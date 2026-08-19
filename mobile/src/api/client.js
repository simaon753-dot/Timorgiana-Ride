import { API_URL } from '../config.js';

// Erro com mensagem amigável vinda do backend
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Pedido genérico à API. Aceita um token opcional para rotas protegidas.
async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Falha de rede (servidor em baixo, sem internet, IP errado…)
    throw new ApiError('NETWORK', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Erro inesperado.', res.status);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  health: () => request('/health'),

  // Viagens
  createRide: (token, body) => request('/rides', { method: 'POST', body, token }),
  activeRide: (token) => request('/rides/active', { token }),
  availableRides: (token) => request('/rides/available', { token }),
  acceptRide: (token, id, fareUsd) =>
    request(`/rides/${id}/accept`, { method: 'POST', body: { fareUsd }, token }),
  setRideStatus: (token, id, status) =>
    request(`/rides/${id}/status`, { method: 'POST', body: { status }, token }),
  cancelRide: (token, id) => request(`/rides/${id}/cancel`, { method: 'POST', token }),
  updateFare: (token, id, fareUsd) =>
    request(`/rides/${id}/fare`, { method: 'POST', body: { fareUsd }, token }),

  // Chat
  listMessages: (token, id) => request(`/rides/${id}/messages`, { token }),
  sendMessage: (token, id, body) =>
    request(`/rides/${id}/messages`, { method: 'POST', body: { body }, token }),

  // Avaliação
  rateRide: (token, id, stars) =>
    request(`/rides/${id}/rate`, { method: 'POST', body: { stars }, token }),
};
