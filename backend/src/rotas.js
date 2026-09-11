import { query, one } from './db.js';
import { straightKm, duracaoRealista } from './routing.js';

// A LINHA DA VIAGEM, pedida a quem desenha o mapa.
//
// PORQUE ISTO EXISTE. A rota era calculada pelo OSRM, que corre sobre dados do
// OpenStreetMap. O mapa que se vê é do Google. São duas fontes diferentes, e
// em Timor-Leste as estradas do OpenStreetMap foram traçadas de imagens de
// satélite antigas — ficam dezenas de metros ao lado de onde o Google as
// desenha.
//
// O resultado é uma linha que segue uma estrada a sério e mesmo assim parece
// errada, porque assenta ao lado da estrada que a pessoa está a ver. O Simão
// comparou com o Google Maps: lá a linha assenta.
//
// Pedindo a rota ao Google, a linha e o mapa passam a vir do mesmo sítio.
//
// SEM CHAVE, VOLTA AO OSRM. O serviço nunca depende de uma facturação: uma
// linha aproximada é melhor do que nenhuma, e continua a haver viagem.

const CHAVE = process.env.GOOGLE_MAPS_KEY || '';

// TECTO DIÁRIO, e é o que torna isto seguro de ligar.
//
// A página de preços do Google fala de 10 mil chamadas grátis por SKU e por
// mês no escalão Essentials, mas eu não consegui confirmar o número ao ponto
// de o garantir ao Simão — e já lhe dei um número errado uma vez, sobre a
// pesquisa de lugares.
//
// Com um tecto, o número exacto deixa de importar: passado o limite, o dia
// continua a funcionar pelo OSRM e ninguém fica sem viagem. Trezentas por dia
// são nove mil por mês, abaixo do que a página indica, e muito acima do que
// vinte motoristas fazem.
const POR_DIA = Number(process.env.ROUTES_MAX_DIA) || 300;

// O contador vive na BASE DE DADOS e não em memória. No plano gratuito do
// Render o servidor reinicia a toda a hora, e um contador em memória
// apagava-se em cada reinício — ou seja, não era tecto nenhum.
async function podePerguntar() {
  if (!CHAVE) return false;
  try {
    const r = await one(
      `INSERT INTO contadores (nome, dia, valor) VALUES ('rotas_google', CURRENT_DATE, 1)
       ON CONFLICT (nome, dia) DO UPDATE SET valor = contadores.valor + 1
       RETURNING valor`
    );
    return (r?.valor ?? 0) <= POR_DIA;
  } catch (e) {
    // UMA FALHA A CONTAR NÃO PODE DEIXAR NINGUÉM SEM ROTA.
    //
    // Se a base de dados não responder, respondemos "não" — segue-se pelo
    // OSRM, que não custa nada. O contrário — deixar passar sem contar —
    // seria abrir a torneira exactamente no dia em que alguma coisa já está
    // mal, que é o pior dia para o fazer.
    console.error('[rotas] não foi possível contar; vou pelo OSRM —', e.message);
    return false;
  }
}

// Descodifica a linha comprimida do Google. É o formato "encoded polyline",
// que guarda cada ponto como a diferença para o anterior — uma rota de 300
// pontos cabe em meio kilobyte em vez de dez.
function descomprimir(texto) {
  const pontos = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < texto.length) {
    for (const eixo of ['lat', 'lng']) {
      let resultado = 0;
      let desvio = 0;
      let byte;
      do {
        byte = texto.charCodeAt(i++) - 63;
        resultado |= (byte & 0x1f) << desvio;
        desvio += 5;
      } while (byte >= 0x20);
      const delta = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
      if (eixo === 'lat') lat += delta;
      else lng += delta;
    }
    pontos.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pontos;
}

async function peloGoogle(a, b, intermedios = []) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': CHAVE,
        // Só os três campos que usamos. O Google cobra por SKU conforme os
        // campos pedidos, e pedir a lista de manobras subiria o escalão sem
        // nos dar nada — não damos indicações passo a passo.
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
        destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
        // PONTOS DO MEIO. A Routes v2 aceita-os como campo irmão da origem e
        // do destino, e devolve a distância e o tempo da rota INTEIRA — por
        // isso o preço não precisa de saber que houve paragens, e a
        // `FieldMask` acima não muda.
        //
        // Uma chamada, e não uma por troço: o contador diário de 300 conta
        // CHAMADAS, portanto uma viagem com duas paragens custa o mesmo que
        // uma directa. Era a dúvida que podia ter travado esta fase.
        ...(intermedios.length
          ? {
              intermediates: intermedios.map((p) => ({
                location: { latLng: { latitude: p.lat, longitude: p.lng } },
              })),
            }
          : {}),
        travelMode: 'DRIVE',
        // Sem trânsito em tempo real de propósito: é um SKU mais caro, e a
        // nossa estimativa de tempo já assume a velocidade real de Díli.
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const rota = j?.routes?.[0];
    const comprimida = rota?.polyline?.encodedPolyline;
    if (!comprimida) return null;
    const km = Math.round((Number(rota.distanceMeters) / 1000) * 10) / 10;
    const seg = Number(String(rota.duration || '0s').replace('s', ''));
    return {
      km,
      min: duracaoRealista(km, seg / 60),
      linha: descomprimir(comprimida),
      fonte: 'google',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

async function peloOsrm(a, b, intermedios = []) {
  // O OSRM já recebia uma LISTA de coordenadas separadas por ponto e vírgula
  // — só estava a ser usada com dois elementos. Acrescentar paragens é pôr
  // mais pares na mesma cadeia, e a geometria devolvida cobre tudo.
  const cadeia = [a, ...intermedios, b].map((p) => `${p.lng},${p.lat}`).join(';');
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${cadeia}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const j = await r.json();
    const rota = j?.routes?.[0];
    if (!rota?.geometry?.coordinates) return null;
    const km = Math.round((rota.distance / 1000) * 10) / 10;
    return {
      km,
      min: duracaoRealista(km, rota.duration / 60),
      linha: rota.geometry.coordinates.map((p) => ({ lat: p[1], lng: p[0] })),
      fonte: 'osrm',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

// A rota com a linha inteira. Google primeiro, OSRM a seguir, linha recta se
// nenhum responder — nunca devolve nada, para o ecrã ter sempre o que mostrar.
// `intermedios` é OPCIONAL e por omissão vazio: as três chamadas que já
// existiam continuam a comportar-se exactamente como antes. Um parâmetro novo
// que mudasse o comportamento por omissão seria o modo que parte as coisas a
// ser o modo normal — e isso já custou caro uma vez, no runtimeVersion.
export async function rotaCompleta(a, b, intermedios = []) {
  if (await podePerguntar()) {
    const g = await peloGoogle(a, b, intermedios);
    if (g) return g;
  }
  const o = await peloOsrm(a, b, intermedios);
  if (o) return o;

  // ÚLTIMO RECURSO: soma troço a troço. Com paragens, a recta entre as pontas
  // seria muito menos do que o caminho real — uma entrega que vai a Comoro e
  // volta a Bidau pagaria como se fosse a direito.
  const cadeia = [a, ...intermedios, b];
  let total = 0;
  for (let i = 1; i < cadeia.length; i++) total += straightKm(cadeia[i - 1], cadeia[i]);
  const km = Math.round(total * 1.4 * 10) / 10;
  return {
    km,
    min: duracaoRealista(km, null),
    linha: cadeia,
    fonte: 'recta',
    aproximado: true,
  };
}

export function estadoDasRotas() {
  return { google: !!CHAVE, tectoDiario: POR_DIA };
}

export async function usoDeHoje() {
  const r = await one(
    `SELECT valor FROM contadores WHERE nome = 'rotas_google' AND dia = CURRENT_DATE`
  );
  return r?.valor ?? 0;
}
