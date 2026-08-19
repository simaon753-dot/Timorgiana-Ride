import Constants from 'expo-constants';

const BACKEND_PORT = 4000;

// Onde está o backend? A resposta muda conforme a app corre em
// desenvolvimento (Expo Go) ou numa build autónoma (APK/IPA).
//
// Ordem de prioridade:
//   1. EXPO_PUBLIC_API_URL — variável definida na altura de compilar.
//      É o que vamos usar no APK (ex.: https://api.timorgianaride.tl)
//   2. extra.apiUrl no app.json — alternativa fixa no ficheiro de config
//   3. hostUri do Expo Go — o IP do computador de desenvolvimento.
//      Só existe em modo de desenvolvimento; adapta-se se o IP mudar.
//   4. localhost — último recurso (simulador no próprio computador)
//
// ⚠️ Sem os passos 1 ou 2, um APK instalado noutro telemóvel NÃO consegue
// falar com o backend: 'localhost' seria o próprio telemóvel.
function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return stripTrailingSlash(fromEnv);

  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra) return stripTrailingSlash(fromExtra);

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';
  const host = hostUri.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  return `http://localhost:${BACKEND_PORT}`;
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

// Útil para diagnosticar "sem ligação ao servidor" numa build real
export const API_SOURCE = process.env.EXPO_PUBLIC_API_URL
  ? 'EXPO_PUBLIC_API_URL'
  : Constants.expoConfig?.extra?.apiUrl
    ? 'app.json extra.apiUrl'
    : Constants.expoConfig?.hostUri
      ? 'Expo Go (hostUri)'
      : 'localhost (fallback)';
