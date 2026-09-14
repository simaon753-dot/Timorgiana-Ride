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
  // Carry: iguais aos do carro por agora. Um veículo de carga trabalha menos
  // viagens por dia do que um táxi, e talvez isto deva ser mais barato — mas
  // isso decide-se com viagens feitas, não antes da primeira.
  carry: [
    { dias: 3, usd: 4 },
    { dias: 10, usd: 12 },
    { dias: 30, usd: 30 },
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
  const [gratuito, abertas, formas, pedidos, devolucoes] = await Promise.all([
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
  ]);

  return {
    dias: u?.dias_saldo ?? 0,
    gratuito,
    gratuitoAte: GRATUITO_ATE,
    pacotes: PACOTES[u?.vehicle_type] || PACOTES.car,
    // Fica para as versões da app anteriores aos pedidos (14/09/26).
    formasPagamento: FORMAS_PAGAMENTO,
    diasContados: dias,
    carregamentos: carregamentos.map((c) => ({ ...c, valor_usd: Number(c.valor_usd) })),
    referencia: referenciaDe(userId),
    comprasAbertas: abertas,
    comprasAbremEm: COMPRAS_ABREM,
    prazoHoras: PRAZO_HORAS,
    // Só as formas que o administrador ligou, com as instruções que escreveu
    // (número de conta, titular, morada do escritório).
    formas: formas
      .filter((f) => f.ativo)
      .map(({ id, instrucoes }) => ({ id, instrucoes, comPedido: FORMAS_COM_PEDIDO.includes(id) })),
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
  const gratuito = await emPeriodoGratuito();
  const u = await one(`SELECT dias_saldo FROM users WHERE id = $1`, [userId]);
  return { dias: u?.dias_saldo ?? 0, gratuito, gratuitoAte: GRATUITO_ATE };
}

// ═══ PEDIDOS DE CARREGAMENTO, PAGAMENTOS E DEVOLUÇÕES (14/09/26) ════════
//
// A política, decidida pelo Simão a 14/09/2026 e escrita nos termos do
// motorista (cláusula "Assinatura da Plataforma"):
//
//   · as compras abrem a 1 de Abril de 2027, um mês antes da cobrança — o
//     administrador pode experimentar antes;
//   · o motorista paga sozinho (QR, transferência, Mosan, agente) e manda o
//     COMPROVATIVO, que é obrigatório. No escritório não há pedido: paga-se
//     ao balcão e o administrador carrega logo, pela rota de sempre;
//   · a referência é PESSOAL e fixa (TR0042): o motorista escreve sempre a
//     mesma, e é por ela e pelo valor que o pagamento se encontra no extracto;
//   · confirma-se na app do administrador, em 24 horas. O comprovativo, por
//     si só, não basta — fabrica-se em segundos;
//   · as devoluções ficam registadas e o valor calcula-se aqui.

export const COMPRAS_ABREM = '2027-04-01';
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

async function comprasAbertas(u) {
  if (u?.is_admin) return true;
  const r = await one(`SELECT ${DIA_DILI} >= $1::date AS abertas`, [COMPRAS_ABREM]);
  return !!r?.abertas;
}

// As formas de pagamento, com o que o administrador escreveu no painel:
// ligada ou não, e as instruções (conta, titular, morada). Guardadas em
// config_servico, como os preços do Carry — mudam sem publicar nada.
export async function formasConfiguradas() {
  const r = await one(`SELECT valor FROM config_servico WHERE chave = 'assinatura.formas'`);
  const v = r?.valor || {};
  return FORMAS_PAGAMENTO.map((id) => ({
    id,
    ativo: !!v[id]?.ativo,
    instrucoes: v[id]?.instrucoes || '',
    comPedido: FORMAS_COM_PEDIDO.includes(id),
  }));
}

export async function gravarFormas(lista, porId) {
  const valor = {};
  for (const f of Array.isArray(lista) ? lista : []) {
    if (!FORMAS_PAGAMENTO.includes(f?.id)) continue;
    const instrucoes = String(f.instrucoes || '')
      .trim()
      .slice(0, 300);
    // Ligada sem instruções mandava o motorista pagar sem lhe dizer onde.
    if (f.ativo && !instrucoes) {
      throw erro('Escreva as instruções (conta, titular ou morada) antes de ligar esta forma.');
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
    throw erro('Os carregamentos abrem a 1 de Abril de 2027.', 403);
  }
  const pacote = (PACOTES[u.vehicle_type] || PACOTES.car).find((p) => p.dias === Number(dias));
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
