import { one } from './db.js';
import { updateLocation } from './drivers.js';

// ONDE ESTÁ O MOTORISTA — num sítio só (21/09/2026).
//
// A posição chega por dois caminhos, e é de propósito:
//
//   • pelo SOCKET, enquanto a app está à frente. É o caminho rápido.
//   • por HTTP, do serviço em primeiro plano, quando o telemóvel está no
//     bolso e o ecrã apagado. Aí o socket pode já não existir — e era isso
//     que congelava o carro no mapa de quem esperava.
//
// O que se faz com ela é o mesmo nos dois casos, e por isso vive aqui. Duas
// cópias desta função divergiriam no dia em que uma mudasse, e o defeito
// apareceria só num dos caminhos — o mais difícil de reproduzir.
const ACTIVE_DRIVER = ['accepted', 'arriving', 'in_progress'];

// A PRECISÃO VIAJA COM A POSIÇÃO (22/09/2026).
//
// O telemóvel diz, em cada leitura, de quantos metros pode estar enganado, e
// até hoje deitávamos esse número fora. Sem ele, discutir precisão é discutir
// sem um único dado: não se sabe se o carro salta por causa do GPS, do
// aparelho ou do nosso código.
//
// Guarda-se na base E vai no socket, porque servem coisas diferentes: na
// base é para medir daqui a um mês; no socket é para a app de quem espera
// decidir se acredita na leitura antes de a desenhar.
//
// NÃO SE RECUSA NADA AQUI. Uma posição imprecisa continua a ser a batida que
// diz que este motorista está ao serviço — e à espera de pedidos a leitura é
// de propósito mais grosseira, para poupar bateria. Filtrar no servidor
// punha um motorista parado a sair de serviço sozinho.
export async function guardarPosicao(io, driverId, lat, lng, precisao = null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const erro = Number.isFinite(Number(precisao)) ? Math.round(Number(precisao)) : null;
  await updateLocation(driverId, lat, lng, erro);

  // A viagem a decorrer, para o passageiro ver o veículo a aproximar-se.
  // Inclui 'in_progress': durante a viagem é quando ele mais olha para o mapa.
  const viagem = await one(
    `SELECT id, passenger_id FROM rides
      WHERE driver_id = $1 AND status = ANY($2)
      ORDER BY id DESC LIMIT 1`,
    [driverId, ACTIVE_DRIVER]
  );
  if (viagem) {
    io?.to(`user:${viagem.passenger_id}`).emit('ride:driverLocation', {
      rideId: viagem.id,
      lat,
      lng,
      precisao: erro,
    });
  }
  return viagem;
}
