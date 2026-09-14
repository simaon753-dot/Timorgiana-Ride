import { onlineDrivers, nearestDrivers } from './drivers.js';
import { cabe } from './capacidade.js';
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
    // Só a quem a carga cabe no veículo — a mesma regra da lista (14/09/26).
    // Sem isto, um Carry pequeno era acordado por um pedido que não vê.
    .filter((m) => m.push_token && cabe(ride.carga?.volume, m.vehicle_capacidade))
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

// As etapas da entrega, ao passageiro (14/09/26). Quem mandou uma mudança
// não está a olhar para o ecrã: é a notificação que lhe diz que a carga já
// está a caminho, ou que chegou.
const TEXTO_ETAPA = {
  carregada: ['Carga carregada', 'O motorista já carregou e vai a caminho do destino.'],
  no_destino: ['Chegou ao destino', 'O motorista chegou ao destino da entrega.'],
  descarregada: ['Descarga feita', 'A carga foi descarregada. Falta concluir a entrega.'],
};
export async function notificarEtapaCarga(pushToken, etapa, rideId) {
  const texto = TEXTO_ETAPA[etapa];
  if (!pushToken || !texto) return { enviadas: 0 };
  return enviar([
    {
      to: pushToken,
      sound: 'default',
      title: texto[0],
      body: texto[1],
      data: { tipo: 'ride:etapa', rideId, etapa },
      priority: 'high',
    },
  ]);
}

// "Já há motorista" — o aviso que o passageiro pediu quando não havia ninguém.
const NOME_TIPO = { motorbike: 'Motorizada', car: 'Carro', carry: 'Carro Pickup' };
export async function notificarMotoristaDisponivel(pushToken, tipo) {
  if (!pushToken) return { enviadas: 0 };
  return enviar([
    {
      to: pushToken,
      sound: 'default',
      title: 'Há um motorista disponível',
      body: `Já há ${NOME_TIPO[tipo] || 'um motorista'} perto de si. Abra a app para pedir.`,
      data: { tipo: 'aviso:motorista' },
      priority: 'high',
    },
  ]);
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

  const onde =
    lat != null && lng != null
      ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
      : 'sem posição';
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

// Avisa os administradores de que um motorista completou os documentos.
// Sem isto, um motorista pode ficar dias à espera só porque ninguém foi
// olhar para o painel — e um motorista que espera dois dias desiste.
export async function notificarAdminsMotoristaPronto({ nome, telefone }) {
  const admins = await query(
    'SELECT push_token FROM users WHERE is_admin = TRUE AND push_token IS NOT NULL'
  );
  if (!admins.length) return { enviadas: 0 };
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: 'Motorista à espera de aprovação',
      body: `${nome || 'Um motorista'} enviou os documentos${telefone ? ` · ${telefone}` : ''}`,
      data: { tipo: 'driver:pronto' },
      priority: 'high',
    }))
  );
}

// Um pedido de carregamento novo. Os termos prometem os dias em 24 horas, e
// o prazo só se cumpre se alguém souber que há um pedido à espera.
export async function notificarAdminsPagamento({ nome, dias, valor, referencia }) {
  const admins = await query(
    'SELECT push_token FROM users WHERE is_admin = TRUE AND push_token IS NOT NULL'
  );
  if (!admins.length) return { enviadas: 0 };
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: 'Pagamento por confirmar',
      body: `${nome || 'Um motorista'} · ${dias} dias · $${valor} · ${referencia}`,
      data: { tipo: 'pagamento:novo' },
      priority: 'high',
    }))
  );
}

// A decisão sobre o pedido, para o motorista não ter de ir ver.
export async function notificarMotoristaPagamento(pushToken, { confirmado, dias, motivo }) {
  if (!pushToken) return { enviadas: 0 };
  return enviar([
    {
      to: pushToken,
      sound: 'default',
      title: confirmado ? 'Dias carregados' : 'Pagamento não confirmado',
      body: confirmado ? `${dias} dias entraram na sua conta.` : `Motivo: ${motivo}`,
      data: { tipo: 'pagamento:decidido' },
    },
  ]);
}
