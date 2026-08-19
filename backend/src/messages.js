import { query, one } from './db.js';

export function toPublicMessage(row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function addMessage(rideId, senderId, body) {
  const row = await one(
    'INSERT INTO messages (ride_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *',
    [rideId, senderId, body.trim()]
  );
  return toPublicMessage(row);
}

export async function listMessages(rideId) {
  const rows = await query('SELECT * FROM messages WHERE ride_id = $1 ORDER BY id ASC', [rideId]);
  return rows.map(toPublicMessage);
}
