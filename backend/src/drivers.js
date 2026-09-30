import { query, one } from './db.js';
import { municipioDe } from './municipios.js';

// QUANTO TEMPO SEM SINAL ATÉ DEIXARMOS DE ACREDITAR.
//
// Um motorista disponível manda a posição de 12 em 12 segundos, esteja ou
// não em viagem (ver o RideContext da app). Dez minutos são cinquenta
// batidas falhadas: quem esteve mesmo a trabalhar nunca é apanhado por
// isto, e quem desapareceu não fica eternamente à espera de pedidos que
// não vai ver.
//
// É generoso de propósito. Em Díli a rede vai-se, e a app em segundo plano
// deixa de correr temporizadores — mas o telemóvel continua a receber
// notificações. Cortar cedo de mais seria tirar trabalho a quem o podia
// aceitar.
export const SINAL_FRESCO = '10 minutes';

// Marca como indisponível quem está dado como disponível e não dá sinal.
//
// PORQUE ISTO EXISTE. O `disconnect` do socket trata do caso normal: a app
// fecha, o socket cai, o motorista sai de serviço. Mas o `disconnect` mora
// no servidor — e quando é o SERVIDOR que reinicia, morre com ele. Fica na
// base de dados um bando de motoristas marcados como disponíveis, sem
// ligação nenhuma e sem ninguém para dar a notícia.
//
// No plano gratuito do Render isso acontece a cada publicação e sempre que
// o serviço acorda de dormir. Foi assim que hoje, 06/09/2026, ficou um
// motorista fantasma — e um passageiro a sério podia ter esperado por ele.
//
// Não se limpa toda a gente ao arrancar, que seria o atalho: isso desligava
// quem estava mesmo a trabalhar e ainda não teve tempo de voltar a ligar-se.
// Limpa-se só quem não dá sinal.
export function marcarAusentesOffline() {
  return query(
    `UPDATE users SET is_online = FALSE
      WHERE role = 'driver' AND is_online = TRUE
        AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '${SINAL_FRESCO}')
      RETURNING id, name`
  );
}

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
export function updateLocation(userId, lat, lng, precisao = null) {
  return query(
    `UPDATE users SET last_lat = $1, last_lng = $2, last_seen_at = NOW(), municipio = $4,
            last_precisao_m = $5
      WHERE id = $3`,
    [lat, lng, userId, municipioDe(lat, lng), precisao]
  );
}

// Motoristas disponíveis, do mais próximo ao mais distante.
//
// A distância é calculada com a fórmula de Haversine em SQL. Para as
// distâncias de Díli é mais do que suficiente — uma extensão geográfica
// (PostGIS) só compensaria com muitos milhares de motoristas.
export function nearestDrivers({ lat, lng, vehicleType, limit = 10, maxKm = 15 }) {
  return query(
    `SELECT id, name, push_token, lingua, last_lat, last_lng, vehicle_capacidade,
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
       AND last_seen_at > NOW() - INTERVAL '${SINAL_FRESCO}'
     ORDER BY km ASC
     LIMIT $4`,
    [lat, lng, vehicleType || null, limit]
  ).then((rows) => rows.filter((r) => r.km == null || r.km <= maxKm));
}

// QUANTOS MOTORISTAS LIVRES HÁ PERTO, por tipo de veículo (30/09/2026).
//
// Pedido do Simão: a app mostra num ícone quantos motoristas activos há
// perto — no ecrã de início e no cartão do veículo — e um «0» vermelho
// quando não há nenhum. Conta-se no servidor e só se manda o NÚMERO: a
// posição de cada motorista não sai daqui.
//
// «Activo» é o mesmo do `nearestDrivers`: aprovado, disponível e com sinal
// fresco. E LIVRE: quem está numa viagem (os estados de `ACTIVE_DRIVER` em
// rides.js, escritos aqui por extenso porque rides.js importa este ficheiro)
// não conta — não pode aceitar outra.
//
// O raio: 5 km, que em Díli é uns dez minutos de mota. A contagem pára nos
// 10; a app mostra «9+» daí para cima. Com a caixa em graus antes da conta
// da distância, e tipos explícitos: `$1 - $3` entre parâmetros sem tipo é
// recusado pelo Postgres (lição de 29/09, escolherParagem).
export const RAIO_MOTORISTAS_PERTO_KM = 5;
export const CONTAGEM_MAX = 10;
export async function contarMotoristasPerto(lat, lng, raioKm = RAIO_MOTORISTAS_PERTO_KM) {
  const dLat = raioKm / 110.574;
  const dLng = raioKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const rows = await query(
    `SELECT vehicle_type AS tipo, LEAST(COUNT(*), ${CONTAGEM_MAX})::int AS n
       FROM users u
      WHERE role = 'driver'
        AND driver_status = 'approved'
        AND is_online = TRUE
        AND last_seen_at > NOW() - INTERVAL '${SINAL_FRESCO}'
        AND last_lat BETWEEN $1::float8 - $3::float8 AND $1::float8 + $3::float8
        AND last_lng BETWEEN $2::float8 - $4::float8 AND $2::float8 + $4::float8
        AND 6371 * 2 * asin(sqrt(
              power(sin(radians($1::float8 - last_lat) / 2), 2) +
              cos(radians(last_lat)) * cos(radians($1::float8)) *
              power(sin(radians($2::float8 - last_lng) / 2), 2)
            )) <= $5::float8
        AND NOT EXISTS (
              SELECT 1 FROM rides r
               WHERE r.driver_id = u.id AND r.status IN ('accepted', 'arriving', 'in_progress')
            )
      GROUP BY vehicle_type`,
    [lat, lng, dLat, dLng, raioKm]
  );
  const contagens = {};
  for (const r of rows) if (r.tipo) contagens[r.tipo] = Number(r.n) || 0;
  return contagens;
}

// Motoristas online agora (para o painel e para saber a quem enviar push)
//
// A condição do sinal fresco faltava aqui e existia no `nearestDrivers` —
// o que dava duas respostas diferentes à mesma pergunta. O painel contava
// fantasmas de reinícios antigos, e o Simão via mais motoristas do que os
// que estavam de facto a trabalhar.
export function onlineDrivers(vehicleType) {
  return query(
    `SELECT id, name, push_token, lingua, vehicle_capacidade FROM users
     WHERE role = 'driver' AND driver_status = 'approved' AND is_online = TRUE
       AND last_seen_at > NOW() - INTERVAL '${SINAL_FRESCO}'
       AND ($1::text IS NULL OR vehicle_type = $1)`,
    [vehicleType || null]
  );
}

export function savePushToken(userId, token) {
  return query('UPDATE users SET push_token = $1 WHERE id = $2', [token || null, userId]);
}
