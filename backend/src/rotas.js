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

// O ÚLTIMO ERRO DO GOOGLE NAS ROTAS (22/09/2026).
//
// PORQUE EXISTE. O Simão abriu a consola do Google e viu «Routes API — 25
// solicitações, 100% de erros». Vinte e cinco pedidos, vinte e cinco falhas,
// e nós sem saber: a função dizia `if (!r.ok) return null` e deitava fora o
// motivo. Caía-se no OSRM em silêncio, as viagens continuavam a ter preço, e
// ninguém tinha como ligar uma coisa à outra.
//
// É a MESMA cegueira que já tínhamos corrigido na busca de lugares, e cuja
// lição está escrita lá: «um caminho novo tem de conseguir explicar-se quando
// falha». As rotas ficaram de fora nessa altura. Corrigir um caminho e deixar
// o irmão é como corrigir metade de uma duplicação — já hoje me custou uma.
//
// Guarda-se só o ÚLTIMO, e um pedaço do corpo: chega para distinguir chave
// recusada, API por activar, quota esgotada e facturação parada, que são as
// quatro causas reais e pedem quatro remédios diferentes.
let ultimoErroGoogle = null;

function guardarErro(http, texto) {
  ultimoErroGoogle = { http, quando: new Date().toISOString(), diz: String(texto).slice(0, 300) };
}

// O MODO DE VIAGEM, por tipo de veículo (22/09/2026).
//
// PORQUE EXISTE. `travelMode: 'DRIVE'` estava escrito à mão e o tipo de
// veículo nem chegava aqui: uma MOTORIZADA era encaminhada como automóvel,
// por avenidas de sentido único, a respeitar separadores centrais e
// proibições de viragem que uma mota contorna. O Simão viu a linha dar uma
// volta enorme e disse o que qualquer motorista de Díli diria: «ninguém vai
// por aí».
//
// Ele tinha razão, e o Google também: nós é que fizemos a pergunta errada.
// O `TWO_WHEELER` existe precisamente para países onde a mota manda — foi
// desenhado para a Índia, a Indonésia e o Vietname, e Timor-Leste é desses.
export const MODO = { motorbike: 'TWO_WHEELER', car: 'DRIVE', carry: 'DRIVE' };

// QUANTOS CAMINHOS SE MOSTRAM (23/09/2026). Três, como o Google, e a decisão
// é do Simão: «mostrar até 3, vamos testar; se funciona, manter».
//
// O «até» é literal — o Google devolve os que existirem, e em muitos
// percursos de Díli há um só. Nesse caso a app desenha um, como sempre.
//
// Está aqui, e não no ecrã que os mostra, porque quem VALIDA a escolha é o
// servidor no momento de criar a viagem: o mesmo número tem de mandar nos
// dois sítios, senão um índice aceite ao mostrar era recusado ao pedir.
export const MAX_CAMINHOS = 3;

// Quanto pode a rota recalculada afastar-se da que foi mostrada antes de se
// considerar que é OUTRO caminho. Trezentos metros é menos do que qualquer
// alternativa a sério e mais do que o ruído de um recálculo.
export const TOLERANCIA_KM = 0.3;

function peloGoogleModo(tipo) {
  return MODO[tipo] || 'DRIVE';
}

// Uma rota da resposta do Google, na forma que o resto do projecto conhece.
// Devolve nada se lhe faltar a linha — sem linha não há o que desenhar, e uma
// distância sem caminho não se pode mostrar a ninguém.
function umaRota(rota) {
  const comprimida = rota?.polyline?.encodedPolyline;
  if (!comprimida) return null;
  const km = Math.round((Number(rota.distanceMeters) / 1000) * 10) / 10;
  const seg = Number(String(rota.duration || '0s').replace('s', ''));
  return { km, min: duracaoRealista(km, seg / 60), linha: descomprimir(comprimida) };
}

async function peloGoogle(a, b, intermedios = [], modo = 'DRIVE') {
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
        travelMode: modo,
        // AS ALTERNATIVAS VÊM NA MESMA CHAMADA (23/09/2026).
        //
        // É uma bandeira no pedido que já fazíamos, e não pedidos a mais: o
        // Google devolve duas ou três rotas em vez de uma. Isto é o que torna
        // a escolha de caminho POSSÍVEL — o nosso tecto conta CHAMADAS, e se
        // três alternativas custassem três chamadas, cada passageiro que
        // abrisse o ecrã gastava o triplo e o tecto acabava a meio da manhã.
        //
        // O que aumenta é o tamanho da resposta, não o preço dela. A
        // `FieldMask` acima não muda, e é ela que decide o escalão.
        //
        // NUNCA COM PARAGENS PELO CAMINHO. A Routes API não dá alternativas a
        // um percurso com pontos intermédios, e pedir as duas coisas ao mesmo
        // tempo faz o pedido INTEIRO ser recusado — não é que viessem sem
        // alternativas: vinha um erro, caíamos no OSRM, e uma entrega de
        // Carry com duas paragens passava a ser cotada por um motor pior sem
        // ninguém perceber porquê.
        //
        // É o caso em que perder a funcionalidade não custa nada: quem
        // definiu onde passar já escolheu o caminho.
        ...(intermedios.length ? {} : { computeAlternativeRoutes: true }),
        // Sem trânsito em tempo real de propósito: é um SKU mais caro, e a
        // nossa estimativa de tempo já assume a velocidade real de Díli.
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    });
    if (!r.ok) {
      guardarErro(r.status, await r.text().catch(() => ''));
      return null;
    }
    ultimoErroGoogle = null;
    const j = await r.json();
    const opcoes = (j?.routes || []).map(umaRota).filter(Boolean);
    // QUANTOS CAMINHOS É QUE O GOOGLE DEU (24/09/2026).
    //
    // O Simão viu duas opções no carro e nenhuma na motorizada, e daqui eu
    // não tenho como saber se é o Google que devolve um só, se é a bandeira
    // que não está a passar, ou se é a app que não os desenha. São três
    // sítios possíveis e a diferença entre eles é invisível de fora.
    //
    // Fica registado à entrada, que é o único sítio onde a resposta do
    // Google ainda existe tal como veio. Sem isto, diagnosticar isto era
    // adivinhar — e já perdi um dia inteiro a mudar a mira nos dois sentidos
    // por não ter medido primeiro.
    registarCaminhos(modo, intermedios.length, opcoes.length);
    if (!opcoes.length) return null;
    // A PRIMEIRA CONTINUA A SER A ROTA, com a forma de sempre. Tudo o que já
    // lê `km`, `min` e `linha` não muda uma linha por causa disto; quem
    // quiser escolher caminho lê o `opcoes`, que é novo.
    return { ...opcoes[0], fonte: 'google', opcoes };
  } catch (e) {
    // TAMBÉM AQUI, e não só no `!r.ok`. Este ramo apanha o que nunca chegou a
    // ser resposta: sem rede, DNS a falhar, e sobretudo o PRAZO de 8 segundos
    // a disparar. Um tempo esgotado não tem código HTTP — sem isto, a causa
    // mais provável numa ligação de Díli era exactamente a única invisível.
    guardarErro(0, e?.name === 'AbortError' ? 'prazo de 8 s esgotado' : e?.message || 'falhou');
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
async function calcularRota(a, b, intermedios, modo = 'DRIVE') {
  if (await podePerguntar()) {
    const g = await peloGoogle(a, b, intermedios, modo);
    if (g) return g;
  }
  // O OSRM público só tem perfil de automóvel: a rede de segurança não sabe
  // distinguir mota de carro. Fica assim de propósito — um caminho de carro é
  // uma resposta conservadora (nunca mais curta do que a real), e inventar um
  // desconto por ser mota seria prometer um atalho que ninguém verificou.
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

// MEMÓRIA CURTA DAS ROTAS (16/09/2026).
//
// O passageiro sem motorista por perto passou a ter um botão "Procurar outra
// vez", que repete a cotação. A cotação pede a rota, e cada pedido ao Google
// conta para o tecto de 300 por dia: um passageiro impaciente a tocar dez
// vezes gastava dez rotas iguais.
//
// Os mesmos pontos, nos últimos dez minutos, dão a mesma rota sem perguntar a
// ninguém. O que o botão quer saber de novo, que motoristas estão livres, não
// passa por aqui: vem sempre fresco do nearestDrivers, na cotação.
//
// Dez minutos, porque é o tempo que um pedido fica aberto. Guarda-se em
// memória e não na base de dados: se o servidor reiniciar perde-se tudo, e o
// pior que acontece é voltar a perguntar uma rota. Só se guardam respostas do
// Google e do OSRM. A linha recta é o recurso de quando os dois falham, e
// guardá-la seria não voltar a tentar durante dez minutos.
const MEMORIA_MS = 10 * 60 * 1000;
const MEMORIA_MAX = 500;
const memoria = new Map();

// Cinco casas decimais são cerca de um metro. A app manda sempre as mesmas
// coordenadas para a mesma viagem, por isso a igualdade exacta chega.
function chaveDaRota(a, b, intermedios) {
  const p = (x) => `${Number(x.lat).toFixed(5)},${Number(x.lng).toFixed(5)}`;
  return [a, ...intermedios, b].map(p).join(';');
}

// `intermedios` é OPCIONAL e por omissão vazio (ver a nota em calcularRota).
export async function rotaCompleta(a, b, intermedios = [], tipoVeiculo = 'car') {
  const modo = peloGoogleModo(tipoVeiculo);
  // O MODO ENTRA NA CHAVE DA MEMÓRIA, e é a parte que se esquece.
  //
  // Sem isto, a primeira cotação de um percurso guardava a rota do carro e a
  // mota recebia-a de volta — a correcção ficava invisível e ninguém ligaria
  // a causa ao efeito. Duas perguntas diferentes não podem partilhar a mesma
  // gaveta.
  const chave = modo + '|' + chaveDaRota(a, b, intermedios);
  const guardada = memoria.get(chave);
  // Uma CÓPIA, e não a própria: se quem chama mexer no que recebe, a memória
  // não pode ficar estragada para o próximo.
  if (guardada && Date.now() - guardada.em < MEMORIA_MS) return structuredClone(guardada.rota);

  const rota = await calcularRota(a, b, intermedios, modo);
  if (rota.fonte !== 'recta') {
    // Cheia, sai a mais antiga (um Map guarda a ordem de entrada).
    if (memoria.size >= MEMORIA_MAX) memoria.delete(memoria.keys().next().value);
    memoria.set(chave, { em: Date.now(), rota: structuredClone(rota) });
  }
  return rota;
}

// AS ÚLTIMAS CHAMADAS AO GOOGLE, para se poder ver o que ele devolveu.
//
// Só o que interessa a esta pergunta: o modo, se ia com paragens (com
// paragens nunca se pedem alternativas) e quantos caminhos vieram. Não
// guarda coordenadas — isto aparece no /api/health, que é público.
const ULTIMAS = [];
const ULTIMAS_MAX = 12;
function registarCaminhos(modo, paragens, quantos) {
  ULTIMAS.unshift({
    modo,
    pediuAlternativas: paragens === 0,
    caminhos: quantos,
    quando: new Date().toISOString(),
  });
  if (ULTIMAS.length > ULTIMAS_MAX) ULTIMAS.length = ULTIMAS_MAX;
}

export function estadoDasRotas() {
  // `null` quer dizer que a última chamada correu bem — ou que ainda não
  // houve nenhuma desde o arranque.
  return { google: !!CHAVE, tectoDiario: POR_DIA, ultimoErroGoogle, ultimas: ULTIMAS };
}

export async function usoDeHoje() {
  const r = await one(
    `SELECT valor FROM contadores WHERE nome = 'rotas_google' AND dia = CURRENT_DATE`
  );
  return r?.valor ?? 0;
}
