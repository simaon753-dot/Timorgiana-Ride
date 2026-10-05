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

// SEM TAXA DE ACESSO ATÉ NOVO AVISO OFICIAL (28/09/2026).
//
// Até aqui havia uma data escrita neste ficheiro — 30/04/2027 — e a cobrança
// começava SOZINHA no dia seguinte. O Simão mudou a regra: o período
// gratuito acaba quando for anunciado oficialmente, e os termos do motorista
// passaram a dizê-lo. Uma data no código seria o servidor a desmentir os
// termos, sem ninguém ter decidido nada nesse dia.
//
// Agora o fim é um ANÚNCIO: o administrador marca no painel o dia em que a
// cobrança começa (`config_servico`, chave 'assinatura.cobranca'). Sem
// anúncio, é gratuito para sempre. O dia tem de ficar pelo menos
// `AVISO_MINIMO_DIAS` à frente — é o que os termos prometem —, e o anúncio
// pode ser retirado enquanto a cobrança não começou.
//
// Os dias continuam registados, marcados como gratuitos: quando a cobrança
// começar, o motorista já viu o mecanismo a funcionar e sabe que é honesto.
export const AVISO_MINIMO_DIAS = 30;
const CHAVE_COBRANCA = 'assinatura.cobranca';

// O dia em que a cobrança começa ('YYYY-MM-DD'), ou null se ainda não foi
// anunciado.
export async function inicioDaCobranca() {
  const r = await one(`SELECT valor FROM config_servico WHERE chave = $1`, [CHAVE_COBRANCA]);
  const d = r?.valor?.inicio;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

// O último dia gratuito — o da véspera da cobrança —, ou null sem anúncio.
// É o que a app mostra: «sem taxa de acesso até 30/04/2027».
export function ultimoDiaGratuito(inicio) {
  if (!inicio) return null;
  const d = new Date(`${inicio}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Anuncia (ou retira, com `inicio` nulo) o dia em que a cobrança começa.
// Devolve `{ erro }` com a mensagem para o painel, ou `{ inicio }`.
export async function anunciarCobranca(inicio, adminId) {
  const actual = await inicioDaCobranca();
  const hoje = (await one(`SELECT TO_CHAR(${DIA_DILI}, 'YYYY-MM-DD') AS d`)).d;
  // Depois de a cobrança começar, já não se volta atrás por aqui: seria
  // apagar a regra com dias já pagos. Adiar faz-se marcando um dia novo.
  if (inicio == null) {
    if (actual && actual <= hoje) {
      return { erro: 'A cobrança já começou. Para a suspender, marque um novo dia de início.' };
    }
    await query(`DELETE FROM config_servico WHERE chave = $1`, [CHAVE_COBRANCA]);
    return { inicio: null };
  }
  if (typeof inicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return { erro: 'Data inválida.' };
  }
  const { minimo } = await one(`SELECT TO_CHAR(${DIA_DILI} + $1::int, 'YYYY-MM-DD') AS minimo`, [
    AVISO_MINIMO_DIAS,
  ]);
  if (inicio < minimo) {
    return { erro: 'A cobrança tem de ser anunciada com pelo menos 30 dias de antecedência.' };
  }
  await query(
    `INSERT INTO config_servico (chave, valor, atualizado_em, atualizado_por)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (chave) DO UPDATE
       SET valor = EXCLUDED.valor, atualizado_em = NOW(), atualizado_por = EXCLUDED.atualizado_por`,
    [CHAVE_COBRANCA, JSON.stringify({ inicio }), adminId]
  );
  return { inicio };
}

// Preços em dólares. O pacote pequeno existe para ser comprado sem medo:
//
// 05/10/2026, decisão do Simão: os 30 dias do Carro e do Carro Pickup baixam
// de $30 para $25; a Motorizada mantém $15. Os pacotes de 3 e 10 dias ficam.
// $4 é dinheiro que um motorista pode arriscar numa app que ainda não sabe
// se lhe serve. O de 30 dias sai mais barato por dia, e é para onde ele vai
// depois de o pacote pequeno lhe ter provado alguma coisa.
export const PACOTES = {
  car: [
    { dias: 3, usd: 4 },
    { dias: 10, usd: 12 },
    { dias: 30, usd: 25 },
  ],
  motorbike: [
    { dias: 3, usd: 2 },
    { dias: 10, usd: 6 },
    { dias: 30, usd: 15 },
  ],
  // Carry: iguais aos do carro por agora. Um veículo de carga trabalha menos
  // viagens por dia do que um táxi, e talvez isto deva ser mais barato — mas
  // isso decide-se com viagens feitas, não antes da primeira.
  carry: [
    { dias: 3, usd: 4 },
    { dias: 10, usd: 12 },
    { dias: 30, usd: 25 },
  ],
};

// Como o dinheiro chega. O servidor é a autoridade sobre esta lista para a
// app não precisar de sair uma versão nova quando abrir um banco novo.
export const FORMAS_PAGAMENTO = [
  // O código QR nacional do Banco Central (TUQR), lançado a 12/09/2026: um
  // código só, para todos os bancos e carteiras que aderirem.
  'tuqr',
  'mandiri',
  'bnu',
  'bnctl',
  'bri',
  'telemor',
  'escritorio',
  'agente',
];

// O dia é o de Díli, não o do servidor. O Render corre algures na Ásia e o
// UTC muda de dia às nove da manhã em Timor-Leste: sem isto, o trabalho de
// uma manhã contaria como o dia anterior.
const DIA_DILI = `(NOW() AT TIME ZONE 'Asia/Dili')::date`;

export async function emPeriodoGratuito() {
  const inicio = await inicioDaCobranca();
  if (!inicio) return true;
  const r = await one(`SELECT ${DIA_DILI} < $1::date AS gratuito`, [inicio]);
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
  const u = await one(`SELECT id, dias_saldo, vehicle_type, is_admin FROM users WHERE id = $1`, [
    userId,
  ]);
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
  const [gratuito, abertas, formas, pedidos, devolucoes, inicio] = await Promise.all([
    emPeriodoGratuito(),
    comprasAbertas(u),
    formasConfiguradas(),
    query(
      `SELECT id, dias, valor_usd, metodo, referencia, estado, motivo, created_at, decidido_em
         FROM pedidos_carregamento WHERE user_id = $1
        ORDER BY id DESC LIMIT 5`,
      [userId]
    ),
    query(
      `SELECT dias, valor_usd, motivo,
              TO_CHAR(created_at AT TIME ZONE 'Asia/Dili', 'YYYY-MM-DD') AS quando
         FROM devolucoes WHERE user_id = $1
        ORDER BY id DESC LIMIT 10`,
      [userId]
    ),
    inicioDaCobranca(),
  ]);

  return {
    dias: u?.dias_saldo ?? 0,
    gratuito,
    // Nulo até haver anúncio: «sem taxa de acesso até novo aviso oficial».
    gratuitoAte: ultimoDiaGratuito(inicio),
    ...(await pacotesDe(userId, u?.vehicle_type)),
    // Fica para as versões da app anteriores aos pedidos (14/09/26).
    formasPagamento: FORMAS_PAGAMENTO,
    diasContados: dias,
    carregamentos: carregamentos.map((c) => ({ ...c, valor_usd: Number(c.valor_usd) })),
    referencia: referenciaDe(userId),
    comprasAbertas: abertas,
    // As compras abrem com o anúncio. Nulo enquanto não houver.
    comprasAbremEm: inicio ? 'anunciadas' : null,
    prazoHoras: PRAZO_HORAS,
    // Só as formas que o administrador ligou, com as instruções que escreveu
    // (número de conta, titular, morada do escritório).
    formas: formas
      .filter((f) => f.ativo)
      .map(({ id, instrucoes, temQr }) => ({
        id,
        instrucoes,
        comPedido: FORMAS_COM_PEDIDO.includes(id),
        ...(temQr !== undefined ? { temQr } : {}),
      })),
    pedidos: pedidos.map((p) => ({
      id: p.id,
      dias: p.dias,
      valorUsd: Number(p.valor_usd),
      metodo: p.metodo,
      referencia: p.referencia,
      estado: p.estado,
      motivo: p.motivo,
      quando: p.created_at,
      decididoEm: p.decidido_em,
    })),
    devolucoes: devolucoes.map((d) => ({ ...d, valor_usd: Number(d.valor_usd) })),
  };
}

// Carregar dias. Só a administração o faz — o dinheiro entra por
// transferência, por um agente ou no escritório, e alguém confirma que
// entrou antes de os dias existirem.
export async function carregar({ userId, dias, valorUsd, metodo, referencia, adminId }) {
  return tx(
    async (client) =>
      (await carregarCom(client, { userId, dias, valorUsd, metodo, referencia, adminId })).saldo
  );
}

// O carregamento em si, dentro de uma transacção que já exista. É o mesmo
// para o botão do escritório e para a confirmação de um pedido: dois
// caminhos para os dias entrarem seriam duas regras para os mesmos dias.
async function carregarCom(client, { userId, dias, valorUsd, metodo, referencia, adminId }) {
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('Número de dias inválido.');
  const ins = await client.query(
    `INSERT INTO carregamentos (user_id, dias, valor_usd, metodo, referencia, admin_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, n, valorUsd ?? null, metodo ?? null, referencia ?? null, adminId ?? null]
  );
  const { rows } = await client.query(
    `UPDATE users SET dias_saldo = dias_saldo + $2 WHERE id = $1 RETURNING dias_saldo`,
    [userId, n]
  );
  return { carregamentoId: ins.rows[0]?.id, saldo: rows[0]?.dias_saldo ?? null };
}

// Versão leve do estado, para pendurar na rota que o ecrã do motorista já
// pede de qualquer maneira. Sem histórico e sem pacotes: numa rede lenta,
// mandar sessenta datas para desenhar uma faixa de duas linhas seria pagar
// caro por nada.
export async function resumoDe(userId) {
  const [gratuito, inicio] = await Promise.all([emPeriodoGratuito(), inicioDaCobranca()]);
  const u = await one(`SELECT dias_saldo FROM users WHERE id = $1`, [userId]);
  return { dias: u?.dias_saldo ?? 0, gratuito, gratuitoAte: ultimoDiaGratuito(inicio) };
}

// ═══ DESCONTO PARA QUEM GANHA POUCO (05/10/2026) ═══════════════════════
//
// A cláusula dos termos do motorista, decidida pelo Simão:
//
//   · um CICLO é um pacote de 30 dias: começa no carregamento de 30 dias e
//     acaba quando se conta o 30.º dia PAGO depois dele;
//   · no fim, calcula-se 15% do rendimento registado nesses 30 dias (as
//     viagens concluídas, pelo preço registado em cada uma);
//   · se for menos do que o preço do pacote, a COMPRA SEGUINTE do pacote de
//     30 dias custa só esses 15%. Uma vez: a primeira compra de 30 dias
//     depois do fim do ciclo gasta-o;
//   · perde-se com mais de 3 cancelamentos depois de aceitar, ou mais de 20%
//     das viagens aceites, nesse ciclo — ou quando o administrador o retira
//     (acordo com um passageiro para viajar por fora, provado).
//
// Paga-se sempre ADIANTADO: o desconto é um preço mais baixo, nunca uma
// dívida a cobrar nem dinheiro devolvido. E não é comissão: a plataforma não
// toca no valor das viagens.
export const DESCONTO = { percentagem: 0.15, maxCanceladas: 3, maxTaxaCanceladas: 0.2 };

export async function descontoDe(userId, vehicleType) {
  const pacote30 = (PACOTES[vehicleType] || PACOTES.car).find((p) => p.dias === 30);
  const sem = (motivo, ciclo = null) => ({
    aplica: false,
    motivo,
    ciclo,
    precoNormal: pacote30.usd,
  });

  // Os pacotes de 30 dias, do mais recente para trás.
  const pacotes = await query(
    `SELECT id, created_at, desconto_retirado_em FROM carregamentos
      WHERE user_id = $1 AND dias = 30 ORDER BY created_at DESC LIMIT 6`,
    [userId]
  );
  if (!pacotes.length) return sem('sem_ciclo');

  // O ciclo acabado mais recente: o primeiro (do mais novo para trás) que já
  // tem 30 dias pagos contados depois dele.
  let ciclo = null;
  for (const c of pacotes) {
    const dias = await query(
      `SELECT TO_CHAR(dia, 'YYYY-MM-DD') AS dia, created_at FROM dias_contados
        WHERE user_id = $1 AND NOT gratuito AND created_at >= $2
        ORDER BY dia ASC LIMIT 30`,
      [userId, c.created_at]
    );
    if (dias.length === 30) {
      ciclo = { pacote: c, dias: dias.map((d) => d.dia), fim: dias[29].created_at };
      break;
    }
  }
  if (!ciclo) return sem('ciclo_por_acabar');

  // Já gasto: houve uma compra de 30 dias depois de o ciclo acabar.
  if (pacotes.some((c) => new Date(c.created_at) > new Date(ciclo.fim))) {
    return sem('ja_usado');
  }

  const de = ciclo.dias[0];
  const ate = ciclo.dias[29];
  const r = await one(
    `SELECT
       COALESCE(SUM(fare_usd) FILTER (
         WHERE status = 'completed'
           AND TO_CHAR((concluida_em AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') = ANY($2::text[])
       ), 0)::float8 AS rendimento,
       COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled'))::int AS aceites,
       COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = $1)::int AS canceladas
     FROM rides
     WHERE driver_id = $1
       AND COALESCE(concluida_em, updated_at) >= ($3::date::timestamp AT TIME ZONE 'Asia/Dili')
       AND COALESCE(concluida_em, updated_at) < (($4::date + 1)::timestamp AT TIME ZONE 'Asia/Dili')`,
    [userId, ciclo.dias, de, ate]
  );
  const rendimento = Math.round(Number(r.rendimento) * 100) / 100;
  const preco = Math.round(rendimento * DESCONTO.percentagem * 100) / 100;
  const info = {
    de,
    ate,
    rendimento,
    aceites: r.aceites,
    canceladas: r.canceladas,
    carregamentoId: ciclo.pacote.id,
  };

  if (ciclo.pacote.desconto_retirado_em) return sem('retirado', info);
  if (
    r.canceladas > DESCONTO.maxCanceladas ||
    (r.aceites > 0 && r.canceladas / r.aceites > DESCONTO.maxTaxaCanceladas)
  ) {
    return sem('cancelamentos', info);
  }
  if (preco >= pacote30.usd) return sem('ganhou_bem', info);
  return { aplica: true, preco, precoNormal: pacote30.usd, ciclo: info };
}

// Os pacotes da conta COM o desconto já aplicado ao de 30 dias. É daqui que
// saem todos os preços — o que a app mostra, o que o pedido cobra e o que o
// administrador regista no escritório —, para nunca haver dois preços.
export async function pacotesDe(userId, vehicleType) {
  const base = PACOTES[vehicleType] || PACOTES.car;
  const d = await descontoDe(userId, vehicleType);
  const pacotes = base.map((p) =>
    p.dias === 30 && d.aplica ? { ...p, usd: d.preco, precoNormal: p.usd } : { ...p }
  );
  return { pacotes, desconto: d };
}

// O administrador retira o desconto do último ciclo (acordo por fora provado).
export async function retirarDesconto(userId, adminId) {
  const u = await one(`SELECT vehicle_type FROM users WHERE id = $1`, [userId]);
  const d = await descontoDe(userId, u?.vehicle_type);
  if (!d.ciclo?.carregamentoId || d.motivo === 'ja_usado') {
    throw erro('Esta conta não tem desconto por usar.');
  }
  await query(
    `UPDATE carregamentos SET desconto_retirado_em = NOW(), desconto_retirado_por = $2 WHERE id = $1`,
    [d.ciclo.carregamentoId, adminId]
  );
}

// O PLANO DE ATIVIDADE, para o ecrã dos Ganhos (04/10/2026).
//
// O Simão pediu um contador «23 / 30» com barra. O saldo é o numerador; o
// DENOMINADOR é o lote em curso — os dias que havia depois do último
// carregamento: o saldo de agora mais os dias pagos gastos desde então. Quem
// carregou 30 e trabalhou 7 vê 23 / 30; quem tinha 5 e carregou 30 vê 35 / 35.
// Nunca uma data de fim: os dias gastam-se ao ritmo do trabalho, e
// «válido até» seria transformar o plano em dias de calendário.
//
// `pacote` é o de 30 dias do tipo de veículo da conta — é o preço que o botão
// «Renovar» mostra. Vem da tabela PACOTES, a mesma da compra: o ecrã nunca
// mostra um preço que a compra não cobre.
export async function planoDe(userId) {
  const [u, gratuito, inicio, entrada] = await Promise.all([
    one(`SELECT dias_saldo, vehicle_type, is_admin FROM users WHERE id = $1`, [userId]),
    emPeriodoGratuito(),
    inicioDaCobranca(),
    podeEntrarAoServico(userId),
  ]);
  const ultimo = await one(
    `SELECT created_at,
            TO_CHAR((created_at AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') AS dia
       FROM carregamentos WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  const usados = ultimo
    ? (
        await one(
          `SELECT COUNT(*)::int AS n FROM dias_contados
            WHERE user_id = $1 AND NOT gratuito AND created_at >= $2`,
          [userId, ultimo.created_at]
        )
      ).n
    : 0;
  const saldo = u?.dias_saldo ?? 0;
  // Com o desconto, se houver: o «Renovar por US$…» diz o preço que se paga.
  const { pacotes, desconto } = await pacotesDe(userId, u?.vehicle_type);
  return {
    desconto,
    dias: saldo,
    total: saldo + usados,
    // O dia do último carregamento — o «Ativado em» do cartão (05/10/2026).
    // Uma data de INÍCIO e nunca de fim: o fim é gastar os dias.
    ativadoEm: ultimo?.dia || null,
    gratuito,
    gratuitoAte: ultimoDiaGratuito(inicio),
    comprasAbertas: await comprasAbertas(u),
    // Já trabalhou hoje com o último dia: pode continuar até à meia-noite.
    hojePago: entrada.motivo === 'dia_ja_pago',
    podeTrabalhar: entrada.pode,
    pacote: pacotes.find((p) => p.dias === 30) || pacotes[pacotes.length - 1],
  };
}

// ═══ PEDIDOS DE CARREGAMENTO, PAGAMENTOS E DEVOLUÇÕES (14/09/26) ════════
//
// A política, decidida pelo Simão a 14/09/2026 e escrita nos termos do
// motorista (cláusula "Assinatura da Plataforma"):
//
//   · as compras abrem quando o fim do período gratuito é anunciado — pelo
//     menos 30 dias antes da cobrança (28/09/2026; antes era 1/4/2027) —, e
//     o administrador pode experimentar antes;
//   · o motorista paga sozinho (QR, transferência, Mosan, agente) e manda o
//     COMPROVATIVO, que é obrigatório. No escritório não há pedido: paga-se
//     ao balcão e o administrador carrega logo, pela rota de sempre;
//   · a referência é PESSOAL e fixa (TR0042): o motorista escreve sempre a
//     mesma, e é por ela e pelo valor que o pagamento se encontra no extracto;
//   · confirma-se na app do administrador, em 24 horas. O comprovativo, por
//     si só, não basta — fabrica-se em segundos;
//   · as devoluções ficam registadas e o valor calcula-se aqui.

export const PRAZO_HORAS = 24;

// As formas em que o motorista paga sozinho e manda comprovativo.
export const FORMAS_COM_PEDIDO = FORMAS_PAGAMENTO.filter((f) => f !== 'escritorio');

export const MOTIVOS_DEVOLUCAO = ['encerramento', 'desativacao', 'fim_servico'];

const MAX_BYTES = 4 * 1024 * 1024;
// Só fotografias: o telemóvel escolhe imagens, e é na app que se confere.
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Um erro com o estado HTTP que a rota deve devolver. O tratador geral do
// servidor transforma tudo em 500; estas são respostas de política, não
// avarias, e o motorista tem de ler o motivo.
function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

// TR + o número da conta com quatro algarismos. Curto de propósito: tem de
// caber no campo "descrição" de qualquer app de banco, e sem hífen, que há
// bancos que o recusam.
export function referenciaDe(userId) {
  return 'TR' + String(userId).padStart(4, '0');
}

// Abertas a partir do anúncio do fim do período gratuito: quem quiser pode
// comprar dias antes de a cobrança começar, e não fica parado no primeiro dia.
async function comprasAbertas(u) {
  if (u?.is_admin) return true;
  return !!(await inicioDaCobranca());
}

// As formas de pagamento, com o que o administrador escreveu no painel:
// ligada ou não, e as instruções (conta, titular, morada). Guardadas em
// config_servico, como os preços do Carry — mudam sem publicar nada.
export async function formasConfiguradas() {
  const [r, qr] = await Promise.all([
    one(`SELECT valor FROM config_servico WHERE chave = 'assinatura.formas'`),
    temImagemQr(),
  ]);
  const v = r?.valor || {};
  return FORMAS_PAGAMENTO.map((id) => ({
    id,
    ativo: !!v[id]?.ativo,
    instrucoes: v[id]?.instrucoes || '',
    comPedido: FORMAS_COM_PEDIDO.includes(id),
    // Só o QR tem imagem; as outras formas vão sem o campo.
    ...(id === 'tuqr' ? { temQr: qr } : {}),
  }));
}

export async function gravarFormas(lista, porId) {
  const valor = {};
  const temQr = await temImagemQr();
  for (const f of Array.isArray(lista) ? lista : []) {
    if (!FORMAS_PAGAMENTO.includes(f?.id)) continue;
    const instrucoes = String(f.instrucoes || '')
      .trim()
      .slice(0, 300);
    // Ligada sem instruções mandava o motorista pagar sem lhe dizer onde.
    if (f.ativo && !instrucoes) {
      throw erro('Escreva as instruções (conta, titular ou morada) antes de ligar esta forma.');
    }
    // O QR ligado sem imagem mandava pagar por um código que não aparece.
    if (f.id === 'tuqr' && f.ativo && !temQr) {
      throw erro('Carregue a imagem do QR antes de ligar esta forma.');
    }
    valor[f.id] = { ativo: !!f.ativo, instrucoes };
  }
  await query(
    `INSERT INTO config_servico (chave, valor, atualizado_em, atualizado_por)
     VALUES ('assinatura.formas', $1::jsonb, NOW(), $2)
     ON CONFLICT (chave) DO UPDATE
       SET valor = EXCLUDED.valor, atualizado_em = NOW(), atualizado_por = EXCLUDED.atualizado_por`,
    [JSON.stringify(valor), porId || null]
  );
}

// O PREÇO VEM DAQUI, nunca do telemóvel: o pedido diz quantos dias, e o
// valor sai da tabela de pacotes do tipo de veículo da conta.
export async function criarPedido({ userId, dias, metodo, mime, base64 }) {
  const u = await one(`SELECT id, name, role, vehicle_type, is_admin FROM users WHERE id = $1`, [
    userId,
  ]);
  if (!u || u.role !== 'driver') throw erro('Só uma conta de motorista pode carregar dias.', 403);
  if (!(await comprasAbertas(u))) {
    throw erro('Os carregamentos abrem quando for anunciado o fim do período gratuito.', 403);
  }
  // Com o desconto de quem ganhou pouco, se o houver (05/10/2026).
  const pacote = (await pacotesDe(userId, u.vehicle_type)).pacotes.find(
    (p) => p.dias === Number(dias)
  );
  if (!pacote) throw erro('Pacote inválido.');
  if (!FORMAS_COM_PEDIDO.includes(metodo)) throw erro('Forma de pagamento inválida.');
  const forma = (await formasConfiguradas()).find((f) => f.id === metodo);
  if (!forma?.ativo) throw erro('Esta forma de pagamento não está disponível.');
  if (!MIMES.includes(mime))
    throw erro('Formato não aceite. Envie uma fotografia do comprovativo.');
  const bytes = Buffer.from(String(base64 || ''), 'base64');
  if (!bytes.length) throw erro('Falta o comprovativo do pagamento.');
  if (bytes.length > MAX_BYTES) throw erro('Comprovativo demasiado grande (máximo 4 MB).');

  try {
    const p = await one(
      `INSERT INTO pedidos_carregamento
         (user_id, dias, valor_usd, metodo, referencia, comprovativo_mime, comprovativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, dias, valor_usd, referencia`,
      [userId, pacote.dias, pacote.usd, metodo, referenciaDe(userId), mime, bytes]
    );
    return { ...p, nome: u.name };
  } catch (e) {
    // O índice único parcial: já há um pedido à espera.
    if (e.code === '23505') throw erro('Já tem um pedido à espera de confirmação.', 409);
    throw e;
  }
}

export async function cancelarPedido({ id, userId }) {
  const r = await one(
    `UPDATE pedidos_carregamento SET estado = 'cancelado', decidido_em = NOW()
      WHERE id = $1 AND user_id = $2 AND estado = 'pendente'
      RETURNING id`,
    [id, userId]
  );
  if (!r) throw erro('Este pedido já não está à espera.', 409);
  return r;
}

// Confirmar: o carregamento e a decisão na MESMA transacção, com o pedido
// trancado. Dois administradores a confirmar ao mesmo tempo, ou dois toques
// no botão, dão um carregamento e não dois.
export async function confirmarPedido({ id, adminId }) {
  return tx(async (client) => {
    const { rows } = await client.query(
      `SELECT id, user_id, dias, valor_usd, metodo, referencia, estado
         FROM pedidos_carregamento WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const p = rows[0];
    if (!p) throw erro('Pedido não encontrado.', 404);
    if (p.estado !== 'pendente') throw erro('Este pedido já foi decidido.', 409);
    const { carregamentoId, saldo } = await carregarCom(client, {
      userId: p.user_id,
      dias: p.dias,
      valorUsd: p.valor_usd,
      metodo: p.metodo,
      referencia: p.referencia,
      adminId,
    });
    await client.query(
      `UPDATE pedidos_carregamento
          SET estado = 'confirmado', decidido_por = $2, decidido_em = NOW(), carregamento_id = $3
        WHERE id = $1`,
      [id, adminId, carregamentoId]
    );
    return { userId: p.user_id, dias: p.dias, saldo };
  });
}

// Recusar exige motivo: o motorista tem de saber o que corrigir.
export async function recusarPedido({ id, adminId, motivo }) {
  const m = String(motivo || '')
    .trim()
    .slice(0, 200);
  if (!m) throw erro('Indique o motivo: o motorista precisa de saber o que corrigir.');
  const r = await one(
    `UPDATE pedidos_carregamento
        SET estado = 'recusado', motivo = $3, decidido_por = $2, decidido_em = NOW()
      WHERE id = $1 AND estado = 'pendente'
      RETURNING user_id, dias`,
    [id, adminId, m]
  );
  if (!r) throw erro('Este pedido já não está à espera.', 409);
  return { userId: r.user_id, dias: r.dias, motivo: m };
}

function paraAdmin(p) {
  return {
    id: p.id,
    userId: p.user_id,
    nome: p.nome,
    telefone: p.telefone,
    tipo: p.vehicle_type,
    dias: p.dias,
    valorUsd: Number(p.valor_usd),
    metodo: p.metodo,
    referencia: p.referencia,
    temComprovativo: !!p.comprovativo_mime,
    estado: p.estado,
    motivo: p.motivo,
    quando: p.created_at,
    decididoEm: p.decidido_em,
    decididoPor: p.decidido_por_nome,
    horas: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 3600000),
  };
}

// Os por confirmar, os mais antigos primeiro (o prazo corre para eles), e
// os últimos vinte decididos, para se ver o que já foi feito.
export async function pedidosParaAdmin() {
  const [pendentes, decididos] = await Promise.all([
    query(
      `SELECT p.id, p.user_id, u.name AS nome, u.phone AS telefone, u.vehicle_type, p.dias,
              p.valor_usd, p.metodo, p.referencia, p.comprovativo_mime, p.estado, p.motivo,
              p.created_at, p.decidido_em, NULL AS decidido_por_nome
         FROM pedidos_carregamento p JOIN users u ON u.id = p.user_id
        WHERE p.estado = 'pendente'
        ORDER BY p.created_at ASC LIMIT 100`
    ),
    query(
      `SELECT p.id, p.user_id, u.name AS nome, u.phone AS telefone, u.vehicle_type, p.dias,
              p.valor_usd, p.metodo, p.referencia, p.comprovativo_mime, p.estado, p.motivo,
              p.created_at, p.decidido_em, a.name AS decidido_por_nome
         FROM pedidos_carregamento p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN users a ON a.id = p.decidido_por
        WHERE p.estado <> 'pendente'
        ORDER BY p.decidido_em DESC NULLS LAST, p.id DESC LIMIT 20`
    ),
  ]);
  return { pendentes: pendentes.map(paraAdmin), decididos: decididos.map(paraAdmin) };
}

export function comprovativoDe(id) {
  return one(
    `SELECT user_id, comprovativo_mime AS mime, comprovativo AS bytes
       FROM pedidos_carregamento WHERE id = $1`,
    [id]
  );
}

// QUANTO SE DEVOLVE. Os termos: "ao preço por dia que efetivamente pagou por
// eles (consideram-se usados primeiro os dias comprados há mais tempo)".
//
// Se os mais antigos se gastam primeiro, os que sobram são os MAIS RECENTES.
// Por isso anda-se dos carregamentos mais novos para trás até perfazer o
// saldo — sem ter de reconstituir quais dias gastaram quais pacotes. Dias
// sem preço (oferecidos, ou acertos antigos sem carregamento) contam a zero:
// os termos dizem que não dão direito a devolução.
export async function calcularDevolucao(userId, client = null) {
  const q = client ? async (s, p) => (await client.query(s, p)).rows : query;
  const [u] = await q(`SELECT dias_saldo FROM users WHERE id = $1`, [userId]);
  const saldo = u?.dias_saldo ?? 0;
  const lotes = await q(
    `SELECT dias, valor_usd, TO_CHAR(created_at AT TIME ZONE 'Asia/Dili', 'YYYY-MM-DD') AS quando
       FROM carregamentos WHERE user_id = $1
      ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  let falta = saldo;
  let centimos = 0;
  let oferecidos = 0;
  const partes = [];
  for (const l of lotes) {
    if (falta <= 0) break;
    const d = Math.min(l.dias, falta);
    const porDia = Number(l.valor_usd) > 0 ? Number(l.valor_usd) / l.dias : 0;
    const valor = Math.round(d * porDia * 100);
    if (!porDia) oferecidos += d;
    partes.push({
      quando: l.quando,
      dias: d,
      porDia: Math.round(porDia * 100) / 100,
      valor: valor / 100,
    });
    centimos += valor;
    falta -= d;
  }
  if (falta > 0) {
    oferecidos += falta;
    partes.push({ quando: null, dias: falta, porDia: 0, valor: 0 });
  }
  return { dias: saldo, valorUsd: centimos / 100, oferecidos, partes };
}

// Registar a devolução tira os dias do saldo. O dinheiro sai por fora — isto
// é o registo de quanto, a quem e porquê, para os dois lados poderem provar.
// Na desactivação por falta grave não se regista: os termos excluem-na.
export async function registarDevolucao({ userId, motivo, adminId }) {
  if (!MOTIVOS_DEVOLUCAO.includes(motivo)) throw erro('Motivo de devolução inválido.');
  return tx(async (client) => {
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const c = await calcularDevolucao(userId, client);
    if (!c.dias) throw erro('Esta conta não tem dias por usar.');
    const { rows } = await client.query(
      `INSERT INTO devolucoes (user_id, dias, valor_usd, motivo, admin_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, c.dias, c.valorUsd, motivo, adminId]
    );
    await client.query(`UPDATE users SET dias_saldo = 0 WHERE id = $1`, [userId]);
    return { ...c, id: rows[0].id };
  });
}

// ── A IMAGEM DO QR TUQR (15/09/26) ───────────────────────────────────────
//
// A que o banco dá à Timorgiana. Guarda-se como o administrador a mandar —
// sem reduzir nem comprimir: um QR que perde nitidez deixa de se ler.
const MIMES_QR = ['image/jpeg', 'image/png', 'image/webp'];

async function temImagemQr() {
  const r = await one(`SELECT 1 AS tem FROM imagens_servico WHERE chave = 'assinatura.qr'`);
  return !!r;
}

export async function gravarQr({ mime, base64, porId }) {
  if (!MIMES_QR.includes(mime)) {
    throw erro('Formato não aceite. Envie a imagem do QR (JPEG, PNG ou WebP).');
  }
  const bytes = Buffer.from(String(base64 || ''), 'base64');
  if (!bytes.length) throw erro('Falta a imagem.');
  if (bytes.length > 2 * 1024 * 1024) throw erro('Imagem demasiado grande (máximo 2 MB).');
  await query(
    `INSERT INTO imagens_servico (chave, mime, bytes, atualizado_por)
     VALUES ('assinatura.qr', $1, $2, $3)
     ON CONFLICT (chave) DO UPDATE
       SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes,
           atualizado_em = NOW(), atualizado_por = EXCLUDED.atualizado_por`,
    [mime, bytes, porId || null]
  );
}

export function qrDoPagamento() {
  return one(
    `SELECT mime, bytes, atualizado_em FROM imagens_servico WHERE chave = 'assinatura.qr'`
  );
}

// Retirar a imagem com o QR ligado deixava os motoristas sem o que ler.
export async function apagarQr() {
  const tuqr = (await formasConfiguradas()).find((f) => f.id === 'tuqr');
  if (tuqr?.ativo) throw erro('Desligue o pagamento por QR antes de retirar a imagem.');
  await query(`DELETE FROM imagens_servico WHERE chave = 'assinatura.qr'`);
}
