import { query, one } from './db.js';

// Regista um pedido de ajuda. Nunca falha por falta de posição: se o GPS
// não responder no momento, o alerta chega na mesma — saber que alguém
// pediu ajuda é mais importante do que saber exactamente onde.
export function criarAlerta({ rideId, userId, lat, lng, note }) {
  return one(
    `INSERT INTO sos_alerts (ride_id, user_id, lat, lng, note)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [rideId || null, userId, lat ?? null, lng ?? null, note || null]
  );
}

export function alertasAbertos() {
  return query(
    `SELECT s.*, u.name AS quem, u.phone AS telefone, u.role AS papel,
            r.dest_label, r.status AS estado_viagem
     FROM sos_alerts s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN rides r ON r.id = s.ride_id
     WHERE s.resolved = FALSE
     ORDER BY s.created_at DESC`
  );
}

export function resolverAlerta(id) {
  return one('UPDATE sos_alerts SET resolved = TRUE WHERE id = $1 RETURNING id', [id]);
}

// Quantas viagens este utilizador cancelou nos últimos dias. Serve para
// distinguir um imprevisto de um padrão — cancelar uma vez acontece a
// toda a gente; cancelar cinco numa semana é outra coisa.
export async function cancelamentosRecentes(userId, dias = 7) {
  const r = await one(
    `SELECT COUNT(*)::int AS n FROM rides
     WHERE cancelled_by = $1 AND created_at > NOW() - ($2 || ' days')::interval`,
    [userId, String(dias)]
  );
  return r?.n || 0;
}
