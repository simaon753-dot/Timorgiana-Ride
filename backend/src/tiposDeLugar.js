// Que tipo de sítio é, na linguagem do OpenStreetMap.
//
// O passageiro escolhe uma palavra que reconhece — "loja", "escola" — e o
// servidor guarda a etiqueta que o OpenStreetMap usa. Assim, quando o
// administrador abre o editor, já sabe o que criar em vez de ter de
// adivinhar pelo nome.
//
// PORQUE NÃO PEDIMOS MAIS. O formulário do OpenStreetMap para um edifício
// pergunta andares, altura, morada e código postal. Um passageiro sentado
// num carro não sabe a altura do prédio, e perguntar-lhe isso transforma um
// gesto de dois segundos num formulário que ninguém preenche.
//
// O nome e o tipo são o que ele SABE e o mapa não tem. O resto acrescenta-se
// depois, no editor, por quem estiver a rever.
export const TIPOS_DE_LUGAR = [
  { id: 'casa', osm: 'building=house' },
  { id: 'edificio', osm: 'building=yes' },
  { id: 'loja', osm: 'shop=yes' },
  { id: 'restaurante', osm: 'amenity=restaurant' },
  { id: 'escola', osm: 'amenity=school' },
  { id: 'hotel', osm: 'tourism=hotel' },
  { id: 'igreja', osm: 'amenity=place_of_worship' },
  { id: 'mercado', osm: 'amenity=marketplace' },
  { id: 'escritorio', osm: 'office=yes' },
  { id: 'bairro', osm: 'place=neighbourhood' },
  // Ponto de interesse.
  //
  // O OpenStreetMap NÃO TEM uma etiqueta para "ponto de interesse" — quer
  // sempre saber de que se trata, e "POI" não lhe diz nada. `tourism=attraction`
  // é o mais perto que existe de "sítio que vale a pena estar no mapa":
  // monumentos, miradouros, sítios conhecidos.
  //
  // Fica como ponto de partida para quem revê, não como palavra final. Se
  // afinal for uma igreja ou um edifício do Estado, corrige-se no editor —
  // que é onde se tem tempo para pensar nisso.
  { id: 'poi', osm: 'tourism=attraction' },
  { id: 'outro', osm: null },
];

export function etiquetaOsm(id) {
  return TIPOS_DE_LUGAR.find((t) => t.id === id)?.osm ?? null;
}

export function tipoValido(id) {
  return !id || TIPOS_DE_LUGAR.some((t) => t.id === id);
}
