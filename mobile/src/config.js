import Constants from 'expo-constants';

// Em desenvolvimento com o Expo Go, a app corre no telemóvel mas o backend
// corre no computador. O Expo expõe o IP da máquina de desenvolvimento no
// "hostUri" (ex.: "192.168.1.10:8081"), que reutilizamos para falar com o
// backend na porta 4000 — assim funciona em telemóvel real sem configuração,
// e continua a funcionar mesmo que o IP do computador mude.
const BACKEND_PORT = 4000;

function resolveApiBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';

  const host = hostUri.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  // Fallback (simulador ou web no próprio computador)
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
