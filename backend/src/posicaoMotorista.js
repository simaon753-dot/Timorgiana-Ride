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

export async function guardarPosicao(io, driverId, lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  await updateLocation(driverId, lat, lng);

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
    });
  }
  return viagem;
}
