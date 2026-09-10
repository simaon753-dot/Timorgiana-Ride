import { query, one } from './db.js';
import { TIPOS_VEICULO } from './config.js';
import { municipioDe } from './municipios.js';

// Estados que ainda contam como "viagem a decorrer"
// Estados em que a viagem AINDA ESTÁ A ACONTECER e tem de aparecer ao
// abrir a app. Faltar aqui um estado faz a viagem desaparecer do ecrã de
// quem a está a fazer — foi o que aconteceu com 'in_progress': no
// instante em que o passageiro entrava no carro, os dois perdiam o mapa,
// a conversa, o botão de emergência e o botão de concluir.
const ACTIVE_PASSENGER = ['requested', 'accepted', 'arriving', 'in_progress'];
// Exportada de propósito. Havia uma segunda cópia desta lista escrita à mão
// dentro do socket, e essa cópia ficou sem 'in_progress' — o que fez a
// posição do motorista deixar de chegar ao passageiro assim que a viagem
// começava. Uma lista de estados escrita em dois sítios diverge; escrita num
// só, não pode.
export const ACTIVE_DRIVER = ['accepted', 'arriving', 'in_progress'];

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
  // ACABOU A VIAGEM, ACABAM OS TELEFONES.
  //
  // O histórico chamava esta função sem opções, e como a viagem terminada tem
  // `driver_id`, a regra de baixo deixava passar o número do passageiro. Ou
  // seja: cada motorista tinha, no ecrã do histórico, a lista de todas as
  // pessoas que levou, com telemóvel — e com as coordenadas de onde as foi
  // buscar, que para quem é apanhado à porta de casa é a morada.
  //
  // O número serve para o motorista ligar a quem vai buscar. Depois de chegar
  // ao destino não há mais nada para combinar, e o que sobra é uma lista de
  // contactos que ninguém deu.
  //
  // Vale para os dois lados e para o telefone do terceiro — que no caso de um
  // menor é o que mais importa.
  const terminada = row.status === 'completed' || row.status === 'cancelled';
  const podeVerTelefones = !terminada;
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
    // PORQUE É QUE A VIAGEM ACABOU.
    //
    // Faltava, e passou a fazer falta quando os pedidos sem resposta
    // começaram a fechar-se sozinhos ao fim de dez minutos: sem o motivo, a
    // viagem desaparecia do ecrã do passageiro sem explicação nenhuma — que é
    // indistinguível de uma avaria.
    cancelReason: row.cancel_reason || null,
    // O TELEFONE SÓ SAI DEPOIS DE HAVER MOTORISTA.
    //
    // A lista de pedidos por aceitar vai para TODOS os motoristas
    // disponíveis do município, e levava o número do passageiro com ela.
    // Bastava um motorista ficar ao serviço e não aceitar nada o dia
    // inteiro para recolher os números de toda a gente que pediu viagem
    // nesse dia — sem nunca ter conduzido ninguém.
    //
    // O número serve para o motorista ligar a quem vai buscar. Antes de
    // aceitar não há a quem ligar, logo não há razão para o ver. Depois de
    // aceitar há uma viagem combinada entre os dois, e aí faz sentido.
    //
    // `driver_id` é a linha que separa as duas situações, e é a mesma
    // condição do lado do motorista lá em baixo.
    passenger: {
      id: row.passenger_id,
      name: row.p_name,
      ...(podeVerTelefones && (paraPassageiro || row.driver_id) ? { phone: row.p_phone } : {}),
    },
    // ── Quem viaja, quando não é quem pede ──────────────────────────
    //
    // Antes de aceitar, o motorista recebe só o que precisa para DECIDIR:
    // que a viagem é para outra pessoa, e se essa pessoa é menor. É o que
    // torna o consentimento dele um consentimento — se soubesse depois de
    // aceitar, já não estaria a escolher.
    //
    // O nome e o telefone entram com a aceitação, pela mesma razão do
    // telefone do passageiro aqui em cima: antes disso não há a quem ligar
    // nem por quem perguntar.
    ...(row.viajante_nome
      ? {
          viajante: {
            menor: !!row.viajante_menor,
            // A QUEM DIZ RESPEITO, e não "depois de aceitar".
            //
            // A primeira versão escondia o nome e o telefone até haver
            // motorista. Protegia bem contra o motorista errado e apanhava
            // também QUEM PEDIU — que os acabou de escrever e precisa de os
            // reler no ecrã da viagem para confirmar que não trocou um
            // algarismo do número.
            //
            // Quem pediu vê sempre. O motorista vê depois de aceitar. Antes
            // disso recebe só o que precisa para decidir, que é saber que a
            // viagem é para outra pessoa e se essa pessoa é menor.
            ...(paraPassageiro || row.driver_id
              ? {
                  nome: row.viajante_nome,
                  ...(podeVerTelefones ? { telefone: row.viajante_telefone || null } : {}),
                }
              : {}),
          },
        }
      : {}),
    driver: row.driver_id
      ? {
          id: row.driver_id,
          name: row.d_name,
          ...(podeVerTelefones ? { phone: row.d_phone } : {}),
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
  passengerId,
  destLabel,
  destLat,
  destLng,
  originLabel,
  originLat,
  originLng,
  vehicleType,
  fareUsd,
  distanceKm = null,
  durationMin = null,
  passengers = null,
  // Quem viaja, quando não é quem pede. Tudo nulo no caso normal.
  viajanteNome = null,
  viajanteTelefone = null,
  viajanteMenor = false,
}) {
  // Quatro dígitos, com zeros à frente. Não é um segredo criptográfico —
  // é uma senha dita em voz alta à porta do carro, e vive uns minutos.
  const codigo = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  // O NOME MANDA. Sem nome não há viajante — o telefone e a marca de menor
  // ficam de fora também, mesmo que venham preenchidos.
  //
  // Sem isto, um pedido com telefone mas sem nome criava uma viagem que diz
  // "é para outra pessoa" e não sabe dizer para quem: o motorista chegava
  // sem saber por quem perguntar, e o registo do consentimento apontava a
  // ninguém.
  const nomeViajante =
    String(viajanteNome || '')
      .trim()
      .slice(0, 80) || null;
  const telefoneViajante = nomeViajante
    ? String(viajanteTelefone || '')
        .trim()
        .slice(0, 20) || null
    : null;
  const ehMenor = nomeViajante ? !!viajanteMenor : false;
  const inserted = await one(
    `INSERT INTO rides
       (passenger_id, dest_label, dest_lat, dest_lng, origin_label, origin_lat, origin_lng,
        vehicle_type, fare_usd, distance_km, duration_min, passengers,
        pickup_code, municipio,
        viajante_nome, viajante_telefone, viajante_menor, consentimento_em, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'requested')
     RETURNING id`,
    [
      passengerId,
      destLabel.trim(),
      num(destLat),
      num(destLng),
      originLabel?.trim() || null,
      num(originLat),
      num(originLng),
      TIPOS_VEICULO.includes(vehicleType) ? vehicleType : null,
      num(fareUsd),
      num(distanceKm),
      durationMin != null ? Math.round(Number(durationMin)) : null,
      passengers != null ? Math.max(1, Math.min(8, Number(passengers))) : null,
      codigo,
      // O município é o da RECOLHA, não o do destino. É de onde o passageiro
      // está à espera que interessa a quem o vai buscar: uma viagem de Díli
      // para Baucau é um pedido de Díli, e é em Díli que tem de aparecer.
      municipioDe(num(originLat), num(originLng)),
      nomeViajante,
      telefoneViajante,
      ehMenor,
      // O CONSENTIMENTO SÓ EXISTE SE HOUVER MENOR.
      //
      // Guardar a hora numa viagem de adulto seria guardar a declaração de
      // uma coisa que ninguém declarou. Um registo que diz mais do que
      // aconteceu não vale mais: vale menos, porque deixa de se poder
      // confiar nele.
      ehMenor ? new Date() : null,
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
//
// NAS DUAS COLUNAS, e não na que o papel mandar.
//
// A versão anterior escolhia a coluna pelo `role`: passageiro via as viagens
// que pediu, motorista via as que conduziu. Parecia razoável até uma pessoa
// ser as duas coisas — que é o caso normal aqui, porque tornar-se motorista
// numa conta de passageiro é um caminho que a app tem de propósito. Uma
// pessoa em Timor-Leste só pode ter três números de telemóvel; obrigá-la a
// uma segunda conta para conduzir era gastar um deles.
//
// Ao passar a `role = 'driver'`, o histórico de passageiro dela desaparecia
// do ecrã. As viagens continuavam na base — mas quem as tinha feito deixava
// de as ver, e isso é indistinguível de as ter perdido.
//
// A viagem activa já procurava nas duas colunas. Isto passa a fazer o mesmo.
export function getRideHistoryForUser(user, limit = 50) {
  return query(
    `SELECT sub.*, (
       SELECT stars FROM ratings WHERE ride_id = sub.id AND rater_id = $1
     ) AS my_stars
     FROM (${RIDE_SELECT}
            WHERE (r.passenger_id = $1 OR r.driver_id = $1)
              AND r.status IN ('completed','cancelled')) sub
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
  // Município do motorista, calculado da posição dele.
  //
  // Sem posição conhecida, fica `null` e o filtro deixa passar tudo. É
  // deliberado: um motorista de quem não sabemos onde está não pode ficar
  // sem trabalho nenhum por causa disso. O mesmo vale para viagens sem
  // município — pedidos antigos, ou sem coordenadas de origem.
  const meuMunicipio = municipioDe(
    typeof driverLat === 'number' ? driverLat : null,
    typeof driverLng === 'number' ? driverLng : null
  );
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
         AND (r.passengers IS NULL OR $4::int IS NULL OR r.passengers <= $4::int)
         AND (r.municipio IS NULL OR $5::text IS NULL OR r.municipio = $5::text)) sub
     ORDER BY pickup_km ASC NULLS LAST, sub.id ASC`,
    [
      driverVehicleType,
      typeof driverLat === 'number' ? driverLat : null,
      typeof driverLng === 'number' ? driverLng : null,
      driverSeats ?? null,
      meuMunicipio,
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
     SET driver_id = $1,
         -- A TARIFA CALCULADA NÃO SE DEIXA SUBSTITUIR.
         --
         -- Estava aqui um COALESCE do valor enviado, que escrevia o valor
         -- enviado pelo motorista, fosse ele qual fosse. Numa viagem com
         -- coordenadas o preço já foi calculado no servidor a partir da rota
         -- real — aceitar outro valor por cima era deitar fora essa garantia
         -- e deixar um telemóvel modificado escrever $50 numa viagem de $2.
         --
         -- Só se aceita valor de fora quando não HÁ preço calculado, que é o
         -- caso do destino escrito à mão: aí não há rota, não há distância, e
         -- o preço volta a ser combinado entre as duas pessoas.
         fare_usd = CASE WHEN distance_km IS NULL THEN COALESCE($2, fare_usd) ELSE fare_usd END,
         status = 'accepted', updated_at = NOW()
     WHERE id = $3 AND status = 'requested' AND driver_id IS NULL
       AND (passengers IS NULL OR $4::int IS NULL OR passengers <= $4::int)
       -- UM MOTORISTA, UMA VIAGEM DE CADA VEZ.
       --
       -- Faltava. O UPDATE verificava que a VIAGEM estava livre e nunca que o
       -- MOTORISTA estava — bastava uma corrida entre dois toques, ou um
       -- cliente modificado, para a mesma pessoa ficar com duas viagens. O
       -- segundo passageiro esperava por um carro que já ia a caminho de
       -- outro sítio, e é o mesmo mal do motorista fantasma por outra porta.
       AND NOT EXISTS (
         SELECT 1 FROM rides r2
          WHERE r2.driver_id = $1 AND r2.status = ANY($5)
       )
     RETURNING id`,
    [driverId, num(fareUsd), rideId, driverSeats ?? null, ACTIVE_DRIVER]
  );
  if (!updated) return null; // já aceite por outro, este já tem viagem, ou inexistente
  return getRideById(rideId);
}

// Este motorista já tem viagem a decorrer? Serve para distinguir as causas de
// uma recusa: dizer "já não está disponível" a quem na verdade tem uma viagem
// em curso manda a pessoa procurar o problema no sítio errado.
export function motoristaOcupado(driverId) {
  return one(`SELECT id FROM rides WHERE driver_id = $1 AND status = ANY($2) LIMIT 1`, [
    driverId,
    ACTIVE_DRIVER,
  ]);
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

// Escrever a tarifa à mão. SÓ onde não há preço calculado.
//
// A versão anterior escrevia qualquer valor em qualquer viagem, sem olhar ao
// preço que o servidor tinha calculado da rota real. A app não usava isto — mas
// o endereço estava aberto, e um cliente modificado cobrava o que quisesse.
//
// Devolve `null` quando a viagem tem preço calculado, para quem chama poder
// dizer porquê em vez de fingir que gravou.
export async function setRideFare(rideId, fareUsd) {
  const linha = await one(
    `UPDATE rides SET fare_usd = $1, updated_at = NOW()
      WHERE id = $2 AND distance_km IS NULL
      RETURNING id`,
    [num(fareUsd), rideId]
  );
  if (!linha) return null;
  return getRideById(rideId);
}

// PEDIDOS QUE NINGUÉM ACEITOU.
//
// `requested` conta como viagem a decorrer, e uma viagem a decorrer impede a
// pessoa de pedir outra. Juntas, as duas regras faziam isto: às onze da noite,
// sem motoristas ao serviço, o passageiro pedia, não acontecia nada — e ficava
// impedido de pedir outra vez até perceber sozinho que tinha de cancelar à mão.
//
// Ao fim de MINUTOS_ATE_DESISTIR o pedido morre por si. Dez minutos são
// generosos para quem está a acabar outra viagem e pouco para quem está à
// espera no passeio; e cancelado é melhor do que pendurado, porque cancelado
// deixa a pessoa pedir outra vez.
//
// A tabela é a autoridade e a hora é a do PostgreSQL — não a do processo. Se
// duas instâncias corressem isto ao mesmo tempo, o `status = 'requested'` na
// condição garante que cada viagem só é fechada uma vez.
export const MINUTOS_ATE_DESISTIR = Number(process.env.RIDE_TIMEOUT_MIN) || 10;

export function expirarPedidosSemResposta() {
  return query(
    `UPDATE rides
        SET status = 'cancelled', cancel_reason = 'sem_motorista', updated_at = NOW()
      WHERE status = 'requested' AND driver_id IS NULL
        AND created_at < NOW() - ($1 || ' minutes')::interval
      RETURNING id, passenger_id`,
    [String(MINUTOS_ATE_DESISTIR)]
  );
}
