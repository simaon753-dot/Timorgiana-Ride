import { query, one } from './db.js';

// Estados que ainda contam como "viagem a decorrer"
const ACTIVE_PASSENGER = ['requested', 'accepted', 'arriving'];
const ACTIVE_DRIVER = ['accepted', 'arriving'];

function num(v) {
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
}

// Traz a viagem já com os dados do passageiro e do motorista numa só
// consulta. Antes eram consultas separadas por cada viagem — com uma
// lista de 20 pedidos isso eram 40 idas à base de dados.
const RIDE_SELECT = `
  SELECT r.*,
         p.name  AS p_name,  p.phone AS p_phone,
         d.name  AS d_name,  d.phone AS d_phone,
         d.vehicle_type AS d_vtype, d.vehicle_model AS d_vmodel,
         d.vehicle_plate AS d_vplate, d.vehicle_color AS d_vcolor
  FROM rides r
  JOIN users p ON p.id = r.passenger_id
  LEFT JOIN users d ON d.id = r.driver_id
`;

// Converte a linha (já com os JOINs) num objeto público
export function toPublicRide(row) {
  if (!row) return null;
  return {
    ...(row.my_stars !== undefined ? { myStars: row.my_stars } : {}),
    id: row.id,
    status: row.status,
    destLabel: row.dest_label,
    destLat: row.dest_lat ?? null,
    destLng: row.dest_lng ?? null,
    originLabel: row.origin_label || null,
    originLat: row.origin_lat ?? null,
    originLng: row.origin_lng ?? null,
    vehicleType: row.vehicle_type || null,
    fareUsd: row.fare_usd ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passenger: { id: row.passenger_id, name: row.p_name, phone: row.p_phone },
    driver: row.driver_id
      ? {
          id: row.driver_id,
          name: row.d_name,
          phone: row.d_phone,
          vehicle: {
            type: row.d_vtype || 'car',
            model: row.d_vmodel || null,
            plate: row.d_vplate || null,
            color: row.d_vcolor || null,
          },
        }
      : null,
  };
}

export function getRideById(id) {
  return one(`${RIDE_SELECT} WHERE r.id = $1`, [id]);
}

// Insere e depois lê. Em PostgreSQL não dá para fazer as duas coisas numa
// só instrução: todas as partes veem a base de dados como estava ANTES da
// instrução, por isso um SELECT no mesmo comando não encontraria a linha
// que o INSERT acabou de criar.
export async function createRide({
  passengerId, destLabel, destLat, destLng,
  originLabel, originLat, originLng, vehicleType, fareUsd,
}) {
  const inserted = await one(
    `INSERT INTO rides
       (passenger_id, dest_label, dest_lat, dest_lng, origin_label, origin_lat, origin_lng, vehicle_type, fare_usd, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'requested')
     RETURNING id`,
    [
      passengerId,
      destLabel.trim(),
      num(destLat),
      num(destLng),
      originLabel?.trim() || null,
      num(originLat),
      num(originLng),
      vehicleType === 'car' || vehicleType === 'motorbike' ? vehicleType : null,
      num(fareUsd),
    ]
  );
  return getRideById(inserted.id);
}

// Viagem ativa do utilizador (para restaurar o estado ao abrir a app)
export function getActiveRideForUser(user) {
  const isPassenger = user.role === 'passenger';
  const states = isPassenger ? ACTIVE_PASSENGER : ACTIVE_DRIVER;
  const col = isPassenger ? 'r.passenger_id' : 'r.driver_id';
  return one(
    `${RIDE_SELECT} WHERE ${col} = $1 AND r.status = ANY($2) ORDER BY r.id DESC LIMIT 1`,
    [user.id, states]
  );
}

// Histórico: viagens terminadas, com as estrelas que ESTE utilizador deu
export function getRideHistoryForUser(user, limit = 50) {
  const col = user.role === 'passenger' ? 'r.passenger_id' : 'r.driver_id';
  return query(
    `SELECT sub.*, (
       SELECT stars FROM ratings WHERE ride_id = sub.id AND rater_id = $1
     ) AS my_stars
     FROM (${RIDE_SELECT} WHERE ${col} = $1 AND r.status IN ('completed','cancelled')) sub
     ORDER BY sub.id DESC LIMIT $2`,
    [user.id, limit]
  );
}

// Pedidos por atribuir que um motorista pode aceitar
export function getAvailableRidesForDriver(driverVehicleType) {
  return query(
    `${RIDE_SELECT}
     WHERE r.status = 'requested' AND r.driver_id IS NULL
       AND (r.vehicle_type IS NULL OR r.vehicle_type = $1)
     ORDER BY r.id ASC`,
    [driverVehicleType]
  );
}

// Aceitar de forma ATÓMICA: a condição vai DENTRO do UPDATE, por isso se
// dois motoristas carregarem ao mesmo tempo só um encontra a linha livre.
export async function acceptRide(rideId, driverId, fareUsd) {
  const updated = await one(
    `UPDATE rides
     SET driver_id = $1, fare_usd = COALESCE($2, fare_usd),
         status = 'accepted', updated_at = NOW()
     WHERE id = $3 AND status = 'requested' AND driver_id IS NULL
     RETURNING id`,
    [driverId, num(fareUsd), rideId]
  );
  if (!updated) return null; // já aceite por outro, ou inexistente
  return getRideById(rideId);
}

export async function setRideStatus(rideId, status) {
  await query('UPDATE rides SET status = $1, updated_at = NOW() WHERE id = $2', [status, rideId]);
  return getRideById(rideId);
}

export async function setRideFare(rideId, fareUsd) {
  await query('UPDATE rides SET fare_usd = $1, updated_at = NOW() WHERE id = $2', [
    num(fareUsd),
    rideId,
  ]);
  return getRideById(rideId);
}
