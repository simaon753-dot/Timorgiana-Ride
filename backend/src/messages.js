import { db } from './db.js';

export function toPublicMessage(row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function addMessage(rideId, senderId, body) {
  const res = db
    .prepare('INSERT INTO messages (ride_id, sender_id, body) VALUES (?, ?, ?)')
    .run(rideId, senderId, body.trim());
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(res.lastInsertRowid);
  return toPublicMessage(row);
}

export function listMessages(rideId) {
  return db
    .prepare('SELECT * FROM messages WHERE ride_id = ? ORDER BY id ASC')
    .all(rideId)
    .map(toPublicMessage);
}
