import { query } from './db.js';
import { normalizar } from './texto.js';

// Os nossos lugares: os que os passageiros baptizaram.
//
// É ISTO QUE FECHA O CICLO. Antes, alguém dava nome a um sítio, a proposta
// chegava ao painel, era marcada como aceite — e mais nada. O passageiro
// seguinte que escrevesse esse nome na pesquisa não encontrava nada, porque
// a pesquisa só perguntava ao OpenStreetMap. Nem quem o baptizou o voltava a
// encontrar. O trabalho dele não servia a ninguém até alguém ir ao editor à
// mão, e isso podia demorar semanas.
//
// Agora a busca pergunta primeiro aqui. Um nome aceite passa a existir na
// app no momento em que é aceite, sem esperar pelo OpenStreetMap.
//
// E É UMA BASE NOSSA. Os dados do OpenStreetMap estão sob ODbL, que obriga a
// partilhar bases derivadas. Estes nomes não são derivados de lá — foram
// escritos pelos nossos passageiros, e vivem em tabela separada. São nossos,
// e podemos na mesma oferecê-los ao OpenStreetMap. As duas coisas ao mesmo
// tempo.

export async function procurarNossos(termo, userId) {
  const n = normalizar(termo);
  if (n.length < 3) return [];

  // QUEM VÊ O QUÊ. Os aceites são para toda a gente. Os que ainda não foram
  // revistos são visíveis SÓ para quem os escreveu.
  //
  // A alternativa era esperar sempre pela revisão, e isso ensinava a coisa
  // errada: alguém dá um nome, procura-o a seguir, não o encontra, e conclui
  // que aquilo não faz nada. Assim o nome funciona já para quem o deu, e só
  // se espalha depois de alguém o ler.
  const rows = await query(
    `SELECT id, nome, lat, lng, aldeia, bairro, suco, posto, municipio, estado
       FROM lugares_propostos
      WHERE (estado = 'aceite' OR (estado = 'novo' AND user_id = $2))
        AND nome_busca LIKE $1
      ORDER BY
        -- Quem começa pelo que foi escrito vem à frente de quem só o contém:
        -- "Kios Mana" deve dar "Kios Mana Rita" antes de "Merkadu Kios".
        CASE WHEN nome_busca LIKE $3 THEN 0 ELSE 1 END,
        CASE WHEN estado = 'aceite' THEN 0 ELSE 1 END,
        id DESC
      LIMIT 20`,
    [`%${n}%`, userId ?? -1, `${n}%`]
  );

  // Três pessoas podem ter baptizado a mesma loja. Ficam como três linhas na
  // tabela — o que está certo, é o registo de quem contribuiu — mas na busca
  // aparecem uma vez só.
  const saida = [];
  for (const r of rows) {
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (saida.some((x) => perto(x, { lat, lng }) && normalizar(x.label) === normalizar(r.nome))) {
      continue;
    }
    saida.push({
      id: `nosso:${r.id}`,
      label: r.nome,
      // A morada serve para distinguir dois sítios com o mesmo nome, que em
      // Díli acontece — há mais do que uma "Kios Mana".
      detalhe: [r.aldeia, r.bairro, r.suco, r.posto, r.municipio].filter(Boolean).join(', '),
      lat,
      lng,
      fonte: 'nosso',
      // Para a app poder assinalar o que ainda não foi revisto.
      porRever: r.estado !== 'aceite',
    });
    if (saida.length >= 6) break;
  }
  return saida;
}

function perto(a, b) {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) < 0.1;
}
