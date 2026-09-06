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
export function updateLocation(userId, lat, lng) {
  return query(
    `UPDATE users SET last_lat = $1, last_lng = $2, last_seen_at = NOW(), municipio = $4
      WHERE id = $3`,
    [lat, lng, userId, municipioDe(lat, lng)]
  );
}

// Motoristas disponíveis, do mais próximo ao mais distante.
//
// A distância é calculada com a fórmula de Haversine em SQL. Para as
// distâncias de Díli é mais do que suficiente — uma extensão geográfica
// (PostGIS) só compensaria com muitos milhares de motoristas.
export function nearestDrivers({ lat, lng, vehicleType, limit = 10, maxKm = 15 }) {
  return query(
    `SELECT id, name, push_token, last_lat, last_lng,
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

// Motoristas online agora (para o painel e para saber a quem enviar push)
//
// A condição do sinal fresco faltava aqui e existia no `nearestDrivers` —
// o que dava duas respostas diferentes à mesma pergunta. O painel contava
// fantasmas de reinícios antigos, e o Simão via mais motoristas do que os
// que estavam de facto a trabalhar.
export function onlineDrivers(vehicleType) {
  return query(
    `SELECT id, name, push_token FROM users
     WHERE role = 'driver' AND driver_status = 'approved' AND is_online = TRUE
       AND last_seen_at > NOW() - INTERVAL '${SINAL_FRESCO}'
       AND ($1::text IS NULL OR vehicle_type = $1)`,
    [vehicleType || null]
  );
}

export function savePushToken(userId, token) {
  return query('UPDATE users SET push_token = $1 WHERE id = $2', [token || null, userId]);
}
