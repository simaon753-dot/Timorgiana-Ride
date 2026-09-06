// Configuração dinâmica sobre o app.json.
//
// Faz duas coisas, e ambas por razões que já custaram tempo.
//
// ── 1. O runtimeVersion e o Expo Go ─────────────────────────────────
//
// O `runtimeVersion` é obrigatório para as actualizações pelo ar chegarem
// ao APK, mas o Expo Go RECUSA qualquer projecto cujo runtime não seja
// `exposdk:<versão>` — e o Expo Go é o único caminho gratuito para testar
// em iPhone.
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
export default ({ config }) => {
  const chave = process.env.GOOGLE_MAPS_ANDROID_KEY;

  // O AVISO SÓ APARECE A COMPILAR, e é de propósito.
  //
  // Em desenvolvimento a falta da chave não faz mal nenhum: o Expo Go traz
  // a chave dele e o mapa aparece na mesma. Avisar aí seria barulho a cada
  // `expo start`, e um aviso que aparece sempre deixa de se ler.
  //
  // Numa compilação a falta é grave: gera um APK cujo mapa nasce cinzento,
  // e isso descobre-se com o APK já instalado no telemóvel de alguém.
  if (!chave && process.env.EAS_BUILD === 'true') {
    console.warn(
      '\n⚠️  GOOGLE_MAPS_ANDROID_KEY não está definida nesta compilação.\n' +
        '   O APK vai sair com o mapa cinzento.\n' +
        '   Ver BUILD-APK.md, passo 3b.\n'
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
  };

  const paraDistribuir = process.env.EAS_BUILD === 'true' || process.env.EAS_UPDATE === '1';

  if (paraDistribuir) return comMapa;

  const { runtimeVersion, updates, ...semAtualizacoes } = comMapa;
  return semAtualizacoes;
};
