import { etiquetaOsm } from './tiposDeLugar.js';

// A proposta traduzida para etiquetas do OpenStreetMap, prontas a colar.
//
// PARA QUE SERVE. O editor do OpenStreetMap tem, no painel das etiquetas, um
// botão que troca a vista de tabela por vista de texto. Nessa vista aceita
// linhas `chave=valor` coladas de uma vez. Quem revê deixa de preencher
// campo a campo e passa a colar um bloco.
//
// AS ETIQUETAS NÃO SÃO INVENTADAS. Perguntámos ao próprio OpenStreetMap que
// etiquetas de morada se usam em Timor-Leste — 4373 objectos com `addr:*` —
// e o resultado foi claro:
//
//     addr:full   1962      addr:district      4
//     addr:street  813      addr:subdistrict   3
//     addr:city    672      addr:suburb        2
//
// Ou seja: em Timor-Leste a morada escreve-se numa linha só, em `addr:full`,
// e as etiquetas hierárquicas praticamente não existem. Um `addr:subdistrict`
// com três usos no país inteiro não é uma convenção, é um acidente — e
// enchermos o mapa deles com etiquetas que ninguém usa seria fazer trabalho
// que outra pessoa teria de desfazer.
//
// E O FORMATO DA LINHA É O QUE JÁ TÍNHAMOS. Os exemplos reais lêem-se assim:
//
//     Fatucama, Metiaut, Cristo Rei, Dili
//      aldeia     suco     posto     município
//
// Do mais pequeno para o maior, que é a ordem do nosso formulário.

// Palavras por que começa uma rua, nas três línguas em que as pessoas as
// escrevem em Díli: português, tétum e indonésio.
//
// Serve para decidir se o que foi escrito no campo do endereço é uma rua ou
// uma referência ("em frente do mercado"). É um palpite, e é de propósito
// que só acrescenta `addr:street` quando tem a certeza: uma referência
// metida em `addr:street` fica errada no mapa, e uma rua que ficou de fora
// vê-se na mesma em `addr:full` e move-se num segundo.
const COMECA_POR_RUA =
  /^\s*(rua|r\.|estrada|avenida|av\.?|travessa|largo|pra[çc]a|dalan|jalan|jl\.?|beco)\b/i;

export function linhasOsm(l) {
  const linhas = [];
  if (l.nome) linhas.push(`name=${l.nome}`);

  const tipo = etiquetaOsm(l.tipo);
  if (tipo) linhas.push(tipo);

  if (l.endereco && COMECA_POR_RUA.test(l.endereco)) {
    linhas.push(`addr:street=${l.endereco.trim()}`);
  }

  // A morada completa, na convenção do país. O endereço entra aqui mesmo
  // quando é uma referência e não uma rua — em Díli é assim que se diz onde
  // fica uma coisa, e `addr:full` existe precisamente para a morada como as
  // pessoas a escrevem.
  const completa = [l.endereco, l.aldeia, l.bairro, l.suco, l.posto, l.municipio]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(', ');
  if (completa) linhas.push(`addr:full=${completa}`);

  // `addr:city` leva o município: em Timor-Leste é o que lá está escrito —
  // Dili, Aileu, Baucau — e não uma cidade em separado.
  if (l.municipio) linhas.push(`addr:city=${l.municipio}`);

  return linhas;
}
