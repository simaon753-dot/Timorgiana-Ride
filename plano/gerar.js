const Pptx = require('pptxgenjs');
const pres = new Pptx();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Timorgiara Neto, Unipessoal, Lda';
pres.title = 'HAKAT — Plano de implementação e desenvolvimento';
['./parte1.js', './parte2.js', './parte3.js', './parte4.js', './parte5.js']
  .forEach((f) => { delete require.cache[require.resolve(f)]; require(f)(pres); });
pres.writeFile({ fileName: 'HAKAT - Plano de Implementacao.pptx' })
  .then((f) => console.log(`  ✓ ${f}`));
