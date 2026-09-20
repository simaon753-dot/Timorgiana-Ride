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

// A LISTA POR LINHAS (21/09/2026), depois da primeira encomenda a sério.
//
// Um parágrafo escrito à pressa — «2 kg de arroz e óleo» — obriga o motorista
// a decidir dentro da loja coisas que não são dele: que marca, que tamanho,
// quantos. O que ele decide mal é dinheiro que adiantou, e uma discussão à
// porta do carro no fim.
//
// Cada artigo passa a ter QUANTOS e O QUÊ, e um detalhe opcional para a marca
// ou o tamanho. Os limites são baixos de propósito: uma encomenda não é uma
// mudança de casa, e uma lista de trinta linhas faz-se com um Pickup.
export const MAX_ITENS = 15;
export const MAX_NOME_ITEM = 60;
export const MAX_DETALHE_ITEM = 60;
export const MAX_LOJA = 80;

// Devolve `{ erro }` ou `{ itens, texto }` — o texto é a mesma lista escrita
// de seguida, que é o que `jastip_lista` guarda e o que as viagens antigas já
// têm. Uma só fonte: nenhum ecrã volta a montar esta frase à sua maneira.
export function validarItens(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw erro('Escreve o que queres que o motorista compre.');
  }
  if (lista.length > MAX_ITENS) throw erro(`Uma encomenda leva até ${MAX_ITENS} artigos.`);

  const itens = [];
  for (const cru of lista) {
    const nome = String(cru?.nome || '').trim();
    if (!nome) throw erro('Há um artigo sem nome na lista.');
    if (nome.length > MAX_NOME_ITEM) throw erro('O nome de um artigo é demasiado longo.');

    const quantos = Math.round(Number(cru?.quantos));
    if (!Number.isFinite(quantos) || quantos < 1 || quantos > 99) {
      throw erro('A quantidade de cada artigo vai de 1 a 99.');
    }
    const detalhe = String(cru?.detalhe || '')
      .trim()
      .slice(0, MAX_DETALHE_ITEM);
    itens.push({ nome, quantos, ...(detalhe ? { detalhe } : {}) });
  }
  return { itens, texto: itens.map(linhaDoItem).join('\n').slice(0, MAX_LISTA) };
}

// «2 × Arroz (Bola Mas, 5 kg)» — a mesma linha na app, na notificação e no
// painel.
export function linhaDoItem(i) {
  return `${i.quantos} × ${i.nome}${i.detalhe ? ` (${i.detalhe})` : ''}`;
}

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

// AS PORTAS DA ENCOMENDA, todas no mesmo sítio e todas a LANÇAR o recado.
//
// Antes devolvia a frase e a rota respondia com ela. Parecia mais simples e
// tinha um custo escondido: o verificador das mensagens só encontra os textos
// escritos dentro de `erro(...)`, de `new Error(...)` ou de um `error:`, e
// estas frases passavam-lhe ao lado — saíam em português a quem tem a app em
// tétum, sem ninguém dar por isso. Lançar põe cada frase onde o verificador a
// vê e obriga a traduzi-la.
export async function exigirQuePode({ user, itens, loja, tetoUsd }) {
  const validos = validarItens(itens);

  // A LOJA POR NOME, e não só o ponto no mapa. Um ponto diz onde é; o nome diz
  // qual é — e num mercado de Díli são coisas muito diferentes.
  if (!String(loja || '').trim()) throw erro('Escreve em que loja se compra.');
  if (String(loja).length > MAX_LOJA) throw erro('O nome da loja é demasiado longo.');

  // A CONTA DE QUEM PEDE. Quem adianta o dinheiro é o motorista, e o email
  // confirmado é hoje a única marca que não se apaga ao desinstalar a app: o
  // número repete-se num cartão novo e o nome escreve-se como se quiser.
  if (config.jastip.exigeEmailConfirmado && !user?.email_confirmado) {
    throw erro('Confirma o teu email no perfil antes de encomendar.');
  }

  const teto = Number(tetoUsd);
  if (!Number.isFinite(teto) || teto <= 0) throw erro('Indica até quanto se pode gastar.');
  if (teto > config.jastip.tetoUsd) {
    throw erro(`O máximo que se pode adiantar é ${dolares(config.jastip.tetoUsd)}.`);
  }

  const feitas = await viagensDoPassageiro(user?.id);
  if (feitas < config.jastip.viagensMinimas) {
    throw erro(
      `Esta encomenda pede ${config.jastip.viagensMinimas} viagens concluídas na tua conta. Já tens ${feitas}.`
    );
  }

  // UMA DE CADA VEZ. Cada encomenda é dinheiro de um motorista na rua; três
  // pedidas ao mesmo tempo são três motoristas a arriscar pela mesma pessoa
  // antes de ela ter pago a primeira.
  if (await jaTemEncomendaAberta(user?.id)) {
    throw erro('Já tens uma encomenda a decorrer.', 409);
  }
  return validos;
}

// Um recado com estado, para a rota responder com ele. Escrito com `erro(...)`
// porque é assim que o verificador das mensagens encontra as frases que
// precisam de tétum e inglês.
function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
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
    // As viagens pedidas antes de 21/09/2026 não têm itens; a app e o painel
    // mostram-lhes o texto, que é tudo o que delas se sabe.
    itens: Array.isArray(row.jastip_itens) ? row.jastip_itens : null,
    loja: row.jastip_loja || null,
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
