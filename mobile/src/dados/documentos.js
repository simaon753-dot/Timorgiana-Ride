// A ORDEM EM QUE OS DOCUMENTOS SE MOSTRAM (14/09/26).
//
// O servidor devolve-os por ordem do nome técnico, e o verso da carta
// ('cartaverso') aparecia à frente de tudo, longe da frente ('licence'). Quem
// aprova tem de ver as duas faces LADO A LADO: é na frente que está o nome e a
// validade, e no verso as categorias que dizem que veículo a pessoa pode
// conduzir.
export const ORDEM_DOCUMENTOS = [
  'photo',
  'identity',
  'licence',
  'cartaverso',
  'vehicle',
  'inspection',
  'fotoveiculo',
];

// Ordena uma lista de documentos pelo campo que traz o tipo ('kind' ou 'tipo').
export function ordenarDocumentos(lista, campo = 'kind') {
  const pos = (d) => {
    const i = ORDEM_DOCUMENTOS.indexOf(d?.[campo]);
    return i < 0 ? ORDEM_DOCUMENTOS.length : i;
  };
  return [...(lista || [])].sort((a, b) => pos(a) - pos(b));
}
