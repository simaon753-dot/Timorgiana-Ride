import { config } from './config.js';

// Distância em linha reta (Haversine), em km
export function straightKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// A ROTA VIVE NO `rotas.js`, E SÓ LÁ (23/09/2026).
//
// Havia aqui um `rota()` que perguntava ao OSRM público com o perfil de
// automóvel, marcado como «mantida para quem já a chamava». Quem a chamava
// era o sítio onde a viagem NASCE — ou seja, era ela que decidia o preço
// cobrado, enquanto o preço MOSTRADO já vinha do Google com o modo do
// veículo. Dois motores a responder à mesma pergunta, e o mais antigo a
// ganhar exactamente onde doía.
//
// Foi apagada, e não corrigida. Uma função que já ninguém devia chamar, mas
// que continua a funcionar, é um convite a ser chamada outra vez — foi assim
// que esteve em produção sem ninguém notar. O que resta abaixo é só o que
// serve a todos: a distância em linha recta, a duração realista e o preço.

// O OSRM devolve o tempo com as estradas livres — para 1,7 km em Díli dava
// 2 minutos, ou seja 51 km/h, o que não acontece em hora nenhuma do dia.
// Tomamos o maior entre o que o OSRM diz e o que uma velocidade real de
// cidade dá. Uma estimativa optimista que falha faz o passageiro pensar que
// o motorista se atrasou; uma conservadora que se cumpre não incomoda
// ninguém.
export function duracaoRealista(km, minutosOsrm) {
  const VELOCIDADE_CIDADE_KMH = 22;
  const porVelocidade = (km / VELOCIDADE_CIDADE_KMH) * 60;
  return Math.max(1, Math.round(Math.max(porVelocidade, minutosOsrm || 0)));
}

// Preço final, arredondado a 0,25 USD
// PAGA-SE O TEMPO ESPERADO, não o cronometrado.
//
// O `min` vem da rota e já traz o trânsito de Díli dentro (ver
// `duracaoRealista`). Podia-se cronometrar a viagem e acertar no fim — mas
// isso tira a certeza do preço antes de entrar no carro, que num sistema a
// dinheiro é o que faz as pessoas confiarem. Uma viagem que se ESPERA que
// demore 45 minutos paga mais do que uma de 27; se depois demorar 50, o
// preço combinado mantém-se.
//
// Sem tempo conhecido, estima-se dos quilómetros pela mesma velocidade que o
// resto da app assume. É melhor do que cobrar zero pela parcela e melhor do
// que recusar dar preço.
export function preco(vehicleType, km, min = null, pessoas = null, carga = null) {
  const t = config.tarifas[vehicleType] || config.tarifas.car;
  const minutos = Number.isFinite(Number(min)) && Number(min) > 0 ? Number(min) : estimarMin(km);
  const distancia = Math.max(0, Number(km) || 0);

  // O QUILÓMETRO MUDA A PARTIR DE CINCO PESSOAS. Ver a nota em config.js.
  //
  // Só no carro: numa motorizada vai sempre uma pessoa, e um `pessoas` de
  // cinco chegado aqui com `motorbike` seria um pedido mal formado — a
  // ausência de `porKmGrande` nessa tarifa faz a conta ignorá-lo sozinha.
  const muitos =
    t.lugaresGrande != null && Number(pessoas) >= t.lugaresGrande && t.porKmGrande != null;
  const porKm = muitos ? t.porKmGrande : t.porKm;

  // O VOLUME MULTIPLICA A DISTÂNCIA, A AJUDA SOMA UM VALOR FIXO.
  //
  // Carga maior é mais peso em cada quilómetro, por isso entra no que cresce
  // com a viagem. Ajudar a carregar é tempo parado à porta — custa o mesmo
  // numa viagem de um quilómetro e numa de vinte —, por isso entra depois,
  // como parcela fixa.
  //
  // Se fosse ao contrário, a mesma cadeira levada ao fim da rua custava
  // cêntimos de mão-de-obra e levada a Baucau custava dez dólares, pelo mesmo
  // esforço feito à mesma porta.
  //
  // Sem carga, os dois valem o neutro: 1 e 0. Uma viagem de pessoas passa por
  // aqui sem mudar de preço.
  const fVolume = (t.volume && carga && t.volume[carga.volume]) || 1;
  const extraAjuda = (t.ajuda && carga && t.ajuda[carga.ajuda]) || 0;

  // A TAXA POR PARAGEM (14/09/26), configurável no painel. Soma, como a
  // ajuda: parar numa loja pelo caminho custa o mesmo tempo seja ela onde for.
  // Os quilómetros do desvio já estão na distância; isto é o tempo parado.
  const extraParagens = (t.porParagem || 0) * (Number(carga?.paragens) || 0);

  const bruto =
    t.base +
    porKm * distancia * fVolume +
    (t.porMinuto || 0) * minutos +
    extraAjuda +
    extraParagens;
  // O MÍNIMO DO CARRY COM PESSOAS. Só chega aqui um `pessoas` num Carry
  // quando o pedido é de pessoas — a rota só o passa nesse modo, porque a
  // cotação manda sempre um número de pessoas (o ecrã começa em 1) e, lido
  // sem o modo, um Carry de bens passaria a custar $5 sem ninguém perceber.
  const minimo = t.minimoPessoas != null && Number(pessoas) > 0 ? t.minimoPessoas : t.minimo;
  return Math.max(minimo, aoCentimoPermitido(bruto));
}

// OS CÊNTIMOS QUE O SIMÃO ACEITA, e mais nenhum.
//
// Ele deu a lista: 00, 25, 35, 45, 55, 65, 75, 85, 95. O 50 não vinha lá,
// mas o preço que pediu a seguir foi $8,50 — e meio dólar é uma moeda que
// existe, por isso incluí-o. Se estiver errado, tira-se daqui e mais nada
// muda.
//
// É uma lista e não uma regra aritmética porque nenhuma regra simples a
// descreve: não são múltiplos de cinco (falta o 05 e o 15), nem quartos de
// dólar. É o que se paga sem contar troco em Díli, e isso sabe-se andando
// na rua, não deduzindo.
const CENTIMOS_PERMITIDOS = [0, 25, 35, 45, 50, 55, 65, 75, 85, 95];

// SEMPRE PARA BAIXO, nunca ao mais próximo.
//
// Ao mais próximo, o arredondamento podia SUBIR o preço — e o objectivo
// declarado é estar abaixo da concorrência. Um arredondamento que às vezes
// trabalha contra a decisão não é um arredondamento, é uma fuga.
//
// Contas em cêntimos inteiros, e não em dólares com vírgula: 8.51 - 8 dá
// 0.5099999999999998 em vírgula flutuante, e uma comparação com 51 falharia
// de vez em quando sem ninguém perceber porquê.
function aoCentimoPermitido(valor) {
  const total = Math.round(Math.max(0, valor) * 100);
  const dolares = Math.floor(total / 100);
  const centimos = total % 100;
  let escolhido = 0;
  for (const c of CENTIMOS_PERMITIDOS) if (c <= centimos) escolhido = c;
  return dolares + escolhido / 100;
}

function estimarMin(km) {
  const VELOCIDADE_KMH = 20;
  return Math.max(1, Math.round(((Number(km) || 0) / VELOCIDADE_KMH) * 60));
}

// Tempo até o motorista chegar ao passageiro. Velocidade média baixa de
// propósito: Díli tem trânsito, e uma estimativa optimista que falha é
// pior do que uma conservadora que se cumpre.
export function etaMinutos(km) {
  const VELOCIDADE_KMH = 20;
  return Math.max(1, Math.round(((km * 1.4) / VELOCIDADE_KMH) * 60));
}
