import { query, one } from './db.js';

export function toPublicMessage(row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    senderId: row.sender_id,
    body: row.body,
    kind: row.kind || null,
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

// Mensagem escrita pelo serviço, não por uma pessoa. Guarda-se um CÓDIGO
// (ex.: 'aceite') em vez do texto: o passageiro pode ler em português e o
// motorista em tétum, e o texto é escolhido na app conforme a língua de
// cada um. Guardar a frase feita obrigaria a escolher uma língua para os
// dois.
export async function addSystemMessage(rideId, codigo) {
  const row = await one(
    "INSERT INTO messages (ride_id, sender_id, body, kind) VALUES ($1, NULL, $2, 'sistema') RETURNING *",
    [rideId, codigo]
  );
  return toPublicMessage(row);
}

export async function listMessages(rideId) {
  const rows = await query('SELECT * FROM messages WHERE ride_id = $1 ORDER BY id ASC', [rideId]);
  return rows.map(toPublicMessage);
}
