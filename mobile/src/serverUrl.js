import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BUILD_TIME_URL } from './config.js';

const STORAGE_KEY = 'tgr.serverUrl';

// Endereço em uso. Começa no valor definido na compilação e pode ser
// substituído pelo que o utilizador guardar nas definições.
//
// Isto permite gerar UM APK e apontá-lo a servidores diferentes sem
// recompilar — útil quando o endereço do túnel muda, ou ao passar de
// testes para produção.
let currentBase = BUILD_TIME_URL;
let usingSaved = false;

// Aceita "10.0.0.5:4000", "meuservidor.com" ou um URL completo
export function normalizeServerUrl(input) {
  let url = String(input || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

export function getBaseUrl() {
  return currentBase;
}

export function getApiUrl() {
  return `${currentBase}/api`;
}

export function getDefaultUrl() {
  return BUILD_TIME_URL;
}

export function isUsingSavedUrl() {
  return usingSaved;
}

// Chamado uma vez ao arrancar, ANTES de restaurar a sessão
export async function loadSavedServer() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      currentBase = saved;
      usingSaved = true;
    }
  } catch {
    /* fica o valor de compilação */
  }
  return currentBase;
}

export async function saveServer(input) {
  const url = normalizeServerUrl(input);
  if (!url) throw new Error('Endereço vazio.');
  currentBase = url;
  usingSaved = true;
  await AsyncStorage.setItem(STORAGE_KEY, url);
  return url;
}

// Voltar ao endereço definido na compilação
export async function resetServer() {
  currentBase = BUILD_TIME_URL;
  usingSaved = false;
  await AsyncStorage.removeItem(STORAGE_KEY);
  return currentBase;
}

// Testa um endereço sem o guardar — para o botão "Testar ligação"
export async function testServer(input) {
  const url = normalizeServerUrl(input);
  if (!url) return { ok: false, error: 'Endereço vazio.' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${url}/api/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data?.service !== 'TimorgianaRide') {
      return { ok: false, error: 'Respondeu, mas não parece um servidor TimorgianaRide.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.name === 'AbortError' ? 'Sem resposta (8s).' : 'Não foi possível ligar.' };
  }
}
