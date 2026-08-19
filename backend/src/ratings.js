import { db } from './db.js';

// Já existe avaliação deste utilizador para esta viagem?
export function hasRated(rideId, raterId) {
  return !!db
    .prepare('SELECT 1 FROM ratings WHERE ride_id = ? AND rater_id = ?')
    .get(rideId, raterId);
}

// Regista uma avaliação e recalcula a média do avaliado.
// Tudo numa transação: ou grava a avaliação E actualiza a média, ou não faz nada.
export function addRating({ rideId, raterId, rateeId, stars }) {
  try {
    db.exec('BEGIN');
    db.prepare(
      'INSERT INTO ratings (ride_id, rater_id, ratee_id, stars) VALUES (?, ?, ?, ?)'
    ).run(rideId, raterId, rateeId, stars);

    const agg = db
      .prepare('SELECT COUNT(*) AS n, AVG(stars) AS avg FROM ratings WHERE ratee_id = ?')
      .get(rateeId);

    db.prepare('UPDATE users SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
      Math.round((agg.avg || 0) * 100) / 100,
      agg.n || 0,
      rateeId
    );
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { ok: true };
}
