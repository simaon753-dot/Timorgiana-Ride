// Configuração dinâmica sobre o app.json.
//
// Existe por um motivo só: o `runtimeVersion` é obrigatório para as
// actualizações pelo ar chegarem ao APK, mas o Expo Go RECUSA qualquer
// projecto cujo runtime não seja `exposdk:<versão>`. Com o campo escrito no
// app.json, ganhámos as actualizações e perdemos o Expo Go — que é o único
// caminho gratuito para testar em iPhone.
//
// Aqui o campo existe por omissão (o comportamento de produção) e só é
// retirado quando se pede explicitamente, no arranque para Expo Go.
export default ({ config }) => {
  const paraExpoGo = process.env.EXPO_GO === '1';

  if (!paraExpoGo) return config;

  const { runtimeVersion, updates, ...semAtualizacoes } = config;
  return semAtualizacoes;
};
