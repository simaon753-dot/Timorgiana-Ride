// Matrículas de Timor-Leste.
//
// Dois formatos, confirmados pelo Simão:
//   carro       A - 23.123 TLS
//   motorizada  A - 1234 TLS
//
// A validação existe porque uma matrícula mal escrita não dá erro
// nenhum: a conta cria-se, o motorista trabalha, e o problema só aparece
// quando um passageiro está na rua a comparar a chapa com o ecrã e não
// bate certo. Nessa altura já não há quem corrija.
//
// Aceita o que a pessoa escreve com espaços, pontos e traços à maneira
// dela, e devolve a forma normalizada. Recusar por causa de um espaço a
// mais seria transformar uma ajuda num obstáculo.

const CARRO = /^([A-Z])[\s-]*(\d{2})[.\s-]*(\d{3})[\s-]*(TLS)$/i;
const MOTA = /^([A-Z])[\s-]*(\d{4})[\s-]*(TLS)$/i;

// Devolve a matrícula na forma oficial, ou null se não encaixar.
export function normalizarMatricula(texto, tipo) {
  const limpo = String(texto || '')
    .trim()
    .toUpperCase();
  if (!limpo) return null;

  if (tipo === 'motorbike') {
    const m = limpo.match(MOTA);
    return m ? `${m[1]} - ${m[2]} TLS` : null;
  }
  const c = limpo.match(CARRO);
  return c ? `${c[1]} - ${c[2]}.${c[3]} TLS` : null;
}

export function matriculaValida(texto, tipo) {
  return normalizarMatricula(texto, tipo) !== null;
}
