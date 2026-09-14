import { query, one } from './db.js';
import { config } from './config.js';
import { nearestDrivers } from './drivers.js';
import { cabe } from './capacidade.js';
import { notificarMotoristaDisponivel } from './push.js';

// "AVISAR QUANDO HOUVER MOTORISTA" (14/09/26).
//
// O passageiro sem ninguém por perto deixa um pedido de aviso, e não uma
// viagem. A diferença importa: uma viagem pendurada à espera obrigava-o a
// aceitar um preço e a ficar preso a ela; um aviso só lhe diz "já há quem
// possa ir", e ele volta e decide com o preço à frente.
//
// Vive duas horas. Quem pediu às dez da manhã não quer ser acordado à meia-
// noite por um motorista que se ligou tarde.

export const HORAS_DO_AVISO = 2;

// Um aviso por passageiro: pedir outro substitui o anterior.
export async function criarAviso({ passengerId, vehicleType, lat, lng, cargaVolume }) {
  await cancelarAvisos(passengerId);
  return one(
    `INSERT INTO avisos_motorista (passenger_id, vehicle_type, lat, lng, carga_volume, expira_em)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '2 hours')
     RETURNING id, expira_em`,
    [passengerId, vehicleType, lat, lng, cargaVolume || null]
  );
}

export function cancelarAvisos(passengerId) {
  return query('DELETE FROM avisos_motorista WHERE passenger_id = $1 AND avisado_em IS NULL', [
    passengerId,
  ]);
}

// O varrimento. Para cada aviso por cumprir: há um motorista do tipo certo,
// ao serviço, perto, sem viagem, e em cujo veículo a carga caiba? Então
// avisa-se — uma vez — e o aviso fica cumprido.
export async function verificarAvisos() {
  const pendentes = await query(
    `SELECT a.id, a.vehicle_type, a.lat, a.lng, a.carga_volume, u.push_token
     FROM avisos_motorista a JOIN users u ON u.id = a.passenger_id
     WHERE a.avisado_em IS NULL AND a.expira_em > NOW()
     ORDER BY a.id LIMIT 50`
  );
  if (!pendentes.length) return 0;
  const ocupados = new Set(
    (
      await query(
        `SELECT DISTINCT driver_id FROM rides
         WHERE status IN ('accepted', 'arriving', 'in_progress') AND driver_id IS NOT NULL`
      )
    ).map((r) => r.driver_id)
  );
  let enviados = 0;
  for (const a of pendentes) {
    const perto = await nearestDrivers({
      lat: a.lat,
      lng: a.lng,
      vehicleType: a.vehicle_type,
      limit: 10,
      maxKm: config.raioAvisoKm,
    });
    const livre = perto.find(
      (d) => !ocupados.has(d.id) && cabe(a.carga_volume, d.vehicle_capacidade)
    );
    if (!livre) continue;
    await query('UPDATE avisos_motorista SET avisado_em = NOW() WHERE id = $1', [a.id]);
    if (a.push_token) {
      await notificarMotoristaDisponivel(a.push_token, a.vehicle_type).catch(() => {});
    }
    enviados += 1;
  }
  return enviados;
}

export function limparAvisosVelhos() {
  return query(`DELETE FROM avisos_motorista WHERE expira_em < NOW() - INTERVAL '1 day'`);
}
