// OS MOTIVOS DE UMA AVALIAÇÃO BAIXA (23/09/2026).
//
// PORQUE EXISTEM. O Simão perguntou como é que se avalia o CARÁCTER de
// alguém, e se a estrela chega. Não chega: uma estrela diz *que* correu mal
// e nunca *o quê*. Quando um motorista cai para 4,2, nem ele nem quem olha
// para o painel consegue saber se foi por conduzir sem cuidado, por não ir
// ao sítio combinado, por ser malcriado, ou por ter pedido mais dinheiro. O
// número regista a insatisfação e deita fora a informação.
//
// CÓDIGOS E NÃO TEXTO LIVRE, e a razão é dupla. Um código traduz-se para as
// três línguas, conta-se («três motoristas com `precoAcima` este mês») e
// pode disparar uma regra. Texto livre não faz nada disso — e, escrito sem
// moderação sobre pessoas identificáveis, é exposição a difamação que
// alguém teria de ler toda.
//
// DUAS LISTAS, porque não se queixa do mesmo lado a lado: quem conduz não
// «não apareceu», e quem viaja não «conduziu sem cuidado». `malcriado` está
// nas duas de propósito — é a mesma queixa, de qualquer dos lados.
//
// NÃO SE ESCOLHE A LISTA PELO PAPEL DE QUEM AVALIA, mas pelo papel de quem
// É AVALIADO. Parece o mesmo e não é: nesta app uma conta de motorista pede
// viagens como passageiro, e nessa viagem quem está a ser avaliado é o
// motorista dela.
export const MOTIVOS_SOBRE_MOTORISTA = [
  'conducao',
  'naoFoiAoLocal',
  'atraso',
  'malcriado',
  'precoAcima',
];
export const MOTIVOS_SOBRE_PASSAGEIRO = [
  'naoApareceu',
  'fezEsperar',
  'naoEstavaNoLocal',
  'malcriado',
  'cargaDiferente',
];

// Acima disto não se pergunta porquê. Quatro e cinco estrelas são um bom
// serviço, e pedir defeitos a quem está satisfeito é fabricar queixas.
export const ESTRELAS_COM_MOTIVO = 3;

// Limpa o que veio no pedido: só motivos conhecidos DESTE lado, sem
// repetidos, no máximo três. O tecto não é técnico — é de desenho: quem
// marca tudo não está a dizer nada, e uma queixa de três pontos é a que se
// consegue ler depois.
export function limparMotivos(motivos, papelDoAvaliado) {
  const validos =
    papelDoAvaliado === 'driver' ? MOTIVOS_SOBRE_MOTORISTA : MOTIVOS_SOBRE_PASSAGEIRO;
  if (!Array.isArray(motivos)) return [];
  return [...new Set(motivos.filter((m) => validos.includes(m)))].slice(0, 3);
}

import { one, tx } from './db.js';

// Já existe avaliação deste utilizador para esta viagem?
export async function hasRated(rideId, raterId) {
  const row = await one('SELECT 1 FROM ratings WHERE ride_id = $1 AND rater_id = $2', [
    rideId,
    raterId,
  ]);
  return !!row;
}

// Regista uma avaliação e recalcula a média do avaliado.
// Numa transação: ou grava a avaliação E actualiza a média, ou não faz nada.
export async function addRating({ rideId, raterId, rateeId, stars, motivos = [] }) {
  await tx(async (client) => {
    await client.query(
      'INSERT INTO ratings (ride_id, rater_id, ratee_id, stars, motivos) VALUES ($1,$2,$3,$4,$5)',
      // Array vazio e não NULL: assim `motivos && ...` e o `unnest` de quem
      // for contar comportam-se sempre da mesma maneira, sem um caso à parte
      // para as avaliações boas.
      [rideId, raterId, rateeId, stars, motivos]
    );

    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS n, AVG(stars)::float AS avg FROM ratings WHERE ratee_id = $1',
      [rateeId]
    );
    const agg = rows[0];

    await client.query('UPDATE users SET rating_avg = $1, rating_count = $2 WHERE id = $3', [
      Math.round((agg.avg || 0) * 100) / 100,
      agg.n || 0,
      rateeId,
    ]);
  });
  return { ok: true };
}
