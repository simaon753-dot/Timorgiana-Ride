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
export async function saveDocument({ userId, kind, mime, base64, expiresOn }) {
  if (!isValidKind(kind)) throw new Error('Tipo de documento inválido.');
  if (!MIMES.includes(mime)) throw new Error('Formato não aceite. Usa JPEG, PNG ou PDF.');

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new Error('Ficheiro vazio.');
  if (bytes.length > MAX_BYTES) throw new Error('Ficheiro demasiado grande (máximo 4 MB).');

  // A validade só se aceita em formato de data simples. Uma data mal
  // formada seria pior do que nenhuma: aparecia como se tivesse sido
  // verificada.
  const validade =
    expiresOn && /^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn)) ? String(expiresOn) : null;

  return one(
    `INSERT INTO driver_documents (user_id, kind, mime, bytes, size_bytes, expires_on)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, kind)
     DO UPDATE SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes,
                   size_bytes = EXCLUDED.size_bytes, expires_on = EXCLUDED.expires_on,
                   created_at = NOW()
     RETURNING id, kind, mime, size_bytes, expires_on, created_at`,
    [userId, kind, mime, bytes, bytes.length, validade]
  );
}

// Lista sem trazer os ficheiros: só o que é preciso para mostrar o estado
export function listDocuments(userId) {
  return query(
    `SELECT id, kind, mime, size_bytes, created_at,
            TO_CHAR(expires_on, 'YYYY-MM-DD') AS expires_on,
            (expires_on IS NOT NULL AND expires_on < CURRENT_DATE) AS caducado,
            (expires_on IS NOT NULL AND expires_on < CURRENT_DATE + 30) AS a_caducar
     FROM driver_documents WHERE user_id = $1 ORDER BY kind`,
    [userId]
  );
}

export function getDocument(id) {
  return one('SELECT * FROM driver_documents WHERE id = $1', [id]);
}

// O documento de uma pessoa, procurado pelo DONO e pelo tipo — nunca pelo
// id. Procurar por id obrigava a app a conhecer o número do documento, e
// bastaria trocar esse número para pedir o documento de outra pessoa. Com
// o dono na própria pesquisa, o pedido errado não devolve nada.
export function getOwnDocument(userId, kind) {
  if (!isValidKind(kind)) return Promise.resolve(null);
  return one('SELECT * FROM driver_documents WHERE user_id = $1 AND kind = $2', [userId, kind]);
}

// Documentos que caducam. A foto do motorista não caduca; a carta e os
// papéis do veículo sim, e são justamente os que dão legitimidade.
export const COM_VALIDADE = ['licence', 'vehicle'];

// Pode este motorista trabalhar hoje? Devolve o motivo, não só um sim ou
// não: dizer "não podes" sem dizer porquê gera um telefonema.
export async function podeTrabalhar(userId) {
  const docs = await listDocuments(userId);
  const porTipo = Object.fromEntries(docs.map((d) => [d.kind, d]));

  for (const k of ['licence', 'vehicle', 'photo']) {
    if (!porTipo[k]) return { pode: false, motivo: 'documento_em_falta', qual: k };
  }
  for (const k of COM_VALIDADE) {
    if (porTipo[k].caducado) {
      return { pode: false, motivo: 'documento_caducado', qual: k, ate: porTipo[k].expires_on };
    }
  }
  const aCaducar = COM_VALIDADE.filter((k) => porTipo[k].a_caducar);
  return { pode: true, aCaducar };
}
