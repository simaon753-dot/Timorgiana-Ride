import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { procurar } from '../lugares.js';
import { query } from '../db.js';
import { tipoValido } from '../tiposDeLugar.js';
import { normalizar } from '../texto.js';
import { MUNICIPIOS, ondeFica } from '../administrativo.js';
import { lugaresPerto } from '../lugaresNossos.js';

export const lugaresRouter = Router();

// Autenticado de propósito. Sem isto, o endereço seria um proxy livre para o
// Google à custa da nossa quota — bastava alguém apontar um script a ele. Só
// quem tem conta procura, e é sempre o próprio destino de alguém.
lugaresRouter.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const texto = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// GET /api/lugares?q=timor plaza
lugaresRouter.get(
  '/',
  wrap(async (req, res) => {
    const r = await procurar(req.query.q, req.user.id);
    res.json(r);
  })
);

// GET /api/lugares/perto?lat=&lng= — o que tem nome à volta deste ponto
//
// Chamado enquanto o dedo arrasta o mapa no modo de escolha. Por isso devolve
// pouco e depressa: seis sítios no máximo, dentro de 250 metros, ordenados do
// mais perto para o mais longe.
lugaresRouter.get(
  '/perto',
  wrap(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const lugares = await lugaresPerto(
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
      req.user.id
    );
    res.json({ lugares });
  })
);

// GET /api/lugares/administrativo?lat=&lng=
//
// Tudo o que o formulário de correcção precisa de saber antes de se
// desenhar: onde é isto, que sucos existem por aqui, e que aldeias já foram
// escritas nesses sucos.
//
// Vai tudo num pedido só. Podia ser três, mas o formulário abre-se quando
// alguém carrega no "!" — e nesse momento a rede em Díli não é para gastar
// em idas e voltas.
lugaresRouter.get(
  '/administrativo',
  wrap(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const onde = await ondeFica(
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null
    );

    // As aldeias que alguém já escreveu nos sucos deste posto.
    //
    // BASTA UMA VEZ para uma aldeia passar a ser sugerida. A tentação era
    // exigir duas ou três, para filtrar erros de escrita — mas com dezenas
    // de utilizadores nunca nada chegaria a duas, e o campo ficaria vazio
    // para sempre. Vale mais sugerir cedo e corrigir no painel do que ter
    // um campo que só aprende quando já não faz falta.
    //
    // Ordenadas pelas mais escritas: se houver "Fomento" e "Fomentu", a que
    // mais gente usa aparece primeiro.
    let aldeias = [];
    const nomesDosSucos = (onde.sucos || []).map((s) => s.nome);
    if (nomesDosSucos.length) {
      const r = await query(
        `SELECT suco, aldeia, COUNT(*)::int AS vezes
           FROM lugares_propostos
          WHERE aldeia IS NOT NULL AND aldeia <> '' AND suco = ANY($1::text[])
          GROUP BY suco, aldeia
          ORDER BY vezes DESC, aldeia`,
        [nomesDosSucos]
      );
      aldeias = r.rows;
    }

    res.json({
      municipio: onde.municipio ?? null,
      posto: onde.posto ?? null,
      sucos: onde.sucos ?? [],
      sugestaoAldeia: onde.sugestaoAldeia ?? null,
      aldeias,
    });
  })
);

// GET /api/lugares/municipios
//
// A árvore inteira, para quando as coordenadas não bastam: sem rede o
// Nominatim não responde, e há sítios de Timor cujas fronteiras ainda não
// estão desenhadas no OpenStreetMap. Nesses casos escolhe-se à mão.
//
// São 49 KB. Enviar tudo de uma vez e deixar a app procurar em memória é
// mais rápido, e sobretudo funciona depois de ter carregado uma vez.
lugaresRouter.get(
  '/municipios',
  wrap(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.json({ municipios: MUNICIPIOS });
  })
);

// POST /api/lugares/propor — o passageiro deu nome a um sítio
//
// Só se chama quando ele ESCREVEU um nome diferente do que lhe mostrámos.
// Aceitar o nome da rua que sugerimos não é informação nova; corrigi-lo é.
lugaresRouter.post(
  '/propor',
  wrap(async (req, res) => {
    const { nome, nomeMapa, lat, lng, tipo } = req.body || {};
    if (!tipoValido(tipo)) return res.status(400).json({ error: 'Tipo desconhecido.' });
    const n = String(nome || '').trim();
    if (n.length < 2 || n.length > 120) return res.status(400).json({ error: 'Nome inválido.' });
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Faltam as coordenadas.' });
    }

    // A morada. Toda opcional, e por isso validada só no tamanho.
    //
    // Não se verifica se o suco pertence mesmo ao posto, nem se o município
    // existe na lista. A app já só deixa escolher da lista, e recusar aqui o
    // que ela mandou só serviria para perder a contribuição de quem está
    // numa zona que o Nominatim não sabe classificar. Quem revê no painel vê
    // o que veio e decide.
    const endereco = texto(req.body?.endereco, 200);
    const municipio = texto(req.body?.municipio, 60);
    const posto = texto(req.body?.posto, 60);
    const suco = texto(req.body?.suco, 60);
    const aldeia = texto(req.body?.aldeia, 60);
    const bairro = texto(req.body?.bairro, 60);

    // Se o que ele escreveu for igual ao que já lá estava, não há nada a
    // guardar — a NÃO SER que tenha preenchido a morada.
    //
    // Antes, um nome igual saía daqui sem se guardar nada. Agora alguém pode
    // confirmar o nome e acrescentar só o suco e a aldeia, e isso é
    // informação nova mesmo com o nome na mesma: é exactamente o que falta
    // ao OpenStreetMap.
    const mesmoNome =
      n.toLowerCase() ===
      String(nomeMapa || '')
        .trim()
        .toLowerCase();
    const temMorada = Boolean(endereco || suco || aldeia || bairro);
    if (mesmoNome && !temMorada) {
      return res.json({ guardado: false, motivo: 'igual' });
    }

    await query(
      `INSERT INTO lugares_propostos
         (user_id, nome, nome_mapa, lat, lng, tipo,
          endereco, municipio, posto, suco, aldeia, bairro, nome_busca)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        req.user.id,
        n,
        String(nomeMapa || '').trim() || null,
        lat,
        lng,
        tipo || null,
        endereco,
        municipio,
        posto,
        suco,
        aldeia,
        bairro,
        normalizar(n),
      ]
    );
    res.json({ guardado: true });
  })
);
