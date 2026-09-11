import { query } from './db.js';

// PARAGENS PELO CAMINHO — os pontos do meio de uma viagem.
//
// DUAS, NO MÁXIMO. Não é uma limitação técnica: o OSRM e a Routes v2 aceitam
// dezenas. É uma decisão de produto para o Carry de Díli — recolher na loja e
// entregar em dois sítios é o caso real; uma rota de nove pontos é um
// trabalho de distribuição, que se paga de outra maneira e se combina ao
// telefone.
//
// Havendo procura, o número muda aqui e em mais lado nenhum.
export const MAX_DESTINOS = 2;

// A LISTA VEM DA APP E NÃO SE ACREDITA NELA.
//
// Cada ponto tem de ter coordenadas que sejam números e um nome que caiba
// numa linha. Um ponto sem coordenadas não é um desvio — é um buraco no meio
// da rota, e o cálculo do preço passaria por cima dele sem dar por nada.
//
// Devolve SEMPRE um array, vazio quando não há nada de aproveitável. Quem
// chama não precisa de distinguir "não mandou" de "mandou lixo": nos dois
// casos a viagem é directa.
export function limparDestinos(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((p) => ({
      label: String(p?.label || '').trim().slice(0, 120),
      lat: Number(p?.lat),
      lng: Number(p?.lng),
    }))
    .filter((p) => p.label && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .slice(0, MAX_DESTINOS);
}

// Escritos DEPOIS da viagem existir, como as fotografias da carga: a chave
// estrangeira aponta para `rides(id)` e esse id só existe depois do INSERT.
//
// A `ordem` é a posição na fila e não o id: quem apagar o segundo de três
// tem de continuar a ter uma primeira e uma segunda paragem, e não uma
// primeira e uma terceira.
export async function guardarDestinos(rideId, lista) {
  const limpos = limparDestinos(lista);
  if (!limpos.length) return [];

  for (let i = 0; i < limpos.length; i++) {
    const p = limpos[i];
    await query(
      `INSERT INTO ride_destinos (ride_id, ordem, label, lat, lng)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ride_id, ordem) DO NOTHING`,
      [rideId, i, p.label, p.lat, p.lng]
    );
  }
  return limpos;
}

export function destinosDaViagem(rideId) {
  return query(
    'SELECT label, lat, lng FROM ride_destinos WHERE ride_id = $1 ORDER BY ordem ASC',
    [rideId]
  );
}
