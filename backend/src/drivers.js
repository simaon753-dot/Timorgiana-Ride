import { query, one } from './db.js';

// Marca o motorista como disponível ou indisponível para receber pedidos.
export function setOnline(userId, online) {
  return one(
    `UPDATE users SET is_online = $1, last_seen_at = NOW()
     WHERE id = $2 AND role = 'driver'
     RETURNING id, is_online`,
    [!!online, userId]
  );
}

// Guarda a última posição conhecida. Chamado com frequência, por isso é
// deliberadamente leve: um UPDATE simples, sem leituras.
export function updateLocation(userId, lat, lng) {
  return query(
    `UPDATE users SET last_lat = $1, last_lng = $2, last_seen_at = NOW() WHERE id = $3`,
    [lat, lng, userId]
  );
}

// Motoristas disponíveis, do mais próximo ao mais distante.
//
// A distância é calculada com a fórmula de Haversine em SQL. Para as
// distâncias de Díli é mais do que suficiente — uma extensão geográfica
// (PostGIS) só compensaria com muitos milhares de motoristas.
export function nearestDrivers({ lat, lng, vehicleType, limit = 10, maxKm = 15 }) {
  return query(
    `SELECT id, name, push_token, last_lat, last_lng,
            6371 * 2 * asin(sqrt(
              power(sin(radians($1 - last_lat) / 2), 2) +
              cos(radians(last_lat)) * cos(radians($1)) *
              power(sin(radians($2 - last_lng) / 2), 2)
            )) AS km
     FROM users
     WHERE role = 'driver'
       AND driver_status = 'approved'
       AND is_online = TRUE
       AND last_lat IS NOT NULL
       AND ($3::text IS NULL OR vehicle_type = $3)
       AND last_seen_at > NOW() - INTERVAL '10 minutes'
     ORDER BY km ASC
     LIMIT $4`,
    [lat, lng, vehicleType || null, limit]
  ).then((rows) => rows.filter((r) => r.km == null || r.km <= maxKm));
}

// Motoristas online agora (para o painel e para saber a quem enviar push)
export function onlineDrivers(vehicleType) {
  return query(
    `SELECT id, name, push_token FROM users
     WHERE role = 'driver' AND driver_status = 'approved' AND is_online = TRUE
       AND ($1::text IS NULL OR vehicle_type = $1)`,
    [vehicleType || null]
  );
}

export function savePushToken(userId, token) {
  return query('UPDATE users SET push_token = $1 WHERE id = $2', [token || null, userId]);
}
