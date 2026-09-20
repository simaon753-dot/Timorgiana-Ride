import { config } from './config.js';
import { one, query } from './db.js';

// JASTIP — comprar por encomenda (20/09/2026).
//
// O passageiro pede a alguém que COMPRE uma coisa e lha entregue. O motorista
// paga do bolso dele na loja e recebe, à entrega, o que gastou mais um valor
// pelo serviço.
//
// A DIFERENÇA PARA O PICKUP, e é ela que explica todas as regras deste
// ficheiro: no Pickup o motorista transporta bens que JÁ SÃO do passageiro. No
// jastip, o dinheiro sai do bolso do motorista antes de existir qualquer
// garantia. Não há carteira na app — tudo é em dinheiro —, portanto não se
// pode reter nada. O que se pode fazer é reduzir o tamanho da perda possível:
//
//   1. UM TETO ao que se adianta (US$25, decisão do Simão a 20/09/2026).
//   2. A PROVA: a fotografia do talão fica com a viagem, e vê-se no painel.
//   3. A REPUTAÇÃO: só pede quem já fez viagens. Quem cria uma conta para isto
//      é exactamente quem um motorista tem razões para temer.
//
// O que o passageiro paga são DUAS coisas separadas, e a app di-lo assim: a
// VIAGEM (com a taxa do serviço, calculada aqui) e as COMPRAS (o valor do
// talão, que só se sabe depois de comprar). Somá-las numa só antes da compra
// seria prometer um número que ninguém conhece.

export const MAX_LISTA = 500;

// Quanto se cobra pelo trabalho de comprar, por escalão de valor.
//
// ESCALÕES E NÃO PERCENTAGEM. Uma percentagem obriga a saber o valor antes de
// comprar, e ninguém o sabe: a lista é "2 kg de arroz e óleo", não uma factura.
// Um escalão diz-se em voz alta à porta de um carro — que é como isto se
// explica a um motorista — e o passageiro sabe o que paga quando pede.
//
// A taxa cresce com o valor porque o que cresce é o RISCO de quem adianta.
export function taxaDe(valorUsd) {
  const escaloes = config.jastip.escaloes;
  const v = Math.max(0, Number(valorUsd) || 0);
  const escalao = escaloes.find((e) => v <= e.ate) || escaloes[escaloes.length - 1];
  return escalao.taxa;
}

// A taxa cobrada de facto: pelo valor comprado, e NUNCA mais do que a que o
// passageiro viu quando pediu.
//
// Se as compras ficarem por baixo do teto, ele paga o escalão mais barato —
// pagar mais do que o combinado por ter gasto menos seria um castigo absurdo.
// Se ficarem acima (o que só acontece com a autorização dele), o valor que se
// mostrou continua a valer: a app não cobra surpresas.
export function taxaCobrada(tetoUsd, valorUsd) {
  const prometida = taxaDe(tetoUsd);
  if (valorUsd == null) return prometida;
  return Math.min(prometida, taxaDe(valorUsd));
}

// Quantas viagens concluídas tem esta conta como passageiro.
//
// É a reputação de quem pede, não a de quem conduz: um motorista com cem
// viagens continua a ser um passageiro novo quando é ELE a encomendar.
export async function viagensDoPassageiro(userId) {
  const r = await one(
    `SELECT COUNT(*)::int AS n FROM rides WHERE passenger_id = $1 AND status = 'completed'`,
    [userId]
  );
  return r?.n ?? 0;
}

// O que impede este pedido de existir, em palavras que o passageiro possa ler.
// `null` quer dizer que pode avançar.
export async function porqueNaoPode({ userId, lista, tetoUsd }) {
  if (!String(lista || '').trim()) return 'Escreve o que queres que o motorista compre.';
  if (String(lista).length > MAX_LISTA) return 'A lista de compras é demasiado longa.';

  const teto = Number(tetoUsd);
  if (!Number.isFinite(teto) || teto <= 0) return 'Indica até quanto se pode gastar.';
  if (teto > config.jastip.tetoUsd) {
    return `O máximo que se pode adiantar é ${dolares(config.jastip.tetoUsd)}.`;
  }

  const feitas = await viagensDoPassageiro(userId);
  if (feitas < config.jastip.viagensMinimas) {
    return `Esta encomenda pede ${config.jastip.viagensMinimas} viagens concluídas na tua conta. Já tens ${feitas}.`;
  }
  return null;
}

const dolares = (v) => `$${Number(v).toFixed(2)}`;

// O motorista comprou: guarda o valor do talão e acerta a tarifa.
//
// A TARIFA MUDA AQUI, e é a única vez que isso acontece depois de um preço
// dado. O que muda é só a taxa do serviço, e só para BAIXO (ver `taxaCobrada`);
// a viagem em si mantém o preço que foi mostrado quando o passageiro pediu.
//
// Só o motorista da viagem, e só enquanto ela decorre: comprar depois de
// terminada não é comprar, é escrever no registo de uma coisa que acabou.
export async function marcarComprado(rideId, driverId, valorUsd) {
  const valor = Math.round(Number(valorUsd) * 100) / 100;
  if (!Number.isFinite(valor) || valor < 0) return { erro: 'Escreve quanto gastaste.' };

  const r = await one(
    `SELECT id, fare_usd, jastip_teto, jastip_taxa FROM rides
      WHERE id = $1 AND driver_id = $2 AND servico = 'jastip'
        AND status IN ('accepted', 'arriving', 'in_progress')`,
    [rideId, driverId]
  );
  if (!r) return { erro: 'Esta encomenda não se pode marcar como comprada agora.' };

  const teto = Number(r.jastip_teto);
  if (valor > teto) {
    return { erro: `O passageiro autorizou até ${dolares(teto)}. Fala com ele antes de gastar mais.` };
  }

  const taxaNova = taxaCobrada(teto, valor);
  const taxaAntiga = Number(r.jastip_taxa) || 0;
  const tarifa = Math.round((Number(r.fare_usd) - taxaAntiga + taxaNova) * 100) / 100;

  const linha = await one(
    `UPDATE rides
        SET jastip_valor = $2, jastip_taxa = $3, jastip_comprado_em = NOW(),
            fare_usd = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
    [rideId, valor, taxaNova, tarifa]
  );
  return linha ? { ok: true } : { erro: 'Esta encomenda não se pode marcar como comprada agora.' };
}

// O que a app mostra de uma encomenda. Fora daqui ninguém monta este objecto,
// para o passageiro e o motorista verem sempre as mesmas contas.
export function jastipPublico(row) {
  if (row.servico !== 'jastip') return null;
  const compras = row.jastip_valor == null ? null : Number(row.jastip_valor);
  return {
    lista: row.jastip_lista || '',
    teto: Number(row.jastip_teto),
    taxa: Number(row.jastip_taxa) || 0,
    compras,
    compradoEm: row.jastip_comprado_em || null,
    // O que se entrega em mão: a viagem (que já traz a taxa) mais o talão.
    total: compras == null ? null : Math.round((Number(row.fare_usd) + compras) * 100) / 100,
  };
}

// Quantas encomendas estão em curso para este passageiro.
//
// Uma de cada vez: cada encomenda é dinheiro de um motorista na rua, e três
// pedidas ao mesmo tempo são três motoristas a arriscar pela mesma pessoa
// antes de ela ter pago a primeira.
export async function jaTemEncomendaAberta(userId) {
  const r = await one(
    `SELECT 1 AS tem FROM rides
      WHERE passenger_id = $1 AND servico = 'jastip'
        AND status IN ('requested', 'accepted', 'arriving', 'in_progress')
      LIMIT 1`,
    [userId]
  );
  return !!r;
}

export async function contarEncomendas(userId) {
  const r = await query(
    `SELECT COUNT(*)::int AS n FROM rides WHERE passenger_id = $1 AND servico = 'jastip'`,
    [userId]
  );
  return r[0]?.n ?? 0;
}
