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

// Os sítios com nome que estão PERTO deste ponto.
//
// É o que alimenta a lista por baixo do mapa enquanto se aponta. Sem ela, o
// modo de escolha devolve um endereço — "Rua de Caicoli" — e não um sítio.
// Com ela, quem aponta para o hospital escolhe entre a entrada principal e a
// das urgências, que é a diferença entre chegar lá e chegar ao portão certo.
//
// Duzentos e cinquenta metros é o raio. Mais do que isso deixa de ser "aqui"
// e passa a ser "ali ao lado" — e uma lista com sítios que não são o que se
// está a apontar é pior do que uma lista vazia.
//
// A CAIXA PRIMEIRO, a distância depois. Comparar 250 metros em graus e só
// medir a sério o que couber na caixa deixa o índice trabalhar; medir tudo
// obrigaria a percorrer a tabela inteira a cada arrasto do mapa.
const RAIO_M = 250;

export async function lugaresPerto(lat, lng, userId) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  const grauLat = RAIO_M / 111320;
  const grauLng = RAIO_M / (111320 * Math.cos((lat * Math.PI) / 180));

  // Os LIMITES calculados aqui, e não dentro da consulta.
  //
  // Estava `lat BETWEEN $1 - $3 AND $1 + $3`. O Postgres não consegue inferir
  // o tipo de uma subtracção entre dois parâmetros sem tipo, e a consulta
  // rebentava com erro 500 — que o meu primeiro teste escondeu, porque lia
  // `lugares` de um objecto de erro e mostrava "nada por aqui".
  //
  // Quatro números já calculados não deixam nada por inferir.
  const latMin = lat - grauLat;
  const latMax = lat + grauLat;
  const lngMin = lng - grauLng;
  const lngMax = lng + grauLng;

  const rows = await query(
    `SELECT id, nome, lat, lng, aldeia, bairro, suco, posto, municipio, estado
       FROM lugares_propostos
      WHERE (estado = 'aceite' OR (estado = 'novo' AND user_id = $5))
        AND lat BETWEEN $1 AND $2
        AND lng BETWEEN $3 AND $4
      ORDER BY id DESC
      LIMIT 60`,
    [latMin, latMax, lngMin, lngMax, userId ?? -1]
  );

  const saida = [];
  for (const r of rows) {
    const p = { lat: Number(r.lat), lng: Number(r.lng) };
    const d = metrosEntre({ lat, lng }, p);
    if (d > RAIO_M) continue;
    // O mesmo sítio baptizado por três pessoas aparece uma vez só.
    if (saida.some((x) => perto(x, p) && normalizar(x.label) === normalizar(r.nome))) continue;
    saida.push({
      id: `nosso:${r.id}`,
      label: r.nome,
      detalhe: [r.aldeia, r.bairro, r.suco].filter(Boolean).join(', '),
      lat: p.lat,
      lng: p.lng,
      metros: Math.round(d),
      fonte: 'nosso',
      porRever: r.estado !== 'aceite',
    });
  }
  return saida.sort((a, b) => a.metros - b.metros).slice(0, 6);
}

function metrosEntre(a, b) {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function perto(a, b) {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) < 0.1;
}
