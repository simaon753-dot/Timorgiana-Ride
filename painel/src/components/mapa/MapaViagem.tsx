import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MapaLibre } from 'maplibre-gl';
// O TRABALHADOR DO MAPA, compilado pelo Vite como worker e não copiado.
//
// O MapLibre 6 processa os mosaicos num worker que vai buscar a
// `maplibre-gl-worker.mjs`, ao lado do ficheiro principal — e esse worker
// importa outro ficheiro. Na compilação nenhum dos dois existia: o pedido caía
// na página do painel, o browser recusava-a como script, e o mapa ficava sem
// fundo. `?worker&url` junta o worker e o que ele importa num ficheiro só.
import urlTrabalhador from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { t } from '@/i18n';

export interface PontoMapa {
  lat: number;
  lng: number;
  tipo: 'origem' | 'destino' | 'paragem';
  nome?: string | null;
}

const CORES = { origem: '#0F766E', destino: '#FF6B57', paragem: '#687572' };

// O MAPA DA VIAGEM, com o mapa próprio da TimorgianaRide (/mapa/estilo.json):
// os mosaicos são os nossos, e não há chave de terceiros nem custo por visita.
//
// Este ficheiro só é descarregado quando se abre uma viagem — o MapLibre pesa
// mais do que o resto do painel junto.
export default function MapaViagem({ pontos }: { pontos: PontoMapa[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!caixa.current || !pontos.length) return;
    let mapa: MapaLibre | null = null;
    let vivo = true;
    import('maplibre-gl')
      .then((maplibregl) => {
        if (!vivo || !caixa.current) return;
        maplibregl.setWorkerUrl(urlTrabalhador);
        const m = new maplibregl.Map({
          container: caixa.current,
          style: '/mapa/estilo.json',
          center: [pontos[0].lng, pontos[0].lat],
          zoom: 13,
          attributionControl: { compact: true },
        });
        mapa = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        m.on('error', () => setFalhou(true));

        for (const p of pontos) {
          const el = document.createElement('div');
          el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${CORES[p.tipo]};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)`;
          el.setAttribute('aria-label', p.nome || p.tipo);
          new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
        }

        m.on('load', () => {
          m.addSource('percurso', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pontos.map((p) => [p.lng, p.lat]) } },
          });
          m.addLayer({
            id: 'percurso',
            type: 'line',
            source: 'percurso',
            paint: { 'line-color': '#0F766E', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
          });
        });

        if (pontos.length > 1) {
          const b = new maplibregl.LngLatBounds();
          for (const p of pontos) b.extend([p.lng, p.lat]);
          m.fitBounds(b, { padding: 48, maxZoom: 16, duration: 0 });
        }
      })
      .catch(() => setFalhou(true));
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [pontos]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-borda bg-teal-suave">
      <div ref={caixa} className="h-64 w-full" role="img" aria-label="Mapa da viagem" />
      {falhou ? (
        <p className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-secundario shadow-subtil">
          {t('det.mapaIndisponivel')}
        </p>
      ) : null}
    </div>
  );
}
