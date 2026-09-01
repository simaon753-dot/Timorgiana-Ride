// A que município pertence um ponto.
//
// O Simão decidiu: cada município vê os seus pedidos. Um motorista em
// Lospalos não vê uma viagem pedida em Díli, e vice-versa.
//
// COMO É DECIDIDO, e porquê assim: pelo capital de município mais próximo.
// Não são as fronteiras verdadeiras — para isso era preciso carregar os
// polígonos administrativos de Timor-Leste, mantê-los actualizados e fazer
// contas de geometria a cada pedido.
//
// O erro desta aproximação vive nas fronteiras, e é pequeno onde interessa:
// as capitais estão longe umas das outras, e quase toda a procura acontece
// perto delas. Um ponto a meio caminho entre Díli e Liquiçá pode cair para
// o lado errado; um ponto dentro de qualquer das duas cidades, nunca.
//
// Se um dia isto der problemas reais — alguém em Hera a ser atribuído a
// Manatuto, por exemplo — a saída é acrescentar pontos à lista, não trocar
// de método. Duas entradas para o mesmo município resolvem uma fronteira
// torta sem complicar o resto.

// As treze capitais de município, mais Ataúro que é município próprio desde
// 2022. Coordenadas em graus decimais.
const CAPITAIS = [
  { id: 'dili', nome: 'Díli', lat: -8.5569, lng: 125.5603 },
  { id: 'baucau', nome: 'Baucau', lat: -8.4667, lng: 126.45 },
  { id: 'bobonaro', nome: 'Maliana', lat: -8.9931, lng: 125.2214 },
  { id: 'covalima', nome: 'Suai', lat: -9.3122, lng: 125.2564 },
  { id: 'lautem', nome: 'Lospalos', lat: -8.515, lng: 126.9958 },
  { id: 'manufahi', nome: 'Same', lat: -9.0, lng: 125.65 },
  { id: 'ainaro', nome: 'Ainaro', lat: -8.9928, lng: 125.5075 },
  { id: 'manatuto', nome: 'Manatuto', lat: -8.51, lng: 126.015 },
  { id: 'viqueque', nome: 'Viqueque', lat: -8.8592, lng: 126.3644 },
  { id: 'liquica', nome: 'Liquiçá', lat: -8.5883, lng: 125.3417 },
  { id: 'ermera', nome: 'Gleno', lat: -8.7167, lng: 125.4333 },
  { id: 'aileu', nome: 'Aileu', lat: -8.7281, lng: 125.5664 },
  { id: 'oecusse', nome: 'Oe-Cusse Ambeno', lat: -9.1978, lng: 124.3767 },
  { id: 'atauro', nome: 'Ataúro', lat: -8.2333, lng: 125.5833 },
];

export const MUNICIPIOS = CAPITAIS.map(({ id, nome }) => ({ id, nome }));

function km(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * 111.32;
  const dLng = (bLng - aLng) * 111.32 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// Devolve o id do município, ou `null` se não houver coordenadas.
//
// `null` é importante e não é falha: uma viagem sem origem conhecida não
// pertence a município nenhum, e a regra de filtragem trata-a à parte em
// vez de a esconder de toda a gente.
export function municipioDe(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let melhor = null;
  let menor = Infinity;
  for (const c of CAPITAIS) {
    const d = km(lat, lng, c.lat, c.lng);
    if (d < menor) {
      menor = d;
      melhor = c.id;
    }
  }
  return melhor;
}

export function nomeDoMunicipio(id) {
  return CAPITAIS.find((c) => c.id === id)?.nome ?? null;
}
