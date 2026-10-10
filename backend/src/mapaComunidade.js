import { query, one } from './db.js';
import { MUNICIPIOS, ondeFica, acharMunicipio } from './administrativo.js';
import { categoriaValida } from './giaraCategorias.js';
import { enviarAoGiara } from './giara.js';

// «AJUDE A MELHORAR O MAPA» (10/10/2026, pedido do Simão).
//
// Depois de uma viagem concluída, o passageiro e o motorista podem responder a
// perguntas sobre o sítio onde ela acabou — uma de cada vez, todas
// voluntárias. A hierarquia é a oficial de Timor-Leste: Município → Posto
// Administrativo → Suco → Aldeia; o BAIRRO é designação local, a mais.
//
// REGRAS DELE, e onde vivem:
//   · o que já se sabe pede-se só para CONFIRMAR (`conhecido`): o município e
//     o posto vêm das coordenadas (ondeFica); o bairro, a aldeia e o suco das
//     respostas já aceites ali perto; o nome do sítio dos lugares do HAKAT Maps;
//   · sem repetições: quem já respondeu a uma pergunta a menos de 500 m nos
//     últimos 90 dias não a volta a ver ali; depois de contribuir, nada durante
//     20 horas; «Agora não» cala o convite 7 dias;
//   · tudo é VISTO NO PAINEL antes de entrar no mapa (estado 'nova' →
//     'aceite' / 'recusada'); o painel agrupa as respostas iguais do mesmo
//     sítio e mostra quantas PESSOAS diferentes as deram (a confiança);
//   · os contribuidores nunca aparecem: o painel mostra contagens, não nomes,
//     e o que vai para o HAKAT Maps sai sem autor.
export const PERGUNTAS = ['bairro', 'aldeia', 'suco', 'posto', 'municipio', 'local', 'problema'];
export const PROBLEMAS = [
  'nome_errado',
  'local_errado',
  'rua_inexistente',
  'rua_sem_nome',
  'sitio_sem_nome',
  'outro',
];
// As categorias que a app oferece para o nome de um sítio (códigos do HAKAT Maps).
export const CATEGORIAS_LOCAL = [
  'shop',
  'restaurant',
  'school',
  'clinic',
  'church',
  'hotel',
  'escritorio',
  'building',
  'other',
];

const PERTO_M = { bairro: 400, aldeia: 400, suco: 600, local: 40 };
const REPETIR_M = 500;
const REPETIR_DIAS = 90;
const DESCANSO_HORAS = 20;
const ADIAR_DIAS = 7;

// Uma caixa em graus à volta do ponto, e a distância a sério depois.
const GRAU = 111320;
const caixa = (lat, m) => [m / GRAU, m / (GRAU * Math.cos((lat * Math.PI) / 180))];

// A viagem onde a contribuição se apoia: concluída, nas últimas 24 horas, e
// desta pessoa (passageiro ou motorista). As coordenadas são as do destino —
// onde a viagem acabou.
export async function viagemParaContribuir(rideId, userId) {
  return one(
    `SELECT id, dest_lat AS lat, dest_lng AS lng FROM rides
      WHERE id = $1 AND status = 'completed'
        AND (passenger_id = $2 OR driver_id = $2)
        AND COALESCE(concluida_em, updated_at) > NOW() - INTERVAL '24 hours'`,
    [rideId, userId]
  );
}

// O valor mais dado e já ACEITE, perto do ponto, para uma pergunta.
async function aceitePerto(tipo, lat, lng) {
  const [dLat, dLng] = caixa(lat, PERTO_M[tipo]);
  const r = await one(
    `SELECT resposta, COUNT(*)::int AS n FROM contribuicoes_mapa
      WHERE tipo = $1 AND estado = 'aceite' AND resposta IS NOT NULL
        AND lat BETWEEN $2::float8 - $4::float8 AND $2::float8 + $4::float8
        AND lng BETWEEN $3::float8 - $5::float8 AND $3::float8 + $5::float8
      GROUP BY resposta ORDER BY n DESC LIMIT 1`,
    [tipo, lat, lng, dLat, dLng]
  );
  if (r) return r.resposta;
  // E os lugares baptizados no painel e na app, que já trazem a morada.
  if (tipo === 'bairro' || tipo === 'aldeia' || tipo === 'suco') {
    const l = await one(
      `SELECT ${tipo} AS v FROM lugares_propostos
        WHERE estado = 'aceite' AND COALESCE(${tipo}, '') <> ''
          AND lat BETWEEN $1::float8 - $3::float8 AND $1::float8 + $3::float8
          AND lng BETWEEN $2::float8 - $4::float8 AND $2::float8 + $4::float8
        GROUP BY ${tipo} ORDER BY COUNT(*) DESC LIMIT 1`,
      [lat, lng, dLat, dLng]
    );
    return l?.v || null;
  }
  return null;
}

// O sítio com nome mais perto (até 40 m), do HAKAT Maps ou baptizado aqui.
async function sitioPerto(lat, lng) {
  const [dLat, dLng] = caixa(lat, PERTO_M.local);
  const r = await one(
    `SELECT nome FROM (
       SELECT nome, lat, lng FROM lugares_giara
       UNION ALL
       SELECT nome, lat, lng FROM lugares_propostos WHERE estado = 'aceite'
     ) s
      WHERE lat BETWEEN $1::float8 - $3::float8 AND $1::float8 + $3::float8
        AND lng BETWEEN $2::float8 - $4::float8 AND $2::float8 + $4::float8
      ORDER BY (lat - $1::float8) ^ 2 + (lng - $2::float8) ^ 2 LIMIT 1`,
    [lat, lng, dLat, dLng]
  );
  return r?.nome || null;
}

// O que esta pessoa já respondeu ali perto (para não repetir).
async function jaRespondidas(userId, lat, lng) {
  const [dLat, dLng] = caixa(lat, REPETIR_M);
  const r = await query(
    `SELECT DISTINCT tipo FROM contribuicoes_mapa
      WHERE user_id = $1 AND created_at > NOW() - ($6 || ' days')::interval
        AND lat BETWEEN $2::float8 - $4::float8 AND $2::float8 + $4::float8
        AND lng BETWEEN $3::float8 - $5::float8 AND $3::float8 + $5::float8`,
    [userId, lat, lng, dLat, dLng, String(REPETIR_DIAS)]
  );
  return new Set(r.map((x) => x.tipo));
}

// As perguntas desta viagem para esta pessoa, já pela ordem certa. Lista vazia
// quando não há nada a perguntar (ou não é altura de perguntar).
export async function perguntasPara(user, ride) {
  const pausa = await one(
    `SELECT (mapa_adiado_ate > NOW()) AS adiado,
            EXISTS (SELECT 1 FROM contribuicoes_mapa
                     WHERE user_id = $1 AND created_at > NOW() - ($2 || ' hours')::interval) AS recente
       FROM users WHERE id = $1`,
    [user.id, String(DESCANSO_HORAS)]
  );
  if (!ride?.lat || pausa?.adiado || pausa?.recente) return [];
  const lat = Number(ride.lat);
  const lng = Number(ride.lng);
  const feitas = await jaRespondidas(user.id, lat, lng);
  const onde = await ondeFica(lat, lng);

  const lista = [];
  const juntar = (p) => {
    if (!feitas.has(p.tipo)) lista.push(p);
  };
  const bairro = await aceitePerto('bairro', lat, lng);
  juntar({ tipo: 'bairro', conhecido: bairro || onde.sugestaoAldeia || null });
  juntar({ tipo: 'aldeia', conhecido: await aceitePerto('aldeia', lat, lng) });
  juntar({
    tipo: 'suco',
    conhecido: await aceitePerto('suco', lat, lng),
    opcoes: (onde.sucos || []).map((s) => s.nome),
  });
  const mun = onde.municipio ? acharMunicipio(onde.municipio.nome) : null;
  juntar({
    tipo: 'posto',
    conhecido: onde.posto?.nome || null,
    opcoes: (mun?.postos || []).map((p) => p.nome),
  });
  juntar({
    tipo: 'municipio',
    conhecido: onde.municipio?.nome || null,
    opcoes: MUNICIPIOS.map((m) => m.nome),
  });
  juntar({ tipo: 'local', conhecido: await sitioPerto(lat, lng), categorias: CATEGORIAS_LOCAL });
  // Só a pergunta dos problemas não chega para incomodar ninguém.
  if (!lista.length) return [];
  lista.push({ tipo: 'problema', opcoes: PROBLEMAS });
  return lista;
}

const limpo = (v, n = 120) =>
  v == null ? null : String(v).replace(/\s+/g, ' ').trim().slice(0, n) || null;

// Uma resposta, guardada logo (parar a meio não perde as que já foram dadas).
export async function guardarResposta(userId, ride, b = {}) {
  const tipo = String(b.tipo || '');
  if (!PERGUNTAS.includes(tipo)) throw new Error('Pergunta desconhecida.');
  const naoSei = !!b.naoSei;
  let resposta = naoSei ? null : limpo(b.resposta);
  let categoria = null;
  if (tipo === 'local' && !naoSei) {
    categoria = categoriaValida(b.categoria) ? b.categoria : null;
  }
  if (tipo === 'problema' && !naoSei) {
    const codigos = (Array.isArray(b.problemas) ? b.problemas : []).filter((p) =>
      PROBLEMAS.includes(p)
    );
    if (!codigos.length) throw new Error('Escolha o que está errado.');
    resposta = codigos.join(',');
  }
  if (!naoSei && !resposta) throw new Error('Escreva a resposta, ou toque em «Não sei».');
  await query(
    `INSERT INTO contribuicoes_mapa (user_id, ride_id, tipo, resposta, categoria, nota, confirmou, nao_sei, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      userId,
      ride.id,
      tipo,
      resposta,
      categoria,
      limpo(b.nota, 300),
      !!b.confirmou,
      naoSei,
      ride.lat,
      ride.lng,
    ]
  );
}

export async function adiar(userId) {
  await query(
    `UPDATE users SET mapa_adiado_ate = NOW() + ($2 || ' days')::interval WHERE id = $1`,
    [userId, String(ADIAR_DIAS)]
  );
}

// ── PAINEL ──────────────────────────────────────────────────────────────
// As respostas por ver, agrupadas: a mesma pergunta, a mesma resposta (sem
// maiúsculas nem espaços a mais) e o mesmo sítio (células de ~400 m). A
// CONFIANÇA é o número de pessoas diferentes que a deram. Sem nomes.
export async function contribuicoesPorVer() {
  return query(
    `SELECT tipo,
            (ARRAY_AGG(resposta ORDER BY id))[1] AS resposta,
            MAX(categoria) AS categoria,
            ARRAY_AGG(id ORDER BY id) AS ids,
            COUNT(*)::int AS respostas,
            COUNT(DISTINCT user_id)::int AS pessoas,
            BOOL_OR(confirmou) AS confirmaram,
            AVG(lat)::float8 AS lat, AVG(lng)::float8 AS lng,
            MAX(created_at) AS ultima,
            ARRAY_REMOVE(ARRAY_AGG(nota), NULL) AS notas
       FROM contribuicoes_mapa
      WHERE estado = 'nova' AND NOT nao_sei AND resposta IS NOT NULL
      GROUP BY tipo, LOWER(resposta), ROUND((lat / 0.004)::numeric), ROUND((lng / 0.004)::numeric)
      ORDER BY COUNT(DISTINCT user_id) DESC, MAX(created_at) DESC
      LIMIT 300`
  );
}

// Aceitar ou recusar um grupo. Aceite, o bairro, a aldeia e o nome de um sítio
// entram no HAKAT Maps como lugar (sem autor); o suco, o posto e o município
// passam a ser «o que já se sabe» ali, e os problemas ficam como tratados.
export async function decidir(ids, aceitar, adminId) {
  const linhas = await query(
    `UPDATE contribuicoes_mapa SET estado = $2, decidido_em = NOW(), decidido_por = $3
      WHERE id = ANY($1::int[]) AND estado = 'nova'
      RETURNING tipo, resposta, categoria, lat, lng`,
    [ids.map(Number).filter(Number.isInteger), aceitar ? 'aceite' : 'recusada', adminId]
  );
  if (!aceitar || !linhas.length) return linhas.length;
  const g = linhas[0];
  const lat = linhas.reduce((s, l) => s + Number(l.lat), 0) / linhas.length;
  const lng = linhas.reduce((s, l) => s + Number(l.lng), 0) / linhas.length;
  const paraMapa =
    g.tipo === 'local'
      ? { tipo: 'outro', categoria: g.categoria || 'other' }
      : g.tipo === 'bairro'
        ? { tipo: 'bairro', categoria: 'bairro', bairro: g.resposta }
        : g.tipo === 'aldeia'
          ? { tipo: 'bairro', categoria: 'village', aldeia: g.resposta }
          : null;
  if (paraMapa) {
    await query(
      `INSERT INTO lugares_propostos (user_id, nome, lat, lng, estado, tipo, categoria, bairro, aldeia)
       VALUES (NULL, $1, $2, $3, 'aceite', $4, $5, $6, $7)`,
      [
        g.resposta,
        lat,
        lng,
        paraMapa.tipo,
        paraMapa.categoria,
        paraMapa.bairro || null,
        paraMapa.aldeia || null,
      ]
    );
    enviarAoGiara().catch((e) => console.error('[mapa] giara:', e.message));
  }
  return linhas.length;
}

export const SQL_CONTRIBUICOES_NO_SINO = `(SELECT COUNT(*) FROM contribuicoes_mapa
   WHERE estado = 'nova' AND NOT nao_sei AND resposta IS NOT NULL)::int`;
