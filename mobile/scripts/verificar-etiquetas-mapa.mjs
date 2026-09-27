// AS ETIQUETAS DA ESTRADA SÃO IMAGENS — e uma imagem não sabe que a tradução
// mudou (27/09/2026).
//
// O texto de «Fatin tula», «Local de destino», «Drop-off point» está desenhado
// dentro de ficheiros, gerados por `scripts/desenhar-etiquetas.py`. Se alguém
// corrigir o tétum no dicionário e não voltar a gerar as imagens, a app passa
// a mostrar no mapa um texto que já não existe em lado nenhum do código — e
// nenhum outro verificador daria por isso, porque o texto velho está num PNG.
//
// Isto compara o manifesto que o gerador escreveu com o dicionário de agora,
// e confirma que os ficheiros e os `require` estão todos lá.
import { readFileSync, existsSync } from 'node:fs';

const LINGUAS = ['pt', 'tet', 'en'];
const CHAVES = {
  origem: 'mapaLocalRecolha',
  destino: 'mapaLocalDestino',
  paragem: 'mapaLocalParagem',
};

const manifesto = JSON.parse(readFileSync('assets/etiquetas/manifesto.json', 'utf8'));
const modulo = readFileSync('src/dados/etiquetasMapa.js', 'utf8');
const problemas = [];

for (const l of LINGUAS) {
  const m = await import(`../src/i18n/${l}.js`);
  const dic = m.default ?? m[Object.keys(m)[0]];
  for (const [qual, chave] of Object.entries(CHAVES)) {
    const desenhado = manifesto?.[l]?.[qual]?.texto;
    if (desenhado !== dic[chave]) {
      problemas.push(
        `${l}/${qual}: a imagem diz «${desenhado}» e o dicionário diz «${dic[chave]}»`
      );
    }
    for (const suf of ['', '@2x', '@3x']) {
      const f = `assets/etiquetas/etiqueta-${qual}-${l}${suf}.png`;
      if (!existsSync(f)) problemas.push(`falta ${f}`);
    }
    if (!modulo.includes(`etiqueta-${qual}-${l}.png`)) {
      problemas.push(`etiquetasMapa.js não tem o require de etiqueta-${qual}-${l}.png`);
    }
  }
}

if (problemas.length) {
  console.error('  ✗ etiquetas do mapa:\n');
  for (const p of problemas) console.error('    ' + p);
  console.error('\n    Corre: python3 scripts/desenhar-etiquetas.py');
  process.exit(1);
}
console.log(`  ✓ ${LINGUAS.length * 3} etiquetas do mapa, com o texto das traduções de agora`);
