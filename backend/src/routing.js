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
export function preco(vehicleType, km) {
  const t = config.tarifas[vehicleType] || config.tarifas.car;
  return Math.max(t.min, Math.round((t.base + t.perKm * km) * 4) / 4);
}

// Tempo até o motorista chegar ao passageiro. Velocidade média baixa de
// propósito: Díli tem trânsito, e uma estimativa optimista que falha é
// pior do que uma conservadora que se cumpre.
export function etaMinutos(km) {
  const VELOCIDADE_KMH = 20;
  return Math.max(1, Math.round((km * 1.4) / VELOCIDADE_KMH * 60));
}
