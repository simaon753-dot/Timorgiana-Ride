import { query, one } from './db.js';

// Estados que ainda contam como "viagem a decorrer"
// Estados em que a viagem AINDA ESTÁ A ACONTECER e tem de aparecer ao
// abrir a app. Faltar aqui um estado faz a viagem desaparecer do ecrã de
// quem a está a fazer — foi o que aconteceu com 'in_progress': no
// instante em que o passageiro entrava no carro, os dois perdiam o mapa,
// a conversa, o botão de emergência e o botão de concluir.
const ACTIVE_PASSENGER = ['requested', 'accepted', 'arriving', 'in_progress'];
const ACTIVE_DRIVER = ['accepted', 'arriving', 'in_progress'];

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

// Converte a linha (já com os JOINs) num objeto público.
//
// O código de recolha só sai se for pedido explicitamente. Se o motorista
// o visse, deixava de provar o que quer que fosse — podia começar a viagem
// sem o passageiro estar no carro.
//
// O segundo argumento é um OBJECTO e não um booleano, por uma razão
// aprendida à força: `rows.map(toPublicRide)` passa o ÍNDICE como segundo
// argumento. Com um booleano, o índice 0 era falso (seguro) e o 1 em
// diante era verdadeiro — a partir da segunda viagem de qualquer lista, o
// código vazava. Com um objecto, um número não tem a propriedade e o valor
// seguro mantém-se, aconteça o que acontecer.
export function toPublicRide(row, opcoes = {}) {
  if (!row) return null;
  const paraPassageiro = opcoes?.paraPassageiro === true;
  return {
    ...(paraPassageiro && row.pickup_code ? { pickupCode: row.pickup_code } : {}),
    ...(row.my_stars !== undefined ? { myStars: row.my_stars } : {}),
    ...(row.pickup_km !== undefined
      ? { pickupKm: row.pickup_km != null ? Math.round(row.pickup_km * 10) / 10 : null }
      : {}),
    id: row.id,
    status: row.status,
    destLabel: row.dest_label,
    destLat: row.dest_lat ?? null,
    destLng: row.dest_lng ?? null,
    originLabel: row.origin_label || null,
    originLat: row.origin_lat ?? null,
    originLng: row.origin_lng ?? null,
    vehicleType: row.vehicle_type || null,
    passengers: row.passengers ?? null,
    startedAt: row.started_at ?? null,
    fareUsd: row.fare_usd ?? null,
    distanceKm: row.distance_km ?? null,
    durationMin: row.duration_min ?? null,
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
  distanceKm = null, durationMin = null, passengers = null,
}) {
  // Quatro dígitos, com zeros à frente. Não é um segredo criptográfico —
  // é uma senha dita em voz alta à porta do carro, e vive uns minutos.
  const codigo = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const inserted = await one(
    `INSERT INTO rides
       (passenger_id, dest_label, dest_lat, dest_lng, origin_label, origin_lat, origin_lng,
        vehicle_type, fare_usd, distance_km, duration_min, passengers,
        pickup_code, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'requested')
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
      num(distanceKm),
      durationMin != null ? Math.round(Number(durationMin)) : null,
      passengers != null ? Math.max(1, Math.min(8, Number(passengers))) : null,
      codigo,
    ]
  );
  return getRideById(inserted.id);
}

// Viagem ativa do utilizador, seja de que lado for.
//
// Já não se pergunta "esta pessoa é passageiro ou motorista?" — pergunta-se
// "esta pessoa está nalguma viagem a decorrer?". A mesma conta pode pedir
// hoje e conduzir amanhã, e nenhum dos dois casos deve esconder o outro.
//
// A ordem importa: uma viagem que EU conduzo tem precedência sobre uma que
// eu pedi, porque estar ao volante é o que exige atenção imediata. Na
// prática não acontecem as duas ao mesmo tempo, mas se acontecerem é essa
// que tem de aparecer.
export function getActiveRideForUser(user) {
  return one(
    `${RIDE_SELECT}
     WHERE (r.driver_id = $1 AND r.status = ANY($2))
        OR (r.passenger_id = $1 AND r.status = ANY($3))
     ORDER BY (r.driver_id = $1) DESC, r.id DESC
     LIMIT 1`,
    [user.id, ACTIVE_DRIVER, ACTIVE_PASSENGER]
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

// Pedidos por atribuir que um motorista pode aceitar, do mais próximo
// ao mais distante. Todos os elegíveis continuam a ver todos os pedidos —
// com poucos motoristas, enviar só ao mais próximo arrisca que um pedido
// fique sem resposta se essa pessoa estiver distraída.
// `driverSeats` = lugares do carro. Um pedido de 5 pessoas não deve
// sequer aparecer a quem tem 4 lugares: mostrar e depois recusar seria
// fazer o motorista perder tempo e o passageiro perder a viagem.
export function getAvailableRidesForDriver(driverVehicleType, driverLat, driverLng, driverSeats) {
  // Uma só forma de consulta, sempre com os mesmos quatro parâmetros. A
  // versão anterior montava o SQL de duas maneiras conforme houvesse
  // posição, e no caso sem posição sobravam parâmetros que a consulta não
  // referia — o PostgreSQL não consegue inferir o tipo de um parâmetro que
  // não é usado, e recusava tudo. Guardar a variação DENTRO do SQL, com
  // casts explícitos, evita duas formas que podem divergir.
  return query(
    `SELECT sub.*,
       CASE
         WHEN sub.origin_lat IS NULL OR $2::float IS NULL THEN NULL
         ELSE 6371 * 2 * asin(sqrt(
                power(sin(radians($2::float - sub.origin_lat) / 2), 2) +
                cos(radians(sub.origin_lat)) * cos(radians($2::float)) *
                power(sin(radians($3::float - sub.origin_lng) / 2), 2)
              ))
       END AS pickup_km
     FROM (${RIDE_SELECT}
       WHERE r.status = 'requested' AND r.driver_id IS NULL
         AND (r.vehicle_type IS NULL OR r.vehicle_type = $1)
         AND (r.passengers IS NULL OR $4::int IS NULL OR r.passengers <= $4::int)) sub
     ORDER BY pickup_km ASC NULLS LAST, sub.id ASC`,
    [
      driverVehicleType,
      typeof driverLat === 'number' ? driverLat : null,
      typeof driverLng === 'number' ? driverLng : null,
      driverSeats ?? null,
    ]
  );
}

// Aceitar de forma ATÓMICA: a condição vai DENTRO do UPDATE, por isso se
// dois motoristas carregarem ao mesmo tempo só um encontra a linha livre.
export async function acceptRide(rideId, driverId, fareUsd, driverSeats) {
  // A condição dos lugares vai DENTRO do UPDATE, tal como a da corrida já
  // estar livre. A app filtra a lista, mas isso é conveniência — um
  // telemóvel modificado aceitaria à mesma, e ficariam pessoas de fé em
  // pé na rua.
  const updated = await one(
    `UPDATE rides
     SET driver_id = $1, fare_usd = COALESCE($2, fare_usd),
         status = 'accepted', updated_at = NOW()
     WHERE id = $3 AND status = 'requested' AND driver_id IS NULL
       AND (passengers IS NULL OR $4::int IS NULL OR passengers <= $4::int)
     RETURNING id`,
    [driverId, num(fareUsd), rideId, driverSeats ?? null]
  );
  if (!updated) return null; // já aceite por outro, ou inexistente
  return getRideById(rideId);
}

// Começa a viagem SE o código estiver certo. A comparação vai dentro do
// UPDATE, como a da aceitação: assim não há um instante entre verificar e
// escrever em que outra coisa possa acontecer.
export async function iniciarViagem(rideId, driverId, codigo) {
  const linha = await one(
    `UPDATE rides
     SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2
       AND status IN ('accepted','arriving')
       AND pickup_code = $3
     RETURNING id`,
    [rideId, driverId, String(codigo || '').trim()]
  );
  if (!linha) return null;
  return getRideById(rideId);
}

export async function setRideStatus(rideId, status, porQuem = null) {
  await query(
    `UPDATE rides SET status = $1, updated_at = NOW(),
            cancelled_by = COALESCE($3, cancelled_by)
     WHERE id = $2`,
    [status, rideId, porQuem]
  );
  return getRideById(rideId);
}

export async function setRideFare(rideId, fareUsd) {
  await query('UPDATE rides SET fare_usd = $1, updated_at = NOW() WHERE id = $2', [
    num(fareUsd),
    rideId,
  ]);
  return getRideById(rideId);
}
