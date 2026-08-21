// Pesquisa e nomes de lugares, via OpenStreetMap (Nominatim).
//
// O Nominatim exige que cada aplicação se identifique e pede que não se
// façam mais de ~1 pedido por segundo. Por isso a pesquisa é adiada
// enquanto a pessoa escreve (ver useBuscaLugares) em vez de disparar a
// cada tecla.
const UA = 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)';
const BASE = 'https://nominatim.openstreetmap.org';

// Limites de Timor-Leste: evita devolver sítios com o mesmo nome noutros
// países, que seria pior do que não encontrar nada.
const TIMOR = { viewbox: '124.0,-10.0,127.4,-8.1', countrycodes: 'tl' };

function nomeCurto(display) {
  return display.split(',').slice(0, 2).join(',').trim();
}

export async function pesquisarLugares(termo, sinal) {
  const q = String(termo || '').trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '6',
    addressdetails: '0',
    countrycodes: TIMOR.countrycodes,
    viewbox: TIMOR.viewbox,
    bounded: '1',
  });

  try {
    const r = await fetch(`${BASE}/search?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: sinal,
    });
    if (!r.ok) return [];
    const rs = await r.json();
    return rs.map((x) => ({
      id: `${x.osm_type || 'x'}${x.osm_id || Math.random()}`,
      label: nomeCurto(x.display_name),
      detalhe: x.display_name.split(',').slice(2, 4).join(',').trim(),
      lat: Number(x.lat),
      lng: Number(x.lon),
    }));
  } catch {
    return []; // sem rede ou pesquisa cancelada
  }
}

export async function nomeDoLugar(lat, lng) {
  try {
    const r = await fetch(`${BASE}/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.display_name ? nomeCurto(j.display_name) : null;
  } catch {
    return null;
  }
}

export const rotuloCoordenadas = (lat, lng) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// Nome da RUA onde está um ponto. Usado para acompanhar o veículo em
// movimento: o que interessa a quem vai no carro — e a quem quer avisar
// alguém — é "estou na Avenida de Portugal", não uma coordenada.
//
// zoom=17 e addressdetails=1 para vir o campo `road`; sem isso o Nominatim
// devolve o bairro, que muda pouco e não ajuda a localizar.
export async function nomeDaRua(lat, lng) {
  try {
    const r = await fetch(
      `${BASE}/reverse?format=json&zoom=17&addressdetails=1&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json', 'User-Agent': UA } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const a = j?.address || {};
    const rua = a.road || a.pedestrian || a.residential || a.suburb || a.village;
    if (rua) return rua;
    return j?.display_name ? nomeCurto(j.display_name) : null;
  } catch {
    return null;
  }
}

// Metros entre dois pontos. Serve para não repetir a pergunta ao Nominatim
// enquanto o veículo não sair do sítio — um carro parado num semáforo não
// tem rua nova para nos dizer, e o serviço é gratuito e partilhado.
export function metrosEntre(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
