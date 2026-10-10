import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import urlTrabalhador from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

type Ponto = [number, number]; // [lat, lng]
export type QualPino = 'sitio' | 'parada';
const DILI: [number, number] = [125.5736, -8.5569];

// UMA PARAGEM NO MAPA (10/10/2026, hotéis com lobby e sítios com muro).
//
// Dois pinos que se arrastam: o SÍTIO (teal), que é o hotel ou a casa, e a
// PARAGEM (coral), onde o carro pára de facto — o lobby, o portão. À volta do
// sítio, o círculo do raio: quem pedir dentro dele vai para a paragem.
// Um clique no mapa põe o pino que estiver escolhido em `modo`.
//
// É o mesmo mapa nosso do «Baptizar um sítio» (MapaEscolher), sem custo por
// visita; o que muda é haver dois pinos e o círculo.
export default function MapaParagem({
  sitio,
  parada,
  raio,
  modo,
  aoMudar,
  className,
}: {
  sitio: Ponto | null;
  parada: Ponto | null;
  raio: number;
  modo: QualPino;
  aoMudar: (qual: QualPino, lat: number, lng: number) => void;
  className?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const pinos = useRef<Record<QualPino, Marker | null>>({ sitio: null, parada: null });
  const atual = useRef({ sitio, parada, raio, modo, aoMudar });
  atual.current = { sitio, parada, raio, modo, aoMudar };
  const [falhou, setFalhou] = useState(false);

  const escolher = (qual: QualPino, lat: number, lng: number) => atual.current.aoMudar(qual, Number(lat.toFixed(6)), Number(lng.toFixed(6)));

  const desenhar = () => {
    const m = mapa.current;
    const L = lib.current;
    if (!m || !L) return;
    for (const qual of ['sitio', 'parada'] as const) {
      const p = atual.current[qual];
      if (!p) {
        pinos.current[qual]?.remove();
        pinos.current[qual] = null;
        continue;
      }
      const onde: [number, number] = [p[1], p[0]];
      if (!pinos.current[qual]) {
        const el = document.createElement('div');
        const cor = qual === 'sitio' ? '#0E5C54' : '#FF6B57';
        el.style.cssText = `width:20px;height:20px;border-radius:9999px;background:${cor};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:grab`;
        el.setAttribute('aria-label', t(qual === 'sitio' ? 'parag.pinoSitio' : 'parag.pinoParada'));
        const mk = new L.Marker({ element: el, draggable: true }).setLngLat(onde).addTo(m);
        mk.on('dragend', () => {
          const ll = mk.getLngLat();
          escolher(qual, ll.lat, ll.lng);
        });
        pinos.current[qual] = mk;
      } else pinos.current[qual]!.setLngLat(onde);
    }
    // O círculo do raio, à volta do sítio (64 lados chegam).
    const fonte = m.getSource('raio') as GeoJSONSource | undefined;
    const s = atual.current.sitio;
    const r = atual.current.raio;
    const anel: [number, number][] = [];
    if (s && r > 0) {
      const dLat = r / 111320;
      const dLng = r / (111320 * Math.cos((s[0] * Math.PI) / 180));
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * 2 * Math.PI;
        anel.push([s[1] + dLng * Math.cos(a), s[0] + dLat * Math.sin(a)]);
      }
    }
    fonte?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: anel.length ? [anel] : [] } });
  };

  useEffect(() => {
    let vivo = true;
    let observador: ResizeObserver | null = null;
    import('maplibre-gl')
      .then((L) => {
        if (!vivo || !caixa.current) return;
        L.setWorkerUrl(urlTrabalhador);
        lib.current = L;
        const s = atual.current.sitio;
        const m = new L.Map({
          container: caixa.current,
          style: '/mapa/estilo.json',
          center: s ? [s[1], s[0]] : DILI,
          zoom: s ? 17.5 : 14,
          attributionControl: { compact: true },
        });
        mapa.current = m;
        m.addControl(new L.NavigationControl({ showCompass: false }), 'top-right');
        m.on('error', () => setFalhou(true));
        m.getCanvas().style.cursor = 'crosshair';
        m.on('click', (e) => escolher(atual.current.modo, e.lngLat.lat, e.lngLat.lng));
        m.on('load', () => {
          m.addSource('raio', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } } });
          m.addLayer({ id: 'raio-fundo', type: 'fill', source: 'raio', paint: { 'fill-color': '#0E5C54', 'fill-opacity': 0.08 } });
          m.addLayer({ id: 'raio-linha', type: 'line', source: 'raio', paint: { 'line-color': '#0E5C54', 'line-width': 1.5, 'line-dasharray': [2, 2] } });
          desenhar();
        });
        observador = new ResizeObserver(() => m.resize());
        observador.observe(caixa.current);
        desenhar();
      })
      .catch(() => setFalhou(true));
    return () => {
      vivo = false;
      observador?.disconnect();
      mapa.current?.remove();
      mapa.current = null;
      pinos.current = { sitio: null, parada: null };
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(desenhar, [sitio?.[0], sitio?.[1], parada?.[0], parada?.[1], raio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Um sítio novo (outro hotel da lista) traz o mapa até ele.
  useEffect(() => {
    const m = mapa.current;
    if (m && sitio && !m.getBounds().contains([sitio[1], sitio[0]])) m.easeTo({ center: [sitio[1], sitio[0]], zoom: Math.max(m.getZoom(), 17) });
  }, [sitio?.[0], sitio?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-borda bg-teal-suave', className ?? 'h-72')}>
      <div ref={caixa} className="h-full w-full" role="application" aria-label={t('parag.mapaParagem')} />
      {falhou ? (
        <p className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-secundario shadow-subtil">{t('det.mapaIndisponivel')}</p>
      ) : null}
    </div>
  );
}
