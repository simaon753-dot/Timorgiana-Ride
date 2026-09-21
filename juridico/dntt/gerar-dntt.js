// Gera os quatro documentos do processo do DNTT.
const { Packer } = require('docx');
const fs = require('fs');
const docs = [
  ['./r1-exposicao.js', '1 - Exposicao ao DNTT.docx'],
  ['./r2-parecer.js', '2 - Parecer Juridico - Enquadramento Legal.docx'],
  ['./r3-anteprojeto.js', '3 - Anteprojeto de Diploma Ministerial.docx'],
  ['./r4-conformidade.js', '4 - Dossier de Conformidade.docx'],
];
(async () => {
  for (const [mod, nome] of docs) {
    delete require.cache[require.resolve(mod)];
    const b = await Packer.toBuffer(require(mod));
    fs.writeFileSync(nome, b);
    console.log(`  ✓ ${nome}  (${(b.length / 1024).toFixed(0)} KB)`);
  }
})();
