// Configuração dinâmica sobre o app.json.
//
// Faz duas coisas, e ambas por razões que já custaram tempo.
//
// ── 1. O runtimeVersion e o Expo Go ─────────────────────────────────
//
// O `runtimeVersion` é obrigatório para as actualizações pelo ar chegarem
// ao APK, mas o Expo Go RECUSA qualquer projecto cujo runtime não seja
// `exposdk:<versão>` — e o Expo Go é o caminho para testar sem compilar.
// (No iPhone verdadeiro já não serve: a 02/09/2026 o Expo Go da App Store
// passou ao SDK 57. No simulador de iPhone o Expo CLI instala o do SDK 54.)
//
// A primeira tentativa punha o campo por omissão e tirava-o com uma
// variável de ambiente. Foi má ideia: quem escrevesse `npx expo start` — o
// comando que qualquer pessoa escreve — apanhava o manifesto errado e via
// "there was a problem running the requested app", sem pista nenhuma.
//
// Agora é ao contrário. Em desenvolvimento o campo NUNCA existe, e só
// aparece quando quem está a chamar é o EAS a compilar ou a publicar uma
// actualização. Esses dois casos são automáticos ou têm comando próprio
// (`npm run publicar`), por isso não dependem de ninguém se lembrar.
//
// ── 2. A chave do Google Maps ───────────────────────────────────────
//
// Desde a versão 1.2.0 o mapa é o Google Maps nativo, e a chave tem de ir
// para dentro do APK — não há alternativa, é assim que a SDK funciona.
//
// O sítio normal seria o `android.config.googleMaps.apiKey` do app.json,
// mas este repositório é PÚBLICO: a chave ficaria no GitHub, à vista, e há
// robôs que o varrem à procura exactamente disso.
//
// A restrição na consola (pacote + impressão digital do certificado) já
// impede que outra aplicação a use. Isto é a segunda porta: a chave entra
// na compilação vinda do ambiente e nunca passa pelo Git.
//
//   npx eas-cli secret:create --scope project \
//     --name GOOGLE_MAPS_ANDROID_KEY --value ...
//
// Ver BUILD-APK.md, passo 3b.
//
// ── 3. A chave do Google Maps no iPhone ─────────────────────────────
//
// O iPhone precisa de uma chave PRÓPRIA: na consola do Google a restrição é
// por plataforma — no Android pacote + SHA-1, no iOS o bundle
// `tl.timorgiana.ride` — e uma chave não aceita as duas. Mesmo esquema da
// do Android: vem do ambiente e nunca passa pelo Git.
//
// Sem ela a compilação iOS sai sem o SDK do Google Maps, e o mapa, que pede
// `provider={PROVIDER_GOOGLE}`, não abre (16/09/2026, antes da 1.ª
// compilação iOS).
export default ({ config }) => {
  const chave = process.env.GOOGLE_MAPS_ANDROID_KEY;
  const chaveIos = process.env.GOOGLE_MAPS_IOS_KEY;
  // O EAS diz em que plataforma compila; cada aviso só vale para a sua.
  const plataforma = process.env.EAS_BUILD_PLATFORM;

  // O AVISO SÓ APARECE A COMPILAR, e é de propósito.
  //
  // Em desenvolvimento a falta da chave não faz mal nenhum: o Expo Go traz
  // a chave dele e o mapa aparece na mesma. Avisar aí seria barulho a cada
  // `expo start`, e um aviso que aparece sempre deixa de se ler.
  //
  // Numa compilação a falta é grave: gera um APK cujo mapa nasce cinzento,
  // e isso descobre-se com o APK já instalado no telemóvel de alguém.
  if (!chave && process.env.EAS_BUILD === 'true' && plataforma !== 'ios') {
    console.warn(
      '\n⚠️  GOOGLE_MAPS_ANDROID_KEY não está definida nesta compilação.\n' +
        '   O APK vai sair com o mapa cinzento.\n' +
        '   Ver BUILD-APK.md, passo 3b.\n'
    );
  }
  if (!chaveIos && process.env.EAS_BUILD === 'true' && plataforma === 'ios') {
    console.warn(
      '\n⚠️  GOOGLE_MAPS_IOS_KEY não está definida nesta compilação.\n' +
        '   A app de iPhone vai sair sem o Google Maps, e o mapa não abre.\n' +
        '   Ver BUILD-APK.md, passo 3c.\n'
    );
  }

  const comMapa = {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: chave },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey: chaveIos,
      },
    },
  };

  const paraDistribuir = process.env.EAS_BUILD === 'true' || process.env.EAS_UPDATE === '1';

  if (paraDistribuir) return comMapa;

  const { runtimeVersion, updates, ...semAtualizacoes } = comMapa;
  return semAtualizacoes;
};
