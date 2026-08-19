import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

// Garantir que a pasta da base de dados existe
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new DatabaseSync(config.dbFile);

// Boas práticas para SQLite em servidor: WAL e foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// --- Esquema -------------------------------------------------------------
// Toda a camada de BD está isolada aqui. Para migrar para PostgreSQL mais
// tarde basta reescrever este ficheiro e os módulos de acesso a dados.

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    phone         TEXT    NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('passenger', 'driver')),
    -- Campos só para motoristas (NULL para passageiros)
    -- vehicle_type: 'car' (carro) ou 'motorbike' (motorizada / mota-táxi)
    vehicle_type  TEXT    CHECK (vehicle_type IN ('car', 'motorbike')),
    vehicle_model TEXT,
    vehicle_plate TEXT,
    vehicle_color TEXT,
    -- Avaliação média (calculada a partir de ratings)
    rating_avg    REAL    NOT NULL DEFAULT 0,
    rating_count  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id    INTEGER NOT NULL REFERENCES users(id),
    driver_id       INTEGER REFERENCES users(id),
    origin_label    TEXT,
    origin_lat      REAL,
    origin_lng      REAL,
    dest_label      TEXT    NOT NULL,
    dest_lat        REAL,
    dest_lng        REAL,
    fare_usd        REAL,
    -- Tipo de veículo pedido pelo passageiro (NULL = qualquer)
    vehicle_type    TEXT    CHECK (vehicle_type IN ('car', 'motorbike')),
    -- requested -> accepted -> arriving -> completed -> cancelled
    status          TEXT    NOT NULL DEFAULT 'requested'
                            CHECK (status IN ('requested','accepted','arriving','completed','cancelled')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id     INTEGER NOT NULL REFERENCES rides(id),
    sender_id   INTEGER NOT NULL REFERENCES users(id),
    body        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id     INTEGER NOT NULL REFERENCES rides(id),
    rater_id    INTEGER NOT NULL REFERENCES users(id),
    ratee_id    INTEGER NOT NULL REFERENCES users(id),
    stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (ride_id, rater_id)
  );

  CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
  CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
  CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id);
`);

// --- Migrações simples (para bases de dados criadas antes de novas colunas) ---
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] Migração: ${table}.${column} adicionada.`);
  }
}
addColumnIfMissing('users', 'vehicle_type', 'TEXT');
addColumnIfMissing('rides', 'vehicle_type', 'TEXT');

console.log('[db] Base de dados pronta:', config.dbFile);
