// Busca de lugares, em duas camadas.
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
// O Google dá 10.000 chamadas por mês sem custo. Chamando-o sempre, e com a
// memória de 24 horas a apanhar as repetições, continua muito acima do que
// Díli faz.
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

const UA = "TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)";

// A mesma caixa que a app usava, com margem nas pontas para não cortar
// Oecusse nem o norte de Ataúro.
const TIMOR = {
  viewbox: "123.8,-9.8,127.6,-8.0",
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
      const texto = await r.text().catch(() => "");
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
        diz: e?.message || "sem resposta",
      };
    }
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

function nomeCurto(display) {
  return display.split(",").slice(0, 2).join(",").trim();
}

// ── Camada 1 ────────────────────────────────────────────────────────
async function noNominatim(q) {
  const p = new URLSearchParams({
    q,
    format: "json",
    limit: "6",
    addressdetails: "0",
    countrycodes: "tl",
    viewbox: TIMOR.viewbox,
    bounded: "1",
  });
  const rs = await comPrazo(`https://nominatim.openstreetmap.org/search?${p}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!Array.isArray(rs)) return [];
  return rs.map((x) => ({
    id: `osm:${x.osm_type || "x"}${x.osm_id || Math.random()}`,
    label: nomeCurto(x.display_name),
    detalhe: x.display_name.split(",").slice(2, 4).join(",").trim(),
    lat: Number(x.lat),
    lng: Number(x.lon),
    fonte: "osm",
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
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": chave,
        // A máscara de campos não é detalhe: o Google cobra por escalão
        // conforme o que se pede. Pedir só o essencial mantém a chamada no
        // escalão mais barato.
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: q,
        regionCode: "TL",
        maxResultCount: 6,
        locationRestriction: {
          rectangle: {
            low: { latitude: TIMOR.sul, longitude: TIMOR.oeste },
            high: { latitude: TIMOR.norte, longitude: TIMOR.leste },
          },
        },
      }),
    },
    true,
  );
  const places = j?.places;
  if (!Array.isArray(places)) return [];
  return places
    .filter((p) => p?.location?.latitude != null)
    .map((p) => ({
      id: `g:${p.id}`,
      label: p.displayName?.text || p.formattedAddress || "",
      detalhe: p.formattedAddress || "",
      lat: p.location.latitude,
      lng: p.location.longitude,
      fonte: "google",
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

export async function procurar(termo) {
  const q = String(termo || "").trim();
  if (q.length < 3) return { lugares: [], fonte: "curto" };

  const guardados = daMemoria(q.toLowerCase());
  if (guardados) return { lugares: guardados, fonte: "memoria" };

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
  // a memória de 24 horas apanha as repetições, e são precisas 10.000
  // chamadas por mês para sair do gratuito — muito acima do que Díli faz.
  const [osm, google] = await Promise.all([noNominatim(q), noGoogle(q)]);

  // O Google primeiro: em Timor-Leste conhece os negócios e os edifícios
  // que o OpenStreetMap ainda não tem, e é isso que as pessoas escrevem.
  // Do OpenStreetMap entra o que não for repetido — tem ruas e bairros que
  // o Google às vezes não devolve.
  const lugares = [...google];
  for (const o of osm) {
    if (!lugares.some((g) => mesmoSitio(g, o))) lugares.push(o);
  }

  guardar(q.toLowerCase(), lugares.slice(0, 8));
  return {
    lugares: lugares.slice(0, 8),
    fonte:
      google.length && osm.length
        ? "ambos"
        : google.length
          ? "google"
          : osm.length
            ? "osm"
            : "nada",
  };
}

// Para o painel: saber se a segunda camada está ligada, sem revelar a chave.
export function estadoDaBusca() {
  return {
    google: !!process.env.GOOGLE_MAPS_KEY,
    memoria: memoria.size,
    // `null` quer dizer que a última chamada ao Google correu bem — ou que
    // ainda não houve nenhuma desde o arranque.
    ultimoErroGoogle,
  };
}
