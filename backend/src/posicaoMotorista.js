import { one } from './db.js';
import { notificarChegada } from './push.js';
import { updateLocation } from './drivers.js';
import { juntarPonto } from './rastos.js';
import { juntarAoPercurso } from './percursos.js';

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
    `SELECT id, passenger_id, status, vehicle_type, origin_lat, origin_lng,
            aviso_perto_em, aviso_chegou_em FROM rides
      WHERE driver_id = $1 AND status = ANY($2)
      ORDER BY id DESC LIMIT 1`,
    [driverId, ACTIVE_DRIVER]
  );
  if (viagem) {
    // O rasto anónimo da viagem, se estiver ligado. Ver `rastos.js`.
    juntarPonto(viagem, lat, lng, erro);
    // O caminho desta viagem, para o painel. Ver `percursos.js`.
    juntarAoPercurso(viagem, lat, lng, erro);
    io?.to(`user:${viagem.passenger_id}`).emit('ride:driverLocation', {
      rideId: viagem.id,
      lat,
      lng,
      precisao: erro,
    });
    avisosChegada(viagem, driverId, lat, lng, erro).catch((e) =>
      console.error('[chegada]', e.message)
    );
  }
  return viagem;
}

// «O MOTORISTA ESTÁ A CHEGAR» E «O MOTORISTA CHEGOU» (08/10/2026, pedido do
// Simão). Pela DISTÂNCIA à recolha e não pelos botões: na app, o mesmo
// estado `arriving` é marcado por «A caminho» no Início (ao SAIR) e por
// «Cheguei» na navegação — um aviso preso ao estado dizia «chegou» a quem
// acabava de partir.
//
// Cada aviso sai uma vez por viagem: a coluna é reclamada num UPDATE com a
// condição «ainda vazia», e só quem a reclamou manda — duas posições quase
// ao mesmo tempo (socket e serviço em primeiro plano) não dão dois avisos.
export const AVISO_PERTO_M = 300;
// 60 m e não 0: o GPS entre prédios engana-se 20 a 40 m, e a recolha é o
// ponto da estrada, não a porta.
export const AVISO_CHEGOU_M = 60;
// Uma leitura com mais erro do que isto não diz «chegou» a ninguém.
const ERRO_MAX_CHEGOU_M = 50;
const ANTES_DE_RECOLHER = ['accepted', 'arriving'];

function metros(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// A regra sozinha, para se poder ensaiar: 'chegou', 'perto' ou null.
export function decidirAviso(metrosARecolha, erro, jaAvisouPerto) {
  if (metrosARecolha <= AVISO_CHEGOU_M && (erro == null || erro <= ERRO_MAX_CHEGOU_M)) return 'chegou';
  if (metrosARecolha <= AVISO_PERTO_M && !jaAvisouPerto) return 'perto';
  return null;
}

async function avisosChegada(viagem, driverId, lat, lng, erro) {
  if (!ANTES_DE_RECOLHER.includes(viagem.status)) return;
  if (viagem.origin_lat == null || viagem.origin_lng == null) return;
  if (viagem.aviso_chegou_em) return;
  const d = metros({ lat, lng }, { lat: Number(viagem.origin_lat), lng: Number(viagem.origin_lng) });
  const qual = decidirAviso(d, erro, !!viagem.aviso_perto_em);
  if (!qual) return;
  // «Chegou» também marca «perto»: quem chega sem ter passado pelos 300 m
  // (aceitou já ao lado) não recebe depois um «está a chegar».
  const reclamado = await one(
    qual === 'chegou'
      ? `UPDATE rides SET aviso_chegou_em = NOW(), aviso_perto_em = COALESCE(aviso_perto_em, NOW())
          WHERE id = $1 AND aviso_chegou_em IS NULL RETURNING id`
      : `UPDATE rides SET aviso_perto_em = NOW()
          WHERE id = $1 AND aviso_perto_em IS NULL RETURNING id`,
    [viagem.id]
  );
  if (!reclamado) return;
  const pessoas = await one(
    `SELECT p.push_token, p.lingua, m.name AS nome, m.vehicle_plate AS matricula
       FROM users p, users m WHERE p.id = $1 AND m.id = $2`,
    [viagem.passenger_id, driverId]
  );
  if (pessoas) await notificarChegada(pessoas, qual, viagem.id, pessoas);
}
