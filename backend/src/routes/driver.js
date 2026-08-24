import { Router } from 'express';
import { one, query } from '../db.js';
import { requireAuth } from '../auth.js';
import { saveDocument, listDocuments, podeTrabalhar, getOwnDocument } from '../documents.js';
import { temFotoDeHoje, guardarFotoDeTurno, ultimaFotoDeTurno } from '../turnos.js';
import { setOnline, savePushToken } from '../drivers.js';
import { toPublicUser } from '../users.js';
import { notificarAdminsMotoristaPronto } from '../push.js';

export const driverRouter = Router();
// Sem guarda de papel: é por aqui que uma conta de passageiro se torna
// motorista. As rotas que exigem estar aprovado verificam-no elas próprias
// — /availability recusa quem não está, e é essa a barreira que conta.
driverRouter.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/driver/status — estado da conta e documentos já enviados
driverRouter.get(
  '/status',
  wrap(async (req, res) => {
    const docs = await listDocuments(req.user.id);
    const [apto, fotoHoje, ultimaFoto] = await Promise.all([
      podeTrabalhar(req.user.id),
      temFotoDeHoje(req.user.id),
      ultimaFotoDeTurno(req.user.id),
    ]);
    res.json({
      user: toPublicUser(req.user),
      documents: docs.map((d) => ({
        kind: d.kind,
        sizeBytes: d.size_bytes,
        createdAt: d.created_at,
        expiresOn: d.expires_on || null,
        expirado: !!d.caducado,
        aExpirar: !!d.a_caducar && !d.caducado,
      })),
      apto,
      fotoDeHoje: fotoHoje,
      // A data do retrato entra no endereço que a app pede. É o que faz a
      // fotografia nova substituir a antiga no ecrã: muda a data, muda o
      // endereço, e a cache de imagens deixa de servir a de ontem.
      retratoDe: ultimaFoto ? ultimaFoto.dia : null,
    });
  })
);

// POST /api/driver/availability — ficar disponível ou indisponível
driverRouter.post(
  '/availability',
  wrap(async (req, res) => {
    const { online } = req.body || {};
    if (typeof online !== 'boolean') {
      return res.status(400).json({ error: 'Valor inválido.' });
    }
    if (req.user.driver_status !== 'approved') {
      return res.status(403).json({ error: 'A tua conta ainda não foi aprovada.' });
    }

    // As condições só se verificam para FICAR disponível. Ficar
    // indisponível tem de funcionar sempre: se um motorista com a carta
    // caducada não conseguisse desligar-se, ficaria preso a receber
    // pedidos — exactamente o contrário do que se pretende.
    if (online) {
      const apto = await podeTrabalhar(req.user.id);
      if (!apto.pode) {
        return res.status(403).json({
          error:
            apto.motivo === 'documento_caducado'
              ? `O teu documento (${apto.qual}) caducou em ${apto.ate}.`
              : 'Faltam documentos na tua conta.',
          motivo: apto.motivo,
          qual: apto.qual,
        });
      }
      if (!(await temFotoDeHoje(req.user.id))) {
        return res.status(428).json({ error: 'Tira uma fotografia para começar o dia.', motivo: 'foto_de_turno' });
      }
    }

    const row = await setOnline(req.user.id, online);

    // Manter as salas do tempo real em sintonia com a base de dados.
    // Sem isto, mudar a disponibilidade por aqui gravava o estado mas
    // deixava o socket fora das salas: o motorista aparecia disponível
    // e não recebia pedido nenhum.
    const io = req.app.get('io');
    const salas = ['drivers', `drivers:${req.user.vehicle_type || 'car'}`];
    const alvo = io.in(`user:${req.user.id}`);
    if (row?.is_online) await alvo.socketsJoin(salas);
    else await alvo.socketsLeave(salas);

    res.json({ online: !!row?.is_online });
  })
);

// GET /api/driver/ganhos — quanto o motorista fez
//
// O dinheiro nunca passa por nós: é entregue em mão. Isto não é uma conta
// bancária, é a soma das viagens que ele concluiu — serve para ele saber
// se valeu a pena o dia, que é a pergunta que um motorista faz ao jantar.
//
// Os intervalos usam a hora de Díli (UTC+9). Sem isso, "hoje" acabava às
// 15h da tarde, porque o servidor pensa em UTC.
driverRouter.get(
  '/ganhos',
  wrap(async (req, res) => {
    const [n] = await query(
      `WITH minhas AS (
         SELECT fare_usd, (created_at AT TIME ZONE 'Asia/Dili') AS quando
         FROM rides WHERE driver_id = $1 AND status = 'completed'
       )
       SELECT
         COALESCE(SUM(fare_usd) FILTER (WHERE quando::date = (NOW() AT TIME ZONE 'Asia/Dili')::date), 0)::float AS hoje,
         COUNT(*) FILTER (WHERE quando::date = (NOW() AT TIME ZONE 'Asia/Dili')::date)::int AS viagensHoje,
         COALESCE(SUM(fare_usd) FILTER (WHERE quando > (NOW() AT TIME ZONE 'Asia/Dili') - INTERVAL '7 days'), 0)::float AS semana,
         COUNT(*) FILTER (WHERE quando > (NOW() AT TIME ZONE 'Asia/Dili') - INTERVAL '7 days')::int AS viagensSemana,
         COALESCE(SUM(fare_usd), 0)::float AS total,
         COUNT(*)::int AS viagensTotal
       FROM minhas`,
      [req.user.id]
    );

    // Últimos 7 dias, para o motorista ver que dias rendem mais
    const dias = await query(
      // Texto e não data: um 'date' viaja como instante e a app volta a
      // interpretá-lo no fuso dela, trocando o dia. 'YYYY-MM-DD' não tem
      // fuso nenhum para interpretar mal.
      `SELECT TO_CHAR((created_at AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') AS dia,
              COALESCE(SUM(fare_usd),0)::float AS valor,
              COUNT(*)::int AS viagens
       FROM rides
       WHERE driver_id = $1 AND status = 'completed'
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY 1 ORDER BY 1 DESC`,
      [req.user.id]
    );

    res.json({
      ganhos: {
        hoje: Math.round(n.hoje * 100) / 100,
        viagensHoje: n.viagenshoje,
        semana: Math.round(n.semana * 100) / 100,
        viagensSemana: n.viagenssemana,
        total: Math.round(n.total * 100) / 100,
        viagensTotal: n.viagenstotal,
        dias: dias.map((d) => ({
          dia: d.dia,
          valor: Math.round(d.valor * 100) / 100,
          viagens: d.viagens,
        })),
      },
    });
  })
);

// POST /api/driver/vehicle — declarar o veículo depois do registo
//
// Quem se registou só como passageiro não tinha onde pôr estes dados. Sem
// isto, tornar-se motorista obrigava a criar outra conta — e uma pessoa em
// Timor-Leste só tem três números de telemóvel.
driverRouter.post(
  '/vehicle',
  wrap(async (req, res) => {
    const { type, model, plate, color, seats } = req.body || {};
    if (!plate || !String(plate).trim()) {
      return res.status(400).json({ error: 'Indica a matrícula do veículo.' });
    }
    const tipo = type === 'motorbike' ? 'motorbike' : 'car';
    if (tipo === 'car' && !seats) {
      return res.status(400).json({ error: 'Indica quantos passageiros o carro leva.' });
    }

    const row = await one(
      `UPDATE users
       SET vehicle_type = $1, vehicle_model = $2, vehicle_plate = $3,
           vehicle_color = $4, vehicle_seats = $5,
           -- Só passa a "à espera" se ainda não tinha pedido nada. Um
           -- motorista já aprovado que corrija a matrícula não deve
           -- recomeçar a análise do zero.
           driver_status = COALESCE(driver_status, 'pending')
       WHERE id = $6
       RETURNING *`,
      [
        tipo,
        model?.trim() || null,
        String(plate).trim(),
        color?.trim() || null,
        tipo === 'car' ? Math.max(1, Math.min(12, Number(seats))) : null,
        req.user.id,
      ]
    );
    res.json({ user: toPublicUser(row) });
  })
);

// POST /api/driver/shift-photo — a selfie de quem vai conduzir hoje
driverRouter.post(
  '/shift-photo',
  wrap(async (req, res) => {
    const { mime, base64 } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Fotografia em falta.' });
    try {
      const r = await guardarFotoDeTurno({ userId: req.user.id, mime, base64 });
      return res.status(201).json({ ok: true, dia: r.dia });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);

// POST /api/driver/terms — aceitar os termos específicos de motorista
//
// Separado do registo de propósito: os termos de motorista falam de seguro,
// de documentos válidos e de trabalho independente. Aceitá-los ANTES de
// enviar os documentos seria aceitar no abstracto; aqui a pessoa já sabe
// exactamente o que entregou.
driverRouter.post(
  '/terms',
  wrap(async (req, res) => {
    const { version } = req.body || {};
    if (!version) return res.status(400).json({ error: 'Versão dos termos em falta.' });
    const row = await one(
      `UPDATE users SET driver_terms_version = $1, driver_terms_accepted_at = NOW()
       WHERE id = $2 RETURNING *`,
      [String(version), req.user.id]
    );
    res.json({ user: toPublicUser(row) });
  })
);

// GET /api/driver/retrato — o rosto a mostrar no perfil
//
// A escolha é feita AQUI e não no telemóvel. A app não tem de saber que
// existem dois sítios onde vive uma fotografia, nem qual delas é a
// melhor; pede um retrato e recebe o melhor que houver:
//
//   1. a fotografia do turno mais recente — é a prova mais fresca de quem
//      está ao volante, e muda todos os dias;
//   2. a do registo, se ainda não houver nenhuma de turno;
//   3. nada, e a app mostra o 👤.
driverRouter.get(
  '/retrato',
  wrap(async (req, res) => {
    const turno = await ultimaFotoDeTurno(req.user.id);
    const foto = turno || (await getOwnDocument(req.user.id, 'photo'));
    if (!foto) return res.status(404).json({ error: 'Sem fotografia.' });

    // `no-cache` obriga o telemóvel a perguntar se mudou, em vez de
    // assumir que não. Sem isto, o retrato de ontem ficava agarrado ao
    // ecrã depois de o motorista tirar o de hoje — e pareceria que a
    // substituição não funcionou, quando o servidor até estava certo.
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('X-Origem', turno ? `turno:${turno.dia}` : 'registo');
    res.setHeader('Content-Type', foto.mime);
    res.send(foto.bytes);
  })
);

// GET /api/driver/documents/:kind/imagem — ver o próprio documento
//
// O painel de administração já servia estas imagens, mas só a
// administradores. O motorista não tinha maneira nenhuma de rever o que
// enviou — nem sequer a própria fotografia de perfil.
//
// Sem :id na rota, de propósito: o dono vem da sessão e o tipo do caminho.
// Não há número nenhum que se possa trocar para chegar ao ficheiro de
// outra pessoa.
driverRouter.get(
  '/documents/:kind/imagem',
  wrap(async (req, res) => {
    const doc = await getOwnDocument(req.user.id, req.params.kind);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    // Privado: é um documento de identificação. Sem isto, um servidor
    // intermédio podia guardar a imagem e servi-la a outra pessoa.
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Type', doc.mime);
    res.send(doc.bytes);
  })
);

// POST /api/driver/documents — enviar carta de condução ou documento do veículo
driverRouter.post(
  '/documents',
  wrap(async (req, res) => {
    const { kind, mime, base64, expiresOn } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Ficheiro em falta.' });

    try {
      const doc = await saveDocument({ userId: req.user.id, kind, mime, base64, expiresOn });

      // Só avisa quando o conjunto ficar completo. Avisar a cada ficheiro
      // daria três notificações pela mesma pessoa e ensinaria a ignorá-las.
      const todos = await listDocuments(req.user.id);
      const tipos = new Set(todos.map((d) => d.kind));
      const completo = ['licence', 'vehicle', 'photo'].every((k) => tipos.has(k));
      // Só avisa quem pediu MESMO para conduzir. Com o registo aberto a
      // qualquer conta, `null || 'pending'` faria soar o alarme por
      // alguém que enviou documentos sem sequer declarar um veículo.
      if (completo && req.user.driver_status === 'pending') {
        req.app.get('io').to('admins').emit('driver:pronto', { id: req.user.id });
        notificarAdminsMotoristaPronto({ nome: req.user.name, telefone: req.user.phone })
          .catch(() => {});
      }

      return res.status(201).json({
        document: { kind: doc.kind, sizeBytes: doc.size_bytes, createdAt: doc.created_at },
      });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);
