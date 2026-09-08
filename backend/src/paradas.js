import { query, one } from './db.js';

// ONDE O CARRO PÁRA, quando quem sabe é uma pessoa e não um algoritmo.
//
// PORQUE ISTO EXISTE. Encostar um ponto à estrada mais próxima acerta quase
// sempre — e falha exactamente nos sítios que mais interessam.
//
// O Simão apontou o Cristo Rei. A estrada mais próxima do monumento, em linha
// recta, é a que passa por cima; mas ninguém é largado ali. Quem vai ao Cristo
// Rei é deixado em baixo, no Dolok Oan, onde começam as escadas. O GOOGLE
// TAMBÉM ERRA ALI — ele verificou. Não é um serviço melhor que resolve isto: é
// saber a terra.
//
// Uma paragem é um ponto que ELE define, uma vez, e que passa a valer para
// toda a gente. Guarda duas coordenadas: onde é o SÍTIO e onde PÁRA o carro.
//
// Vale para lugares nossos e para lugares do Google por igual, porque a
// correspondência é por DISTÂNCIA e não por identificador. Ninguém tem de
// registar o Cristo Rei na nossa base para lhe corrigir a paragem.

// A que distância do sítio é que um pedido ainda conta como sendo dali.
//
// Guardado por paragem, e não fixo: um monumento com um recinto grande precisa
// de mais raio do que uma loja. O valor por omissão são 150 metros, que chega
// para um edifício e para o seu pátio sem apanhar o vizinho do lado.
const RAIO_POR_OMISSAO_M = 150;

export async function listarParadas() {
  return query(
    `SELECT p.id, p.nome, p.lat, p.lng, p.parada_lat, p.parada_lng, p.raio_m,
            p.created_at, u.name AS criada_por
       FROM paradas p LEFT JOIN users u ON u.id = p.criado_por
      ORDER BY p.nome`
  );
}

export function criarParada({ nome, lat, lng, paradaLat, paradaLng, raioM, adminId }) {
  return one(
    `INSERT INTO paradas (nome, lat, lng, parada_lat, parada_lng, raio_m, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, nome, lat, lng, parada_lat, parada_lng, raio_m`,
    [
      String(nome || '')
        .trim()
        .slice(0, 120),
      lat,
      lng,
      paradaLat,
      paradaLng,
      Number(raioM) > 0 ? Math.min(2000, Math.round(Number(raioM))) : RAIO_POR_OMISSAO_M,
      adminId || null,
    ]
  );
}

export function apagarParada(id) {
  return one('DELETE FROM paradas WHERE id = $1 RETURNING id, nome', [id]);
}

// A paragem que cobre este ponto, se houver alguma.
//
// A distância é calculada em SQL, com a mesma fórmula que já ordena os
// motoristas por proximidade. A mais próxima ganha: se duas paragens se
// sobrepuserem — um centro comercial dentro do recinto de um mercado — vale a
// que estiver mais perto do que a pessoa apontou.
export async function paragemQueCobre(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return one(
    `SELECT id, nome, parada_lat AS lat, parada_lng AS lng,
            6371000 * 2 * asin(sqrt(
              power(sin(radians($1 - p.lat) / 2), 2) +
              cos(radians(p.lat)) * cos(radians($1)) *
              power(sin(radians($2 - p.lng) / 2), 2)
            )) AS metros
       FROM paradas p
      WHERE 6371000 * 2 * asin(sqrt(
              power(sin(radians($1 - p.lat) / 2), 2) +
              cos(radians(p.lat)) * cos(radians($1)) *
              power(sin(radians($2 - p.lng) / 2), 2)
            )) <= p.raio_m
      ORDER BY metros ASC
      LIMIT 1`,
    [lat, lng]
  );
}
