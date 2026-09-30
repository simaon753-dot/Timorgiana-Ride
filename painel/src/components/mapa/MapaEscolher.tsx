import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MapaLibre, Marker } from 'maplibre-gl';
// O mesmo trabalhador do mapa da viagem — ver a nota em MapaViagem.tsx.
import urlTrabalhador from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { t } from '@/i18n';

type Ponto = [number, number]; // [lat, lng], como as coordenadas se colam
const DILI: [number, number] = [125.5736, -8.5569]; // [lng, lat], como o MapLibre as quer

// ESCOLHER UM PONTO COM UM CLIQUE (30/09/2026), para baptizar um sítio.
//
// O mapa é o nosso (/mapa/estilo.json), como o da viagem: sem chave de
// terceiros e sem custo por visita. Não tem pontos de interesse — de
// propósito, ver backend/mapa/LEIA-ME.md —, por isso o sítio acha-se pelas
// ruas; ou cola-se ao lado as coordenadas copiadas do Google Maps, e o pino
// vem para aqui.
//
// Clicar põe o pino; arrastá-lo afina. `ponto` é quem manda: o que vier do
// campo de texto move o pino, e o que o pino fizer volta por `aoEscolher`.
export default function MapaEscolher({ ponto, aoEscolher }: { ponto: Ponto | null; aoEscolher: (lat: number, lng: number) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const marca = useRef<Marker | null>(null);
  const biblioteca = useRef<typeof import('maplibre-gl') | null>(null);
  // As funções e o ponto mais recentes, para os ouvintes do mapa, que se
  // registam uma vez só.
  const aoEscolherRef = useRef(aoEscolher);
  aoEscolherRef.current = aoEscolher;
  const pontoRef = useRef(ponto);
  pontoRef.current = ponto;
  const [falhou, setFalhou] = useState(false);

  // Seis casas decimais são dez centímetros: mais do que isso é ruído.
  const escolher = (lat: number, lng: number) => aoEscolherRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));

  const porMarca = () => {
    const m = mapa.current;
    const lib = biblioteca.current;
    const p = pontoRef.current;
    if (!m || !lib) return;
    if (!p) {
      marca.current?.remove();
      marca.current = null;
      return;
    }
    const onde: [number, number] = [p[1], p[0]];
    if (!marca.current) {
      const el = document.createElement('div');
      el.style.cssText =
        'width:18px;height:18px;border-radius:9999px;background:#FF6B57;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:grab';
      el.setAttribute('aria-label', t('parag.baptizarPino'));
      marca.current = new lib.Marker({ element: el, draggable: true }).setLngLat(onde).addTo(m);
      marca.current.on('dragend', () => {
        const ll = marca.current?.getLngLat();
        if (ll) escolher(ll.lat, ll.lng);
      });
    } else {
      marca.current.setLngLat(onde);
    }
    // Um ponto colado fora da vista traz o mapa até ele.
    if (!m.getBounds().contains(onde)) m.easeTo({ center: onde, zoom: Math.max(m.getZoom(), 16) });
  };

  useEffect(() => {
    let vivo = true;
    let observador: ResizeObserver | null = null;
    import('maplibre-gl')
      .then((lib) => {
        if (!vivo || !caixa.current) return;
        lib.setWorkerUrl(urlTrabalhador);
        biblioteca.current = lib;
        const p = pontoRef.current;
        const m = new lib.Map({
          container: caixa.current,
          style: '/mapa/estilo.json',
          center: p ? [p[1], p[0]] : DILI,
          zoom: p ? 17 : 14,
          attributionControl: { compact: true },
        });
        mapa.current = m;
        m.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');
        m.on('error', () => setFalhou(true));
        m.getCanvas().style.cursor = 'crosshair';
        m.on('click', (e) => escolher(e.lngLat.lat, e.lngLat.lng));
        // Dentro de uma janela que abre a animar, o mapa nasce com o tamanho
        // errado; acompanha a caixa em vez de adivinhar quando acabou.
        observador = new ResizeObserver(() => m.resize());
        observador.observe(caixa.current);
        porMarca();
      })
      .catch(() => setFalhou(true));
    return () => {
      vivo = false;
      observador?.disconnect();
      mapa.current?.remove();
      mapa.current = null;
      marca.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(porMarca, [ponto?.[0], ponto?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative overflow-hidden rounded-xl border border-borda bg-teal-suave">
      <div ref={caixa} className="h-72 w-full" role="application" aria-label={t('parag.baptizarMapa')} />
      {falhou ? (
        <p className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-secundario shadow-subtil">
          {t('det.mapaIndisponivel')}
        </p>
      ) : null}
    </div>
  );
}
