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

// Rota pelas estradas reais. O cálculo é feito AQUI, no servidor, e não na
// app: se o preço é firme, a distância que o determina não pode vir de um
// telemóvel — bastaria alterá-la para pagar sempre o mínimo.
//
// Se o OSRM não responder, cai para linha reta com um factor de 1,4, que
// aproxima o desvio típico das estradas. Melhor um preço aproximado do que
// nenhum preço.
export async function rota(origem, destino) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=false`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await r.json();
    const rt = j?.routes?.[0];
    if (!rt) throw new Error('sem rota');
    const km = Math.round((rt.distance / 1000) * 10) / 10;
    return { km, min: duracaoRealista(km, rt.duration / 60), aproximado: false };
  } catch {
    const km = Math.round(straightKm(origem, destino) * 1.4 * 10) / 10;
    return { km, min: duracaoRealista(km, null), aproximado: true };
  }
}

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
export function preco(vehicleType, km, min = null) {
  const t = config.tarifas[vehicleType] || config.tarifas.car;
  const minutos = Number.isFinite(Number(min)) && Number(min) > 0 ? Number(min) : estimarMin(km);
  const distancia = Math.max(0, Number(km) || 0);
  const bruto = t.base + t.porKm * distancia + (t.porMinuto || 0) * minutos;
  // ARREDONDA PARA BAIXO, a meio dólar.
  //
  // Para baixo e não ao mais próximo, e isso é de propósito: arredondar ao
  // mais próximo pode subir o preço, e o objectivo declarado é estar abaixo
  // da concorrência. Um arredondamento que às vezes trabalha contra a
  // decisão não é um arredondamento, é uma fuga.
  //
  // A meio dólar porque foi o que o Simão pediu: valores pares, e ímpares só
  // com o cinco. Assim os cêntimos são sempre 00 ou 50 — e num sistema a
  // dinheiro isso é uma nota ou uma moeda, não um troco a contar.
  return Math.max(t.minimo, Math.floor(bruto * 2) / 2);
}

function estimarMin(km) {
  const VELOCIDADE_KMH = 20;
  return Math.max(1, Math.round((Number(km) || 0) / VELOCIDADE_KMH * 60));
}

// Tempo até o motorista chegar ao passageiro. Velocidade média baixa de
// propósito: Díli tem trânsito, e uma estimativa optimista que falha é
// pior do que uma conservadora que se cumpre.
export function etaMinutos(km) {
  const VELOCIDADE_KMH = 20;
  return Math.max(1, Math.round((km * 1.4) / VELOCIDADE_KMH * 60));
}
