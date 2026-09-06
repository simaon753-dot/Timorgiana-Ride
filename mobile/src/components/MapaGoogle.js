import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Circle, Polyline } from 'react-native-maps';
import Svg, { Path, Circle as Bola } from 'react-native-svg';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

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
const ANCORA_Y = 42 / PINO_A;

function Pino({ tipo: qual }) {
  const c = COR[qual] || COR.origem;
  return (
    <Svg width={PINO_L} height={PINO_A} viewBox="0 0 36 54">
      <Path d={GOTA} fill="none" stroke="#FFF" strokeWidth={5.6} strokeLinejoin="round" />
      <Path d={GOTA} fill={c.fill} stroke={c.risco} strokeWidth={2.6} strokeLinejoin="round" />
      <Bola cx={18} cy={18} r={6} fill="#FFF" />
      <Bola cx={18} cy={50} r={2.4} fill="#FFF" />
      <Bola cx={18} cy={50} r={1.7} fill={c.risco} />
    </Svg>
  );
}

// O cartão com o nome, ao lado do pino.
//
// `agora` é o do veículo em movimento: fundo escuro, para não se confundir
// com os dois que estão parados quando lhes passa por cima.
function Cartao({ nome, detalhe, qual, agora = false }) {
  return (
    <View style={[styles.cartao, agora ? styles.cartaoAgora : styles['risco_' + qual]]}>
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

function metrosEntre(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function MapaGoogle({
  pickable = false,
  precisaoM = null,
  arrastavel = false,
  onArrastar,
  modoEscolha = null,
  onCentro,
  markers = [],
  center,
  height = 240,
  onPick,
  onRoute,
  liveMarker,
  liveLabel,
  fill = false,
}) {
  const mapaRef = useRef(null);
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);

  const [rota, setRota] = useState(null);
  const [aMexer, setAMexer] = useState(false);
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
  useEffect(() => {
    if (modoEscolha || !mapaRef.current || !pts.length) return;
    if (pts.length > 1) {
      mapaRef.current.fitToCoordinates(
        pts.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 70, right: 70, bottom: 70, left: 70 }, animated: true }
      );
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
  }, [markersKey, modoEscolha]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const ctrl = new AbortController();
    const cortar = setTimeout(() => ctrl.abort(), 12000);
    // "overview=simplified" e não "full": o full traz centenas de pontos
    // para uma viagem em Díli, que num ecrã de telemóvel não se distinguem
    // de vinte e são dez vezes mais para descarregar.
    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        const r = j?.routes?.[0];
        if (!vivo || !r?.geometry?.coordinates) return;
        setRota({
          linha: r.geometry.coordinates.map((p) => ({ latitude: p[1], longitude: p[0] })),
          tracejada: false,
        });
        if (onRoute) onRoute({ km: Math.round(r.distance / 100) / 10 });
      })
      .catch(() => {
        /* fica a linha recta que já está desenhada */
      })
      .finally(() => clearTimeout(cortar));

    return () => {
      vivo = false;
      clearTimeout(cortar);
      ctrl.abort();
    };
  }, [markersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const centroMudou = useCallback(
    (regiao) => {
      setAMexer(false);
      centroRef.current = { lat: regiao.latitude, lng: regiao.longitude };
      if (modoEscolha && onCentro) {
        onCentro({ type: 'centro', lat: regiao.latitude, lng: regiao.longitude });
      }
    },
    [modoEscolha, onCentro]
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
    <View style={[styles.wrap, fill ? styles.fill : { height }]}>
      <MapView
        ref={mapaRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        initialRegion={regiaoInicial}
        onRegionChange={() => {
          if (modoEscolha && !aMexer) setAMexer(true);
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* O CÍRCULO DE INCERTEZA do GPS: mostra o que o telemóvel realmente
            sabe — "estou algures aqui dentro". Sem ele, um pino de traço
            fino parece uma certeza, e o Simão viu exactamente isso: um ponto
            seguro de si a 35 metros de onde estava.
            Abaixo de 15 metros não se desenha — seria mais pequeno do que o
            pino e só faria sujidade. */}
        {precisaoM > 15 && pts.length ? (
          <Circle
            center={{
              latitude: (pts.find((p) => p.qual !== 'destino') || pts[0]).lat,
              longitude: (pts.find((p) => p.qual !== 'destino') || pts[0]).lng,
            }}
            radius={Number(precisaoM)}
            strokeColor="rgba(14,92,84,0.35)"
            fillColor="rgba(14,92,84,0.10)"
            strokeWidth={1}
          />
        ) : null}

        {rota ? (
          <Polyline
            coordinates={rota.linha}
            strokeColor="#0E5C54"
            strokeWidth={rota.tracejada ? 4 : 5}
            lineDashPattern={rota.tracejada ? [8, 8] : undefined}
          />
        ) : null}

        {pts.map((p, i) => (
          <React.Fragment key={`${p.lat},${p.lng},${p.qual},${i}`}>
            <Marker
              coordinate={{ latitude: p.lat, longitude: p.lng }}
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
              // Sem isto, o mapa redesenha a vista do marcador a cada quadro
              // à procura de mudanças que não existem — e come bateria numa
              // viagem inteira. Só o do veículo precisa de acompanhar.
              tracksViewChanges={false}
            >
              <Pino tipo={p.qual} />
            </Marker>
            {p.nome ? (
              <Marker
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                // O cartão encosta-se ao lado do pino: canto inferior
                // esquerdo à direita da coordenada, subido até à altura da
                // CABEÇA. Não se põe por cima porque tapava a rua por onde
                // se chega — que é justamente o que interessa ver.
                anchor={{ x: 0, y: 1 }}
                tracksViewChanges={false}
                // Não intercepta toques: quem toca aqui quer o mapa.
                tappable={false}
              >
                <View style={styles.folgaCartao}>
                  <Cartao nome={p.nome} detalhe={p.detalhe} qual={p.qual} />
                </View>
              </Marker>
            ) : null}
          </React.Fragment>
        ))}

        {/* O VEÍCULO A APROXIMAR-SE. `tracksViewChanges` fica ligado porque
            este é o único que muda de facto — de posição e de rótulo. */}
        {liveMarker ? (
          <Marker
            coordinate={{ latitude: liveMarker.lat, longitude: liveMarker.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1000}
          >
            <View style={styles.veiculo}>
              <Text style={styles.veiculoIcone}>🚗</Text>
              {liveLabel ? <Cartao nome={liveLabel} qual="origem" agora /> : null}
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* ── A MIRA ────────────────────────────────────────────────────
          O pino fica FIXO no centro do ecrã e o mapa é que se move por
          baixo. É o MESMO desenho do marcador: se fossem dois, divergiam, e
          o que se vê ao apontar deixava de ser o que fica marcado.

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
    folgaCartao: { paddingLeft: 22, paddingBottom: 20 },
    cartao: {
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingVertical: 7,
      paddingHorizontal: 12,
      maxWidth: 190,
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

    veiculo: { flexDirection: 'row', alignItems: 'center' },
    veiculoIcone: { fontSize: 26, lineHeight: 30 },

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
