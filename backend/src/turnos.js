import { query, one } from './db.js';

const MAX_BYTES = 3 * 1024 * 1024;
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Quantos dias de fotografias de turno se guardam.
//
// Não é uma preferência — são duas forças em sentidos opostos:
//
//   · Guardar tudo. Esta fotografia existe para responder a "quem conduzia
//     no dia 12?". Apagar a de ontem deixa uma queixa de ontem sem prova
//     nenhuma, que é justamente quando ela faz falta.
//   · Não guardar nada. Cada fotografia pesa cerca de meio megabyte. Um
//     motorista a trabalhar todos os dias gasta 180 MB por ano, e o plano
//     gratuito da base de dados tem 500 MB para TUDO. Guardar sempre não
//     é generoso — é ficar sem base de dados a meio do ano.
//
// Sete dias cobre a janela em que as queixas aparecem e mantém o espaço
// limitado. Para o Simão, no perfil, o efeito é o que pediu: vê sempre a
// de hoje, e a de ontem desapareceu.
const DIAS_A_GUARDAR = Number(process.env.SHIFT_PHOTO_DAYS || 7);

// Foto do turno: quem está ao volante hoje.
//
// Os documentos verificam a CONTA — que existe uma pessoa aprovada com
// aquela carta. Não verificam quem está sentado no lugar do condutor às
// nove da noite. Um motorista aprovado que empresta o telemóvel ao primo é
// o problema mais comum deste negócio, e nenhum documento o apanha.
//
// Uma por dia, não uma por cada vez que fica disponível: um motorista
// liga e desliga a disponibilidade muitas vezes por dia, e pedir a foto
// de cada vez transformaria uma protecção numa razão para desistir.

// "Hoje" na hora de Díli. Sem isto o dia mudava às 15h da tarde, porque o
// servidor pensa em UTC.
function hojeEmDili() {
  return query(`SELECT (NOW() AT TIME ZONE 'Asia/Dili')::date AS dia`).then((r) => r[0].dia);
}

export async function temFotoDeHoje(userId) {
  const [r] = await query(
    `SELECT 1 FROM driver_shifts
     WHERE user_id = $1 AND dia = (NOW() AT TIME ZONE 'Asia/Dili')::date`,
    [userId]
  );
  return !!r;
}

export async function guardarFotoDeTurno({ userId, mime, base64 }) {
  if (!MIMES.includes(mime)) throw new Error('Formato não aceite. Usa uma fotografia.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new Error('Ficheiro vazio.');
  if (bytes.length > MAX_BYTES) throw new Error('Fotografia demasiado grande (máximo 3 MB).');

  const linha = await one(
    `INSERT INTO driver_shifts (user_id, dia, mime, bytes)
     VALUES ($1, (NOW() AT TIME ZONE 'Asia/Dili')::date, $2, $3)
     ON CONFLICT (user_id, dia)
     DO UPDATE SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes, created_at = NOW()
     RETURNING id, TO_CHAR(dia,'YYYY-MM-DD') AS dia, created_at`,
    [userId, mime, bytes]
  );

  // A limpeza acontece aqui e não numa tarefa à parte: o servidor
  // adormece quando ninguém o usa, por isso uma tarefa agendada não
  // correria. Guardar a fotografia nova é o momento exacto em que se sabe
  // que há uma mais recente do que as antigas.
  await query(
    `DELETE FROM driver_shifts
     WHERE user_id = $1
       AND dia < (NOW() AT TIME ZONE 'Asia/Dili')::date - ($2::int - 1)`,
    [userId, DIAS_A_GUARDAR]
  );

  return linha;
}

// A fotografia mais recente deste motorista, seja de que dia for.
//
// Não é "a de hoje": às cinco da manhã, antes de tirar a de hoje, o perfil
// mostraria um buraco. A mais recente é sempre a melhor que existe.
export function ultimaFotoDeTurno(userId) {
  return one(
    `SELECT id, mime, bytes, TO_CHAR(dia,'YYYY-MM-DD') AS dia, created_at
     FROM driver_shifts WHERE user_id = $1 ORDER BY dia DESC LIMIT 1`,
    [userId]
  );
}

// Para o painel: fotos de hoje, ao lado de quem as tirou.
export function fotosDeHoje() {
  return query(
    `SELECT s.id, s.user_id, s.created_at, u.name, u.phone,
            (SELECT d.id FROM driver_documents d
             WHERE d.user_id = s.user_id AND d.kind = 'photo') AS foto_registo
     FROM driver_shifts s
     JOIN users u ON u.id = s.user_id
     WHERE s.dia = (NOW() AT TIME ZONE 'Asia/Dili')::date
     ORDER BY s.created_at DESC`
  );
}

export function getFotoDeTurno(id) {
  return one('SELECT * FROM driver_shifts WHERE id = $1', [id]);
}

export { hojeEmDili };
