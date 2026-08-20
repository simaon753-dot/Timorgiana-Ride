import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedDriver } from '../auth.js';
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

// O Express 4 não apanha erros de funções assíncronas: uma falha da base
// de dados deixaria o pedido pendurado até expirar. Este invólucro
// encaminha qualquer erro para o tratamento normal.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notify(io, ride, event) {
  const pub = toPublicRide(ride);
  io.to(`user:${ride.passenger_id}`).emit(event, pub);
  if (ride.driver_id) io.to(`user:${ride.driver_id}`).emit(event, pub);
}

async function rideForParticipant(rideId, userId) {
  const row = await getRideById(rideId);
  if (!row) return null;
  if (row.passenger_id !== userId && row.driver_id !== userId) return null;
  return row;
}

// POST /api/rides — passageiro pede uma viagem
ridesRouter.post(
  '/',
  requireRole('passenger'),
  wrap(async (req, res) => {
    const { destLabel, destLat, destLng, originLabel, originLat, originLng, vehicleType, fareUsd } =
      req.body || {};
    if (!destLabel || !destLabel.trim()) {
      return res.status(400).json({ error: 'Indica o destino.' });
    }

    const existing = await getActiveRideForUser(req.user);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'Já tens uma viagem a decorrer.', ride: toPublicRide(existing) });
    }

    const row = await createRide({
      passengerId: req.user.id,
      destLabel, destLat, destLng,
      originLabel, originLat, originLng,
      vehicleType, fareUsd,
    });
    const ride = toPublicRide(row);

    const io = req.app.get('io');
    io.to(row.vehicle_type ? `drivers:${row.vehicle_type}` : 'drivers').emit('ride:new', ride);

    return res.status(201).json({ ride });
  })
);

// GET /api/rides/active
ridesRouter.get(
  '/active',
  wrap(async (req, res) => {
    const row = await getActiveRideForUser(req.user);
    return res.json({ ride: row ? toPublicRide(row) : null });
  })
);

// GET /api/rides/history
ridesRouter.get(
  '/history',
  wrap(async (req, res) => {
    const rows = await getRideHistoryForUser(req.user);
    return res.json({ rides: rows.map(toPublicRide) });
  })
);

// GET /api/rides/available — só motoristas
ridesRouter.get(
  '/available',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rows = await getAvailableRidesForDriver(req.user.vehicle_type || 'car');
    return res.json({ rides: rows.map(toPublicRide) });
  })
);

// POST /api/rides/:id/accept
ridesRouter.post(
  '/:id/accept',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { fareUsd } = req.body || {};
    const fare = fareUsd != null && fareUsd !== '' ? Number(fareUsd) : null;
    if (fare != null && (Number.isNaN(fare) || fare < 0)) {
      return res.status(400).json({ error: 'Tarifa inválida.' });
    }

    const row = await acceptRide(rideId, req.user.id, fare);
    if (!row) return res.status(409).json({ error: 'Esta viagem já não está disponível.' });

    const io = req.app.get('io');
    notify(io, row, 'ride:update');
    io.to('drivers').emit('ride:taken', { id: row.id });

    return res.json({ ride: toPublicRide(row) });
  })
);

// POST /api/rides/:id/status
ridesRouter.post(
  '/:id/status',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { status } = req.body || {};
    if (!['arriving', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const row = await getRideById(rideId);
    if (!row || row.driver_id !== req.user.id) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }
    if (!['accepted', 'arriving'].includes(row.status)) {
      return res.status(409).json({ error: 'Não é possível mudar o estado desta viagem.' });
    }

    const updated = await setRideStatus(rideId, status);
    notify(req.app.get('io'), updated, 'ride:update');
    return res.json({ ride: toPublicRide(updated) });
  })
);

// POST /api/rides/:id/fare
ridesRouter.post(
  '/:id/fare',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const fare = Number(req.body?.fareUsd);
    if (Number.isNaN(fare) || fare < 0) return res.status(400).json({ error: 'Tarifa inválida.' });

    const row = await getRideById(rideId);
    if (!row || row.driver_id !== req.user.id) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }
    const updated = await setRideFare(rideId, fare);
    notify(req.app.get('io'), updated, 'ride:update');
    return res.json({ ride: toPublicRide(updated) });
  })
);

// GET /api/rides/:id/messages
ridesRouter.get(
  '/:id/messages',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    return res.json({ messages: await listMessages(rideId) });
  })
);

// POST /api/rides/:id/messages
ridesRouter.post(
  '/:id/messages',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    if (!row.driver_id) return res.status(409).json({ error: 'A viagem ainda não foi aceite.' });

    const message = await addMessage(rideId, req.user.id, body);
    const otherId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
    req.app.get('io').to(`user:${otherId}`).emit('message:new', message);

    return res.status(201).json({ message });
  })
);

// POST /api/rides/:id/rate
ridesRouter.post(
  '/:id/rate',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const stars = Number(req.body?.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Avaliação inválida.' });
    }

    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    if (row.status !== 'completed') {
      return res.status(409).json({ error: 'Só podes avaliar uma viagem concluída.' });
    }
    if (await hasRated(rideId, req.user.id)) {
      return res.status(409).json({ error: 'Já avaliaste esta viagem.' });
    }

    const rateeId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
    await addRating({ rideId, raterId: req.user.id, rateeId, stars });
    return res.json({ ok: true });
  })
);

// POST /api/rides/:id/cancel
ridesRouter.post(
  '/:id/cancel',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const row = await getRideById(rideId);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });

    const isOwner = row.passenger_id === req.user.id || row.driver_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: 'Sem permissão.' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ error: 'Esta viagem já terminou.' });
    }

    const updated = await setRideStatus(rideId, 'cancelled');
    const io = req.app.get('io');
    notify(io, updated, 'ride:update');
    if (row.status === 'requested') io.to('drivers').emit('ride:taken', { id: row.id });

    return res.json({ ride: toPublicRide(updated) });
  })
);
