import { query, one, tx } from './db.js';

// Assinatura dos motoristas.
//
// A TimorgianaRide não cobra comissão: o motorista fica com cada dólar de
// cada viagem. Em vez disso paga o acesso à plataforma, em dias, adiantado.
//
// Porquê dias e não meses: a regra que o Simão desenhou é que um dia só
// conta quando o motorista fez alguma coisa. Carrega 30 dias, e esses 30
// dias gastam-se ao ritmo do trabalho dele, não do calendário. Quem passa
// uma semana doente não paga essa semana.
//
// A REGRA, e é só uma:
//
//     Um dia conta quando houve pelo menos uma viagem CONCLUÍDA.
//
// Tudo o resto sai daqui sem precisar de excepção: uma viagem aceite que o
// passageiro cancelou não conta (não foi concluída); um dia inteiro offline
// não conta (não houve viagem); dez viagens no mesmo dia contam uma vez (é
// um dia, não dez).
//
// A simplicidade é deliberada. Isto tem de se explicar a um motorista em
// voz alta, à porta de um carro, sem folheto. Uma regra com excepções não
// sobrevive a essa conversa — e a primeira discussão sobre a cobrança
// define a confiança para sempre.

// Até esta data, ninguém paga e ninguém é bloqueado. Os dias são registados
// à mesma, marcados como gratuitos: quando a cobrança começar, o motorista
// já viu o mecanismo a funcionar durante meses e sabe que é honesto.
//
// A data vive AQUI e não na aplicação. Adiar a cobrança passa a ser uma
// publicação do servidor, não uma actualização que cada telemóvel tem de
// receber — e num sítio onde a rede falha, essa diferença é entre mudar a
// data e não conseguir mudá-la.
export const GRATUITO_ATE = '2027-04-30';

// Preços em dólares. O pacote pequeno existe para ser comprado sem medo:
// $4 é dinheiro que um motorista pode arriscar numa app que ainda não sabe
// se lhe serve. O de 30 dias sai mais barato por dia, e é para onde ele vai
// depois de o pacote pequeno lhe ter provado alguma coisa.
export const PACOTES = {
  car: [
    { dias: 3, usd: 4 },
    { dias: 10, usd: 12 },
    { dias: 30, usd: 30 },
  ],
  motorbike: [
    { dias: 3, usd: 2 },
    { dias: 10, usd: 6 },
    { dias: 30, usd: 15 },
  ],
};

// Como o dinheiro chega. O servidor é a autoridade sobre esta lista para a
// app não precisar de sair uma versão nova quando abrir um banco novo.
export const FORMAS_PAGAMENTO = ['mandiri', 'bnu', 'bnctl', 'bri', 'telemor', 'escritorio', 'agente'];

// O dia é o de Díli, não o do servidor. O Render corre algures na Ásia e o
// UTC muda de dia às nove da manhã em Timor-Leste: sem isto, o trabalho de
// uma manhã contaria como o dia anterior.
const DIA_DILI = `(NOW() AT TIME ZONE 'Asia/Dili')::date`;

export async function emPeriodoGratuito() {
  const r = await one(`SELECT ${DIA_DILI} <= $1::date AS gratuito`, [GRATUITO_ATE]);
  return !!r?.gratuito;
}

// Regista o dia de trabalho e, se já se pagar, gasta um dia do saldo.
//
// Numa transacção porque são duas escritas que têm de concordar: se o dia
// ficasse registado e o saldo não descesse, o motorista trabalhava de
// graça; ao contrário, pagava um dia que não ficou registado e não teria
// como o provar.
//
// O `ON CONFLICT DO NOTHING` faz o trabalho todo da regra "uma vez por
// dia". A segunda viagem do mesmo dia não insere nada, portanto não desce
// saldo nenhum — sem contar viagens, sem comparar datas em JavaScript.
export async function registarDia(userId, rideId) {
  const gratuito = await emPeriodoGratuito();
  return tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO dias_contados (user_id, dia, ride_id, gratuito)
       VALUES ($1, ${DIA_DILI}, $2, $3)
       ON CONFLICT (user_id, dia) DO NOTHING
       RETURNING id`,
      [userId, rideId || null, gratuito]
    );
    if (!rows.length) return { novo: false, gratuito };

    if (!gratuito) {
      // GREATEST(...,0) porque um saldo negativo não quer dizer nada: quem
      // não tem dias fica bloqueado à entrada, não em dívida.
      await client.query(
        `UPDATE users SET dias_saldo = GREATEST(dias_saldo - 1, 0) WHERE id = $1`,
        [userId]
      );
    }
    return { novo: true, gratuito };
  });
}

// Pode entrar ao serviço?
//
// O caso que parece pequeno e não é: um motorista com saldo zero que JÁ
// trabalhou hoje continua a poder trabalhar. O dia de hoje já foi pago, e
// desligá-lo a meio de um dia comprado seria cobrar-lhe um dia para lhe dar
// meio. Sem esta excepção, quem gastasse o último dia ficava de fora à
// primeira vez que fechasse a aplicação.
export async function podeEntrarAoServico(userId) {
  if (await emPeriodoGratuito()) return { pode: true, motivo: 'gratuito' };

  const r = await one(
    `SELECT u.dias_saldo,
            EXISTS (SELECT 1 FROM dias_contados d
                     WHERE d.user_id = u.id AND d.dia = ${DIA_DILI}) AS hoje_contado
       FROM users u WHERE u.id = $1`,
    [userId]
  );
  if (!r) return { pode: false, motivo: 'sem_conta' };
  if (r.hoje_contado) return { pode: true, motivo: 'dia_ja_pago' };
  if ((r.dias_saldo ?? 0) > 0) return { pode: true, motivo: 'com_saldo' };
  return { pode: false, motivo: 'sem_saldo', dias: 0 };
}

// O que o motorista vê: quantos dias tem, e quais os dias que lhe foram
// contados. O histórico não é enfeite — é a prova. Sem ele, uma discussão
// sobre um dia cobrado não tem como se resolver, e resolve-se sempre contra
// quem não tem registo.
export async function estadoDe(userId) {
  const u = await one(
    `SELECT dias_saldo, vehicle_type FROM users WHERE id = $1`,
    [userId]
  );
  const dias = await query(
    `SELECT TO_CHAR(dia, 'YYYY-MM-DD') AS dia, gratuito, ride_id
       FROM dias_contados WHERE user_id = $1
      ORDER BY dia DESC LIMIT 60`,
    [userId]
  );
  const carregamentos = await query(
    `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Dili', 'YYYY-MM-DD') AS quando,
            dias, valor_usd, metodo
       FROM carregamentos WHERE user_id = $1
      ORDER BY id DESC LIMIT 20`,
    [userId]
  );
  const gratuito = await emPeriodoGratuito();

  return {
    dias: u?.dias_saldo ?? 0,
    gratuito,
    gratuitoAte: GRATUITO_ATE,
    pacotes: PACOTES[u?.vehicle_type === 'motorbike' ? 'motorbike' : 'car'],
    formasPagamento: FORMAS_PAGAMENTO,
    diasContados: dias,
    carregamentos: carregamentos.map((c) => ({ ...c, valor_usd: Number(c.valor_usd) })),
  };
}

// Carregar dias. Só a administração o faz — o dinheiro entra por
// transferência, por um agente ou no escritório, e alguém confirma que
// entrou antes de os dias existirem.
export async function carregar({ userId, dias, valorUsd, metodo, referencia, adminId }) {
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('Número de dias inválido.');

  return tx(async (client) => {
    await client.query(
      `INSERT INTO carregamentos (user_id, dias, valor_usd, metodo, referencia, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, n, valorUsd ?? null, metodo ?? null, referencia ?? null, adminId ?? null]
    );
    const { rows } = await client.query(
      `UPDATE users SET dias_saldo = dias_saldo + $2 WHERE id = $1 RETURNING dias_saldo`,
      [userId, n]
    );
    return rows[0]?.dias_saldo ?? null;
  });
}

// Versão leve do estado, para pendurar na rota que o ecrã do motorista já
// pede de qualquer maneira. Sem histórico e sem pacotes: numa rede lenta,
// mandar sessenta datas para desenhar uma faixa de duas linhas seria pagar
// caro por nada.
export async function resumoDe(userId) {
  const gratuito = await emPeriodoGratuito();
  const u = await one(`SELECT dias_saldo FROM users WHERE id = $1`, [userId]);
  return { dias: u?.dias_saldo ?? 0, gratuito, gratuitoAte: GRATUITO_ATE };
}
