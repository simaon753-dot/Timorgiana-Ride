import { db } from './db.js';
import { findUserById } from './users.js';

// Estados que ainda contam como "viagem a decorrer"
const ACTIVE_PASSENGER = ['requested', 'accepted', 'arriving'];
const ACTIVE_DRIVER = ['accepted', 'arriving'];

function num(v) {
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
}

// Versão compacta de um utilizador para mostrar dentro de uma viagem
function compactUser(id, { withVehicle = false } = {}) {
  const u = findUserById(id);
  if (!u) return null;
  const base = { id: u.id, name: u.name, phone: u.phone };
  if (withVehicle && u.role === 'driver') {
    base.vehicle = {
      type: u.vehicle_type || 'car',
      model: u.vehicle_model || null,
      plate: u.vehicle_plate || null,
      color: u.vehicle_color || null,
    };
  }
  return base;
}

// Converte uma linha da BD num objeto público (com passageiro e motorista)
export function toPublicRide(row) {
  if (!row) return null;
  return {
    // Presente só nas consultas de histórico: estrelas que o utilizador
    // atual já deu a esta viagem (null se ainda não avaliou)
    ...(row.my_stars !== undefined ? { myStars: row.my_stars } : {}),
    id: row.id,
    status: row.status,
    destLabel: row.dest_label,
    destLat: row.dest_lat != null ? row.dest_lat : null,
    destLng: row.dest_lng != null ? row.dest_lng : null,
    originLabel: row.origin_label || null,
    originLat: row.origin_lat != null ? row.origin_lat : null,
    originLng: row.origin_lng != null ? row.origin_lng : null,
    vehicleType: row.vehicle_type || null,
    fareUsd: row.fare_usd != null ? row.fare_usd : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passenger: compactUser(row.passenger_id),
    driver: row.driver_id ? compactUser(row.driver_id, { withVehicle: true }) : null,
  };
}

export function getRideById(id) {
  return db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
}

export function createRide({
  passengerId,
  destLabel,
  destLat,
  destLng,
  originLabel,
  originLat,
  originLng,
  vehicleType,
  fareUsd,
}) {
  const stmt = db.prepare(`
    INSERT INTO rides
      (passenger_id, dest_label, dest_lat, dest_lng, origin_label, origin_lat, origin_lng, vehicle_type, fare_usd, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')
  `);
  const result = stmt.run(
    passengerId,
    destLabel.trim(),
    num(destLat),
    num(destLng),
    originLabel?.trim() || null,
    num(originLat),
    num(originLng),
    vehicleType === 'car' || vehicleType === 'motorbike' ? vehicleType : null,
    num(fareUsd)
  );
  return getRideById(result.lastInsertRowid);
}

// Viagem ativa do utilizador (para restaurar o estado ao abrir a app)
export function getActiveRideForUser(user) {
  if (user.role === 'passenger') {
    const placeholders = ACTIVE_PASSENGER.map(() => '?').join(',');
    return db
      .prepare(
        `SELECT * FROM rides WHERE passenger_id = ? AND status IN (${placeholders}) ORDER BY id DESC LIMIT 1`
      )
      .get(user.id, ...ACTIVE_PASSENGER);
  }
  const placeholders = ACTIVE_DRIVER.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT * FROM rides WHERE driver_id = ? AND status IN (${placeholders}) ORDER BY id DESC LIMIT 1`
    )
    .get(user.id, ...ACTIVE_DRIVER);
}

// Pedidos por atribuir que um motorista pode aceitar.
// Regra actual: vê os pedidos do seu tipo de veículo + os que não têm preferência.
export function getAvailableRidesForDriver(driverVehicleType) {
  return db
    .prepare(
      `SELECT * FROM rides
       WHERE status = 'requested' AND driver_id IS NULL
         AND (vehicle_type IS NULL OR vehicle_type = ?)
       ORDER BY id ASC`
    )
    .all(driverVehicleType);
}

// Histórico: viagens terminadas (concluídas ou canceladas) do utilizador.
// Inclui quantas estrelas ESTE utilizador já deu, para o ecrã saber se
// ainda pode avaliar.
export function getRideHistoryForUser(user, limit = 50) {
  // A coluna vem de uma lista fixa (não de input do utilizador)
  const col = user.role === 'passenger' ? 'passenger_id' : 'driver_id';
  return db
    .prepare(
      `SELECT r.*, (
         SELECT stars FROM ratings WHERE ride_id = r.id AND rater_id = ?
       ) AS my_stars
       FROM rides r
       WHERE r.${col} = ? AND r.status IN ('completed','cancelled')
       ORDER BY r.id DESC
       LIMIT ?`
    )
    .all(user.id, user.id, limit);
}

// Aceitar uma viagem de forma ATÓMICA.
// O `WHERE status = 'requested' AND driver_id IS NULL` garante que, se dois
// motoristas carregarem em "Aceitar" ao mesmo tempo, só um consegue: o
// segundo UPDATE não encontra linhas e devolve changes = 0.
export function acceptRide(rideId, driverId, fareUsd) {
  const res = db
    .prepare(
      `UPDATE rides
       SET driver_id = ?, fare_usd = COALESCE(?, fare_usd), status = 'accepted', updated_at = datetime('now')
       WHERE id = ? AND status = 'requested' AND driver_id IS NULL`
    )
    .run(driverId, num(fareUsd), rideId);
  if (res.changes === 0) return null; // já aceite por outro, ou inexistente
  return getRideById(rideId);
}

export function setRideStatus(rideId, status) {
  db.prepare(`UPDATE rides SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
    status,
    rideId
  );
  return getRideById(rideId);
}

// Atualizar a tarifa combinada (motorista, após conversar no chat)
export function setRideFare(rideId, fareUsd) {
  db.prepare(`UPDATE rides SET fare_usd = ?, updated_at = datetime('now') WHERE id = ?`).run(
    num(fareUsd),
    rideId
  );
  return getRideById(rideId);
}
