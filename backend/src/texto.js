// Comparar nomes sem depender de acentos.
//
// Vive sozinho porque é preciso em três sítios que não se devem importar uns
// aos outros: a busca dos nossos lugares, o preenchimento da coluna de busca
// no arranque da base, e o casamento dos nomes da divisão administrativa com
// os que o Nominatim devolve.
//
// A primeira versão tinha-o dentro do lugaresNossos.js, e o db.js importava-o
// de lá — mas o lugaresNossos.js importa o `query` do db.js. Ficava um ciclo:
// funcionava, porque nenhum dos dois usa o outro no momento em que é
// carregado, mas era funcionar por sorte. Um ficheiro sem dependências
// nenhumas não tem como entrar em ciclo com ninguém.
export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
