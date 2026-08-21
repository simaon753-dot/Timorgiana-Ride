// Configuração dinâmica sobre o app.json.
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
export default ({ config }) => {
  const paraDistribuir =
    process.env.EAS_BUILD === 'true' || process.env.EAS_UPDATE === '1';

  if (paraDistribuir) return config;

  const { runtimeVersion, updates, ...semAtualizacoes } = config;
  return semAtualizacoes;
};
