import bcrypt from 'bcryptjs';
import { db } from './db.js';

// Normaliza o número de telemóvel: remove espaços e símbolos comuns.
// Em Timor-Leste o indicativo é +670. Guardamos o que o utilizador
// escreve, mas de forma consistente para evitar duplicados.
export function normalizePhone(phone) {
  return String(phone || '').replace(/[\s()-]/g, '').trim();
}

// Converte uma linha da BD no formato público (sem o hash da palavra-passe)
export function toPublicUser(row) {
  if (!row) return null;
  const base = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    role: row.role,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    createdAt: row.created_at,
  };
  if (row.role === 'driver') {
    base.vehicle = {
      type: row.vehicle_type || 'car', // 'car' | 'motorbike'
      model: row.vehicle_model || null,
      plate: row.vehicle_plate || null,
      color: row.vehicle_color || null,
    };
  }
  return base;
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function findUserByPhone(phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizePhone(phone));
}

// Cria um utilizador. Lança erro se o telemóvel já existir.
export async function createUser({ name, phone, email, password, role, vehicle }) {
  const passwordHash = await bcrypt.hash(password, 10);

  // Tipo de veículo só se aplica a motoristas; por omissão 'car'
  const vehicleType =
    role === 'driver' ? (vehicle?.type === 'motorbike' ? 'motorbike' : 'car') : null;

  const stmt = db.prepare(`
    INSERT INTO users (name, phone, email, password_hash, role, vehicle_type, vehicle_model, vehicle_plate, vehicle_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name.trim(),
    normalizePhone(phone),
    email ? email.trim() : null,
    passwordHash,
    role,
    vehicleType,
    vehicle?.model?.trim() || null,
    vehicle?.plate?.trim() || null,
    vehicle?.color?.trim() || null
  );
  return findUserById(result.lastInsertRowid);
}

// Confere a palavra-passe contra o hash guardado
export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}
