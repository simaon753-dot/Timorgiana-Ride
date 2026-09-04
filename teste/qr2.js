// Duas folhas numa: instalar o Expo Go certo, e abrir o projecto.
//
// PORQUE SÃO DUAS. O Expo Go da Play Store já vai no SDK 57 e a app é SDK
// 54 — abre e recusa. Para Android, o Expo publica o APK do Expo Go 54, e é
// esse que é preciso instalar ANTES de ler o segundo código.
const QR = require('../plano/node_modules/qrcode');
const { PNG } = require('../plano/node_modules/pngjs');
const jsQR = require('../plano/node_modules/jsqr');
const fs = require('fs');

const GO54 = 'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-54.0.8/Expo-Go-54.0.8.apk';
const PROJ = process.argv[2];

async function codigo(url) {
  const dataUrl = await QR.toDataURL(url, { margin: 1, width: 1120, errorCorrectionLevel: 'M' });
  // Descodifica de volta antes de o usar. Um QR que aponta para o sítio
  // errado parece perfeito e só falha nas mãos de quem o lê.
  const buf = await QR.toBuffer(url, { margin: 1, width: 1120, errorCorrectionLevel: 'M', type: 'png' });
  const png = PNG.sync.read(buf);
  const lido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!lido || lido.data !== url) throw new Error('o QR não descodifica para o endereço certo: ' + url);
  console.log(`  ✓ verificado: ${url.slice(0, 62)}${url.length > 62 ? '…' : ''}`);
  return dataUrl;
}

(async () => {
  const [a, b] = [await codigo(GO54), await codigo(PROJ)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1180" height="880" viewBox="0 0 1180 880">
  <rect width="1180" height="880" fill="#FAF7F2"/>
  <rect x="0" y="0" width="1180" height="132" fill="#0E5C54"/>
  <text x="590" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="32" fill="#FFFFFF">TimorgianaRide  ·  teste em Android</text>
  <text x="590" y="96" text-anchor="middle" font-family="Helvetica,Arial" font-size="17" fill="#FF6B4A">Dois passos, por esta ordem</text>

  <circle cx="118" cy="196" r="24" fill="#FF6B4A"/>
  <text x="118" y="205" text-anchor="middle" font-family="Helvetica,Arial" font-size="22" font-weight="bold" fill="#22100A">1</text>
  <text x="156" y="192" font-family="Helvetica,Arial" font-size="22" font-weight="bold" fill="#0E5C54">Instalar o Expo Go 54</text>
  <text x="156" y="218" font-family="Helvetica,Arial" font-size="14" fill="#6A7671">Não o da Play Store — esse já vai no SDK 57 e recusa a app</text>
  <rect x="94" y="248" width="440" height="440" rx="14" fill="#FFFFFF"/>
  <image x="114" y="268" width="400" height="400" xlink:href="${a}"/>
  <text x="314" y="712" text-anchor="middle" font-family="Helvetica,Arial" font-size="13" fill="#6A7671">Expo-Go-54.0.8.apk</text>
  <text x="314" y="736" text-anchor="middle" font-family="Helvetica,Arial" font-size="13" fill="#6A7671">O telemóvel vai pedir para permitir instalação de fonte desconhecida</text>

  <circle cx="672" cy="196" r="24" fill="#FF6B4A"/>
  <text x="672" y="205" text-anchor="middle" font-family="Helvetica,Arial" font-size="22" font-weight="bold" fill="#22100A">2</text>
  <text x="710" y="192" font-family="Helvetica,Arial" font-size="22" font-weight="bold" fill="#0E5C54">Abrir a aplicação</text>
  <text x="710" y="218" font-family="Helvetica,Arial" font-size="14" fill="#6A7671">No Expo Go, tocar em «Scan QR code» e ler este</text>
  <rect x="648" y="248" width="440" height="440" rx="14" fill="#FFFFFF"/>
  <image x="668" y="268" width="400" height="400" xlink:href="${b}"/>
  <text x="868" y="712" text-anchor="middle" font-family="Helvetica,Arial" font-size="13" fill="#6A7671">${PROJ}</text>

  <rect x="94" y="782" width="994" height="62" rx="8" fill="#FDECEA"/>
  <text x="114" y="808" font-family="Helvetica,Arial" font-size="14" font-weight="bold" fill="#C0392B">O segundo código só funciona enquanto o computador do Simão estiver ligado, com o servidor a correr.</text>
  <text x="114" y="830" font-family="Helvetica,Arial" font-size="14" font-weight="bold" fill="#C0392B">Em iPhone não há solução: a App Store só serve o Expo Go mais recente, e esse não abre projectos SDK 54.</text>
</svg>`;
  fs.writeFileSync('teste/qr-android.svg', svg);
  console.log(`  ✓ teste/qr-android.svg`);
})();
