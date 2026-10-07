// AS CATEGORIAS DO GIARA NO PAINEL (07/10/2026, pedido do Simão).
//
// Os nomes baptizados aqui vão para o Giara Maps. Para os dois mapas
// falarem a mesma língua, o tipo de sítio deixou de ser só um botão: o botão
// abre as categorias do Giara que lhe dizem respeito (Igreja → Capela,
// Catedral…), e é o código escolhido que segue para lá.
//
// A lista é uma cópia do catálogo do Giara, feita por
// backend/scripts/gerar-categorias-giara.mjs — não se edita à mão.
import catalogo from './categoriasGiara.json';

export type GrupoCategorias = { numero: number; nome: string; categorias: [codigo: string, nome: string][] };
export const GRUPOS = catalogo as GrupoCategorias[];

// Que grupos do Giara abre cada botão, pela ordem em que aparecem. «Outro»
// abre todos. O número é o do grupo no catálogo («12. Religião»).
export const GRUPOS_DO_TIPO: Record<string, number[] | 'todos'> = {
  casa: [21],
  edificio: [22, 21, 34],
  loja: [2, 17, 11],
  restaurante: [1],
  escola: [4],
  hotel: [8],
  igreja: [12],
  mercado: [2],
  escritorio: [20, 18, 5, 7],
  bairro: [28],
  poi: [13, 14, 15, 16, 24, 25],
  outro: 'todos',
};

// A categoria que um toque no botão já deixa escolhida: um clique basta para
// o caso normal, e a lista só serve para afinar.
export const CATEGORIA_DO_TIPO: Record<string, string> = {
  casa: 'residence',
  edificio: 'building',
  loja: 'shop',
  restaurante: 'restaurant',
  escola: 'school',
  hotel: 'hotel',
  igreja: 'church',
  mercado: 'market',
  escritorio: 'escritorio',
  bairro: 'bairro',
  poi: 'attraction',
  outro: 'other',
};

const NOMES = new Map(GRUPOS.flatMap((g) => g.categorias));
export const nomeCategoria = (codigo: string | null | undefined) => (codigo ? NOMES.get(codigo) ?? null : null);

/** O botão de tipo que combina com a categoria: o atual se ela lá estiver,
 * senão o primeiro que abre o grupo dela, senão «Outro». O tipo é o que dá a
 * etiqueta do OpenStreetMap — uma «Farmácia» com o tipo «Igreja» ficava
 * marcada como local de culto. */
export function tipoDaCategoria(codigo: string, atual: string): string {
  const grupo = GRUPOS.find((g) => g.categorias.some(([c]) => c === codigo))?.numero;
  const abre = (tipo: string) => {
    const numeros = GRUPOS_DO_TIPO[tipo];
    return numeros !== 'todos' && grupo !== undefined && !!numeros?.includes(grupo);
  };
  if (abre(atual)) return atual;
  return Object.keys(GRUPOS_DO_TIPO).find(abre) ?? 'outro';
}

export function gruposDoTipo(tipo: string): GrupoCategorias[] {
  const numeros = GRUPOS_DO_TIPO[tipo];
  if (!numeros || numeros === 'todos') return GRUPOS;
  return numeros.map((n) => GRUPOS.find((g) => g.numero === n)).filter((g): g is GrupoCategorias => !!g);
}

// Sem acentos nem maiúsculas: «saude» encontra «Saúde».
const simples = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Os grupos com as categorias cujo nome (ou o do grupo) tem todas as palavras escritas. */
export function procurarCategorias(grupos: GrupoCategorias[], pesquisa: string): GrupoCategorias[] {
  const palavras = simples(pesquisa).split(/\s+/).filter(Boolean);
  if (!palavras.length) return grupos;
  return grupos
    .map((g) => ({
      ...g,
      categorias: g.categorias.filter(([codigo, nome]) => {
        const texto = simples(`${nome} ${g.nome} ${codigo.replace(/_/g, ' ')}`);
        return palavras.every((p) => texto.includes(p));
      }),
    }))
    .filter((g) => g.categorias.length > 0);
}
