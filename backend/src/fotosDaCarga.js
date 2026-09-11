import { query, one } from './db.js';

const MAX_BYTES = 3 * 1024 * 1024;
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Quantas fotografias por viagem.
//
// TRÊS, e o número não é arbitrário. Uma só mostra um lado da carga e
// engana sem querer — um frigorífico de frente parece caber em qualquer
// lado. Três chegam para o conjunto, um pormenor e o sítio onde está.
//
// O tecto existe porque cada fotografia pesa até 3 MB e a base de dados
// gratuita tem 500 MB para tudo. Sem limite, um pedido sozinho podia
// ocupar o espaço de uma semana de trabalho.
export const MAX_FOTOS = 3;

// Quantos dias se guardam depois da viagem acabar.
//
// A mesma janela das fotografias de turno, e pela mesma razão: é o tempo em
// que as queixas aparecem. "Os meus móveis chegaram riscados" vale pouco se
// não houver como ver em que estado saíram — e a fotografia que o passageiro
// tirou na origem é exactamente essa prova.
//
// Passados sete dias apaga-se: a queixa já veio ou já não vem, e o espaço
// faz falta a quem está a pedir hoje.
const DIAS = 7;

// A limpeza acontece AQUI e não numa tarefa agendada — o servidor adormece
// quando ninguém o usa, e uma tarefa agendada nunca correria. Guardar uma
// fotografia nova é o momento em que se sabe que há tráfego.
async function limpar() {
  await query(
    `DELETE FROM ride_fotos f
      USING rides r
      WHERE r.id = f.ride_id
        AND r.status IN ('completed', 'cancelled')
        AND f.created_at < NOW() - INTERVAL '${DIAS} days'`
  );
}

export async function guardarFotoDaCarga({ rideId, mime, base64 }) {
  if (!MIMES.includes(mime)) throw new Error('Formato não aceite. Usa uma fotografia.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new Error('Ficheiro vazio.');
  if (bytes.length > MAX_BYTES) throw new Error('Fotografia demasiado grande (máximo 3 MB).');

  // O TECTO É CONTADO NA BASE e não na app.
  //
  // A app já impede a quarta fotografia, e isso resolve o caso honesto. Não
  // resolve o outro: quem chama o servidor directamente não passa pela app
  // nenhuma. Um limite que só existe no telemóvel não é um limite — é uma
  // sugestão.
  const { count } = await one('SELECT COUNT(*)::int AS count FROM ride_fotos WHERE ride_id = $1', [
    rideId,
  ]);
  if (count >= MAX_FOTOS) throw new Error(`Máximo de ${MAX_FOTOS} fotografias.`);

  const linha = await one(
    `INSERT INTO ride_fotos (ride_id, mime, bytes, size_bytes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, mime, size_bytes, created_at`,
    [rideId, mime, bytes, bytes.length]
  );

  await limpar();
  return { id: linha.id, total: count + 1 };
}

// As fotografias de uma viagem, da mais antiga para a mais recente.
//
// A ORDEM É A DE QUEM AS TIROU e tem de ser estável: a app pede "a segunda
// fotografia desta viagem" e precisa de receber sempre a mesma. Ordenar por
// `id` dá isso de graça — é a ordem em que entraram, e não muda.
export function listarFotosDaCarga(rideId) {
  return query(
    'SELECT id, mime, size_bytes, created_at FROM ride_fotos WHERE ride_id = $1 ORDER BY id ASC',
    [rideId]
  );
}

// Uma fotografia pelo seu lugar na fila (0, 1, 2) e não pelo `id`.
//
// Pelo lugar, e de propósito: o `id` é global e sequencial na tabela toda.
// Se o endereço fosse `/fotos/8231`, quem experimentasse `8230` estaria a
// pedir a fotografia da carga de outra pessoa — e a única coisa entre ele e
// ela seria a verificação de quem pode ver. Com o lugar na fila, o número
// que se escreve no endereço só tem sentido DENTRO da viagem que já foi
// verificada. Um erro na regra de acesso deixa de ser um erro que expõe a
// cidade inteira.
export async function fotoDaCarga(rideId, indice) {
  const linhas = await query(
    'SELECT mime, bytes FROM ride_fotos WHERE ride_id = $1 ORDER BY id ASC OFFSET $2 LIMIT 1',
    [rideId, Math.max(0, Number(indice) || 0)]
  );
  return linhas[0] || null;
}
