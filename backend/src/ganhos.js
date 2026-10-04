import { query, one } from './db.js';

// OS GANHOS DO MOTORISTA (04/10/2026, pedido do Simão).
//
// O dinheiro nunca passa por nós: é entregue em mão. Isto não é uma conta
// bancária, é a soma das viagens que ele concluiu, contadas pelo DIA EM QUE
// ACABARAM, na hora de Díli — o mesmo dia que a assinatura conta como dia de
// actividade (`registarDia`). Uma viagem pedida às 23:50 e acabada às 00:10 é
// do dia seguinte nos dois sítios.
//
// O dia de actividade vem da tabela `dias_contados`, e não de «houve viagens
// neste dia»: o que interessa ao motorista é o que lhe foi CONTADO, que é o
// que lhe gasta o plano. Se as duas coisas alguma vez discordassem, era a
// tabela que ele teria de discutir — por isso é ela que se mostra.
//
// As horas online vêm de `sessoes_online` (ver drivers.js), cortadas pela
// meia-noite de Díli: uma sessão das 22:00 às 02:00 dá duas horas a cada dia.

// O maior período que se pede de uma vez: um ano e um dia (o «Personalizado»
// de 1 de Janeiro a 1 de Janeiro). Mais do que isso é uma consulta pesada
// para um gráfico que não o consegue mostrar.
export const MAX_DIAS_PERIODO = 367;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Meia-noite de Díli de uma data, como instante. `$n::date::timestamp AT TIME
// ZONE` lê a data como hora local de Díli e devolve o instante absoluto.
const INICIO = (p) => `(${p}::date::timestamp AT TIME ZONE 'Asia/Dili')`;
const FIM = (p) => `((${p}::date + 1)::timestamp AT TIME ZONE 'Asia/Dili')`;

export async function hojeEmDili() {
  return (await one(`SELECT TO_CHAR((NOW() AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') AS d`))
    .d;
}

// O período pedido, validado. Sem nada: os últimos 7 dias. O fim nunca passa
// de hoje — amanhã não tem ganhos, e uma barra a zero no fim do gráfico
// parecia um dia mau.
export async function periodoDe(de, ate) {
  const hoje = await hojeEmDili();
  let fim = DATA.test(String(ate || '')) ? String(ate) : hoje;
  if (fim > hoje) fim = hoje;
  let inicio = DATA.test(String(de || '')) ? String(de) : null;
  if (!inicio || inicio > fim) {
    inicio = (
      await one(`SELECT TO_CHAR($1::date - 6, 'YYYY-MM-DD') AS d`, [fim])
    ).d;
  }
  const { n } = await one(`SELECT ($2::date - $1::date + 1)::int AS n`, [inicio, fim]);
  if (n > MAX_DIAS_PERIODO) {
    inicio = (
      await one(`SELECT TO_CHAR($1::date - ($2::int - 1), 'YYYY-MM-DD') AS d`, [
        fim,
        MAX_DIAS_PERIODO,
      ])
    ).d;
  }
  return { de: inicio, ate: fim, hoje };
}

// Cada dia de calendário do período, INCLUINDO os dias a zero — o gráfico e
// o «Por dia» mostram-nos, e um dia sem viagens não conta como dia de
// actividade (a coluna `conta` vem da tabela, não daqui).
export async function porDia(userId, de, ate) {
  const linhas = await query(
    `WITH dias AS (
       SELECT d::date AS dia, ${INICIO('d')} AS ini, ${FIM('d')} AS fim
         FROM generate_series($2::date, $3::date, INTERVAL '1 day') d
     ),
     v AS (
       SELECT (concluida_em AT TIME ZONE 'Asia/Dili')::date AS dia,
              COALESCE(SUM(fare_usd), 0)::float8 AS valor,
              COUNT(*)::int AS viagens,
              COALESCE(SUM(distance_km), 0)::float8 AS km
         FROM rides
        WHERE driver_id = $1 AND status = 'completed'
          AND concluida_em >= ${INICIO('$2')} AND concluida_em < ${FIM('$3')}
        GROUP BY 1
     ),
     o AS (
       SELECT dias.dia,
              SUM(EXTRACT(EPOCH FROM
                    LEAST(COALESCE(s.fim, NOW()), dias.fim) - GREATEST(s.inicio, dias.ini)
                  ))::float8 / 60 AS minutos
         FROM dias
         JOIN sessoes_online s
           ON s.user_id = $1 AND s.inicio < dias.fim AND COALESCE(s.fim, NOW()) > dias.ini
        GROUP BY dias.dia
     )
     SELECT TO_CHAR(dias.dia, 'YYYY-MM-DD') AS dia,
            COALESCE(v.valor, 0) AS valor,
            COALESCE(v.viagens, 0) AS viagens,
            COALESCE(v.km, 0) AS km,
            (c.dia IS NOT NULL) AS conta,
            COALESCE(c.gratuito, FALSE) AS gratuito,
            COALESCE(o.minutos, 0) AS minutos
       FROM dias
       LEFT JOIN v ON v.dia = dias.dia
       LEFT JOIN dias_contados c ON c.user_id = $1 AND c.dia = dias.dia
       LEFT JOIN o ON o.dia = dias.dia
      ORDER BY dias.dia DESC`,
    [userId, de, ate]
  );
  return linhas.map((l) => ({
    dia: l.dia,
    valor: centimos(l.valor),
    viagens: l.viagens,
    km: Math.round(Number(l.km) * 10) / 10,
    conta: !!l.conta,
    gratuito: !!l.gratuito,
    minutosOnline: Math.round(Number(l.minutos)),
  }));
}

function centimos(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

// Hoje, os últimos 7 dias e desde sempre — os cartões fixos do ecrã, que não
// mudam com o filtro.
async function fixos(userId, hoje) {
  const n = await one(
    `WITH minhas AS (
       SELECT fare_usd, (concluida_em AT TIME ZONE 'Asia/Dili')::date AS dia
         FROM rides WHERE driver_id = $1 AND status = 'completed'
     )
     SELECT
       COALESCE(SUM(fare_usd) FILTER (WHERE dia = $2::date), 0)::float8 AS hoje,
       COUNT(*) FILTER (WHERE dia = $2::date)::int AS viagens_hoje,
       COALESCE(SUM(fare_usd) FILTER (WHERE dia > $2::date - 7), 0)::float8 AS semana,
       COUNT(*) FILTER (WHERE dia > $2::date - 7)::int AS viagens_semana,
       COALESCE(SUM(fare_usd), 0)::float8 AS total,
       COUNT(*)::int AS viagens_total
     FROM minhas`,
    [userId, hoje]
  );
  const d = await one(
    `SELECT COUNT(*) FILTER (WHERE dia > $2::date - 7)::int AS semana,
            COUNT(*)::int AS total
       FROM dias_contados WHERE user_id = $1`,
    [userId, hoje]
  );
  return { n, d };
}

// A primeira vez que alguém ficou online depois de as sessões existirem. Antes
// disso não se sabe — e um «0h» nesses dias seria mentir.
async function onlineDesde() {
  const r = await one(
    `SELECT TO_CHAR((MIN(inicio) AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') AS d
       FROM sessoes_online`
  );
  return r?.d || null;
}

export async function resumoGanhos(userId, pedido = {}) {
  const { de, ate, hoje } = await periodoDe(pedido.de, pedido.ate);
  const [dias, { n, d }, desde, hojeLinha] = await Promise.all([
    porDia(userId, de, ate),
    fixos(userId, hoje),
    onlineDesde(),
    // Hoje à parte: o filtro pode não o incluir, e o cartão de cima é sempre
    // de hoje.
    porDia(userId, hoje, hoje),
  ]);

  const periodo = dias.reduce(
    (a, x) => ({
      valor: a.valor + x.valor,
      viagens: a.viagens + x.viagens,
      dias: a.dias + (x.conta ? 1 : 0),
      minutosOnline: a.minutosOnline + x.minutosOnline,
      km: a.km + x.km,
    }),
    { valor: 0, viagens: 0, dias: 0, minutosOnline: 0, km: 0 }
  );
  periodo.valor = centimos(periodo.valor);
  periodo.km = Math.round(periodo.km * 10) / 10;

  const h = hojeLinha[0] || { valor: 0, viagens: 0, minutosOnline: 0 };
  return {
    // Os campos de sempre, para as versões da app anteriores a este ecrã.
    hoje: centimos(n.hoje),
    viagensHoje: n.viagens_hoje,
    semana: centimos(n.semana),
    viagensSemana: n.viagens_semana,
    total: centimos(n.total),
    viagensTotal: n.viagens_total,
    dias: dias
      .filter((x) => x.viagens > 0)
      .slice(0, 7)
      .map((x) => ({ dia: x.dia, valor: x.valor, viagens: x.viagens })),
    // O que é novo.
    minutosOnlineHoje: h.minutosOnline,
    hojeConta: !!h.conta,
    diasSemana: d.semana,
    diasTotal: d.total,
    onlineDesde: desde,
    periodo: { de, ate, ...periodo },
    porDia: dias,
  };
}

// AS VIAGENS DE UM DIA, para o detalhe. As concluídas (que contam para os
// ganhos) e as canceladas depois de aceites por ele (que não contam, mas
// aconteceram — e o motorista lembra-se delas). Um pedido que ele recusou
// nunca foi dele, e não aparece.
export async function viagensDoDia(userId, dia) {
  if (!DATA.test(String(dia || ''))) return null;
  const viagens = await query(
    `SELECT id, referencia, status, vehicle_type, origin_label, dest_label,
            fare_usd, distance_km,
            TO_CHAR(COALESCE(concluida_em, updated_at) AT TIME ZONE 'Asia/Dili', 'HH24:MI') AS hora
       FROM rides
      WHERE driver_id = $1
        AND COALESCE(concluida_em, updated_at) >= ($2::date::timestamp AT TIME ZONE 'Asia/Dili')
        AND COALESCE(concluida_em, updated_at) < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dili')
        AND (status = 'completed' OR status = 'cancelled')
      ORDER BY COALESCE(concluida_em, updated_at) ASC`,
    [userId, dia]
  );
  const [resumo] = await porDia(userId, dia, dia);
  return {
    dia,
    ...resumo,
    lista: viagens.map((v) => ({
      id: v.id,
      referencia: v.referencia || null,
      estado: v.status,
      veiculo: v.vehicle_type,
      origem: v.origin_label || null,
      destino: v.dest_label || null,
      km: v.distance_km == null ? null : Math.round(Number(v.distance_km) * 10) / 10,
      valor: v.status === 'completed' ? centimos(v.fare_usd) : null,
      hora: v.hora,
    })),
  };
}
