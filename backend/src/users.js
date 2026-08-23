import bcrypt from 'bcryptjs';
import { query, one } from './db.js';

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
  // A capacidade de conduzir deixou de depender do papel escolhido no
  // registo. Três estados diferentes, e a diferença importa:
  //   null        — nunca pediu para conduzir (a maioria das pessoas)
  //   'pending'   — pediu e aguarda decisão
  //   'approved'  — pode conduzir
  // Tratar "nunca pediu" como "à espera" mandaria todos os passageiros
  // para o ecrã de análise de documentos.
  base.driverStatus = row.driver_status || null;
  base.podeConduzir = row.driver_status === 'approved';
  if (row.driver_status_motivo) base.driverStatusMotivo = row.driver_status_motivo;
  if (row.vehicle_plate) {
    base.vehicle = {
      type: row.vehicle_type || 'car',
      model: row.vehicle_model || null,
      plate: row.vehicle_plate || null,
      color: row.vehicle_color || null,
      seats: row.vehicle_seats ?? null,
    };
  }
  if (row.is_admin) base.isAdmin = true;
  base.termsVersion = row.terms_version || null;
  base.driverTermsVersion = row.driver_terms_version || null;
  return base;
}

export function findUserById(id) {
  return one('SELECT * FROM users WHERE id = $1', [id]);
}

export function findUserByPhone(phone) {
  return one('SELECT * FROM users WHERE phone = $1', [normalizePhone(phone)]);
}

// Cria um utilizador. A restrição UNIQUE do telemóvel protege contra
// dois registos simultâneos com o mesmo número.
export async function createUser({ name, phone, email, password, role, vehicle, termsVersion }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const vehicleType =
    role === 'driver' ? (vehicle?.type === 'motorbike' ? 'motorbike' : 'car') : null;

  // Motoristas novos ficam à espera de aprovação; passageiros entram logo
  return one(
    `INSERT INTO users
       (name, phone, email, password_hash, role, vehicle_type, vehicle_model, vehicle_plate,
        vehicle_color, vehicle_seats, driver_status, terms_version, terms_accepted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     RETURNING *`,
    [
      name.trim(),
      normalizePhone(phone),
      email ? email.trim() : null,
      passwordHash,
      role,
      vehicleType,
      vehicle?.model?.trim() || null,
      vehicle?.plate?.trim() || null,
      vehicle?.color?.trim() || null,
      role === 'driver' && vehicleType === 'car' && vehicle?.seats
        ? Math.max(1, Math.min(12, Number(vehicle.seats)))
        : null,
      role === 'driver' ? 'pending' : null,
      termsVersion || null,
    ]
  );
}

export function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}
