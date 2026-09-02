import { query, one } from './db.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB por documento
const TIPOS = ['licence', 'vehicle', 'photo', 'inspection'];

// O dia em Díli, e não o dia do servidor.
//
// O Neon corre em UTC, e Díli está nove horas à frente. Com CURRENT_DATE, um
// cartão que caduca hoje só passaria a caducado às 09:00 de Díli — meia
// manhã de trabalho com um documento fora de prazo. Ao contrário, à noite,
// caducava um dia cedo. A assinatura já usa esta mesma expressão.
const HOJE_DILI = "(NOW() AT TIME ZONE 'Asia/Dili')::date";
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
            (expires_on IS NOT NULL AND expires_on < ${HOJE_DILI}) AS caducado,
            (expires_on IS NOT NULL AND expires_on < ${HOJE_DILI} + 30) AS a_caducar,
            -- Quantos dias faltam. Negativo quer dizer que já passou.
            (expires_on - ${HOJE_DILI}) AS dias
     FROM driver_documents WHERE user_id = $1 ORDER BY kind`,
    [userId]
  );
}

// Pôr ou corrigir a data de validade sem voltar a fotografar.
//
// Existe por uma razão concreta: os documentos que já estavam na base foram
// enviados antes de haver campo de data, e ficaram sem nenhuma. Obrigar a
// refotografar uma carta de condução só para escrever uma data é trabalho
// que não serve para nada — e trabalho que não serve para nada não se faz.
export function definirValidade(userId, kind, expiresOn) {
  if (!isValidKind(kind)) throw new Error('Tipo de documento inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn || ''))) {
    throw new Error('Data inválida. Usa o formato AAAA-MM-DD.');
  }
  return one(
    `UPDATE driver_documents SET expires_on = $3
      WHERE user_id = $1 AND kind = $2
      RETURNING id, kind, TO_CHAR(expires_on,'YYYY-MM-DD') AS expires_on`,
    [userId, kind, String(expiresOn)]
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

// Documentos que caducam. A fotografia do motorista não caduca; a carta de
// condução, os papéis do veículo e o cartão de inspecção sim — e são
// justamente os que dão legitimidade para conduzir.
export const COM_VALIDADE = ['licence', 'vehicle', 'inspection'];

// Todos são obrigatórios. O cartão de inspecção entrou nesta lista em
// 02/09/2026, a pedido do Simão.
export const OBRIGATORIOS = ['licence', 'vehicle', 'photo', 'inspection'];

// Avisar quinze dias antes. Chega para tratar de um papel em Díli sem
// perder um dia de trabalho, e não é tão cedo que se esqueça.
export const DIAS_DE_AVISO = 15;

// Pode este motorista trabalhar hoje? Devolve o motivo, não só um sim ou
// não: dizer "não podes" sem dizer porquê gera um telefonema.
//
// A CONTA FICA SUSPENSA ENQUANTO UM DOCUMENTO ESTIVER FORA DE PRAZO, e volta
// sozinha assim que ele for renovado. A suspensão NÃO se escreve na tabela
// de propósito: escrita, obrigava alguém a desfazê-la à mão, e se esse
// alguém estivesse a dormir o motorista perdia um dia de trabalho por um
// documento que já tinha renovado. Calculada, a conta volta no segundo em
// que o cartão novo é enviado.
//
// E NÃO INTERROMPE UMA VIAGEM A MEIO. Isto só é perguntado ao ligar o
// serviço e ao entrar ao serviço — nunca durante uma viagem. Cortar um
// motorista à meia-noite deixava um passageiro na estrada por causa de um
// papel.
export async function podeTrabalhar(userId) {
  const docs = await listDocuments(userId);
  const porTipo = Object.fromEntries(docs.map((d) => [d.kind, d]));

  for (const k of OBRIGATORIOS) {
    if (!porTipo[k]) return { pode: false, motivo: 'documento_em_falta', qual: k };
  }

  // UM DOCUMENTO SEM DATA CONTA COMO FORA DE ORDEM, e esta linha é a que faz
  // a regra existir mesmo.
  //
  // Sem ela, `expires_on` a NULL nunca caduca — e como os documentos
  // enviados antes de haver campo de data ficaram todos a NULL, a
  // suspensão automática não suspenderia ninguém. Uma regra que nunca
  // dispara é pior do que nenhuma: dá a sensação de estar tratado.
  for (const k of COM_VALIDADE) {
    if (!porTipo[k].expires_on) {
      return { pode: false, motivo: 'documento_sem_validade', qual: k };
    }
  }

  for (const k of COM_VALIDADE) {
    if (porTipo[k].caducado) {
      return { pode: false, motivo: 'documento_caducado', qual: k, ate: porTipo[k].expires_on };
    }
  }

  // O que caduca nos próximos quinze dias, com quantos dias faltam, para o
  // aviso poder dizer "faltam 4 dias" em vez de "está quase".
  const aCaducar = COM_VALIDADE.filter(
    (k) => porTipo[k].dias != null && porTipo[k].dias <= DIAS_DE_AVISO
  )
    .map((k) => ({ qual: k, ate: porTipo[k].expires_on, dias: Number(porTipo[k].dias) }))
    .sort((a, b) => a.dias - b.dias);

  return { pode: true, aCaducar };
}
