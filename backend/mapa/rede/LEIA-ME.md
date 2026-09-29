# Rede de estradas de Timor-Leste

`estradas-tl.bin` é a rede de estradas que `mapa/rotas.js` usa para
calcular rotas sem o Google.

**Dados © colaboradores do OpenStreetMap**, disponíveis sob a
[Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
Recorte de Timor-Leste distribuído pela [Geofabrik](https://download.geofabrik.de/asia/east-timor.html).

## Refazer

1. Descarregar o recorte mais recente para `mapa/receita/osm/`
   (o ficheiro `.osm.pbf` não vai para o git):
   `https://download.geofabrik.de/asia/east-timor-latest.osm.pbf`
2. No `backend/`:
   `node mapa/scripts/construir-rede.mjs mapa/receita/osm/<ficheiro>.osm.pbf`
3. Comparar com as viagens reais antes de publicar:
   `node --env-file=.env scripts/comparar-rotas.mjs`

A 29/09/2026 (recorte de 28/09): 16 482 vias para carro, 26 192 cruzamentos,
30 083 troços, 11 208 km de estrada, 6,0 MB.
