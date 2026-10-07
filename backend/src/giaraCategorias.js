// O TIPO DE UM LUGAR NA TIMORGIANARIDE → A CATEGORIA NO GIARA (07/10/2026).
//
// Partilhado pelo envio automático (giara.js) e pelo CSV da primeira
// importação (scripts/lugares-para-giara.mjs): uma só tabela, para os dois
// caminhos nunca darem categorias diferentes ao mesmo lugar. As categorias
// do Giara são as da migração 004 de lá.
const CATEGORIA = {
  edificio: 'building',
  loja: 'shop',
  restaurante: 'restaurant',
  escola: 'school',
  hotel: 'hotel',
  escritorio: 'company',
  igreja: 'church',
};

export function categoriaGiara(lugar) {
  if (CATEGORIA[lugar.tipo]) return CATEGORIA[lugar.tipo];
  // Os «outro» são sobretudo ATMs e bancos; o nome di-lo.
  if (/^atm\b/i.test(lugar.nome)) return 'atm';
  if (/\bbanco\b|\bbank\b|\bBNU\b|\bBNCTL\b/i.test(lugar.nome)) return 'bank';
  return 'other';
}
