// Faz o QR do endereço do Expo Go, com uma folha à volta que explica o que
// é — um QR sozinho não diz a ninguém o que fazer com ele.
//
// O QR vai como IMAGEM embutida e não como SVG dentro de SVG. A biblioteca
// devolve um SVG cujo viewBox são os módulos do código (uns 33×33), e a
// opção `width` não o redimensiona: ao encaixá-lo saía um selo de dois
// centímetros no meio da folha. Com uma imagem, a escala é minha.
const QR = require('../plano/node_modules/qrcode');
const fs = require('fs');
const url = process.argv[2];
if (!url) { console.error('  falta o endereço'); process.exit(1); }

QR.toDataURL(url, { margin: 1, width: 1120, errorCorrectionLevel: 'M', scale: 20 })
  .then((dataUrl) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="760" height="1010" viewBox="0 0 760 1010">
  <rect width="760" height="1010" fill="#FAF7F2"/>
  <rect x="0" y="0" width="760" height="150" fill="#0E5C54"/>
  <text x="380" y="66" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#FFFFFF">TimorgianaRide</text>
  <text x="380" y="104" text-anchor="middle" font-family="Helvetica,Arial" font-size="19" fill="#FF6B4A">Teste com o Expo Go</text>
  <rect x="120" y="190" width="520" height="520" rx="16" fill="#FFFFFF"/>
  <image x="140" y="210" width="480" height="480" xlink:href="${dataUrl}"/>
  <text x="380" y="762" text-anchor="middle" font-family="Helvetica,Arial" font-size="14" fill="#6A7671">${url}</text>
  <text x="60"  y="828" font-family="Helvetica,Arial" font-size="18" font-weight="bold" fill="#14201D">Como se usa</text>
  <text x="60"  y="862" font-family="Helvetica,Arial" font-size="15" fill="#14201D">1.  Instalar o Expo Go — Play Store ou App Store</text>
  <text x="60"  y="890" font-family="Helvetica,Arial" font-size="15" fill="#14201D">2.  Abrir o Expo Go e tocar em «Scan QR code»</text>
  <text x="60"  y="918" font-family="Helvetica,Arial" font-size="15" fill="#14201D">3.  Ler este código</text>
  <rect x="46" y="940" width="668" height="52" rx="8" fill="#FDECEA"/>
  <text x="60"  y="962" font-family="Helvetica,Arial" font-size="13.5" font-weight="bold" fill="#C0392B">Só funciona enquanto o computador do Simão estiver ligado,</text>
  <text x="60"  y="981" font-family="Helvetica,Arial" font-size="13.5" font-weight="bold" fill="#C0392B">com o servidor a correr. Fechado o computador, o código deixa de abrir.</text>
</svg>`;
    fs.writeFileSync('teste/qr-expo-go.svg', svg);
    console.log(`  ✓ teste/qr-expo-go.svg  (${(svg.length / 1024).toFixed(0)} KB)`);
  });
