// OS LUGARES DA TIMORGIANARIDE PARA O TIMORGIANA MAPS (GIARA), 06/10/2026.
//
//   node scripts/lugares-para-giara.mjs [ficheiro.csv]
//
// PORQUE EXISTE. O Giara nasceu vazio. Os primeiros dados dele são os que a
// TimorgianaRide já tem e são DA EMPRESA: os nomes que os passageiros e o
// administrador deram aos sítios, aceites no painel (lugares_propostos). Não
// vem nada do Google nem do OpenStreetMap — o que mantém estes dados nossos.
//
// Escreve um CSV no formato que o editor do Giara importa (Importar › CSV).
// Só leitura na base; não leva quem propôs nem telefones: só o sítio.
//
// A coluna `id` («tgr-130») fica no Giara como importedExternalId: é o que
// deixa, mais tarde, a TimorgianaRide reconhecer os seus próprios lugares
// quando os for buscar ao Giara, sem os duplicar.
import 'dotenv/config';
import fs from 'node:fs';
import { query } from '../src/db.js';

const destino = process.argv[2] || 'lugares-para-giara.csv';

// tipo na TimorgianaRide → categoria do Giara (database/migrations/004).
const CATEGORIA = {
  edificio: 'building',
  loja: 'shop',
  restaurante: 'restaurant',
  escola: 'school',
  hotel: 'hotel',
  escritorio: 'company',
  igreja: 'church',
};
function categoria(l) {
  if (CATEGORIA[l.tipo]) return CATEGORIA[l.tipo];
  // Os «outro» são sobretudo ATMs; o nome di-lo.
  if (/^atm\b/i.test(l.nome)) return 'atm';
  if (/\bbanco\b|\bbank\b|\bBNU\b|\bBNCTL\b/i.test(l.nome)) return 'bank';
  return 'other';
}

const cel = (v) => {
  let t = v == null ? '' : String(v);
  // Como o próprio Giara: uma célula a começar por = + - @ não vira fórmula.
  if (/^[\s]*[=+\-@]/.test(t) && typeof v !== 'number') t = `'${t}`;
  return `"${t.replaceAll('"', '""')}"`;
};

const lugares = await query(
  `SELECT id, nome, lat, lng, tipo, tipo_outro, municipio, posto, suco, aldeia, bairro, endereco
     FROM lugares_propostos WHERE estado = 'aceite' ORDER BY id`
);

const linhas = [
  ['id', 'kind', 'name', 'category', 'source', 'longitude', 'latitude', 'municipality',
    'administrative_post', 'suco', 'aldeia', 'neighborhood', 'address', 'description'].map(cel).join(','),
];
for (const l of lugares) {
  linhas.push(
    [
      `tgr-${l.id}`, 'place', l.nome.trim(), categoria(l), 'TimorgianaRide — nomes aceites no painel',
      Number(l.lng).toFixed(7), Number(l.lat).toFixed(7), l.municipio, l.posto, l.suco, l.aldeia,
      l.bairro, l.endereco, l.tipo === 'outro' && l.tipo_outro ? l.tipo_outro : null,
    ].map((v, i) => (i === 5 || i === 6 ? v : cel(v))).join(',')
  );
}
fs.writeFileSync(destino, '﻿' + linhas.join('\n') + '\n');

const porCategoria = {};
for (const l of lugares) porCategoria[categoria(l)] = (porCategoria[categoria(l)] || 0) + 1;
console.log(`✓ ${destino}: ${lugares.length} lugares`);
console.log('  ' + Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(' · '));
process.exit(0);
