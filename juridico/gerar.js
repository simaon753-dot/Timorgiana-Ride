// Gera os sete documentos de uma vez.
const { Packer } = require('docx');
const fs = require('fs');
const docs = [
  ['./d1-admissao.js', '1 - Regulamento de Admissao de Motoristas.docx'],
  ['./d2-veiculos.js', '2 - Regulamento de Registo e Inspecao de Veiculos.docx'],
  ['./d3-contrato-motorista.js', '3 - Contrato TimorgianaRide e Motorista.docx'],
  ['./d4-proprietario.js', '4 - Declaracao entre Proprietario e Motorista.docx'],
  ['./d5-seguranca.js', '5 - Politica de Seguranca dos Passageiros.docx'],
  ['./d6-infracoes.js', '6 - Tabela de Infracoes e Sancoes.docx'],
  ['./d7-checklist.js', '7 - Checklist Documental para Aprovacao.docx'],
];
(async () => {
  for (const [mod, nome] of docs) {
    delete require.cache[require.resolve(mod)];
    const b = await Packer.toBuffer(require(mod));
    fs.writeFileSync(nome, b);
    console.log(`  ✓ ${nome}  (${(b.length / 1024).toFixed(0)} KB)`);
  }
})();
