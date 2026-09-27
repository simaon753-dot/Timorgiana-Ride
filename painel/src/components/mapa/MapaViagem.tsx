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
import type { PercursoViagem } from '@/types/api';

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
// COM PERCURSO (27/09/2026), desenha o caminho feito, com o GPS do motorista:
// a ida à recolha a cinzento tracejado, a viagem com o passageiro a cheio. Sem
// ele — viagens antigas, ou que ninguém conduziu — fica a recta de antes.
export default function MapaViagem({ pontos, percurso }: { pontos: PontoMapa[]; percurso?: PercursoViagem | null }) {
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

        // AS LINHAS ENTRAM QUANDO O ESTILO ESTÁ PRONTO, e não no `load`.
        //
        // O `load` só dispara depois de TODOS os mosaicos do primeiro ecrã
        // chegarem. Com um mosaico que demora ou falha — rede má em Díli, ou
        // a demonstração, que não tem todos —, nunca dispara, e o mapa ficava
        // com os pinos e sem caminho nenhum, sem erro nenhum. As linhas não
        // precisam dos mosaicos: precisam só do estilo.
        let desenhado = false;
        const desenhar = () => {
          if (desenhado || !m.isStyleLoaded()) return;
          desenhado = true;
          if (percurso) {
            const corte = percurso.recolhaIndice ?? percurso.pontos.length;
            const linha = (pts: [number, number][]) => ({
              type: 'Feature' as const,
              properties: {},
              geometry: { type: 'LineString' as const, coordinates: pts.map(([la, ln]) => [ln, la]) },
            });
            // A ida à recolha acaba onde a viagem começa: o ponto da fronteira
            // entra nas duas, para não ficar um buraco entre elas.
            const ida = percurso.pontos.slice(0, Math.min(corte + 1, percurso.pontos.length));
            const comPassageiro = percurso.pontos.slice(Math.max(corte, 0));
            if (ida.length > 1) {
              m.addSource('ida', { type: 'geojson', data: linha(ida) });
              m.addLayer({
                id: 'ida',
                type: 'line',
                source: 'ida',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#687572', 'line-width': 3, 'line-dasharray': [1.5, 1.5], 'line-opacity': 0.8 },
              });
            }
            if (comPassageiro.length > 1) {
              m.addSource('viagem', { type: 'geojson', data: linha(comPassageiro) });
              m.addLayer({
                id: 'viagem-contorno',
                type: 'line',
                source: 'viagem',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#0A463F', 'line-width': 7 },
              });
              m.addLayer({
                id: 'viagem',
                type: 'line',
                source: 'viagem',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#26877D', 'line-width': 4.5 },
              });
            }
            return;
          }
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
        };
        m.on('styledata', desenhar);
        m.on('load', desenhar);

        if (pontos.length > 1 || percurso) {
          const b = new maplibregl.LngLatBounds();
          for (const p of pontos) b.extend([p.lng, p.lat]);
          for (const [la, ln] of percurso?.pontos ?? []) b.extend([ln, la]);
          m.fitBounds(b, { padding: 48, maxZoom: 16, duration: 0 });
        }
      })
      .catch(() => setFalhou(true));
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [pontos, percurso]);

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
