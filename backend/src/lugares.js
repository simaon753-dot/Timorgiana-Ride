// Busca de lugares, em três camadas.
//
// Camada 0: os NOSSOS lugares — os que os passageiros baptizaram e que
// alguém já aceitou. Vêm primeiro, e não por vaidade: são exactamente os
// sítios que as outras camadas não têm. Se o OpenStreetMap soubesse o que é
// a "Kios Mana Rita", ninguém teria tido de a escrever.
//
// Esta camada fecha o ciclo. Antes, aceitar uma proposta mudava uma palavra
// na base de dados e mais nada — quem baptizou um sítio não o voltava a
// encontrar, nem ele próprio.
//
// Camada 1: Nominatim (OpenStreetMap). Gratuito, e num teste com dezasseis
// destinos reais de Díli acertou em catorze.
//
// Camada 2: Google Places, chamado AO MESMO TEMPO e não a seguir.
//
// A primeira versão só o chamava quando o Nominatim devolvia zero, para
// poupar. Estava errado, e o Simão descobriu-o em dois minutos de uso: com
// "Universidade" o Nominatim devolve seis resultados irrelevantes, e como
// não devolveu zero o Google nunca era consultado. Quem escreve um destino
// escreve meia palavra — esperar pelo zero é esperar por um caso que quase
// nunca acontece a meio de uma palavra.
//
// Quanto custa. Em Março de 2025 o Google acabou com o crédito de 200 USD
// por mês e passou a dar chamadas grátis POR ESCALÃO: 10.000 Essentials,
// 5.000 Pro, 1.000 Enterprise. A máscara de campos aqui em baixo pede
// displayName, formattedAddress e location, e os três são Pro — logo são
// 5.000 buscas grátis por mês, e não 10.000 como esta linha dizia até
// 2026-09-05. O número estava certo quando foi escrito e deixou de estar.
//
// Descer a Essentials não serve: esse escalão devolve o identificador do
// lugar e mais nada — sem nome, sem morada, sem coordenadas — e para saber
// onde fica era precisa uma segunda chamada, também ela paga.
//
// Chamando o Google em todas as buscas, e com a memória de 24 horas a
// apanhar as repetições, 5.000 continua muito acima do que Díli faz.
//
// O tecto rígido não está aqui: está na quota diária definida na consola do
// Google, na linha `SearchTextRequest per day`. Se um dia for atingida, as
// chamadas passam a ser recusadas e o erro aparece em /api/health, no campo
// `ultimoErroGoogle`. Quem vier a depurar uma busca que deixou de dar
// resultados deve olhar aí primeiro.
//
// ARMADILHA para quem vier a seguir: as restantes quotas da Places API
// estão postas a ZERO de propósito, por não usarmos nenhuma. Quem juntar
// uma funcionalidade que chame outro método — fotografias, detalhes de um
// lugar, busca por proximidade — vai recebê-la recusada e não vai perceber
// porquê, porque o código está certo. É preciso subir a quota desse método
// na consola. Está registado no DEPLOY.md, passo 4.
//
// POR QUE RAZÃO ISTO VIVE NO SERVIDOR e não no telemóvel: a chave do Google
// é uma senha de facturação. Dentro da app, qualquer pessoa que descarregue
// o APK a consegue extrair e gastar a quota alheia — há quem procure chaves
// em aplicações só para isso. Aqui, fica no Render.
//
// E há um ganho que não tem nada a ver com o Google: estando a busca no
// servidor, as respostas ficam guardadas. Numa rede como a de Díli, a
// segunda pessoa a procurar "Timor Plaza" recebe a resposta sem sair do
// país.

import { one } from './db.js';
import { procurarNossos, lugaresPerto } from './lugaresNossos.js';

const UA = 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)';

// A mesma caixa que a app usava, com margem nas pontas para não cortar
// Oecusse nem o norte de Ataúro.
const TIMOR = {
  viewbox: '123.8,-9.8,127.6,-8.0',
  sul: -9.8,
  norte: -8.0,
  oeste: 123.8,
  leste: 127.6,
};

const PRAZO_MS = 7000;

// ── Memória ─────────────────────────────────────────────────────────
//
// Um lugar não muda de sítio. Guardar por 24 horas é conservador e já
// apanha o essencial: num dia, o mesmo punhado de destinos é procurado
// vezes sem conta.
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX = 500;
const memoria = new Map();

function daMemoria(q) {
  const e = memoria.get(q);
  if (!e) return null;
  if (Date.now() - e.quando > TTL_MS) {
    memoria.delete(q);
    return null;
  }
  return e.lugares;
}

function guardar(q, lugares) {
  // Não guardar respostas vazias: se o Nominatim falhou por a rede estar
  // má, guardar o vazio faria a busca continuar a falhar durante um dia
  // inteiro depois de a rede voltar.
  if (!lugares.length) return lugares;
  if (memoria.size >= MAX) memoria.delete(memoria.keys().next().value);
  memoria.set(q, { lugares, quando: Date.now() });
  return lugares;
}

// ── O NOME DE UM PONTO, pelo nosso servidor (20/09/2026) ────────────────
//
// PORQUE MUDOU DE SÍTIO. O nome do ponto de recolha era perguntado pelo
// PRÓPRIO TELEMÓVEL ao OpenStreetMap. Quando essa resposta não chegava em
// nove segundos — rede fraca em Díli, ou o serviço a demorar, o que também
// acontece — a app mostrava a coordenada: "-8.55692, 125.56021". Foi o que o
// Simão viu numa conta nova, noutro telemóvel, no mesmo sítio onde a conta
// dele mostrava o nome.
//
// Aqui ganha-se o que o telemóvel não tem:
//
//   1. MEMÓRIA PARTILHADA. O segundo passageiro no mesmo quarteirão recebe o
//      nome sem ninguém sair do país. O telemóvel só se lembrava do que ELE
//      próprio tinha perguntado, e esquecia-o ao fechar a app.
//   2. UMA LIGAÇÃO BOA. O servidor está num centro de dados; o telemóvel está
//      numa rua de Díli com 3G.
//   3. OS NOSSOS LUGARES PRIMEIRO. Um sítio que alguém baptizou vale mais do
//      que o nome da rua onde ele fica.
//
// A app continua a saber perguntar sozinha: se isto falhar, ela vai ao
// OpenStreetMap como sempre foi. O que é novo tem de poder falhar sem levar o
// resto atrás.
const TTL_NOMES_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NOMES = 1000;
const nomes = new Map();

// Quatro casas decimais são ~11 metros: a largura de um prédio. Com três
// (~110 m) dois edifícios diferentes recebiam o mesmo nome.
const chaveDoPonto = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

// OS MESMOS NÚMEROS DA APP (ver lib/geocode.js), e não outros: estes foram
// afinados com um caso real — o Simão estava no Centro de Formação Jurídica e
// a app disse "Tribunal da Primeira Instância", a 93 metros. Dois sítios a
// decidir o mesmo com limites diferentes acabam a discordar, e nesse dia
// ninguém saberia qual dos dois estava certo.
//
// 35 m é o fundo de um quintal em Díli: mais do que isso, o edifício é o do
// VIZINHO. Com um erro de GPS acima de 45 m, escolher um edifício dentro do
// círculo de incerteza é escolher à sorte — diz-se a rua, que é verdade em
// qualquer ponto dele.
const PERTO_M = 35;
const ERRO_TOLERAVEL_M = 45;

function metros(a, b) {
  const dLat = (a.lat - b.lat) * 111320;
  const dLng = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// A mesma leitura que a app fazia, agora num sítio só.
function nomeDaResposta(j, lat, lng, precisaoM) {
  if (!j) return null;
  const a = j.address || {};
  const rua = a.road || a.pedestrian || a.residential || a.neighbourhood || a.suburb;
  const eSitio = j.addresstype && !['road', 'suburb', 'neighbourhood'].includes(j.addresstype);
  const longe =
    eSitio && metros({ lat, lng }, { lat: Number(j.lat), lng: Number(j.lon) }) > PERTO_M;
  const gpsVago = typeof precisaoM === 'number' && precisaoM > ERRO_TOLERAVEL_M;
  if (eSitio && !longe && !gpsVago && j.name) return j.name;
  if (rua) return rua;
  if (!j.display_name) return null;
  return j.display_name.split(',').slice(0, 2).join(',').trim();
}

// ── O NOME DO SÍTIO PELO GOOGLE ─────────────────────────────────────
//
// PORQUE EXISTE (22/09/2026). O Simão apontou ao Centro de Formação Jurídica
// e a app escreveu «Rua Palácio das Cinzas». Não estava errada: o nome que
// ele VIA escrito no mapa é desenhado pelo SDK do Google e não é entregue ao
// código — estávamos a olhar para uma etiqueta que a app não consegue ler. E
// o OpenStreetMap, que é quem respondia, tem Díli com as ruas bem mapeadas e
// quase nenhum edifício.
//
// A chave do Google já cá estava, para a pesquisa. Isto usa a mesma, e o
// mesmo escalão barato de campos: só o nome e a posição.
//
// O TECTO DIÁRIO É A PARTE QUE IMPORTA. Isto é pago À CHAMADA, e o gatilho é
// arrastar um mapa — o gesto mais repetido da app inteira. Sem tecto, uma
// tarde de alguém a brincar com o mapa é uma factura. Com tecto, passado o
// limite cai-se no OpenStreetMap como sempre, e ninguém fica sem nome.
//
// O contador vive na BASE, e não em memória, pela mesma razão do das rotas:
// no plano gratuito do Render o servidor reinicia a toda a hora, e um
// contador em memória não é tecto nenhum.
const NOMES_POR_DIA = Number(process.env.PLACES_MAX_DIA) || 400;

// DE ONDE VIERAM OS NOMES, desde o arranque (22/09/2026).
//
// PORQUE EXISTE. O Simão apontou a um warung e a app escreveu o nome de uma
// escola a oitenta metros. A pergunta certa — qual das camadas respondeu? —
// não tinha resposta: a função devolve um campo `fonte` desde sempre e
// ninguém o estava a olhar. Construí a medição das CHAMADAS e esqueci-me da
// medição das RESPOSTAS.
//
// SÓ A CONTAGEM, nunca os nomes nem as coordenadas. O /api/health é público:
// guardar os últimos lugares procurados seria dizer a quem passar por lá
// onde é que as pessoas andaram. Uma contagem por camada responde à pergunta
// sem contar nada sobre ninguém.
const fontes = { nossos: 0, memoria: 0, google: 0, osm: 0, nada: 0 };
function contarFonte(f) {
  if (f in fontes) fontes[f] += 1;
}

// Quarenta metros. Mais do que isto e começa a devolver-se o vizinho do lado
// como se fosse o sítio apontado — e um nome errado é pior do que o nome da
// rua, que pelo menos é verdade.
const RAIO_NOME_M = 40;

async function podePerguntarNome() {
  if (!process.env.GOOGLE_MAPS_KEY) return false;
  try {
    const r = await one(
      `INSERT INTO contadores (nome, dia, valor) VALUES ('nomes_google', CURRENT_DATE, 1)
       ON CONFLICT (nome, dia) DO UPDATE SET valor = contadores.valor + 1
       RETURNING valor`
    );
    return (r?.valor ?? 0) <= NOMES_POR_DIA;
  } catch (e) {
    // Uma falha a contar não pode deixar ninguém sem nome: responde-se "não"
    // e segue-se pelo OpenStreetMap, que não custa nada. Deixar passar sem
    // contar seria abrir a torneira no dia em que algo já está mal.
    console.error('[lugares] não foi possível contar; vou pelo OSM —', e.message);
    return false;
  }
}

async function nomeNoGoogle(lat, lng) {
  if (!(await podePerguntarNome())) return null;
  const j = await comPrazo(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_KEY,
        // Só o nome. A máscara de campos decide o escalão de preço, e pedir
        // mais do que se usa é pagar mais do que se precisa.
        'X-Goog-FieldMask': 'places.displayName',
      },
      body: JSON.stringify({
        maxResultCount: 1,
        // PELO MAIS PRÓXIMO, e não pelo mais conhecido (corrigido a
        // 22/09/2026).
        //
        // Comecei por pedir o mais PROMINENTE, com o raciocínio de que a 40
        // metros o mais perto podia ser um portão sem nome. Estava errado por
        // duas razões. A primeira: o Google só devolve estabelecimentos com
        // nome — portões sem nome não entram. A segunda, que é a que importa:
        // quando alguém APONTA a um sítio, está a dizer AQUELE. Numa
        // competição de fama, uma escola internacional ganha sempre a um
        // warung — e a pessoa que apontou ao warung fica com o nome da
        // escola.
        rankPreference: 'DISTANCE',
        languageCode: 'pt',
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: RAIO_NOME_M },
        },
      }),
    },
    true
  );
  return j?.places?.[0]?.displayName?.text || null;
}

export async function nomeDoPonto(lat, lng, userId, precisaoM) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return { nome: null, fonte: 'nada' };

  // 1. Os nossos, primeiro — e NÃO se guardam na memória: a lista depende de
  //    quem pergunta (um lugar proposto e ainda por rever só o vê quem o
  //    propôs), e uma memória partilhada mostrá-lo-ia a toda a gente.
  const perto = await lugaresPerto(lat, lng, userId, 60);
  const nosso = perto.find((l) => l.nome);
  if (nosso) {
    contarFonte('nossos');
    return { nome: nosso.nome, fonte: 'nossos' };
  }

  const chave = chaveDoPonto(lat, lng);
  const guardado = nomes.get(chave);
  if (guardado && Date.now() - guardado.quando < TTL_NOMES_MS) {
    contarFonte('memoria');
    return { nome: guardado.nome, fonte: 'memoria' };
  }
  if (guardado) nomes.delete(chave);

  // 3. O GOOGLE, que é quem sabe os nomes dos edifícios de Díli. Antes do
  //    OpenStreetMap porque responde o que a pessoa reconhece; depois da
  //    memória e dos nossos porque é o único que custa dinheiro.
  const doGoogle = await nomeNoGoogle(lat, lng);
  if (doGoogle) {
    if (nomes.size >= MAX_NOMES) nomes.delete(nomes.keys().next().value);
    nomes.set(chave, { nome: doGoogle, quando: Date.now() });
    contarFonte('google');
    return { nome: doGoogle, fonte: 'google' };
  }

  // 4. O OpenStreetMap, como sempre. Continua a ser a rede de segurança:
  //    sem chave, passado o tecto, ou se o Google não conhecer o sítio.
  const j = await comPrazo(
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`,
    { headers: { Accept: 'application/json', 'User-Agent': UA } }
  );
  const nome = nomeDaResposta(j, lat, lng, precisaoM);
  // Falhas não se guardam: da próxima pode correr bem, e um vazio guardado
  // fazia o sítio ficar sem nome durante uma semana.
  if (!nome) {
    contarFonte('nada');
    return { nome: null, fonte: 'nada' };
  }
  if (nomes.size >= MAX_NOMES) nomes.delete(nomes.keys().next().value);
  nomes.set(chave, { nome, quando: Date.now() });
  contarFonte('osm');
  return { nome, fonte: 'osm' };
}

// O último erro do Google, para o /api/health o poder mostrar.
//
// Isto existe porque a versão anterior engolia tudo: se o Google recusasse
// a chave, ou a API não estivesse activada, ou a facturação falhasse, a
// função devolvia lista vazia e ninguém ficava a saber. O Simão viu a busca
// sem resultados e eu não tinha como lhe dizer porquê.
//
// Um caminho novo tem de conseguir explicar-se quando falha. Foi a lição do
// ecrã de registo, que esteve partido semanas em silêncio.
let ultimoErroGoogle = null;

async function comPrazo(url, opcoes = {}, guardarErro = false) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
  try {
    const r = await fetch(url, { ...opcoes, signal: ctrl.signal });
    if (r.ok) {
      if (guardarErro) ultimoErroGoogle = null;
      return await r.json();
    }
    if (guardarErro) {
      // O corpo do erro do Google diz exactamente o que está mal — chave
      // recusada, API por activar, facturação em falta. Guardamos um
      // excerto; a chave nunca aparece nestas respostas.
      const texto = await r.text().catch(() => '');
      ultimoErroGoogle = {
        http: r.status,
        quando: new Date().toISOString(),
        diz: texto.slice(0, 300),
      };
    }
    return null;
  } catch (e) {
    if (guardarErro) {
      ultimoErroGoogle = {
        http: 0,
        quando: new Date().toISOString(),
        diz: e?.message || 'sem resposta',
      };
    }
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

function nomeCurto(display) {
  return display.split(',').slice(0, 2).join(',').trim();
}

// ── Camada 1 ────────────────────────────────────────────────────────
async function noNominatim(q) {
  const p = new URLSearchParams({
    q,
    format: 'json',
    limit: '6',
    addressdetails: '0',
    countrycodes: 'tl',
    viewbox: TIMOR.viewbox,
    bounded: '1',
  });
  const rs = await comPrazo(`https://nominatim.openstreetmap.org/search?${p}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!Array.isArray(rs)) return [];
  return rs.map((x) => ({
    id: `osm:${x.osm_type || 'x'}${x.osm_id || Math.random()}`,
    label: nomeCurto(x.display_name),
    detalhe: x.display_name.split(',').slice(2, 4).join(',').trim(),
    lat: Number(x.lat),
    lng: Number(x.lon),
    fonte: 'osm',
  }));
}

// ── Camada 2 ────────────────────────────────────────────────────────
//
// Só corre se a chave existir. Sem chave, esta função devolve lista vazia e
// tudo se comporta exactamente como antes de ela ser escrita — que é o que
// permite ligá-la e desligá-la sem publicar app nenhuma.
async function noGoogle(q) {
  const chave = process.env.GOOGLE_MAPS_KEY;
  if (!chave) return [];

  const j = await comPrazo(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': chave,
        // A máscara de campos não é detalhe: o Google cobra por escalão
        // conforme o que se pede. Pedir só o essencial mantém a chamada no
        // escalão mais barato.
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: q,
        regionCode: 'TL',
        maxResultCount: 6,
        locationRestriction: {
          rectangle: {
            low: { latitude: TIMOR.sul, longitude: TIMOR.oeste },
            high: { latitude: TIMOR.norte, longitude: TIMOR.leste },
          },
        },
      }),
    },
    true
  );
  const places = j?.places;
  if (!Array.isArray(places)) return [];
  return places
    .filter((p) => p?.location?.latitude != null)
    .map((p) => ({
      id: `g:${p.id}`,
      label: p.displayName?.text || p.formattedAddress || '',
      detalhe: p.formattedAddress || '',
      lat: p.location.latitude,
      lng: p.location.longitude,
      fonte: 'google',
    }))
    .filter((p) => p.label);
}

// Dois lugares são o mesmo se estiverem a menos de cem metros um do outro.
// Comparar nomes não serve: o Google diz "Universidade Nacional Timor
// Lorosa'e" e o OpenStreetMap diz "UNTL" — são a mesma porta.
function mesmoSitio(a, b) {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) < 0.1;
}

export async function procurar(termo, userId) {
  const q = String(termo || '').trim();
  if (q.length < 3) return { lugares: [], fonte: 'curto' };

  // Os nossos vêm SEMPRE da base, mesmo quando o resto vem da memória.
  //
  // A memória é partilhada por toda a gente e guarda 24 horas. Os nossos
  // lugares dependem de QUEM procura — cada um vê os seus por rever — e
  // mudam no instante em que alguém aceita uma proposta. Guardá-los fazia
  // duas asneiras ao mesmo tempo: um nome recém-aceite não aparecia durante
  // um dia, e um passageiro via os lugares por rever de outro. É uma
  // consulta a uma tabela pequena com índice; não é onde se poupa.
  const nossos = await procurarNossos(q, userId);

  const guardados = daMemoria(q.toLowerCase());
  if (guardados) {
    const lugares = [...nossos];
    for (const g of guardados) {
      if (!lugares.some((n) => mesmoSitio(n, g))) lugares.push(g);
    }
    return { lugares: lugares.slice(0, 8), fonte: nossos.length ? 'nossos+memoria' : 'memoria' };
  }

  // OS DOIS AO MESMO TEMPO, e não um depois do outro.
  //
  // A primeira versão só chamava o Google quando o Nominatim devolvia
  // ZERO. Parecia poupado e estava errado: com "Universidade" o Nominatim
  // devolve seis resultados — nenhum deles a Universidade Nacional — e
  // como não devolveu zero, o Google nunca era consultado. A resposta
  // certa existia e não aparecia.
  //
  // Quem escreve um destino escreve meia palavra e espera. Esperar pelo
  // zero é esperar por um caso que quase nunca acontece a meio de uma
  // palavra.
  //
  // Custa mais? Chama o Google em todas as buscas em vez de 12% delas. Mas
  // a memória de 24 horas apanha as repetições, e são precisas 5.000
  // chamadas por mês para sair do gratuito — muito acima do que Díli faz.
  // (Cinco mil, não dez: o escalão é Pro. Ver o cabeçalho do ficheiro.)
  const [osm, google] = await Promise.all([noNominatim(q), noGoogle(q)]);

  // O Google primeiro: em Timor-Leste conhece os negócios e os edifícios
  // que o OpenStreetMap ainda não tem, e é isso que as pessoas escrevem.
  // Do OpenStreetMap entra o que não for repetido — tem ruas e bairros que
  // o Google às vezes não devolve.
  const deFora = [...google];
  for (const o of osm) {
    if (!deFora.some((g) => mesmoSitio(g, o))) deFora.push(o);
  }

  // Só o que vem de fora vai para a memória. Os nossos entram depois, a
  // cada busca — ver o comentário lá em cima.
  guardar(q.toLowerCase(), deFora.slice(0, 8));

  // Os nossos à frente, e o de fora que não seja o mesmo sítio a seguir. Um
  // nome que um passageiro escreveu ganha ao "Rua Sem Nome" do mapa: é
  // precisamente por o mapa não lhe saber o nome que alguém teve o trabalho
  // de lho dar.
  const lugares = [...nossos];
  for (const d of deFora) {
    if (!lugares.some((n) => mesmoSitio(n, d))) lugares.push(d);
  }

  const de = [];
  if (nossos.length) de.push('nossos');
  if (google.length) de.push('google');
  if (osm.length) de.push('osm');
  return { lugares: lugares.slice(0, 8), fonte: de.join('+') || 'nada' };
}

// O GOOGLE CONHECE ESTE SÍTIO?
//
// Pergunta-se UMA vez, quando o lugar é aprovado, e guarda-se a resposta.
// Serve para decidir se vale a pena desenhá-lo no mapa: um nome que o Google
// já escreve não precisa de ser escrito outra vez por cima.
//
// COMO SE DECIDE. Procura-se o nome dentro da caixa de Timor-Leste e vê-se se
// algum resultado cai a menos de 60 metros do nosso ponto. Sessenta porque um
// edifício grande tem essa largura — o Hotel Timor e a loja da Timor Telecom
// que lá dentro está são o mesmo sítio para quem vai de carro.
//
// SEM CHAVE, devolve `null` e não `false`. Não perguntámos, logo não sabemos;
// e um lugar por perguntar não se desenha. É melhor não mostrar do que
// mostrar o que talvez seja repetido.
const PERTO_PARA_SER_O_MESMO_M = 60;

export async function googleConhece(nome, lat, lng) {
  if (!process.env.GOOGLE_MAPS_KEY) return null;
  const achados = await noGoogle(String(nome || '').trim());
  if (!achados.length) return false;
  return achados.some((g) => {
    const dLat = (g.lat - lat) * 111320;
    const dLng = (g.lng - lng) * 111320 * Math.cos((lat * Math.PI) / 180);
    return Math.hypot(dLat, dLng) <= PERTO_PARA_SER_O_MESMO_M;
  });
}

// Perguntar pelos que ficaram por perguntar.
//
// Corre ao arrancar o servidor. Apanha dois casos: os lugares que já estavam
// aprovados antes de esta coluna existir, e os que foram aprovados enquanto
// o Google estava em baixo — nesses a marca ficou NULL e eles não se
// desenham, o que é o comportamento seguro mas não o certo para sempre.
//
// VINTE DE CADA VEZ, e com uma pausa entre eles. São chamadas pagas, e o
// Render reinicia a cada publicação: sem limite, uma tarde de publicações
// como a de hoje gastaria a quota inteira a perguntar as mesmas coisas.
// Vinte por arranque esgota qualquer atraso realista em poucos reinícios.
const POR_ARRANQUE = 20;

export async function marcarPorPerguntar(query) {
  if (!process.env.GOOGLE_MAPS_KEY) return 0;
  const porPerguntar = await query(
    `SELECT id, nome, lat, lng FROM lugares_propostos
      WHERE estado = 'aceite' AND google_conhece IS NULL
      ORDER BY id LIMIT ${POR_ARRANQUE}`
  );
  let feitos = 0;
  for (const l of porPerguntar) {
    const sabe = await googleConhece(l.nome, Number(l.lat), Number(l.lng));
    if (sabe === null) break; // o Google está em baixo; tenta-se no próximo arranque
    await query('UPDATE lugares_propostos SET google_conhece = $2 WHERE id = $1', [l.id, sabe]);
    feitos++;
    // O Nominatim e o Google não gostam de rajadas, e isto não tem pressa
    // nenhuma: ninguém está à espera desta resposta.
    await new Promise((r) => setTimeout(r, 400));
  }
  return feitos;
}

// Para o painel: saber se a segunda camada está ligada, sem revelar a chave.
// Quantos nomes se pediram ao Google hoje. Sem isto o tecto é uma promessa
// que ninguém consegue verificar — e o que não se vê não se governa.
export async function nomesDeHoje() {
  const r = await one(
    `SELECT valor FROM contadores WHERE nome = 'nomes_google' AND dia = CURRENT_DATE`
  );
  return r?.valor ?? 0;
}

export function estadoDaBusca() {
  return {
    google: !!process.env.GOOGLE_MAPS_KEY,
    memoria: memoria.size,
    nomesTectoDiario: NOMES_POR_DIA,
    // Quantos nomes cada camada deu desde o arranque. Sem nomes nem
    // coordenadas: só a contagem.
    fontes: { ...fontes },
    // `null` quer dizer que a última chamada ao Google correu bem — ou que
    // ainda não houve nenhuma desde o arranque.
    ultimoErroGoogle,
  };
}
