import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle as Bola, Line } from 'react-native-svg';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// O mapa, desenhado pelo Google Maps nativo.
//
// SUBSTITUI o OSMMap.js, que é Leaflet dentro de um WebView. O OSMMap NÃO SE
// APAGA: fica no repositório como saída de emergência. Se a chave do Google
// morrer — facturação fechada, restrição mal posta, conta suspensa — este
// mapa fica cinzento e a app deixa de servir para nada. Nesse caso troca-se
// o import nos dois sítios que o usam (RequestRideScreen e MapaExpandivel) e
// corre-se `npm run publicar`: chega aos telemóveis em minutos, sem APK novo,
// porque o react-native-webview continua dentro do binário.
//
// Uma dependência externa só se põe debaixo de tudo se houver um caminho de
// fuga que não dependa dela.
//
// A INTERFACE É A MESMA do OSMMap, propriedade por propriedade. Foi de
// propósito: assim a troca é uma linha, nos dois sentidos.

const DILI = { lat: -8.5569, lng: 125.5603 };

// A forma do pino, igual à do OSMMap — mesmo caminho SVG, mesmas cores.
//
// Copiado e não partilhado num ficheiro comum, e isso é deliberado: o
// OSMMap desenha dentro de uma página HTML e este desenha em componentes
// React. Não há forma de os dois lerem o mesmo código sem inventar uma
// camada que traduza um no outro. Se um dia a forma mudar, mudam-se os
// dois — e este comentário está aqui para que ninguém se esqueça do outro.
const GOTA = 'M2 18 A16 16 0 1 1 34 18 C34 26 26 32 18 41 C10 32 2 26 2 18 Z';
const COR = {
  origem: { fill: '#0E5C54', risco: '#08403A' },
  destino: { fill: '#E85531', risco: '#8C2E14' },
};

// O pino tem 30x45 no ecrã. O ponto que marca o sítio está em y=50 de 54 no
// sistema do desenho, o que dá 42 dos 45 — é essa fracção que diz ao mapa
// onde assentar o marcador.
const PINO_L = 30;
const PINO_A = 45;
const CARTAO_L = 150;

// O PINO DENTRO DO MAPA É UMA IMAGEM, e não o componente <Pino>.
//
// Três tentativas a corrigir a vista React dentro do marcador falharam, e
// todas por boas razões — tamanho por declarar, achatamento do Android,
// momento da fotografia. Todas eram defeitos reais e todas continuam
// corrigidas. Nenhuma era ESTA.
//
// O que deu a pista foi a mira: é o MESMO <Pino>, desenhado por cima do
// mapa como vista normal, e sempre apareceu perfeito. Dentro de um
// marcador, o mapa nativo não mostra a vista — tira-lhe uma fotografia. É
// essa fotografia que sai mal neste telemóvel.
//
// Uma imagem não passa por fotografia nenhuma: o mapa desenha-a
// directamente. Perde-se flexibilidade — a cor deixa de ser uma variável e
// passa a ser um ficheiro — mas para dois pinos fixos vale a troca.
//
// As imagens são geradas do MESMO caminho SVG, em scripts/desenhar-pinos.py.
// Se a forma mudar, correr o script outra vez; mudar só o <Pino> deixa o
// mapa com o desenho velho e o resto da app com o novo.
const IMAGEM = {
  origem: require('../../assets/mapa/pino-origem.png'),
  destino: require('../../assets/mapa/pino-destino.png'),
};

// O VEÍCULO TAMBÉM É IMAGEM, e voltou a ser marcador por causa disso.
//
// Foi por cima do mapa durante meia hora, e o Simão apanhou-o: ao arrastar,
// a posição em pixéis não se recalcula, o carro fica colado ao ecrã e o mapa
// desliza por baixo. Parecia que o carro andava sozinho.
//
// Um marcador anda com o mapa sem ninguém calcular nada. O que faltava era
// uma forma de o desenhar que funcionasse — e é a mesma dos pinos.
const CARRO = require('../../assets/mapa/carro.png');
// O ponto onde o carro encosta. IMAGEM e não vista por cima do mapa: uma
// vista tem de ser recolocada a cada movimento, e recolocar depois do
// movimento é vê-la a flutuar durante ele. Um marcador com imagem é
// desenhado pelo mapa, agarrado à coordenada, e nunca se descola.
const PONTO_ESTRADA = require('../../assets/mapa/ponto-estrada.png');
const ANCORA_Y = 42 / PINO_A;

// O TAMANHO VAI DECLARADO NUMA VISTA À VOLTA, e não só nas propriedades do
// SVG.
//
// O mapa nativo do Android mede a vista do marcador antes de o React lhe
// ter dado forma. Sem largura e altura escritas, mede zero e desenha uma
// fotografia do tamanho que adivinhou — foi assim que os pinos saíram
// esmagados na primeira versão.
//
// No Leaflet isto não podia acontecer: o `iconSize` era obrigatório. Aqui é
// opcional, e o que é opcional foi o que faltou.
function Pino({ tipo: qual }) {
  const c = COR[qual] || COR.origem;
  return (
    // `collapsable={false}` NÃO É DECORAÇÃO.
    //
    // O React Native ACHATA vistas: uma <View> que só tem propriedades de
    // disposição e mais nada é considerada supérflua e removida da árvore
    // nativa antes de chegar ao Android. É uma optimização normal e quase
    // sempre invisível.
    //
    // Aqui não é. Sem isto, a vista de 30x45 desaparecia no caminho, o mapa
    // voltava a medir o SVG directamente e o pino saía esmagado — com a
    // agravante de o resultado ser IDÊNTICO ao de antes da correcção, o que
    // faz parecer que a actualização não chegou.
    <View style={{ width: PINO_L, height: PINO_A }} collapsable={false}>
      <Svg width={PINO_L} height={PINO_A} viewBox="0 0 36 54">
        <Path d={GOTA} fill="none" stroke="#FFF" strokeWidth={5.6} strokeLinejoin="round" />
        <Path d={GOTA} fill={c.fill} stroke={c.risco} strokeWidth={2.6} strokeLinejoin="round" />
        <Bola cx={18} cy={18} r={6} fill="#FFF" />
        <Bola cx={18} cy={50} r={2.4} fill="#FFF" />
        <Bola cx={18} cy={50} r={1.7} fill={c.risco} />
      </Svg>
    </View>
  );
}

// O cartão com o nome, ao lado do pino.
//
// `agora` é o do veículo em movimento: fundo escuro, para não se confundir
// com os dois que estão parados quando lhes passa por cima.
function Cartao({ nome, detalhe, qual, agora = false }) {
  return (
    <View
      style={[styles.cartao, agora ? styles.cartaoAgora : styles['risco_' + qual]]}
      collapsable={false}
    >
      <Text style={[styles.cartaoNome, agora && styles.cartaoNomeAgora]} numberOfLines={1}>
        {nome}
      </Text>
      {detalhe ? (
        <Text style={[styles.cartaoDetalhe, agora && styles.cartaoDetalheAgora]} numberOfLines={1}>
          {detalhe}
        </Text>
      ) : null}
    </View>
  );
}

// A diferença entre dois rumos, pelo caminho mais curto.
//
// De 359 para 1 grau vão DOIS graus, não trezentos e cinquenta e oito. Sem
// isto, o travão dos três graus deixava passar todas as passagens pelo norte
// e o mapa dava um salto completo de cada vez que se apontasse para lá.
function diferencaAngular(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function metrosEntre(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// O BOTÃO DE VOLTAR À MINHA LOCALIZAÇÃO.
//
// Existe em todos os mapas que as pessoas usam, e quem arrasta o mapa para
// ver uma rua fica sem forma de voltar. Antes só se voltava fechando e
// reabrindo o ecrã, o que apagava o que já estivesse escolhido.
//
// A mira é desenhada e não é um emoji: os emojis mudam de forma conforme o
// telemóvel, e um alvo tem de se ler como um alvo em todos.
function Mira() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Bola cx={12} cy={12} r={6.5} fill="none" stroke="#0E5C54" strokeWidth={2} />
      <Bola cx={12} cy={12} r={2} fill="#0E5C54" />
      <Line
        x1={12}
        y1={1.5}
        x2={12}
        y2={5}
        stroke="#0E5C54"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={19}
        x2={12}
        y2={22.5}
        stroke="#0E5C54"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={1.5}
        y1={12}
        x2={5}
        y2={12}
        stroke="#0E5C54"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={19}
        y1={12}
        x2={22.5}
        y2={12}
        stroke="#0E5C54"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// A agulha da bússola. Metade coral a apontar ao norte, metade cinzenta —
// é o desenho que toda a gente reconhece de uma bússola, e distingue-se de
// um simples triângulo, que tanto podia ser "para cima" como "reproduzir".
function Agulha() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 2 L16.5 13 L12 11 Z" fill="#E85531" />
      <Path d="M12 22 L7.5 11 L12 13 Z" fill="#7C8A85" />
    </Svg>
  );
}

// AS CAMADAS: fotografia de satélite por cima do mapa desenhado.
//
// Três folhas empilhadas, que é a figura que toda a gente associa a "trocar de
// vista" — a mesma do Google. Acesa a branco quando o satélite está ligado,
// como o botão de seguir a bússola: é um MODO e não uma acção, e um modo tem
// de se ver que está a correr.
function Camadas({ activo }) {
  const cor = activo ? '#FFFFFF' : '#0E5C54';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 3 L21 8 L12 13 L3 8 Z" fill={cor} />
      <Path
        d="M4.5 11.2 L12 15.4 L19.5 11.2"
        fill="none"
        stroke={cor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 15 L12 19.2 L19.5 15"
        fill="none"
        stroke={cor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// A seta de seguir. Um cursor de navegação dentro de um círculo — a mesma
// figura que o Google usa, e que se distingue da AGULHA da bússola: a agulha
// diz onde é o norte, esta diz para onde EU estou virado.
function Seta({ activo }) {
  const cor = activo ? '#FFFFFF' : '#0E5C54';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Bola cx={12} cy={12} r={9.2} fill="none" stroke={cor} strokeWidth={1.8} />
      <Path d="M12 6.2 L15.6 16 L12 14 L8.4 16 Z" fill={cor} />
    </Svg>
  );
}

export default function MapaGoogle({
  pickable = false,
  arrastavel = false,
  onArrastar,
  modoEscolha = null,
  onCentro,
  markers = [],
  // OS TROÇOS A PÉ, agora uma LISTA e não um só.
  //
  // Era um, e só servia a recolha. O destino não tinha nenhum — quem pedia
  // para um sítio no meio de um quarteirão via o pino lá dentro e não fazia
  // ideia de onde é que o carro o ia largar.
  //
  // Cada troço é { de, para, qual }: `de` é onde a pessoa apontou, `para` é
  // onde o carro chega, e `qual` diz se é a recolha ou a largada.
  trocosAPe = [],
  // A LINHA JÁ CALCULADA, quando quem chama a tem.
  //
  // O ecrã de pedir viagem já pede a cotação ao servidor, e a cotação já traz
  // a linha por onde o preço passou. Passando-a aqui, não se pede a mesma
  // rota duas vezes — e garante-se que a linha desenhada é EXACTAMENTE a
  // linha cobrada. Sem ela, este componente pede a sua.
  linhaDaRota = null,
  center,
  height = 240,
  onPick,
  onRoute,
  liveMarker,
  liveLabel,
  fill = false,
  // QUANTO DESCER A COLUNA DE BOTÕES.
  //
  // Os três botões vivem no canto superior direito. Quem põe este mapa em
  // ecrã inteiro precisa de lá pôr também um botão de fechar, e esse botão
  // aterrava em cima do primeiro da coluna — o de voltar à minha
  // localização, que ficava invisível e intocável.
  //
  // Descer a coluna resolve sem inventar um segundo sítio para os botões: o
  // fechar passa a ser o primeiro da MESMA coluna, com o mesmo tamanho e o
  // mesmo intervalo, e lêem-se os quatro como um conjunto.
  topoDosBotoes = 0,
}) {
  const { t } = useI18n();
  const { token } = useAuth();
  const mapaRef = useRef(null);
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);
  // Comparada pelo COMPRIMENTO e pelas pontas, e não ponto a ponto: uma rota
  // tem centenas de pontos e serializá-la a cada desenho custa mais do que o
  // desenho.
  const linhaKey = linhaDaRota?.length
    ? `${linhaDaRota.length}:${linhaDaRota[0].lat},${linhaDaRota[0].lng}`
    : '';

  const [rota, setRota] = useState(null);
  const [aMexer, setAMexer] = useState(false);
  const [mapaPronto, setMapaPronto] = useState(false);
  // Onde o cartão do nome tem de ser desenhado, em pixéis do ecrã.
  const [cartoes, setCartoes] = useState([]);
  const [largura, setLargura] = useState(0);
  const [veiculo, setVeiculo] = useState(null);
  // OS NOSSOS LUGARES DESENHADOS NO MAPA.
  //
  // É a última parte da ideia que o Simão teve no princípio — "podemos
  // construir o nosso mapa como o GrabMaps?". As outras três já viviam: um
  // lugar aceite aparecia na pesquisa, na lista de perto e no cartão ao lado
  // do pino. Faltava estar ESCRITO no mapa, como o Google escreve os dele.
  //
  // Ao fim de uns meses, os sítios que o Google não conhece passam a estar
  // lá — e a app mostra coisas que nenhum outro mapa de Díli mostra.
  const [nossos, setNossos] = useState([]);
  const [nossosNoEcra, setNossosNoEcra] = useState([]);
  const regiaoRef = useRef(null);
  // O centro actual, para decidir de que lado do pino fica o cartão.
  const centroRef = useRef({ lat: c.lat, lng: c.lng });

  // MARCADORES PARADOS. Só se redesenham quando mudam de verdade — o
  // `markersKey` compara o conteúdo e não a identidade do array, porque
  // quem nos chama constrói um array novo a cada desenho do ecrã.
  const pts = useMemo(
    () =>
      markers.map((m) => {
        const partes = String(m.label || '').split(',');
        return {
          lat: m.lat,
          lng: m.lng,
          nome: (partes[0] || '').trim(),
          detalhe: (partes[1] || '').trim(),
          qual: m.tipo === 'destino' ? 'destino' : 'origem',
          cartao: !!m.cartao,
          // ONDE SE DESENHA O PINO, quando não é onde o carro pára.
          //
          // `lat`/`lng` são a coordenada da ESTRADA e continuam a ser a
          // verdade do marcador: é com elas que se calcula a rota, se
          // enquadra o mapa e se pede o preço. O pino é que se desenha no
          // sítio que a pessoa apontou.
          //
          // Confundi as duas na versão anterior — pus o marcador inteiro no
          // ponto escolhido, e a rota passou a ser calculada de dentro de um
          // quarteirão para dentro de outro. O OSRM encostava cada ponta à
          // estrada que lhe apetecesse e a linha dava a volta ao mundo. O
          // Simão viu-o em Cristo Rei.
          pino: m.pino || null,
        };
      }),
    [markersKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const regiaoInicial = useMemo(
    () => ({
      latitude: c.lat,
      longitude: c.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }),
    [c.lat, c.lng]
  );

  // ── Enquadrar ──────────────────────────────────────────────────────
  //
  // Com dois pontos, mostrar os dois. Com um, aproximar. No modo de escolha
  // NÃO se mexe: quem está a apontar com o dedo não quer o mapa a saltar-lhe
  // debaixo da mira.
  //
  // Enquadra pela ROTA quando ela já existe, e só pelos dois pontos
  // enquanto não existe. A diferença não é cosmética: entre a Avenida
  // Nicolau Lobato e o Cristo Rei a estrada contorna a baía toda, e um
  // enquadramento feito só com as pontas deixa metade do caminho de fora.
  const enquadrar = useCallback(() => {
    if (modoEscolha || !mapaRef.current || !pts.length) return;
    const pontos = rota?.linha?.length
      ? rota.linha
      : pts.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    if (pontos.length > 1) {
      mapaRef.current.fitToCoordinates(pontos, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    } else {
      mapaRef.current.animateToRegion(
        {
          latitude: pts[0].lat,
          longitude: pts[0].lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        400
      );
    }
  }, [modoEscolha, pts, rota]);

  // TRÊS MOMENTOS, e faltava o terceiro.
  //
  // Os pontos mudam; o mapa fica pronto (a primeira tentativa acontecia
  // antes de ele existir e não fazia nada); e a rota verdadeira chega, que
  // é quando o enquadramento passa a ter mais do que duas pontas para
  // conter. Sem este último, a recolha ficava fora do ecrã à esquerda.
  useEffect(() => {
    if (!mapaPronto) return;
    enquadrar();
  }, [markersKey, mapaPronto, rota?.tracejada]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── A rota ─────────────────────────────────────────────────────────
  //
  // A linha recta aparece PRIMEIRO e a verdadeira substitui-a quando chegar.
  // Numa ligação lenta, ver uma ligação aproximada de imediato é melhor do
  // que ver a certa daqui a dez segundos — ou nunca, se o pedido falhar em
  // silêncio, que foi o que acontecia antes de haver prazo.
  useEffect(() => {
    if (pts.length < 2) {
      setRota(null);
      return;
    }
    const a = pts[0];
    const b = pts[pts.length - 1];
    let vivo = true;

    const recta = [
      { latitude: a.lat, longitude: a.lng },
      { latitude: b.lat, longitude: b.lng },
    ];
    setRota({ linha: recta, tracejada: true });
    if (onRoute) onRoute({ km: Math.round(metrosEntre(a, b) * 10) / 10, approx: true });

    // Já veio de fora? Desenha-se e não se pergunta a ninguém.
    if (linhaDaRota?.length > 1) {
      setRota({
        linha: linhaDaRota.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        tracejada: false,
      });
      return undefined;
    }

    // PEDIDA AO NOSSO SERVIDOR, e não a um serviço de rotas directamente.
    //
    // Durante meses a app falou com o OSRM, que calcula sobre dados do
    // OpenStreetMap. O mapa é do Google. Em Timor-Leste as estradas do
    // OpenStreetMap foram traçadas de imagens antigas e ficam dezenas de
    // metros ao lado de onde o Google as desenha — a linha seguia uma estrada
    // a sério e assentava ao lado da estrada que a pessoa via.
    //
    // O servidor pergunta ao Google, com a chave que só ele tem e um tecto
    // diário de chamadas, e cai para o OSRM se faltar uma das duas coisas.
    api
      .linhaDaRota(token, {
        originLat: a.lat,
        originLng: a.lng,
        destLat: b.lat,
        destLng: b.lng,
      })
      .then((j) => {
        if (!vivo || !j?.linha?.length) return;
        setRota({
          linha: j.linha.map((p) => ({ latitude: p.lat, longitude: p.lng })),
          tracejada: false,
        });
        if (onRoute) onRoute({ km: j.km });
      })
      .catch(() => {
        /* fica a linha recta que já está desenhada */
      })
      .finally(() => {});

    return () => {
      vivo = false;
    };
  }, [markersKey, linhaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // O CARTÃO É DESENHADO POR CIMA DO MAPA, não dentro dele.
  //
  // Dentro de um marcador não funciona: o mapa fotografa a vista e a
  // fotografia sai a zero de largura — via-se só o risco de 3 pixéis da
  // borda. O pino resolveu-se com uma imagem; o cartão não pode, porque o
  // texto muda a cada sítio.
  //
  // A mira sempre funcionou porque é exactamente isto: uma vista normal por
  // cima do mapa. `pointForCoordinate` converte a coordenada em pixéis e
  // nós pomos o cartão lá.
  //
  // O preço é este: as posições só se sabem depois de o mapa parar. Por
  // isso os cartões escondem-se enquanto o dedo arrasta e voltam quando ele
  // levanta — melhor do que os ver a flutuar atrasados sobre o mapa.
  // Buscar os nossos lugares da zona visível.
  //
  // SÓ COM O MAPA APROXIMADO. Acima de três quilómetros de raio são nomes
  // demais para caberem sem se taparem, e o que se ganharia em informação
  // perdia-se em desordem. Quem está a ver Díli inteira não quer ler nomes
  // de portões.
  const buscarNossos = useCallback(
    async (regiao) => {
      if (!token || !regiao) return;
      const raioM = (regiao.latitudeDelta * 111320) / 2;
      if (raioM > 3000) {
        setNossos([]);
        return;
      }
      try {
        const r = await api.lugaresPerto(token, regiao.latitude, regiao.longitude, raioM);
        // SÓ O QUE O GOOGLE NÃO CONHECE. O servidor já respondeu a essa
        // pergunta quando o lugar foi aprovado; aqui é só filtrar.
        setNossos((r?.lugares || []).filter((l) => l.desenhar).slice(0, 12));
      } catch {
        // Sem rede não se desenha nada de novo. Os que já lá estavam ficam,
        // que é melhor do que os ver desaparecer a meio de um arrasto.
      }
    },
    [token]
  );

  const recalcularCartoes = useCallback(async () => {
    const comNome = pts.filter((p) => p.cartao && p.nome);
    if (!mapaRef.current || !comNome.length) {
      setCartoes([]);
      return;
    }
    try {
      const pontos = await Promise.all(
        comNome.map((p) =>
          mapaRef.current.pointForCoordinate({ latitude: p.lat, longitude: p.lng })
        )
      );
      setCartoes(comNome.map((p, i) => ({ ...p, x: pontos[i].x, y: pontos[i].y })));
    } catch {
      // Sem posições não se desenha nada. Um cartão no sítio errado é pior
      // do que nenhum: diz que aquele nome é daquele ponto, e não é.
      setCartoes([]);
    }
  }, [pts]);

  // As posições dos nossos no ecrã.
  //
  // `pointForCoordinate` e não uma conta de latitude para pixéis: desde que
  // o mapa roda, uma conta linear deixa de valer — teria de saber o rumo, a
  // projecção e o centro, e sairia errada de maneiras difíceis de ver. O
  // mapa sabe isso tudo e responde por nós.
  useEffect(() => {
    let vivo = true;
    if (!mapaPronto || !mapaRef.current || !nossos.length) {
      setNossosNoEcra([]);
      return undefined;
    }
    Promise.all(
      nossos.map((l) =>
        mapaRef.current.pointForCoordinate({ latitude: l.lat, longitude: l.lng }).catch(() => null)
      )
    )
      .then((pontos) => {
        if (!vivo) return;
        setNossosNoEcra(
          nossos
            .map((l, i) => (pontos[i] ? { ...l, x: pontos[i].x, y: pontos[i].y } : null))
            .filter(Boolean)
        );
      })
      .catch(() => vivo && setNossosNoEcra([]));
    return () => {
      vivo = false;
    };
  }, [nossos, mapaPronto, aMexer]);

  useEffect(() => {
    if (mapaPronto) {
      recalcularCartoes();
    }
  }, [mapaPronto, markersKey, recalcularCartoes]);

  // O VEÍCULO segue o mesmo caminho dos cartões: desenhado POR CIMA do mapa.
  //
  // Era um marcador com o carro e o rótulo lá dentro — o mesmo caminho que
  // fazia o cartão sair a zero de largura. Nunca o vimos partido porque só
  // aparece com um motorista a caminho; era um defeito à espera da primeira
  // viagem a sério.
  //
  // Ao contrário dos cartões, recalcula-se também quando o carro se mexe, e
  // não só quando o mapa pára.
  useEffect(() => {
    let vivo = true;
    if (!mapaPronto || !mapaRef.current || !liveMarker) {
      setVeiculo(null);
      return undefined;
    }
    mapaRef.current
      .pointForCoordinate({ latitude: liveMarker.lat, longitude: liveMarker.lng })
      .then((q) => vivo && setVeiculo(q))
      .catch(() => vivo && setVeiculo(null));
    return () => {
      vivo = false;
    };
  }, [mapaPronto, liveMarker?.lat, liveMarker?.lng, aMexer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pede a posição AO TOQUE e não guardada de antes: quem carrega neste
  // botão quer saber onde está agora, não onde estava quando abriu o ecrã.
  const [aLocalizar, setALocalizar] = useState(false);
  // O rumo do mapa, em graus. Zero é norte para cima.
  //
  // Lido com `getCamera` quando o mapa pára, porque a região não o traz — o
  // que a região diz é onde está e quanto se vê, não para onde está virado.
  const [rumo, setRumo] = useState(0);
  const [aSeguirBussola, setASeguirBussola] = useState(false);
  // O SATÉLITE COMEÇA DESLIGADO, e é uma decisão sobre o dinheiro de quem usa.
  //
  // O mapa normal são instruções de desenho: chegam uma vez e voltam a
  // desenhar-se em qualquer zoom. O satélite são fotografias, e cada nível de
  // aproximação é uma fotografia nova — aproximar três vezes são três
  // descargas. Num país onde os dados se compram ao megabyte, quem passa o dia
  // com o mapa aberto paga isso.
  //
  // Não custa nada ao Simão: a SDK do mapa é "Unlimited" na tabela do Google e
  // o modo de desenho não muda o SKU. Custa a quem conduz.
  const [satelite, setSatelite] = useState(false);
  const irParaMim = useCallback(async () => {
    if (aLocalizar || !mapaRef.current) return;
    setALocalizar(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapaRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        500
      );
    } catch {
      // Sem GPS agora. Não se diz nada: o botão não prometeu nada, e um
      // aviso vermelho por não haver satélite seria assustar sem motivo.
    } finally {
      setALocalizar(false);
    }
  }, [aLocalizar]);

  // SEGUIR A BÚSSOLA: o mapa roda para o que está à frente no ecrã ser o que
  // está à frente na rua.
  //
  // É o OPOSTO do botão do norte, e por isso são dois. O do norte endireita o
  // mapa e pára; este abandona o norte de propósito, e serve para andar a pé
  // à procura do sítio onde esperar.
  useEffect(() => {
    if (!aSeguirBussola) return undefined;
    let vivo = true;
    let sub = null;
    // O rumo suavizado, e o último que chegou a mover o mapa. São dois
    // valores diferentes de propósito — ver a explicação em baixo.
    let suave = null;
    let aplicado = null;
    let ultimaOrdem = 0;

    // QUANTO A BÚSSOLA TEM DE MUDAR PARA O MAPA SE MEXER.
    //
    // Estavam três graus, e três graus é MENOS do que a bússola de um
    // telemóvel treme parada em cima da mesa. Perto de metal, dentro de um
    // carro ou ao pé de um telemóvel a carregar, o desvio é bem maior.
    //
    // O resultado era o que o Simão viu: ligava o botão, punha o telemóvel
    // quieto, e o mapa continuava a rodar sozinho.
    const GRAUS_PARA_MEXER = 8;
    // Uma ordem à câmara de cada vez que a anterior teve tempo de acabar. A
    // animação dura 250 ms; mandar outra a meio é começar por cima do que
    // ainda está a andar, e é isso que se vê como tremor.
    const MS_ENTRE_ORDENS = 400;
    // Quanto pesa cada leitura nova no valor suavizado. Um quinto: o rumo
    // segue uma volta a sério em menos de um segundo, e o ruído de uma
    // leitura solta dilui-se antes de chegar ao mapa.
    const PESO = 0.2;

    (async () => {
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (!vivo) return;
          // `trueHeading` é o norte geográfico e vem -1 quando o telemóvel
          // ainda não o sabe; nesse caso serve o magnético, que é o que a
          // agulha de uma bússola de mão também dá.
          const grau = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (!Number.isFinite(grau)) return;

          // PRIMEIRO SUAVIZAR, DEPOIS DECIDIR. Eram as duas coisas de que
          // isto precisava e faltavam as duas.
          //
          // A média corre pelo caminho mais curto (daí o `diferencaAngular`),
          // senão a passagem de 359 para 1 grau dava uma volta inteira ao
          // contrário.
          if (suave === null) suave = grau;
          else suave = (suave + PESO * diferencaAngular(grau, suave) + 360) % 360;

          // O TRAVÃO COMPARA COM O QUE ESTÁ NO MAPA, e não com a leitura
          // anterior. Comparado com a leitura anterior, um tremor de quatro
          // graus para a frente e para trás passava sempre — cada leitura
          // estava longe da outra, e o mapa andava sem nunca sair do sítio.
          if (aplicado !== null && Math.abs(diferencaAngular(suave, aplicado)) < GRAUS_PARA_MEXER) {
            return;
          }
          const agora = Date.now();
          if (agora - ultimaOrdem < MS_ENTRE_ORDENS) return;
          ultimaOrdem = agora;
          aplicado = suave;
          mapaRef.current?.animateCamera({ heading: suave }, { duration: 250 });
        });
      } catch {
        // Sem bússola no telemóvel não há nada a seguir.
        if (vivo) setASeguirBussola(false);
      }
    })();

    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, [aSeguirBussola]);

  const aoNorte = useCallback(() => {
    // Endireitar enquanto se segue a bússola era mandar duas ordens
    // contrárias ao mesmo mapa. Quem pede o norte quer o norte.
    setASeguirBussola(false);
    mapaRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
  }, []);

  const centroMudou = useCallback(
    (regiao) => {
      setAMexer(false);
      // O rumo não vem na região; pergunta-se à câmara.
      // Envolvido, e não encadeado directamente: se `getCamera` não existir
      // ou não devolver uma promessa, um `.then` sobre `undefined` rebentava
      // este handler INTEIRO — e com ele o modo de escolher no mapa, os
      // cartões dos nomes e a posição do veículo, que dependem todos dele.
      try {
        const camara = mapaRef.current?.getCamera?.();
        if (camara?.then) camara.then((c) => setRumo(Number(c?.heading) || 0)).catch(() => {});
      } catch {
        /* sem rumo; a bússola fica a apontar ao norte, que é o caso normal */
      }
      centroRef.current = { lat: regiao.latitude, lng: regiao.longitude };
      regiaoRef.current = regiao;
      recalcularCartoes();
      buscarNossos(regiao);
      if (modoEscolha && onCentro) {
        onCentro({ type: 'centro', lat: regiao.latitude, lng: regiao.longitude });
      }
    },
    [modoEscolha, onCentro, recalcularCartoes, buscarNossos]
  );

  // O PRIMEIRO ENVIO É IMEDIATO. Quem abre o modo de escolha já está a
  // apontar para algum sítio, e esperar pelo primeiro arrasto deixava o
  // botão de confirmar sem nome nenhum por baixo.
  useEffect(() => {
    if (modoEscolha && onCentro) onCentro({ type: 'centro', lat: c.lat, lng: c.lng });
  }, [modoEscolha]); // eslint-disable-line react-hooks/exhaustive-deps

  // O react-native-maps não existe na web.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, styles.fallback, fill ? styles.fill : { height }]}>
        <Text style={styles.fallbackIcon}>🗺️</Text>
        <Text style={styles.fallbackText}>O mapa está disponível na app do telemóvel.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, fill ? styles.fill : { height }]}
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
    >
      <MapView
        ref={mapaRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        // "hybrid" e não "satellite": é a fotografia COM os nomes das ruas por
        // cima. O satélite puro é mais bonito e serve pior — quem escolhe um
        // ponto de recolha precisa de reconhecer a casa E de saber em que rua
        // ela fica.
        mapType={satelite ? 'hybrid' : 'standard'}
        initialRegion={regiaoInicial}
        // Antes o primeiro enquadramento corria no `useEffect` de montagem,
        // quando o mapa nativo ainda não existia — e não fazia nada.
        onMapReady={() => {
          setMapaPronto(true);
          // Sem isto, os nossos lugares só apareciam depois de a pessoa
          // mexer no mapa — e quem não mexesse nunca os via.
          buscarNossos(regiaoInicial);
        }}
        // O `aMexer` vale para os dois: levanta a mira, e esconde os
        // cartões enquanto as posições deles estão desactualizadas.
        onRegionChange={() => {
          if (!aMexer) setAMexer(true);
        }}
        // ARRASTAR DESLIGA O SEGUIMENTO.
        //
        // Com os dois ligados havia dois a mandar no mapa: a pessoa arrastava
        // e a bússola puxava de volta meio segundo depois. Quem toca no mapa
        // com o dedo está a dizer que quer decidir, e ganha.
        onPanDrag={() => {
          if (aSeguirBussola) setASeguirBussola(false);
        }}
        onRegionChangeComplete={centroMudou}
        // O TOQUE SÓ AVISA, NÃO DESENHA.
        //
        // Quem nos chama recebe a coordenada, guarda-a como recolha ou
        // destino e devolve-a em `markers` — o pino aparece por aí. Se
        // desenhássemos também um aqui ficavam DOIS pinos no mesmo sítio,
        // e o de baixo nunca mais saía porque este componente não sabe
        // quando o ponto deixou de interessar.
        onPress={
          pickable
            ? (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                if (onPick) onPick({ lat: latitude, lng: longitude });
              }
            : undefined
        }
        // O PONTO AZUL DO GOOGLE, o mesmo que o Google Maps desenha.
        //
        // Estava desligado, e isso deixava o utilizador sem forma de comparar
        // o PINO (onde o motorista vai) com ONDE ELE ESTÁ AGORA. O Simão só
        // deu pela diferença abrindo o Google Maps ao lado.
        //
        // Agora vê os dois no mesmo ecrã: se não coincidirem, arrasta o pino.
        // Não corrige o satélite — dá a quem está lá a forma de mandar nele.
        showsUserLocation
        showsMyLocationButton={false}
        // A BÚSSOLA DO GOOGLE, DESLIGADA. Nós temos a nossa.
        //
        // Vem ligada de origem e só aparece com o mapa torto — por isso
        // ficou invisível até eu ligar a rotação, e depois apareceu sozinha
        // no canto oposto ao dos nossos três botões. O Simão viu duas
        // bússolas e perguntou qual apagar.
        //
        // Fica a nossa: está na coluna com as outras duas, aparece sempre, e
        // a agulha aponta ao norte mesmo com o mapa direito — diz para onde é
        // o norte, e não só que o mapa está torto.
        showsCompass={false}
        toolbarEnabled={false}
        // A ROTAÇÃO ESTAVA DESLIGADA, e sem ela uma bússola não teria o
        // que mostrar. Roda-se com dois dedos, como em qualquer mapa.
        rotateEnabled
        pitchEnabled={false}
      >
        {/* A CIRCUNFERÊNCIA DE INCERTEZA SAIU DAQUI.
            Desenhávamos uma, em teal, à volta do pino. Desde que o ponto
            azul do Google passou a aparecer, ele traz a dele — e duas
            circunferências translúcidas sobrepostas não dizem duas coisas,
            dizem uma coisa turva.
            A do Google é melhor: é do momento, e encolhe quando ele ganha
            confiança. A nossa era do instante em que o pino foi posto e
            ficava parada. O "±40 m" na folha de baixo continua a dizer o
            erro daquela leitura, que é a informação que faltaria. */}

        {/* A CHAVE MUDA quando a rota deixa de ser a provisória, e isso é
            obrigatório.

            Passar `lineDashPattern={undefined}` NÃO apaga o tracejado: o
            React reaproveita o mesmo objecto nativo e `undefined` significa
            "não mexas nisto", não "tira isso". A rota verdadeira aparecia
            correcta — a seguir as estradas — mas vestida de pontinhos, como
            se ainda fosse a linha recta.

            Com chaves diferentes, a linha verdadeira nasce num objecto novo,
            que nunca teve tracejado nenhum. */}
        {/* O TROÇO A PÉ, de onde a pessoa está até ao ponto de recolha.
            Aos pontinhos e não a cheio: uma linha cheia é o caminho do
            carro, e esta não é — é o caminho dela. Responde a uma pergunta
            que a pessoa tem e a que ninguém respondia: onde é que eu espero?
            Cinzento-escuro em vez do teal, para não competir com a rota. */}
        {trocosAPe.map((t, i) => (
          <Polyline
            key={`a-pe-${t.qual || i}`}
            coordinates={[
              { latitude: t.de.lat, longitude: t.de.lng },
              { latitude: t.para.lat, longitude: t.para.lng },
            ]}
            // Como os do Google: pontos redondos e espaçados, cinzento
            // neutro. Não é a cor de nada nosso de propósito — este troço não
            // é da app, é o bocado que a pessoa faz a pé.
            strokeColor="#5A6B66"
            strokeWidth={4}
            lineCap="round"
            lineDashPattern={[1, 9]}
          />
        ))}

        {rota ? (
          <Polyline
            key={rota.tracejada ? 'recta' : 'estrada'}
            coordinates={rota.linha}
            strokeColor="#0E5C54"
            strokeWidth={rota.tracejada ? 4 : 5}
            strokeOpacity={rota.tracejada ? 0.6 : 0.9}
            lineDashPattern={rota.tracejada ? [8, 8] : undefined}
          />
        ) : null}

        {pts.map((p, i) => (
          <Marker
            key={`${p.lat},${p.lng},${p.qual},${i}`}
            coordinate={{
              latitude: p.pino ? p.pino.lat : p.lat,
              longitude: p.pino ? p.pino.lng : p.lng,
            }}
            anchor={{ x: 0.5, y: ANCORA_Y }}
            // ARRASTAR PARA CORRIGIR. O GPS de um telemóvel entre prédios
            // erra 20 a 40 metros, e nenhum código corrige uma leitura de
            // satélite. O que se pode fazer é deixar quem está lá — e sabe
            // onde está — pôr o ponto no sítio.
            draggable={arrastavel}
            onDragEnd={
              arrastavel && onArrastar
                ? (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    onArrastar({
                      type: 'arrastou',
                      tipo: p.qual,
                      lat: latitude,
                      lng: longitude,
                    });
                  }
                : undefined
            }
            image={IMAGEM[p.qual]}
          />
        ))}

        {trocosAPe.map((t) => (
          <Marker
            key={`ponto-${t.qual}`}
            coordinate={{ latitude: t.para.lat, longitude: t.para.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={900}
            image={PONTO_ESTRADA}
          />
        ))}

        {liveMarker ? (
          <Marker
            coordinate={{ latitude: liveMarker.lat, longitude: liveMarker.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1000}
            image={CARRO}
          />
        ) : null}
      </MapView>

      {/* OS NOSSOS LUGARES, escritos no mapa.
          Pequenos e discretos de propósito: são para se lerem quando se
          procura por eles, não para competirem com os nomes do Google. Um
          ponto teal e o nome ao lado, sem caixa branca — a caixa é do ponto
          ESCOLHIDO, e dois desenhos iguais para coisas diferentes fariam
          parecer que já se escolheu o que ainda se está a ver.

          Não se desenha o que já está escolhido: o pino e o cartão dele já
          o dizem, e dizê-lo duas vezes no mesmo sítio é sujidade. */}
      {!aMexer &&
        nossosNoEcra
          .filter(
            (l) =>
              !pts.some((p) => Math.abs(p.lat - l.lat) < 0.0002 && Math.abs(p.lng - l.lng) < 0.0002)
          )
          .map((l) => (
            <View
              key={l.id}
              pointerEvents="none"
              style={[styles.nosso, { left: l.x + 6, top: l.y - 8 }]}
            >
              <View style={styles.nossoPonto} />
              <Text
                style={[styles.nossoNome, satelite && styles.nossoNomeSatelite]}
                numberOfLines={1}
              >
                {l.label}
              </Text>
            </View>
          ))}

      {/* Os cartões dos lugares nossos, desenhados sobre o mapa.
          `pointForCoordinate` devolve o pixel da COORDENADA, que é onde
          assenta a ponta do pino. A cabeça fica 27 pixéis acima, e é a essa
          altura que o cartão se encosta — nunca por cima, que taparia a rua
          por onde se chega.
          Junto à borda direita o cartão passa para a esquerda do pino: fixá-lo
          de um lado deixava-o a sair do ecrã sempre que o ponto ficasse
          encostado a essa borda, e um ponto encostado à borda é o caso normal
          de quem acabou de arrastar o mapa. */}
      {!aMexer &&
        cartoes.map((c) => {
          const aDireita = largura > 0 && c.x > largura * 0.55;
          return (
            <View
              key={`${c.lat},${c.lng}`}
              pointerEvents="none"
              style={[
                styles.cartaoSolto,
                aDireita ? { left: c.x - 16 - CARTAO_L } : { left: c.x + 16 },
                { top: c.y - 46 },
              ]}
            >
              <Cartao nome={c.nome} detalhe={c.detalhe} qual={c.qual} />
            </View>
          );
        })}

      {/* ONDE O CARRO PÁRA.
          Um ponto na estrada e o rótulo por cima, na ponta da linha aos
          pontinhos. É a pergunta que a pessoa tem quando o pino cai a meio
          de um quarteirão — "então o carro vem cá dentro?" — e que ninguém
          respondia do lado do destino.
          Some enquanto o dedo arrasta, como os cartões: um rótulo atrasado
          diz que o carro pára ali, e não pára. */}

      {/* Só o RÓTULO do veículo fica por cima — o carro é marcador.
          O rótulo tem de continuar aqui porque o texto muda a cada rua, e
          não há imagem que sirva. Esconde-se enquanto o dedo arrasta, como
          os outros cartões: um nome atrasado a flutuar diz que aquela rua é
          a de agora, e não é. O carro, esse, nunca desaparece. */}
      {veiculo && liveLabel && !aMexer ? (
        <View
          pointerEvents="none"
          style={[styles.veiculo, { left: veiculo.x + 24, top: veiculo.y - 17 }]}
        >
          <Cartao nome={liveLabel} qual="origem" agora />
        </View>
      ) : null}

      {/* Em cima à direita, porque o canto de baixo é do botão de expandir
          no MapaExpandivel — e um mapa não pode ter dois botões no mesmo
          sítio conforme o ecrã onde está. */}
      <Pressable
        style={[
          styles.botaoMim,
          aLocalizar && styles.botaoMimOcupado,
          topoDosBotoes ? { top: spacing.sm + topoDosBotoes } : null,
        ]}
        onPress={irParaMim}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('irParaMim')}
      >
        <Mira />
      </Pressable>

      {/* SEGUIR A BÚSSOLA. Aceso a teal quando está ligado, como no Google:
          é um modo, não uma acção, e um modo tem de se ver que está a
          correr — senão a pessoa não percebe porque é que o mapa "mexe
          sozinho" e não sabe como o parar. */}
      <Pressable
        style={[
          styles.botaoSeguir,
          aSeguirBussola && styles.botaoSeguirActivo,
          topoDosBotoes ? { top: spacing.sm + 96 + topoDosBotoes } : null,
        ]}
        onPress={() => setASeguirBussola((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: aSeguirBussola }}
        accessibilityLabel={t('seguirBussola')}
      >
        <Seta activo={aSeguirBussola} />
      </Pressable>

      {/* O SATÉLITE.
          O selector de mapa já existiu e o Simão mandou-o tirar — eram botões
          a mais sem motivo. Este volta com um motivo só, e é forte em Díli:
          grande parte da cidade não tem morada, e as pessoas orientam-se por
          referências. Num mapa desenhado, um bairro sem nomes de rua é um
          emaranhado de linhas iguais; na fotografia, a pessoa reconhece a sua
          própria casa — e é isso que faz o motorista encontrá-la.
          Desligado por omissão, porque as fotografias custam dados a quem
          conduz. Ver a nota no estado. */}
      <Pressable
        style={[
          styles.botaoSatelite,
          satelite && styles.botaoSateliteActivo,
          topoDosBotoes ? { top: spacing.sm + 144 + topoDosBotoes } : null,
        ]}
        onPress={() => setSatelite((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: satelite }}
        accessibilityLabel={t('verSatelite')}
      >
        <Camadas activo={satelite} />
      </Pressable>

      {/* A BÚSSOLA ESTÁ SEMPRE VISÍVEL.
          A primeira versão só a mostrava com o mapa torto, e eu justifiquei
          isso com uma regra que soa bem: um botão permanente para desfazer
          uma coisa que quase nunca se faz só ocupa espaço.
          Estava errado, e a referência que o Simão deu diz o contrário — no
          Google Maps o botão está lá com o mapa direito. Um botão que só
          aparece quando já se sabe que se precisa dele não ensina ninguém
          que existe: quem nunca rodou o mapa nunca descobre que pode.
          A agulha aponta sempre ao norte, e por isso diz duas coisas ao
          mesmo tempo: para onde é o norte, e quanto o mapa está torto. */}
      <Pressable
        style={[
          styles.botaoBussola,
          topoDosBotoes ? { top: spacing.sm + 48 + topoDosBotoes } : null,
        ]}
        onPress={aoNorte}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('voltarAoNorte')}
      >
        <View style={{ transform: [{ rotate: `${-rumo}deg` }] }}>
          <Agulha />
        </View>
      </Pressable>

      {/* ── A MIRA ────────────────────────────────────────────────────
          O pino fica FIXO no centro do ecrã e o mapa é que se move por
          baixo.

          A mira usa o componente <Pino>; o marcador usa uma IMAGEM. São
          duas peças diferentes com o mesmo caminho SVG, e é preciso saber
          disso: se a forma mudar num sítio e não no outro, o que se vê ao
          apontar deixa de ser o que fica marcado. As imagens geram-se com
          scripts/desenhar-pinos.py, do mesmo caminho.

          A mira sobe três pixéis enquanto o mapa mexe. É o que dá a sensação
          de que o mapa está a passar por baixo dela, e não o contrário. */}
      {modoEscolha ? (
        <View style={styles.miraCaixa} pointerEvents="none">
          <View style={[styles.mira, aMexer && styles.miraAMexer]}>
            <Pino tipo={modoEscolha === 'destino' ? 'destino' : 'origem'} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    wrap: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#e9e4db',
    },
    fill: { flex: 1, borderRadius: 0, borderWidth: 0 },
    mapa: { flex: 1 },
    fallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    fallbackIcon: { fontSize: 32, marginBottom: spacing.sm },
    fallbackText: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },

    // O cartão do nome. Afastado do pino e subido até à cabeça — ver o
    // comentário na âncora do marcador.
    // LARGURA FIXA, e não `maxWidth`.
    //
    // `maxWidth` diz até onde o cartão PODE crescer; não diz de que tamanho
    // ele É. Numa lista ou num ecrã há sempre um pai que o estica até ao
    // limite — dentro de um marcador não há nada, e ele encolhe até ao
    // mínimo do conteúdo. Com texto que não parte, esse mínimo deu ZERO, e
    // o que se via era só o risco de 3 pixéis da borda esquerda.
    //
    // 150 é o que cabe ao lado do pino num ecrã de telemóvel estreito sem
    // sair pela direita quando o ponto está encostado a essa borda.
    folgaCartao: { width: CARTAO_L + 22, paddingLeft: 22, paddingBottom: 20 },
    cartao: {
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingVertical: 7,
      paddingHorizontal: 12,
      width: CARTAO_L,
      borderLeftWidth: 3,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    // Um risco da cor à esquerda, para se saber qual é a recolha e qual é o
    // destino sem ter de olhar para o pino.
    risco_origem: { borderLeftColor: '#0E5C54' },
    risco_destino: { borderLeftColor: '#E85531' },
    cartaoAgora: { backgroundColor: '#14201D', borderLeftColor: '#FF6B4A' },
    cartaoNome: { fontSize: 12.5, fontWeight: '700', color: '#14201D', letterSpacing: -0.1 },
    cartaoNomeAgora: { color: '#EAF2EF' },
    cartaoDetalhe: { fontSize: 11, color: '#6A7671', marginTop: 1 },
    cartaoDetalheAgora: { color: '#9DB0AA' },

    // O balão sobre a ponta da linha, com o bico a apontar-lhe. Coral, como
    // nas imagens que o Simão mandou: é a cor da acção nesta app, e parar o
    // carro é a acção.

    veiculo: { position: 'absolute', width: CARTAO_L },

    cartaoSolto: { position: 'absolute' },
    nosso: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 150,
    },
    nossoPonto: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.teal,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      marginRight: 4,
    },
    // Um halo branco em vez de caixa: lê-se sobre qualquer fundo do mapa e
    // não tapa as ruas por baixo, que é o que uma caixa faria.
    // SOBRE A FOTOGRAFIA, O CONTRÁRIO. Teal com halo branco lê-se bem sobre um
    // mapa claro e desaparece sobre um telhado escuro. Branco com sombra
    // escura é o que o próprio Google usa nos nomes em cima do satélite, e
    // pela mesma razão: funciona sobre qualquer coisa.
    nossoNomeSatelite: {
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowRadius: 4,
    },
    nossoNome: {
      ...tipo.legenda,
      color: '#0E5C54',
      fontWeight: '700',
      textShadowColor: '#FFFFFF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
      flexShrink: 1,
    },
    botaoMim: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    botaoMimOcupado: { opacity: 0.5 },
    botaoSeguir: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm + 96,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    botaoSeguirActivo: { backgroundColor: colors.teal },
    // O quarto da coluna: 8 + 48 + 48 + 48.
    botaoSatelite: {
      position: 'absolute',
      right: spacing.sm,
      top: spacing.sm + 144,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    botaoSateliteActivo: { backgroundColor: colors.teal },
    botaoBussola: {
      position: 'absolute',
      right: spacing.sm,
      // Por baixo do de voltar a mim: 40 de altura mais um respiro.
      top: spacing.sm + 48,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    miraCaixa: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    // A PONTA do pino tem de cair no meio do ecrã, não a base da caixa: o
    // desenho tem 45 de altura e a ponta está a 42, portanto sobe-se metade
    // da altura menos a distância da ponta ao centro.
    mira: { transform: [{ translateY: -(PINO_A / 2) + (PINO_A - 42) }] },
    miraAMexer: { transform: [{ translateY: -(PINO_A / 2) + (PINO_A - 42) - 3 }] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
