// Ler uma data como ela está escrita no documento.
//
// PORQUE ISTO EXISTE. O Kartaun Inspesaun da DNTT escreve a validade assim:
//
//     Valido Inspesaun    22/12/2026
//
// e o campo da app pedia `2026-12-22`. Quem tem o cartão na mão escreve o
// que lá está, a app recusa, e a pessoa fica a olhar para uma data correcta
// a ser chamada de inválida. É a pior espécie de erro: aquele em que quem o
// comete tem razão.
//
// Aceita as duas formas e devolve sempre a que o servidor quer. As barras
// podem ser `/`, `-` ou `.`, porque quem escreve à pressa num telemóvel usa
// o que lhe aparece.
//
// NÃO ADIVINHA ENTRE DIA E MÊS. Em Timor-Leste escreve-se dia primeiro, e
// 03/04/2027 é 3 de Abril. Um formato que às vezes lê ao contrário seria
// pior do que um que só lê de uma maneira.
export function paraISO(escrito) {
  const s = String(escrito || '').trim();
  if (!s) return null;

  // Já vem como o servidor quer.
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return valida(+iso[1], +iso[2], +iso[3]);

  // Como está no cartão: dia, mês, ano.
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) return valida(+dmy[3], +dmy[2], +dmy[1]);

  return null;
}

function valida(ano, mes, dia) {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  if (ano < 2000 || ano > 2100) return null;
  // Deixa o Date apanhar 31 de Fevereiro: se a data não existir, o mês
  // muda sozinho e a comparação denuncia-a.
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Mostrar uma data como se escreve em Timor-Leste.
export function paraMostrar(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '';
}
