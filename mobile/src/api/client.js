import { getApiUrl } from '../serverUrl.js';

export class ApiError extends Error {
  constructor(message, status, motivo) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // O servidor manda um `motivo` legível por código junto com a mensagem
    // — 'sem_saldo', 'foto_de_turno', 'documento_caducado'. Sem o guardar
    // aqui, quem apanha o erro só tem a frase, e não pode decidir para onde
    // levar a pessoa a seguir.
    this.motivo = motivo ?? null;
  }
}

// Servidores em planos gratuitos adormecem quando ninguém os usa e demoram
// cerca de um minuto a acordar. Em vez de falhar aos 8 segundos e dizer
// "sem ligação" — o que faria o utilizador pensar que a app está partida —
// tentamos várias vezes, com paciência crescente.
//
// Só repetimos falhas de REDE. Um erro do servidor (401, 409…) é uma
// resposta legítima e repeti-la não faria sentido.
const TENTATIVAS = [15000, 30000, 35000]; // total: até 80 s

// Avisa a interface de que a ligação está demorada (servidor a acordar)
let onSlow = null;
export function setSlowHandler(fn) {
  onSlow = fn;
}

function fetchComPrazo(url, options, prazo) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), prazo);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function request(path, { method = 'GET', body, token } = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  let res;

  for (let i = 0; i < TENTATIVAS.length; i++) {
    if (i > 0 && onSlow) onSlow(true); // a partir da 2.ª: avisar que está lento
    try {
      res = await fetchComPrazo(`${getApiUrl()}${path}`, options, TENTATIVAS[i]);
      break;
    } catch {
      // falha de rede — tentar de novo com mais paciência
    }
  }

  if (onSlow) onSlow(false);

  if (!res) {
    throw new ApiError('NETWORK', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Erro inesperado.', res.status, data?.motivo);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  health: () => request('/health'),
  fares: () => request('/config/fares'),
  quote: (token, body) => request('/quote', { method: 'POST', body, token }),

  createRide: (token, body) => request('/rides', { method: 'POST', body, token }),
  activeRide: (token) => request('/rides/active', { token }),
  rideHistory: (token) => request('/rides/history', { token }),
  availableRides: (token) => request('/rides/available', { token }),
  acceptRide: (token, id, fareUsd) =>
    request(`/rides/${id}/accept`, { method: 'POST', body: { fareUsd }, token }),
  startRide: (token, id, code) =>
    request(`/rides/${id}/start`, { method: 'POST', body: { code }, token }),

  registarVeiculo: (token, veiculo) =>
    request('/driver/vehicle', { method: 'POST', body: veiculo, token }),

  shiftPhoto: (token, { mime, base64 }) =>
    request('/driver/shift-photo', { method: 'POST', body: { mime, base64 }, token }),

  adminTurnos: (token) => request('/admin/turnos', { token }),

  setRideStatus: (token, id, status) =>
    request(`/rides/${id}/status`, { method: 'POST', body: { status }, token }),
  cancelRide: (token, id, reason) =>
    request(`/rides/${id}/cancel`, { method: 'POST', body: { reason }, token }),
  updateFare: (token, id, fareUsd) =>
    request(`/rides/${id}/fare`, { method: 'POST', body: { fareUsd }, token }),

  listMessages: (token, id) => request(`/rides/${id}/messages`, { token }),
  sendMessage: (token, id, body) =>
    request(`/rides/${id}/messages`, { method: 'POST', body: { body }, token }),

  rateRide: (token, id, stars) =>
    request(`/rides/${id}/rate`, { method: 'POST', body: { stars }, token }),

  // Motorista: estado da conta e documentos
  driverStatus: (token) => request('/driver/status', { token }),
  uploadDocument: (token, { kind, mime, base64, expiresOn }) =>
    request('/driver/documents', {
      method: 'POST',
      body: { kind, mime, base64, expiresOn },
      token,
    }),
  setAvailability: (token, online) =>
    request('/driver/availability', { method: 'POST', body: { online }, token }),

  numerosEmergencia: () => request('/config/emergencia'),

  sos: (token, rideId, body) =>
    request(`/rides/${rideId || 0}/sos`, { method: 'POST', body, token }),

  ganhos: (token) => request('/driver/ganhos', { token }),

  acceptDriverTerms: (token, version) =>
    request('/driver/terms', { method: 'POST', body: { version }, token }),

  adminResumo: (token) => request('/admin/resumo', { token }),
  adminSos: (token) => request('/admin/sos', { token }),
  adminNotificacoes: (token) => request('/admin/notificacoes', { token }),
  assinatura: (token) => request('/driver/assinatura', { token }),
  proporLugar: (token, body) => request('/lugares/propor', { method: 'POST', body, token }),
  // Onde fica este ponto, na divisão administrativa. Devolve também os
  // sucos do posto e as aldeias que já foram escritas neles.
  lugarAdministrativo: (token, lat, lng) =>
    request(`/lugares/administrativo?lat=${lat}&lng=${lng}`, { token }),
  // A árvore toda, para escolher à mão quando as coordenadas não chegam.
  lugarMunicipios: (token) => request('/lugares/municipios', { token }),
  adminLugares: (token, estado = 'novo') => request(`/admin/lugares?estado=${estado}`, { token }),
  adminLugarEstado: (token, id, estado) =>
    request(`/admin/lugares/${id}/estado`, { method: 'POST', body: { estado }, token }),
  adminCarregar: (token, id, body) =>
    request(`/admin/drivers/${id}/carregar`, { method: 'POST', body, token }),
  adminResolverSos: (token, id) => request(`/admin/sos/${id}/resolver`, { method: 'POST', token }),
  adminDrivers: (token, status) => request(`/admin/drivers?status=${status}`, { token }),
  adminDecidir: (token, id, decision, motivo) =>
    request(`/admin/drivers/${id}/decision`, { method: 'POST', body: { decision, motivo }, token }),

  adminViagens: (token, horas = 24) => request(`/admin/viagens?horas=${horas}`, { token }),
  adminEstatisticas: (token, dias = 7) => request(`/admin/estatisticas?dias=${dias}`, { token }),

  // Acesso total do painel. As listas são paginadas: numa rede lenta,
  // trazer trezentas contas de uma vez é o mesmo que não trazer nenhuma.
  adminUtilizadores: (token, { q = '', papel = 'todos', pagina = 0 } = {}) =>
    request(`/admin/utilizadores?q=${encodeURIComponent(q)}&papel=${papel}&pagina=${pagina}`, {
      token,
    }),
  adminUtilizador: (token, id) => request(`/admin/utilizadores/${id}`, { token }),
  adminViagem: (token, id) => request(`/admin/viagens/${id}`, { token }),
  adminRegisto: (token, dias = 30) => request(`/admin/registo?dias=${dias}`, { token }),

  savePushToken: (token, pushToken) =>
    request('/auth/push-token', { method: 'POST', body: { token: pushToken }, token }),
};
