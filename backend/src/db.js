import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// --- Ligação -------------------------------------------------------------
// Em produção o alojamento fornece DATABASE_URL. Os serviços geridos
// (Neon, Render, Railway…) exigem TLS, mas usam certificados que o Node
// não reconhece por omissão — daí o rejectUnauthorized: false.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err.message);
});

// Atalhos: query devolve linhas; one devolve a primeira (ou undefined)
export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

export async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0];
}

// Executa várias instruções numa transação. Recebe uma função que usa
// o cliente dedicado — se lançar erro, faz ROLLBACK de tudo.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// --- Esquema -------------------------------------------------------------
// Criado no arranque. É idempotente: correr várias vezes não faz mal.
export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL UNIQUE,
      email         TEXT,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('passenger','driver')),
      vehicle_type  TEXT CHECK (vehicle_type IN ('car','motorbike')),
      vehicle_model TEXT,
      vehicle_plate TEXT,
      vehicle_color TEXT,
      -- Só motoristas: pending -> approved | rejected.
      -- Um motorista só recebe pedidos depois de aprovado.
      driver_status TEXT CHECK (driver_status IN ('pending','approved','rejected')),
      is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
      -- Só motoristas: se está a aceitar pedidos neste momento
      is_online     BOOLEAN NOT NULL DEFAULT FALSE,
      -- Última posição conhecida, para o passageiro ver o motorista
      -- a aproximar-se e para escolher o motorista mais próximo
      last_lat      DOUBLE PRECISION,
      last_lng      DOUBLE PRECISION,
      last_seen_at  TIMESTAMPTZ,
      rating_avg    REAL NOT NULL DEFAULT 0,
      rating_count  INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rides (
      id           SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL REFERENCES users(id),
      driver_id    INTEGER REFERENCES users(id),
      origin_label TEXT,
      origin_lat   DOUBLE PRECISION,
      origin_lng   DOUBLE PRECISION,
      dest_label   TEXT NOT NULL,
      dest_lat     DOUBLE PRECISION,
      dest_lng     DOUBLE PRECISION,
      fare_usd     REAL,
      vehicle_type TEXT CHECK (vehicle_type IN ('car','motorbike')),
      status       TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested','accepted','arriving','in_progress','completed','cancelled')),
      cancelled_by INTEGER REFERENCES users(id),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Documentos dos motoristas (carta de condução, documento do veículo).
  // Guardados na própria base de dados: para um piloto com poucos
  // motoristas chega, e evita depender de mais um serviço externo.
  // Se crescer, esta tabela é o único sítio a mudar.
  await query(`
    CREATE TABLE IF NOT EXISTS driver_documents (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      kind       TEXT NOT NULL CHECK (kind IN ('licence','vehicle','photo')),
      mime       TEXT NOT NULL,
      bytes      BYTEA NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, kind)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER NOT NULL REFERENCES rides(id),
      sender_id  INTEGER NOT NULL REFERENCES users(id),
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Alertas de emergência. Guardados com a posição do momento: se algo
  // correr mal durante uma viagem, o que interessa é saber ONDE estava a
  // pessoa quando pediu ajuda, não onde estava quando entrou no carro.
  await query(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER REFERENCES rides(id),
      user_id    INTEGER NOT NULL REFERENCES users(id),
      lat        DOUBLE PRECISION,
      lng        DOUBLE PRECISION,
      note       TEXT,
      resolved   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER NOT NULL REFERENCES rides(id),
      rater_id   INTEGER NOT NULL REFERENCES users(id),
      ratee_id   INTEGER NOT NULL REFERENCES users(id),
      stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (ride_id, rater_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id)');

  // --- Migrações para bases criadas antes destas colunas ---
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_status TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
  // Motoristas que já existiam ficam aprovados: foram criados antes da
  // regra existir e bloqueá-los agora quebraria contas em uso.
  await query(
    `UPDATE users SET driver_status = 'approved'
     WHERE role = 'driver' AND driver_status IS NULL`
  );

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT`);

  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id)`);
  // A rota é calculada para fixar o preço; guardá-la evita pedir outra vez
  // ao OSRM só para mostrar quanto tempo demora a viagem.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km REAL`);
  // Porque é que a viagem foi cancelada. Guardado como código curto e não
  // como texto livre: serve para contar padrões, não para ler histórias.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancel_reason TEXT`);
  // Quantas pessoas vão na viagem. Só faz sentido em carro — numa
  // motorizada vai sempre uma.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS passengers INTEGER`);
  // Lugares do carro, SEM contar o motorista.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_seats INTEGER`);

  // Código que o passageiro diz ao motorista para a viagem começar. Prova
  // que quem entrou no carro é quem pediu, e impede o motorista de marcar
  // viagens que não fez.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_code TEXT`);
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`);
  // A restrição original não conhecia 'in_progress'. Substituí-la em vez
  // de a apagar: uma coluna de estado sem restrição aceita erros de
  // escrita para sempre e só se descobre quando a app não sabe desenhar
  // um estado que não existe.
  await query(`ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check`);
  await query(`
    ALTER TABLE rides ADD CONSTRAINT rides_status_check
    CHECK (status IN ('requested','accepted','arriving','in_progress','completed','cancelled'))
  `);

  // Validade dos documentos. Guardar a imagem sem a data dá aparência de
  // legalidade sem a substância: uma carta caducada é pior do que nenhuma,
  // porque passou por uma verificação.
  await query(`ALTER TABLE driver_documents ADD COLUMN IF NOT EXISTS expires_on DATE`);

  // Foto do turno: quem está ao volante HOJE. Os documentos verificam a
  // conta; isto verifica a pessoa. Um motorista aprovado que empresta o
  // telemóvel ao primo é o problema mais comum deste negócio.
  await query(`
    CREATE TABLE IF NOT EXISTS driver_shifts (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      dia        DATE NOT NULL,
      mime       TEXT NOT NULL,
      bytes      BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, dia)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_turnos_dia ON driver_shifts(dia DESC)');
  // Mensagens automáticas do serviço não têm remetente humano.
  await query(`ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT`);
  // Prova de que os termos foram aceites, e qual versão. A versão importa:
  // se os termos mudarem, é preciso saber quem aceitou o quê.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_terms_version TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_terms_accepted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_min INTEGER`);

  await query('CREATE INDEX IF NOT EXISTS idx_docs_user ON driver_documents(user_id)');
  // Que tipo de emergência foi pedida. Sem isto, quem responde não sabe
  // se manda uma ambulância ou chama a polícia.
  await query(`ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS tipo TEXT`);
  await query('CREATE INDEX IF NOT EXISTS idx_sos_aberto ON sos_alerts(resolved, created_at DESC)');
  await query('CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE role = \'driver\'');

  const [{ now }] = await query('SELECT NOW() AS now');
  console.log('[db] PostgreSQL pronto —', now.toISOString());
}
