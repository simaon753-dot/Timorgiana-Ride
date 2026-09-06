import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  Images,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import Svg, { Path, Circle as Bola, Line } from 'react-native-svg';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// O mapa próprio, feito dos dados do OpenStreetMap.
//
// MESMA INTERFACE do MapaGoogle.js e do OSMMap.js, propriedade por
// propriedade. São três agora, e a troca continua a ser uma linha em cada um
// dos dois sítios que os usam.
//
// PORQUE EXISTE. O Simão viu o mapa do Grab, percebeu que é OpenStreetMap
// desenhado por eles, e quis o mesmo. O que se ganha não são dados melhores —
// são os mesmos — é decidir o que aparece. O estilo NÃO TEM PONTOS DE
// INTERESSE, e isso resolve na origem o problema que nos custou uma tarde: os
// nossos lugares deixam de competir com os rótulos de outra pessoa.
//
// OS PINOS SÃO CAMADAS NATIVAS, e não vistas React. É a lição que o
// react-native-maps nos ensinou à força: um marcador com filhos é fotografado,
// e a fotografia sai mal. Aqui as imagens vão para o próprio motor de
// desenho do mapa — o mesmo caminho por onde passam as ruas.
//
// O QUE CONTINUA A SER DESENHADO POR CIMA: os cartões dos nomes, o rótulo do
// veículo, a mira e os três botões. Texto que muda não cabe numa imagem, e
// esse caminho já provou que funciona.
const DILI = { lat: -8.5569, lng: 125.5603 };
const ESTILO = 'https://timorgiana-ride.onrender.com/mapa/estilo.json';

const IMAGENS = {
  'pino-origem': require('../../assets/mapa/pino-origem.png'),
  'pino-destino': require('../../assets/mapa/pino-destino.png'),
  carro: require('../../assets/mapa/carro.png'),
};

const CARTAO_L = 150;

function Mira({ tipo: qual }) {
  const c =
    qual === 'destino'
      ? { fill: '#E85531', risco: '#8C2E14' }
      : { fill: '#0E5C54', risco: '#08403A' };
  const GOTA = 'M2 18 A16 16 0 1 1 34 18 C34 26 26 32 18 41 C10 32 2 26 2 18 Z';
  return (
    <View style={{ width: 30, height: 45 }} collapsable={false}>
      <Svg width={30} height={45} viewBox="0 0 36 54">
        <Path d={GOTA} fill="none" stroke="#FFF" strokeWidth={5.6} strokeLinejoin="round" />
        <Path d={GOTA} fill={c.fill} stroke={c.risco} strokeWidth={2.6} strokeLinejoin="round" />
        <Bola cx={18} cy={18} r={6} fill="#FFF" />
        <Bola cx={18} cy={50} r={2.4} fill="#FFF" />
        <Bola cx={18} cy={50} r={1.7} fill={c.risco} />
      </Svg>
    </View>
  );
}

function Agulha() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 2 L16.5 13 L12 11 Z" fill="#E85531" />
      <Path d="M12 22 L7.5 11 L12 13 Z" fill="#7C8A85" />
    </Svg>
  );
}

function Alvo() {
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

function Seta({ activo }) {
  const cor = activo ? '#FFFFFF' : '#0E5C54';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Bola cx={12} cy={12} r={9.2} fill="none" stroke={cor} strokeWidth={1.8} />
      <Path d="M12 6.2 L15.6 16 L12 14 L8.4 16 Z" fill={cor} />
    </Svg>
  );
}

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

function metrosEntre(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function diferencaAngular(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

export default function MapaProprio({
  pickable = false,
  arrastavel = false,
  onArrastar,
  modoEscolha = null,
  onCentro,
  markers = [],
  trocoAPe = null,
  center,
  height = 240,
  onPick,
  onRoute,
  liveMarker,
  liveLabel,
  fill = false,
}) {
  const { t } = useI18n();
  const { token } = useAuth();
  const mapaRef = useRef(null);
  const camaraRef = useRef(null);
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);

  const [pronto, setPronto] = useState(false);
  const [aMexer, setAMexer] = useState(false);
  const [rumo, setRumo] = useState(0);
  const [rota, setRota] = useState(null);
  const [cartoes, setCartoes] = useState([]);
  const [veiculo, setVeiculo] = useState(null);
  const [largura, setLargura] = useState(0);
  const [aSeguirBussola, setASeguirBussola] = useState(false);
  const [aLocalizar, setALocalizar] = useState(false);

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
        };
      }),
    [markersKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Os pinos como dados, não como componentes. É isto que os põe no motor de
  // desenho do mapa em vez de os fotografar.
  const pinos = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: pts.map((p, i) => ({
        type: 'Feature',
        id: String(i),
        properties: { icone: `pino-${p.qual}` },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    }),
    [pts]
  );

  const linhas = useMemo(() => {
    const f = [];
    if (rota?.linha?.length) {
      f.push({
        type: 'Feature',
        properties: { tipo: 'estrada' },
        geometry: { type: 'LineString', coordinates: rota.linha },
      });
    }
    if (trocoAPe) {
      f.push({
        type: 'Feature',
        properties: { tipo: 'ape' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [trocoAPe.de.lng, trocoAPe.de.lat],
            [trocoAPe.para.lng, trocoAPe.para.lat],
          ],
        },
      });
    }
    return { type: 'FeatureCollection', features: f };
  }, [rota, trocoAPe]);

  const veiculoPonto = useMemo(
    () =>
      liveMarker
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { icone: 'carro' },
                geometry: { type: 'Point', coordinates: [liveMarker.lng, liveMarker.lat] },
              },
            ],
          }
        : { type: 'FeatureCollection', features: [] },
    [liveMarker?.lat, liveMarker?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── A rota ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (pts.length < 2) {
      setRota(null);
      return undefined;
    }
    const a = pts[0];
    const b = pts[pts.length - 1];
    let vivo = true;

    setRota({
      linha: [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ],
      tracejada: true,
    });
    if (onRoute) onRoute({ km: Math.round(metrosEntre(a, b) * 10) / 10, approx: true });

    const ctrl = new AbortController();
    const cortar = setTimeout(() => ctrl.abort(), 12000);
    fetch(
      'https://router.project-osrm.org/route/v1/driving/' +
        `${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((j) => {
        const r = j?.routes?.[0];
        if (!vivo || !r?.geometry?.coordinates) return;
        setRota({ linha: r.geometry.coordinates, tracejada: false });
        if (onRoute) onRoute({ km: Math.round(r.distance / 100) / 10 });
      })
      .catch(() => {})
      .finally(() => clearTimeout(cortar));

    return () => {
      vivo = false;
      clearTimeout(cortar);
      ctrl.abort();
    };
  }, [markersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enquadrar ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pronto || modoEscolha || !camaraRef.current || !pts.length) return;
    const usar = rota?.linha?.length ? rota.linha : pts.map((p) => [p.lng, p.lat]);
    if (usar.length > 1) {
      const lngs = usar.map((x) => x[0]);
      const lats = usar.map((x) => x[1]);
      camaraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        [70, 70, 70, 70],
        600
      );
    } else {
      camaraRef.current.setCamera({
        centerCoordinate: [pts[0].lng, pts[0].lat],
        zoomLevel: 15,
        animationDuration: 400,
      });
    }
  }, [pronto, markersKey, rota?.tracejada, modoEscolha]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Posições no ecrã, para o que é desenhado por cima ──────────────
  const recalcular = useCallback(async () => {
    if (!pronto || !mapaRef.current) return;
    const comNome = pts.filter((p) => p.cartao && p.nome);
    try {
      if (comNome.length) {
        const pontos = await Promise.all(
          comNome.map((p) => mapaRef.current.getPointInView([p.lng, p.lat]).catch(() => null))
        );
        setCartoes(
          comNome
            .map((p, i) => (pontos[i] ? { ...p, x: pontos[i][0], y: pontos[i][1] } : null))
            .filter(Boolean)
        );
      } else setCartoes([]);

      if (liveMarker) {
        const q = await mapaRef.current.getPointInView([liveMarker.lng, liveMarker.lat]);
        setVeiculo(q ? { x: q[0], y: q[1] } : null);
      } else setVeiculo(null);
    } catch {
      setCartoes([]);
      setVeiculo(null);
    }
  }, [pronto, pts, liveMarker?.lat, liveMarker?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recalcular();
  }, [recalcular]);

  // ── Seguir a bússola ───────────────────────────────────────────────
  useEffect(() => {
    if (!aSeguirBussola) return undefined;
    let vivo = true;
    let sub = null;
    let ultimo = null;
    (async () => {
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (!vivo) return;
          const grau = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (!Number.isFinite(grau)) return;
          if (ultimo !== null && Math.abs(diferencaAngular(grau, ultimo)) < 3) return;
          ultimo = grau;
          camaraRef.current?.setCamera({ heading: grau, animationDuration: 250 });
        });
      } catch {
        if (vivo) setASeguirBussola(false);
      }
    })();
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, [aSeguirBussola]);

  const aoNorte = useCallback(() => {
    setASeguirBussola(false);
    camaraRef.current?.setCamera({ heading: 0, animationDuration: 300 });
  }, []);

  const irParaMim = useCallback(async () => {
    if (aLocalizar) return;
    setALocalizar(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      camaraRef.current?.setCamera({
        centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    } catch {
      /* sem GPS agora */
    } finally {
      setALocalizar(false);
    }
  }, [aLocalizar]);

  // ── O mapa parou ───────────────────────────────────────────────────
  const paraouDeMexer = useCallback(
    (estado) => {
      setAMexer(false);
      const centro = estado?.properties?.center || estado?.geometry?.coordinates;
      const b = estado?.properties?.bearing;
      if (Number.isFinite(b)) setRumo(b);
      if (modoEscolha && onCentro && Array.isArray(centro)) {
        onCentro({ type: 'centro', lat: centro[1], lng: centro[0] });
      }
      recalcular();
    },
    [modoEscolha, onCentro, recalcular]
  );

  useEffect(() => {
    if (modoEscolha && onCentro) onCentro({ type: 'centro', lat: c.lat, lng: c.lng });
  }, [modoEscolha]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Map
        ref={mapaRef}
        style={styles.mapa}
        mapStyle={ESTILO}
        // A BÚSSOLA E O LOGÓTIPO DO MOTOR, DESLIGADOS: temos os nossos, e
        // ontem ficámos com duas bússolas por eu não ter desligado a do
        // Google.
        compass={false}
        logo={false}
        // A ATRIBUIÇÃO FICA LIGADA, e não é uma escolha de gosto: os dados são
        // ODbL e a licença EXIGE que ela se veja. É por isso que o Grab mostra
        // aquela janela que o Simão fotografou.
        attribution
        attributionPosition={{ bottom: 6, right: 6 }}
        onDidFinishLoadingMap={() => setPronto(true)}
        onRegionWillChange={() => !aMexer && setAMexer(true)}
        onRegionDidChange={paraouDeMexer}
        onPress={
          pickable
            ? (e) => {
                const co = e?.geometry?.coordinates;
                if (onPick && Array.isArray(co)) onPick({ lat: co[1], lng: co[0] });
              }
            : undefined
        }
      >
        <Camera
          ref={camaraRef}
          defaultSettings={{ centerCoordinate: [c.lng, c.lat], zoomLevel: 14 }}
        />
        <Images images={IMAGENS} />

        {/* A linha da rota e o troço a pé, no mesmo sítio: são duas linhas com
            regras diferentes, e uma expressão distingue-as pelo tipo. */}
        <GeoJSONSource id="linhas" shape={linhas}>
          <Layer
            id="linha-ape"
            type="line"
            filter={['==', ['get', 'tipo'], 'ape']}
            style={{ lineColor: '#5A6B66', lineWidth: 3, lineDasharray: [2, 6] }}
          />
          <Layer
            id="linha-rota"
            type="line"
            filter={['==', ['get', 'tipo'], 'estrada']}
            style={{
              lineColor: '#0E5C54',
              lineWidth: rota?.tracejada ? 4 : 5,
              lineOpacity: rota?.tracejada ? 0.6 : 0.9,
              ...(rota?.tracejada ? { lineDasharray: [2, 2] } : {}),
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </GeoJSONSource>

        {/* OS PINOS COMO CAMADA, e não como marcadores com filhos.
            `iconAllowOverlap` para não desaparecerem quando ficam perto um do
            outro — a recolha e o destino de uma viagem curta ficam. */}
        <GeoJSONSource id="pinos" shape={pinos}>
          <Layer
            id="pinos-camada"
            type="symbol"
            style={{
              iconImage: ['get', 'icone'],
              iconAnchor: 'bottom',
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconSize: 1,
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="veiculo" shape={veiculoPonto}>
          <Layer
            id="veiculo-camada"
            type="symbol"
            style={{
              iconImage: ['get', 'icone'],
              iconAnchor: 'center',
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />
        </GeoJSONSource>

        <UserLocation />
      </Map>

      {/* ── Desenhado POR CIMA ───────────────────────────────────────── */}
      <Pressable
        style={[styles.botaoMim, aLocalizar && styles.botaoMimOcupado]}
        onPress={irParaMim}
        hitSlop={8}
        accessibilityLabel={t('irParaMim')}
      >
        <Alvo />
      </Pressable>

      <Pressable style={styles.botaoBussola} onPress={aoNorte} hitSlop={8}>
        <View style={{ transform: [{ rotate: `${-rumo}deg` }] }}>
          <Agulha />
        </View>
      </Pressable>

      <Pressable
        style={[styles.botaoSeguir, aSeguirBussola && styles.botaoSeguirActivo]}
        onPress={() => setASeguirBussola((v) => !v)}
        hitSlop={8}
        accessibilityLabel={t('seguirBussola')}
      >
        <Seta activo={aSeguirBussola} />
      </Pressable>

      {!aMexer &&
        cartoes.map((l) => {
          const aDireita = largura > 0 && l.x > largura * 0.55;
          return (
            <View
              key={`${l.lat},${l.lng}`}
              pointerEvents="none"
              style={[
                styles.cartaoSolto,
                aDireita ? { left: l.x - 16 - CARTAO_L } : { left: l.x + 16 },
                { top: l.y - 46 },
              ]}
            >
              <Cartao nome={l.nome} detalhe={l.detalhe} qual={l.qual} />
            </View>
          );
        })}

      {veiculo && liveLabel && !aMexer ? (
        <View
          pointerEvents="none"
          style={[styles.rotuloVeiculo, { left: veiculo.x + 24, top: veiculo.y - 17 }]}
        >
          <Cartao nome={liveLabel} qual="origem" agora />
        </View>
      ) : null}

      {modoEscolha ? (
        <View style={styles.miraCaixa} pointerEvents="none">
          <View style={[styles.mira, aMexer && styles.miraAMexer]}>
            <Mira tipo={modoEscolha === 'destino' ? 'destino' : 'origem'} />
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
      backgroundColor: '#F7F4EF',
    },
    fill: { flex: 1, borderRadius: 0, borderWidth: 0 },
    mapa: { flex: 1 },
    fallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    fallbackIcon: { fontSize: 32, marginBottom: spacing.sm },
    fallbackText: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },

    cartaoSolto: { position: 'absolute' },
    rotuloVeiculo: { position: 'absolute', width: CARTAO_L },
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
    risco_origem: { borderLeftColor: '#0E5C54' },
    risco_destino: { borderLeftColor: '#E85531' },
    cartaoAgora: { backgroundColor: '#14201D', borderLeftColor: '#FF6B4A' },
    cartaoNome: { fontSize: 12.5, fontWeight: '700', color: '#14201D', letterSpacing: -0.1 },
    cartaoNomeAgora: { color: '#EAF2EF' },
    cartaoDetalhe: { fontSize: 11, color: '#6A7671', marginTop: 1 },
    cartaoDetalheAgora: { color: '#9DB0AA' },

    botaoMim: { ...botao(spacing.sm) },
    botaoMimOcupado: { opacity: 0.5 },
    botaoBussola: { ...botao(spacing.sm + 48) },
    botaoSeguir: { ...botao(spacing.sm + 96) },
    botaoSeguirActivo: { backgroundColor: colors.teal },

    miraCaixa: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    mira: { transform: [{ translateY: -22.5 + 3 }] },
    miraAMexer: { transform: [{ translateY: -22.5 + 3 - 3 }] },
  });

function botao(topo) {
  return {
    position: 'absolute',
    right: spacing.sm,
    top: topo,
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
  };
}

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
