import { query, one } from './db.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB por documento
const TIPOS = ['licence', 'vehicle', 'photo'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function isValidKind(kind) {
  return TIPOS.includes(kind);
}

// Guarda (ou substitui) um documento. O UNIQUE(user_id, kind) garante que
// um motorista tem no máximo um documento de cada tipo — reenviar
// substitui, em vez de acumular versões antigas.
export async function saveDocument({ userId, kind, mime, base64 }) {
  if (!isValidKind(kind)) throw new Error('Tipo de documento inválido.');
  if (!MIMES.includes(mime)) throw new Error('Formato não aceite. Usa JPEG, PNG ou PDF.');

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new Error('Ficheiro vazio.');
  if (bytes.length > MAX_BYTES) throw new Error('Ficheiro demasiado grande (máximo 4 MB).');

  return one(
    `INSERT INTO driver_documents (user_id, kind, mime, bytes, size_bytes)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, kind)
     DO UPDATE SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes,
                   size_bytes = EXCLUDED.size_bytes, created_at = NOW()
     RETURNING id, kind, mime, size_bytes, created_at`,
    [userId, kind, mime, bytes, bytes.length]
  );
}

// Lista sem trazer os ficheiros: só o que é preciso para mostrar o estado
export function listDocuments(userId) {
  return query(
    `SELECT id, kind, mime, size_bytes, created_at
     FROM driver_documents WHERE user_id = $1 ORDER BY kind`,
    [userId]
  );
}

export function getDocument(id) {
  return one('SELECT * FROM driver_documents WHERE id = $1', [id]);
}
