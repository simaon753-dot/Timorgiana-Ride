// O ENDEREÇO DO SERVIDOR ESTÁ DENTRO DO PACOTE? (29/09/2026)
//
// Corre no fim do `npm run publicar`, sobre a pasta `dist` que o EAS acabou
// de enviar.
//
// PORQUE EXISTE. A 28/09 duas publicações saíram sem o endereço: antes delas
// tinha corrido um `npx expo export` sem `EXPO_PUBLIC_API_URL`, o Metro
// guardou em cache o `config.js` sem endereço, e a publicação reaproveitou-o.
// Os telemóveis caíram no último recurso — `localhost:4000` — e ninguém
// soube até o Simão ver o endereço mudado no ⚙.
//
// O `--clear-cache` no script resolve a causa. Isto é para a próxima causa
// que ainda não conhecemos: se o pacote enviado não tiver o endereço, diz-se
// JÁ, em voz alta, e não quando um passageiro não consegue pedir viagem.
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.EXPO_PUBLIC_API_URL;
if (!url) {
  console.error('✗ EXPO_PUBLIC_API_URL não está definida — não sei o que procurar.');
  process.exit(1);
}
const anfitriao = new URL(url).host;

let falhas = 0;
for (const plataforma of ['android', 'ios']) {
  const pasta = path.join('dist', '_expo', 'static', 'js', plataforma);
  if (!fs.existsSync(pasta)) continue;
  for (const f of fs.readdirSync(pasta).filter((x) => !x.endsWith('.map'))) {
    // O Hermes guarda o texto ASCII em UTF-8: o endereço lê-se tal como é.
    const tem = fs.readFileSync(path.join(pasta, f)).includes(anfitriao);
    console.log(`  ${tem ? '✓' : '✗'} ${plataforma}/${f}: ${tem ? 'tem' : 'NÃO TEM'} ${anfitriao}`);
    if (!tem) falhas++;
  }
}
if (falhas) {
  console.error(
    `\n✗ PUBLICADO SEM O ENDEREÇO DO SERVIDOR. Os telemóveis vão para localhost.\n` +
      `  Publique de novo já: npm run publicar (limpa a cache do Metro).`
  );
  process.exit(1);
}
console.log('endereço do servidor dentro do pacote');
