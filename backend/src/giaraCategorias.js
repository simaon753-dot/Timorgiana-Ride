// O TIPO DE UM LUGAR NA TIMORGIANARIDE → A CATEGORIA NO GIARA (07/10/2026).
//
// Partilhado pelo envio automático (giara.js) e pelo CSV da primeira
// importação (scripts/lugares-para-giara.mjs): uma só tabela, para os dois
// caminhos nunca darem categorias diferentes ao mesmo lugar. As categorias
// do Giara são as do catálogo de lá (migração 012), copiado para
// categoriasGiara.json por scripts/gerar-categorias-giara.mjs.
//
// DESDE 07/10/2026 o painel escolhe a categoria exata (Igreja → Capela) e
// guarda-a em `categoria`; essa ganha sempre. O tipo só decide quando não há
// categoria — o que chega da app, onde o passageiro só toca num botão.
import { readFileSync } from 'node:fs';

const CATALOGO = JSON.parse(readFileSync(new URL('./categoriasGiara.json', import.meta.url), 'utf8'));
const CODIGOS = new Set(CATALOGO.flatMap((g) => g.categorias.map(([codigo]) => codigo)));

export function categoriaValida(codigo) {
  return !codigo || CODIGOS.has(codigo);
}

const CATEGORIA = {
  casa: 'residence',
  edificio: 'building',
  loja: 'shop',
  restaurante: 'restaurant',
  escola: 'school',
  hotel: 'hotel',
  escritorio: 'escritorio',
  igreja: 'church',
  mercado: 'market',
  bairro: 'bairro',
  poi: 'attraction',
};

export function categoriaGiara(lugar) {
  if (lugar.categoria && CODIGOS.has(lugar.categoria)) return lugar.categoria;
  if (CATEGORIA[lugar.tipo]) return CATEGORIA[lugar.tipo];
  // Os «outro» são sobretudo ATMs e bancos; o nome di-lo.
  if (/^atm\b/i.test(lugar.nome)) return 'atm';
  if (/\bbanco\b|\bbank\b|\bBNU\b|\bBNCTL\b/i.test(lugar.nome)) return 'bank';
  return 'other';
}
