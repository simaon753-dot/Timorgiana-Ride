import { AsyncLocalStorage } from 'node:async_hooks';
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
// A MOTA PEDE A ROTA DE CARRO (27/09/2026) — medido, e não suposto.
//
// Ligou-se `TWO_WHEELER` a 22/09 à espera de caminhos próprios de mota. O
// registo do /api/health, com os testes do Simão, mostrou o que o Google
// responde em Timor-Leste para duas rodas: ZERO caminhos, em todas as
// chamadas, com alternativas pedidas e sem elas. O modo não é servido cá.
//
// Durante uma semana a mota esteve, sem ninguém saber, no OSRM — a diferença
// de 9,8 km (mota) contra 11,4 km (carro) que parecia um atalho de mota era
// o OSRM contra o Google, e não duas rodas contra quatro. Depois passou a cair
// na rota de carro do Google (ver `calcularRota`), mas cada cotação ainda
// gastava uma chamada que nunca dava nada — metade do tecto diário.
//
// Um caminho de carro é sempre válido para uma mota. Se um dia o Google
// servir duas rodas em Timor-Leste, é voltar a pôr 'TWO_WHEELER' aqui e ver
// no /api/health se começam a vir caminhos.
export const MODO = { motorbike: 'DRIVE', car: 'DRIVE', carry: 'DRIVE' };

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

// `rumo` (opcional): o sentido em que o carro ARRANCA, em graus. Diz ao
// Google a que faixa encostar a origem numa avenida de faixas separadas —
// ver `recolhaDoOutroLado`. Sem ele, o Google escolhe a mais perto do pino.
async function peloGoogle(a, b, intermedios = [], modo = 'DRIVE', rumo = null) {
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
        origin: {
          location: {
            latLng: { latitude: a.lat, longitude: a.lng },
            ...(rumo != null ? { heading: Math.round(rumo) % 360 } : {}),
          },
        },
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
        //
        // NEM EM DUAS RODAS (27/09/2026). Medido no /api/health, nos testes
        // do Simão: com alternativas pedidas, `TWO_WHEELER` devolveu ZERO
        // caminhos, quatro vezes seguidas, enquanto `DRIVE` devolvia dois.
        // Não era «só um caminho» — era nenhum, e a mota caía no OSRM, com
        // estradas que não batem com o mapa do Google e sem alternativas.
        // As alternativas da mota vêm agora das do carro (ver
        // `caminhosDaViagem`), que são caminhos válidos para ela também.
        ...(intermedios.length || modo === 'TWO_WHEELER' ? {} : { computeAlternativeRoutes: true }),
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
    registarCaminhos(modo, !intermedios.length && modo !== 'TWO_WHEELER', opcoes.length);
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
  // SEM ROTA DE MOTA DO GOOGLE, A DE CARRO DO GOOGLE — e só depois o OSRM.
  //
  // Um caminho de carro é sempre um caminho válido para uma mota; o
  // contrário é que não. E o do Google bate com as estradas do mapa que a
  // pessoa está a ver, coisa que o OSRM não garante. Vai pela memória (e
  // pela partilha de pedidos em curso) de `rotaCompleta`: a cotação já pede
  // a rota de carro do mesmo percurso, e isto não custa uma chamada a mais.
  if (modo !== 'DRIVE') return rotaCompleta(a, b, intermedios, 'car');
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

  // UM PEDIDO EM CURSO É PARTILHADO (27/09/2026). A memória só se enche
  // quando a resposta CHEGA; até lá, dois pedidos iguais passavam os dois.
  // Era o que acontecia em cada viagem nova: a cotação e a linha provisória
  // do mapa pedem a mesma rota de carro no mesmo segundo, e o registo do
  // /api/health mostrava `DRIVE` duas vezes por pedido — o dobro do tecto
  // diário gasto para a mesma resposta.
  const emVoo = emCurso.get(chave);
  if (emVoo) return structuredClone(await emVoo);

  const promessa = calcularRota(a, b, intermedios, modo);
  emCurso.set(chave, promessa);
  try {
    const rota = await promessa;
    if (rota.fonte !== 'recta') {
      // Cheia, sai a mais antiga (um Map guarda a ordem de entrada).
      if (memoria.size >= MEMORIA_MAX) memoria.delete(memoria.keys().next().value);
      memoria.set(chave, { em: Date.now(), rota: structuredClone(rota) });
    }
    return structuredClone(rota);
  } finally {
    emCurso.delete(chave);
  }
}
const emCurso = new Map();

// ── A RECOLHA DO OUTRO LADO DA AVENIDA (28/09/2026) ───────────────────
//
// PORQUE EXISTE. A viagem 36 (Nicolau Lobato → Cristo Rei Beach) saiu com
// 11,4 km e uma volta ao quarteirão pela Hudi-Laran. A avenida tem ali duas
// faixas separadas, cada uma de sentido único; o pino ficou a sul, o Google
// encostou a recolha à faixa sul — a que vai para OESTE — e o carro tinha de
// ir para trás antes de ir para a frente. Não era erro do Google: era a faixa
// onde o pino calhou, e ninguém a escolheu.
//
// Decisão do Simão (opção 2): a recolha FICA onde a pessoa está, e a app
// diz-lhe quanto poupa do outro lado. Atravessar uma avenida a pé é decisão
// de quem atravessa, não nossa.
//
// SÓ SE PERGUNTA QUANDO A ROTA ARRANCA A FUGIR DO DESTINO — mais de
// `DESVIO_MIN_GRAUS` entre o sentido dos primeiros metros e a direcção do
// destino. Na maioria das viagens isto é falso e não custa chamada nenhuma.
const DESVIO_MIN_GRAUS = 110;
// Até onde se admite que a outra faixa fica: atravessar a avenida, e não
// andar até outro sítio.
const OUTRO_LADO_MAX_M = 100;
// Abaixo disto a diferença é ruído de arredondamento, não uma volta.
const POUPANCA_MIN_KM = 0.3;
// Quanto se anda para a direita à procura da outra faixa. Na Nicolau Lobato
// as duas faixas estão a 13 m; há separadores mais largos. Uma chamada por
// tentativa, e pára à primeira que muda de faixa.
const DESLOCAMENTOS_M = [12, 25, 40];

function deslocar(p, rumo, metros) {
  const rad = (rumo * Math.PI) / 180;
  return {
    lat: p.lat + (metros * Math.cos(rad)) / 110574,
    lng: p.lng + (metros * Math.sin(rad)) / (111320 * Math.cos((p.lat * Math.PI) / 180)),
  };
}

function rumoEntre(p, q) {
  const rad = Math.PI / 180;
  const y = Math.sin((q.lng - p.lng) * rad) * Math.cos(q.lat * rad);
  const x =
    Math.cos(p.lat * rad) * Math.sin(q.lat * rad) -
    Math.sin(p.lat * rad) * Math.cos(q.lat * rad) * Math.cos((q.lng - p.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

function diferencaDeRumo(r1, r2) {
  const d = Math.abs(r1 - r2) % 360;
  return d > 180 ? 360 - d : d;
}

// O sentido em que a linha arranca: do primeiro ponto até ao primeiro que
// esteja a 150 m ou mais. Um só segmento mede a esquina, não a estrada.
function rumoDeArranque(linha) {
  if (!linha || linha.length < 2) return null;
  const inicio = linha[0];
  for (const p of linha) if (straightKm(inicio, p) >= 0.15) return rumoEntre(inicio, p);
  return rumoEntre(inicio, linha[linha.length - 1]);
}

// AS ÚLTIMAS DECISÕES, no /api/health (28/09/2026). A primeira versão não
// dizia porque é que não propunha nada, e o primeiro teste do Simão falhou sem
// deixar rasto. Só números e o motivo — NUNCA coordenadas: o /api/health é
// público, e o sítio de onde alguém pede um carro é a casa dessa pessoa.
const DECISOES = [];
export function anotarOutroLado(d) {
  DECISOES.unshift({ quando: new Date().toISOString(), ...d });
  if (DECISOES.length > 10) DECISOES.length = 10;
}
const r0 = (x) => (x == null ? null : Math.round(x));

// Devolve `{ lat, lng, km, min }` — o ponto da outra faixa onde o carro pára
// e a rota a partir dele — ou `null` quando não há outro lado que valha a pena.
// `rota` é a que a cotação já tem; `pino` é onde a pessoa apontou.
export async function recolhaDoOutroLado(pino, b, rota) {
  if (rota?.fonte !== 'google' || !rota.linha?.length) {
    anotarOutroLado({ motivo: 'rota-nao-google', fonte: rota?.fonte || null });
    return null;
  }
  const arranque = rumoDeArranque(rota.linha);
  const paraDestino = rumoEntre(rota.linha[0], b);
  const base = {
    rotaKm: rota.km,
    arranque: r0(arranque),
    paraDestino: r0(paraDestino),
    desvio: arranque == null ? null : r0(diferencaDeRumo(arranque, paraDestino)),
    pinoAteLinhaM: r0(straightKm(pino, rota.linha[0]) * 1000),
  };
  if (arranque == null || base.desvio < DESVIO_MIN_GRAUS) {
    anotarOutroLado({ motivo: 'arranca-para-o-destino', ...base });
    return null;
  }

  const rumo = (arranque + 180) % 360;
  // Na memória de dez minutos, com resposta negativa incluída: a procura
  // automática refaz a cotação de 20 em 20 segundos, e cada uma não pode
  // gastar outra chamada para ouvir o mesmo «não».
  const chave = 'OUTRO_LADO|' + chaveDaRota(pino, b, []);
  const guardada = memoria.get(chave);
  if (guardada && Date.now() - guardada.em < MEMORIA_MS) {
    anotarOutroLado({ motivo: 'memoria', proposta: !!guardada.rota, ...base });
    return structuredClone(guardada.rota);
  }

  // O PONTO VAI EM CIMA DA OUTRA FAIXA, e não o pino com um rumo. A primeira
  // versão mandava o pino e `heading` contrário; o registo do teste do Simão
  // mostrou o Google a devolver a MESMA rota (11,4 km, a arrancar para
  // oeste): numa via de faixas separadas o `heading` escolhe o lado da mesma
  // estrada, não a outra faixa. O Google encosta sempre à mais perto.
  //
  // Em Timor-Leste conduz-se pela esquerda: a faixa do sentido contrário fica
  // à DIREITA de quem segue. Parte-se do ponto onde o Google encostou (no
  // mapa DELE, para não somar o desvio do OpenStreetMap) e anda-se para a
  // direita até ele mudar de faixa. Quem confirma é o resultado: só conta uma
  // rota que arranque mesmo no sentido contrário.
  let resposta = null;
  const d = { ...base, rumoPedido: r0(rumo), tentativas: [] };
  const direita = (arranque + 90) % 360;
  for (const m of DESLOCAMENTOS_M) {
    if (!(await podePerguntar())) {
      d.motivo = 'sem-google-ou-tecto';
      break;
    }
    const tentativa = deslocar(rota.linha[0], direita, m);
    const g = await quem.run('outro-lado', () => peloGoogle(tentativa, b, [], 'DRIVE', rumo));
    const ponto = g?.linha?.[0];
    if (!ponto) {
      d.tentativas.push({ m, resposta: false });
      continue;
    }
    const t = {
      m,
      km: g.km,
      arranque: r0(rumoDeArranque(g.linha)),
      pinoM: r0(straightKm(pino, ponto) * 1000),
    };
    d.tentativas.push(t);
    // Ainda na mesma faixa: tentar mais longe.
    if (t.arranque == null || diferencaDeRumo(t.arranque, arranque) < 90) continue;
    if (t.pinoM > OUTRO_LADO_MAX_M) d.motivo = 'outro-lado-longe';
    else if (rota.km - g.km < POUPANCA_MIN_KM) d.motivo = 'poupa-pouco';
    else {
      d.motivo = 'proposta';
      resposta = { lat: ponto.lat, lng: ponto.lng, km: g.km, min: g.min };
    }
    break;
  }
  if (!d.motivo) d.motivo = 'google-nao-muda-de-faixa';
  anotarOutroLado(d);
  if (memoria.size >= MEMORIA_MAX) memoria.delete(memoria.keys().next().value);
  memoria.set(chave, { em: Date.now(), rota: resposta });
  return structuredClone(resposta);
}

// ── OS CAMINHOS DE UMA VIAGEM ─────────────────────────────────────────
//
// A LISTA QUE O PASSAGEIRO VÊ E A LISTA COM QUE A VIAGEM É COBRADA TÊM DE
// SER A MESMA, e por isso saem as duas daqui. A app manda o ÍNDICE do
// caminho escolhido; se a cotação montasse a lista de uma maneira e a
// criação da viagem de outra, o índice 1 de uma seria outro caminho na
// outra — o passageiro escolhia um e pagava outro, sem aviso nenhum.
//
// O PRIMEIRO É O RECOMENDADO, e é o que o Google põe à frente para o modo
// do veículo. Não é o mais curto: é o mais rápido, calculado por quem sabe
// o tipo de estrada, os sentidos proibidos e as viragens que não se podem
// fazer. Nós não temos melhor informação do que essa para Díli, e
// reordenar por quilómetros seria recomendar o caminho mais lento.
//
// NA MOTA, as alternativas vêm das do carro: o Google não dá alternativas
// em duas rodas (medido), e um caminho de carro é sempre válido para uma
// mota. O preço de cada uma continua a ser o da mota — quem calcula o preço
// é a cotação, com o tipo do veículo.
//
// SÓ OS QUE SÃO MESMO OUTROS. Ver `mesmoCaminho`.
export async function caminhosDaViagem(a, b, intermedios = [], tipoVeiculo = 'car') {
  const proprio = await rotaCompleta(a, b, intermedios, tipoVeiculo);
  let lista = proprio.opcoes || [proprio];
  if (peloGoogleModo(tipoVeiculo) === 'TWO_WHEELER' && !intermedios.length) {
    const carro = await rotaCompleta(a, b, intermedios, 'car');
    lista = [...lista, ...(carro.opcoes || [carro])];
  }
  const saida = [];
  for (const c of lista) {
    if (!c?.linha?.length) continue;
    if (saida.some((x) => mesmoCaminho(x, c))) continue;
    saida.push(c);
    if (saida.length >= MAX_CAMINHOS) break;
  }
  return saida.length ? saida : [proprio];
}

// DOIS CAMINHOS SÃO O MESMO se nenhum ponto de um se afastar mais de
// `DIFERENCA_MINIMA_M` do outro — medido nos dois sentidos, porque um
// caminho pode estar contido no outro e ter um desvio só de um lado.
//
// Três rotas praticamente iguais não são três escolhas: são uma escolha
// repetida, e obrigam o passageiro a comparar números que só diferem por
// o Google ter arredondado uma esquina de outra maneira.
const DIFERENCA_MINIMA_M = 150;
export function mesmoCaminho(a, b) {
  const amostra = (l) => l.filter((_, i) => i % 8 === 0 || i === l.length - 1);
  const pa = amostra(a.linha);
  const pb = amostra(b.linha);
  const afastamento = (de, para) => {
    let pior = 0;
    for (const p of de) {
      let perto = Infinity;
      for (const q of para) perto = Math.min(perto, straightKm(p, q) * 1000);
      pior = Math.max(pior, perto);
    }
    return pior;
  };
  return Math.max(afastamento(pa, pb), afastamento(pb, pa)) < DIFERENCA_MINIMA_M;
}

// AS ÚLTIMAS CHAMADAS AO GOOGLE, para se poder ver o que ele devolveu.
//
// Só o que interessa a esta pergunta: o modo, se ia com paragens (com
// paragens nunca se pedem alternativas) e quantos caminhos vieram. Não
// guarda coordenadas — isto aparece no /api/health, que é público.
const ULTIMAS = [];
const ULTIMAS_MAX = 12;

// QUEM PEDIU (27/09/2026). Duas chamadas no mesmo segundo podiam ser um
// pedido repetido ou duas rotas diferentes e necessárias — a do motorista até
// à recolha e a da viagem —, e o registo não deixava distinguir. O nome é
// posto à entrada de cada rota do servidor (`pedidoDe`) e acompanha o pedido
// até aqui sem passar por cada função pelo caminho: é isso que o
// AsyncLocalStorage faz, e é por isso que não mexe em `rotaCompleta`.
//
// Um pedido partilhado (ver `emCurso`) fica com o nome de quem chegou
// primeiro — que é quem, de facto, fez a chamada ao Google.
const quem = new AsyncLocalStorage();
export function pedidoDe(nome, fn) {
  return quem.run(nome, fn);
}

// NA BASE DE DADOS E NÃO SÓ EM MEMÓRIA (28/09/2026). O plano gratuito do
// Render adormece o servidor quando ninguém o usa, e acordar apagava a
// memória: três vezes seguidas o Simão testou, pediu para ver o registo, e o
// registo estava vazio porque o servidor tinha dormido entretanto. Fica a
// memória para quando a base falhar, e a base para o resto.
const REGISTO_MAX = 200;
function registarCaminhos(modo, pediuAlternativas, quantos) {
  const linha = {
    para: quem.getStore() || 'outro',
    modo,
    pediuAlternativas,
    caminhos: quantos,
    quando: new Date().toISOString(),
  };
  ULTIMAS.unshift(linha);
  if (ULTIMAS.length > ULTIMAS_MAX) ULTIMAS.length = ULTIMAS_MAX;
  query(
    `INSERT INTO registo_rotas (para, modo, pediu_alternativas, caminhos) VALUES ($1, $2, $3, $4)`,
    [linha.para, modo, pediuAlternativas, quantos]
  )
    .then(() =>
      query(
        `DELETE FROM registo_rotas WHERE id <= (SELECT MAX(id) FROM registo_rotas) - $1`,
        [REGISTO_MAX]
      )
    )
    .catch(() => {});
}

export async function estadoDasRotas() {
  let ultimas = ULTIMAS;
  try {
    const rows = await query(
      `SELECT para, modo, pediu_alternativas, caminhos, quando
         FROM registo_rotas ORDER BY id DESC LIMIT $1`,
      [ULTIMAS_MAX]
    );
    ultimas = rows.map((r) => ({
      para: r.para,
      modo: r.modo,
      pediuAlternativas: r.pediu_alternativas,
      caminhos: r.caminhos,
      quando: r.quando,
    }));
  } catch {
    // Sem a base, fica o que está em memória.
  }
  // `null` quer dizer que a última chamada correu bem — ou que ainda não
  // houve nenhuma desde o arranque.
  return { google: !!CHAVE, tectoDiario: POR_DIA, ultimoErroGoogle, ultimas, outroLado: DECISOES };
}

export async function usoDeHoje() {
  const r = await one(
    `SELECT valor FROM contadores WHERE nome = 'rotas_google' AND dia = CURRENT_DATE`
  );
  return r?.valor ?? 0;
}
