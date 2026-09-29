// COMPARA AS ROTAS NOSSAS COM AS DO GOOGLE, nas viagens reais (29/09/2026).
//
//   node --env-file=.env scripts/comparar-rotas.mjs
//
// A distância de cada viagem foi calculada, na altura, pelo Google (desde
// 08/09/2026; antes disso pelo OSRM). Aqui recalcula-se com as rotas nossas,
// pelos mesmos pontos, e mostra-se a diferença. Só lê — não escreve nada.
//
// Serve para uma pergunta só: as rotas do OpenStreetMap de Timor-Leste
// chegam para navegar? Uma diferença pequena e constante diz que sim; uma
// viagem muito mais longa ou mais curta aponta uma estrada em falta, um
// sentido único errado ou uma ponte que não existe — e mostra onde.
import { query } from '../src/db.js';
import { rotaNossa } from '../src/rotasNossas.js';

const rows = await query(
  `SELECT id, created_at::date::text AS dia, vehicle_type, distance_km,
          COALESCE(origin_escolhido_lat, origin_lat) AS olat,
          COALESCE(origin_escolhido_lng, origin_lng) AS olng,
          COALESCE(dest_escolhido_lat, dest_lat) AS dlat,
          COALESCE(dest_escolhido_lng, dest_lng) AS dlng,
          dest_label
     FROM rides
    WHERE created_at >= '2026-09-08' AND distance_km > 0
      AND origin_lat IS NOT NULL AND dest_lat IS NOT NULL
    ORDER BY id`
);

const t0 = performance.now();
const primeira = rotaNossa({ lat: -8.556, lng: 125.578 }, { lat: -8.52, lng: 125.61 });
const carregar = performance.now() - t0;
const mem = process.memoryUsage();
console.log(
  `rede carregada em ${carregar.toFixed(0)} ms · memória ${(mem.rss / 1e6).toFixed(0)} MB ` +
    `(heap ${(mem.heapUsed / 1e6).toFixed(0)} MB) · teste ${primeira ? primeira.km + ' km' : 'sem rota'}\n`
);

const linhas = [];
let tempos = 0;
for (const r of rows) {
  const t = performance.now();
  const n = rotaNossa(
    { lat: Number(r.olat), lng: Number(r.olng) },
    { lat: Number(r.dlat), lng: Number(r.dlng) }
  );
  tempos += performance.now() - t;
  const g = Number(r.distance_km);
  linhas.push({
    viagem: r.id,
    dia: r.dia,
    veiculo: r.vehicle_type,
    destino: String(r.dest_label || '').slice(0, 26),
    google_km: g,
    nossa_km: n ? n.km : null,
    diferenca: n ? `${n.km >= g ? '+' : ''}${(((n.km - g) / g) * 100).toFixed(0)}%` : 'sem rota',
    encosto_m: n ? `${n.encosto.origem}/${n.encosto.destino}` : '',
  });
}
console.table(linhas);
const comRota = linhas.filter((l) => l.nossa_km != null);
const razoes = comRota.map((l) => l.nossa_km / l.google_km).sort((a, b) => a - b);
const mediana = razoes.length ? razoes[Math.floor(razoes.length / 2)] : null;
const longe = comRota.filter((l) => Math.abs(l.nossa_km / l.google_km - 1) > 0.15);
console.log(
  `\n${comRota.length}/${linhas.length} viagens com rota nossa · ` +
    `mediana nossa/Google = ${mediana ? mediana.toFixed(2) : '—'} · ` +
    `${longe.length} com mais de 15% de diferença · ` +
    `${(tempos / Math.max(1, linhas.length)).toFixed(1)} ms por rota`
);
process.exit(0);
