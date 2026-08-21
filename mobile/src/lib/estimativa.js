import { metrosEntre } from './geocode.js';

// Quanto falta para o motorista chegar ao passageiro.
//
// Calculado na app, não no servidor, de propósito: a posição do motorista
// chega de 12 em 12 segundos e pedir uma rota ao OSRM a cada uma delas
// seria pesado e lento, para uma diferença de um ou dois minutos. O preço
// continua a ser calculado no servidor — esse não pode ser aproximado.
//
// 22 km/h e o factor 1,4 são os mesmos valores do servidor: o trânsito de
// Díli e o desvio das estradas em relação à linha reta.
const VELOCIDADE_CIDADE_KMH = 22;
const DESVIO_ESTRADA = 1.4;

export function minutosAte(de, para) {
  if (!de || !para) return null;
  const km = (metrosEntre(de, para) / 1000) * DESVIO_ESTRADA;
  if (!isFinite(km)) return null;
  return Math.max(1, Math.round((km / VELOCIDADE_CIDADE_KMH) * 60));
}

// Hora de chegada, para quem prefere ler "21:47" a "12 min".
export function horaDeChegada(minutos) {
  if (minutos == null) return null;
  const t = new Date(Date.now() + minutos * 60000);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}
