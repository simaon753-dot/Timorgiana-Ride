import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import {
  createRide,
  getRideById,
  getActiveRideForUser,
  getRideHistoryForUser,
  getAvailableRidesForDriver,
  acceptRide,
  setRideStatus,
  setRideFare,
  toPublicRide,
} from '../rides.js';
import { addMessage, listMessages } from '../messages.js';
import { addRating, hasRated } from '../ratings.js';

export const ridesRouter = Router();

ridesRouter.use(requireAuth);

// Emite um evento para o passageiro e o motorista de uma viagem
function notifyParticipants(io, ride, event) {
  const pub = toPublicRide(ride);
  io.to(`user:${ride.passenger_id}`).emit(event, pub);
  if (ride.driver_id) io.to(`user:${ride.driver_id}`).emit(event, pub);
}

// Devolve a viagem se o utilizador for participante, senão null
function rideForParticipant(rideId, userId) {
  const row = getRideById(rideId);
  if (!row) return null;
  if (row.passenger_id !== userId && row.driver_id !== userId) return null;
  return row;
}

// POST /api/rides — passageiro pede uma viagem
ridesRouter.post('/', requireRole('passenger'), (req, res) => {
  const { destLabel, destLat, destLng, originLabel, originLat, originLng, vehicleType, fareUsd } =
    req.body || {};
  if (!destLabel || !destLabel.trim()) {
    return res.status(400).json({ error: 'Indica o destino.' });
  }

  // Não permitir dois pedidos ativos ao mesmo tempo
  const existing = getActiveRideForUser(req.user);
  if (existing) {
    return res
      .status(409)
      .json({ error: 'Já tens uma viagem a decorrer.', ride: toPublicRide(existing) });
  }

  const row = createRide({
    passengerId: req.user.id,
    destLabel,
    destLat,
    destLng,
    originLabel,
    originLat,
    originLng,
    vehicleType,
    fareUsd,
  });
  const ride = toPublicRide(row);

  // Avisar os motoristas elegíveis em tempo real
  const io = req.app.get('io');
  const room = row.vehicle_type ? `drivers:${row.vehicle_type}` : 'drivers';
  io.to(room).emit('ride:new', ride);

  return res.status(201).json({ ride });
});

// GET /api/rides/active — viagem ativa do utilizador
ridesRouter.get('/active', (req, res) => {
  const row = getActiveRideForUser(req.user);
  return res.json({ ride: row ? toPublicRide(row) : null });
});

// GET /api/rides/history — viagens terminadas do utilizador
ridesRouter.get('/history', (req, res) => {
  const rows = getRideHistoryForUser(req.user);
  return res.json({ rides: rows.map(toPublicRide) });
});

// GET /api/rides/available — pedidos por aceitar (só motoristas)
ridesRouter.get('/available', requireRole('driver'), (req, res) => {
  const rows = getAvailableRidesForDriver(req.user.vehicle_type || 'car');
  return res.json({ rides: rows.map(toPublicRide) });
});

// POST /api/rides/:id/accept — motorista aceita e indica a tarifa
ridesRouter.post('/:id/accept', requireRole('driver'), (req, res) => {
  const rideId = Number(req.params.id);
  const { fareUsd } = req.body || {};
  const fare = fareUsd != null && fareUsd !== '' ? Number(fareUsd) : null;
  if (fare != null && (Number.isNaN(fare) || fare < 0)) {
    return res.status(400).json({ error: 'Tarifa inválida.' });
  }

  const row = acceptRide(rideId, req.user.id, fare);
  if (!row) {
    return res.status(409).json({ error: 'Esta viagem já não está disponível.' });
  }

  const io = req.app.get('io');
  notifyParticipants(io, row, 'ride:update');
  io.to('drivers').emit('ride:taken', { id: row.id }); // tirar das listas dos outros

  return res.json({ ride: toPublicRide(row) });
});

// POST /api/rides/:id/status — avançar o estado (a caminho / concluído)
ridesRouter.post('/:id/status', requireRole('driver'), (req, res) => {
  const rideId = Number(req.params.id);
  const { status } = req.body || {};
  if (!['arriving', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  const row = getRideById(rideId);
  if (!row || row.driver_id !== req.user.id) {
    return res.status(404).json({ error: 'Viagem não encontrada.' });
  }
  if (!['accepted', 'arriving'].includes(row.status)) {
    return res.status(409).json({ error: 'Não é possível mudar o estado desta viagem.' });
  }

  const updated = setRideStatus(rideId, status);
  notifyParticipants(req.app.get('io'), updated, 'ride:update');
  return res.json({ ride: toPublicRide(updated) });
});

// POST /api/rides/:id/fare — motorista atualiza a tarifa combinada
ridesRouter.post('/:id/fare', requireRole('driver'), (req, res) => {
  const rideId = Number(req.params.id);
  const fare = Number(req.body?.fareUsd);
  if (Number.isNaN(fare) || fare < 0) {
    return res.status(400).json({ error: 'Tarifa inválida.' });
  }
  const row = getRideById(rideId);
  if (!row || row.driver_id !== req.user.id) {
    return res.status(404).json({ error: 'Viagem não encontrada.' });
  }
  const updated = setRideFare(rideId, fare);
  notifyParticipants(req.app.get('io'), updated, 'ride:update');
  return res.json({ ride: toPublicRide(updated) });
});

// GET /api/rides/:id/messages — histórico do chat
ridesRouter.get('/:id/messages', (req, res) => {
  const rideId = Number(req.params.id);
  const row = rideForParticipant(rideId, req.user.id);
  if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
  return res.json({ messages: listMessages(rideId) });
});

// POST /api/rides/:id/messages — enviar mensagem no chat
ridesRouter.post('/:id/messages', (req, res) => {
  const rideId = Number(req.params.id);
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

  const row = rideForParticipant(rideId, req.user.id);
  if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
  if (!row.driver_id) return res.status(409).json({ error: 'A viagem ainda não foi aceite.' });

  const message = addMessage(rideId, req.user.id, body);

  // Entregar ao outro participante em tempo real
  const otherId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
  req.app.get('io').to(`user:${otherId}`).emit('message:new', message);

  return res.status(201).json({ message });
});

// POST /api/rides/:id/rate — avaliar o outro participante (após concluída)
ridesRouter.post('/:id/rate', (req, res) => {
  const rideId = Number(req.params.id);
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Avaliação inválida.' });
  }

  const row = rideForParticipant(rideId, req.user.id);
  if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
  if (row.status !== 'completed') {
    return res.status(409).json({ error: 'Só podes avaliar uma viagem concluída.' });
  }
  if (hasRated(rideId, req.user.id)) {
    return res.status(409).json({ error: 'Já avaliaste esta viagem.' });
  }

  const rateeId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
  addRating({ rideId, raterId: req.user.id, rateeId, stars });
  return res.json({ ok: true });
});

// POST /api/rides/:id/cancel — passageiro ou motorista cancela
ridesRouter.post('/:id/cancel', (req, res) => {
  const rideId = Number(req.params.id);
  const row = getRideById(rideId);
  if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });

  const isOwner = row.passenger_id === req.user.id || row.driver_id === req.user.id;
  if (!isOwner) return res.status(403).json({ error: 'Sem permissão.' });
  if (['completed', 'cancelled'].includes(row.status)) {
    return res.status(409).json({ error: 'Esta viagem já terminou.' });
  }

  const updated = setRideStatus(rideId, 'cancelled');
  const io = req.app.get('io');
  notifyParticipants(io, updated, 'ride:update');
  if (row.status === 'requested') io.to('drivers').emit('ride:taken', { id: row.id });

  return res.json({ ride: toPublicRide(updated) });
});
