import { one, tx } from './db.js';

// Já existe avaliação deste utilizador para esta viagem?
export async function hasRated(rideId, raterId) {
  const row = await one('SELECT 1 FROM ratings WHERE ride_id = $1 AND rater_id = $2', [
    rideId,
    raterId,
  ]);
  return !!row;
}

// Regista uma avaliação e recalcula a média do avaliado.
// Numa transação: ou grava a avaliação E actualiza a média, ou não faz nada.
export async function addRating({ rideId, raterId, rateeId, stars }) {
  await tx(async (client) => {
    await client.query(
      'INSERT INTO ratings (ride_id, rater_id, ratee_id, stars) VALUES ($1,$2,$3,$4)',
      [rideId, raterId, rateeId, stars]
    );

    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS n, AVG(stars)::float AS avg FROM ratings WHERE ratee_id = $1',
      [rateeId]
    );
    const agg = rows[0];

    await client.query('UPDATE users SET rating_avg = $1, rating_count = $2 WHERE id = $3', [
      Math.round((agg.avg || 0) * 100) / 100,
      agg.n || 0,
      rateeId,
    ]);
  });
  return { ok: true };
}
