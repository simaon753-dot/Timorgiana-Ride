import { onlineDrivers, nearestDrivers } from './drivers.js';
import { query } from './db.js';
import { config } from './config.js';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

// Envia notificações pelo serviço da Expo. Não precisa de conta nem de
// chaves: os tokens que a app gera já identificam o destinatário.
//
// Falhar aqui nunca deve impedir a viagem de ser criada — a notificação é
// um extra, o pedido em tempo real é o mecanismo principal.
async function enviar(mensagens) {
  if (!mensagens.length) return { enviadas: 0 };
  try {
    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensagens),
    });
    if (!res.ok) {
      console.error('[push] resposta', res.status);
      return { enviadas: 0 };
    }
    const j = await res.json();
    const erros = (j.data || []).filter((d) => d.status === 'error');
    if (erros.length) console.error('[push] erros:', erros.map((e) => e.message).join('; '));
    return { enviadas: (j.data || []).length - erros.length };
  } catch (e) {
    console.error('[push] falhou:', e.message);
    return { enviadas: 0 };
  }
}

// Avisa os motoristas disponíveis de que há um pedido novo
export async function notificarPedidoNovo(ride) {
  // Se soubermos onde é a recolha, avisamos só quem está por perto: não
  // vale a pena acordar um motorista a 20 km de distância. Sem
  // coordenadas, avisamos todos os disponíveis.
  const temOrigem = ride.originLat != null && ride.originLng != null;
  const motoristas = temOrigem
    ? await nearestDrivers({
        lat: ride.originLat,
        lng: ride.originLng,
        vehicleType: ride.vehicleType,
        maxKm: config.raioAvisoKm,
        limit: 25,
      }).then((rows) => rows.map((r) => ({ ...r, push_token: r.push_token })))
    : await onlineDrivers(ride.vehicleType);
  const mensagens = motoristas
    .filter((m) => m.push_token)
    .map((m) => ({
      to: m.push_token,
      sound: 'default',
      title: 'Novo pedido de viagem',
      body: `${ride.destLabel}${ride.fareUsd != null ? ` · USD ${ride.fareUsd}` : ''}`,
      data: { tipo: 'ride:new', rideId: ride.id },
      priority: 'high',
      channelId: 'pedidos',
    }));
  return enviar(mensagens);
}

// Avisa o passageiro de que um motorista aceitou
export async function notificarAceite(pushToken, ride) {
  if (!pushToken) return { enviadas: 0 };
  return enviar([
    {
      to: pushToken,
      sound: 'default',
      title: 'Motorista a caminho',
      body: `${ride.driver?.name} vai buscar-te${ride.fareUsd != null ? ` · USD ${ride.fareUsd}` : ''}`,
      data: { tipo: 'ride:accepted', rideId: ride.id },
      priority: 'high',
    },
  ]);
}

// Avisa todos os administradores de um pedido de ajuda. Vai com prioridade
// máxima e sem `sound: 'default'` trocado por nada: isto tem de tocar mesmo
// que o telemóvel esteja no bolso.
export async function notificarAdminsSOS({ nome, rideId, lat, lng }) {
  const admins = await query(
    'SELECT push_token FROM users WHERE is_admin = TRUE AND push_token IS NOT NULL'
  );
  if (!admins.length) return { enviadas: 0 };

  const onde = lat != null && lng != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'sem posição';
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: '🚨 PEDIDO DE AJUDA',
      body: `${nome || 'Alguém'} carregou no SOS · ${onde}`,
      data: { tipo: 'sos', rideId },
      priority: 'high',
    }))
  );
}
