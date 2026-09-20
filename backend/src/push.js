import { onlineDrivers, nearestDrivers } from './drivers.js';
import { cabe } from './capacidade.js';
import { query } from './db.js';
import { config } from './config.js';
import { notificacao as n } from './mensagens.js';

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

// A QUEM SE MANDA, E EM QUE LÍNGUA (15/09/26). Aceita o token sozinho, como
// as chamadas antigas, ou a linha da conta com push_token e lingua — é a
// lingua que escolhe o texto (ver mensagens.js). Sem língua, português.
function destino(d) {
  if (!d) return null;
  if (typeof d === 'string') return { to: d, lingua: 'pt' };
  return d.push_token ? { to: d.push_token, lingua: d.lingua || 'pt' } : null;
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
      })
    : await onlineDrivers(ride.vehicleType);
  const mensagens = motoristas
    // Só a quem a carga cabe no veículo — a mesma regra da lista (14/09/26).
    // Sem isto, um Carry pequeno era acordado por um pedido que não vê.
    .filter((m) => m.push_token && cabe(ride.carga?.volume, m.vehicle_capacidade))
    .map((m) => ({
      to: m.push_token,
      sound: 'default',
      title: n('pedidoNovoTitulo', m.lingua),
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
  carregada: ['etapaCarregadaTitulo', 'etapaCarregadaTexto'],
  no_destino: ['etapaDestinoTitulo', 'etapaDestinoTexto'],
  descarregada: ['etapaDescarregadaTitulo', 'etapaDescarregadaTexto'],
};
export async function notificarEtapaCarga(quem, etapa, rideId) {
  const d = destino(quem);
  const chaves = TEXTO_ETAPA[etapa];
  if (!d || !chaves) return { enviadas: 0 };
  return enviar([
    {
      to: d.to,
      sound: 'default',
      title: n(chaves[0], d.lingua),
      body: n(chaves[1], d.lingua),
      data: { tipo: 'ride:etapa', rideId, etapa },
      priority: 'high',
    },
  ]);
}

// A COMPRA FEITA (jastip). O passageiro autorizou um teto e tem direito a
// saber o que foi gasto ANTES de a encomenda lhe chegar à porta — é com esse
// número que ele prepara o dinheiro.
export async function notificarComprado(quem, ride) {
  const d = destino(quem);
  if (!d) return { enviadas: 0 };
  const valor = `$${Number(ride.jastip_valor ?? 0).toFixed(2)}`;
  return enviar([
    {
      to: d.to,
      sound: 'default',
      title: n('compradoTitulo', d.lingua),
      body: n('compradoTexto', d.lingua, { valor }),
      data: { tipo: 'ride:comprado', rideId: ride.id },
      priority: 'high',
    },
  ]);
}

// "Já há motorista" — o aviso que o passageiro pediu quando não havia ninguém.
const NOME_TIPO = { motorbike: 'veiculoMotorbike', car: 'veiculoCar', carry: 'veiculoCarry' };
export async function notificarMotoristaDisponivel(quem, tipo) {
  const d = destino(quem);
  if (!d) return { enviadas: 0 };
  const veiculo = n(NOME_TIPO[tipo] || 'veiculoQualquer', d.lingua);
  return enviar([
    {
      to: d.to,
      sound: 'default',
      title: n('motoristaDisponivelTitulo', d.lingua),
      body: n('motoristaDisponivelTexto', d.lingua, { veiculo }),
      data: { tipo: 'aviso:motorista' },
      priority: 'high',
    },
  ]);
}

// Avisa o passageiro de que um motorista aceitou
export async function notificarAceite(quem, ride) {
  const d = destino(quem);
  if (!d) return { enviadas: 0 };
  return enviar([
    {
      to: d.to,
      sound: 'default',
      title: n('aceiteTitulo', d.lingua),
      body: n('aceiteTexto', d.lingua, {
        nome: ride.driver?.name || '',
        preco: ride.fareUsd != null ? ` · USD ${ride.fareUsd}` : '',
      }),
      data: { tipo: 'ride:accepted', rideId: ride.id },
      priority: 'high',
    },
  ]);
}

function administradores() {
  return query(
    'SELECT push_token, lingua FROM users WHERE is_admin = TRUE AND push_token IS NOT NULL'
  );
}

// Avisa todos os administradores de um pedido de ajuda. Vai com prioridade
// máxima e sem `sound: 'default'` trocado por nada: isto tem de tocar mesmo
// que o telemóvel esteja no bolso.
export async function notificarAdminsSOS({ nome, rideId, lat, lng }) {
  const admins = await administradores();
  if (!admins.length) return { enviadas: 0 };
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: n('sosTitulo', a.lingua),
      body: n('sosTexto', a.lingua, {
        nome: nome || n('sosAlguem', a.lingua),
        onde:
          lat != null && lng != null
            ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
            : n('sosSemPosicao', a.lingua),
      }),
      data: { tipo: 'sos', rideId },
      priority: 'high',
    }))
  );
}

// Avisa os administradores de que um motorista completou os documentos.
// Sem isto, um motorista pode ficar dias à espera só porque ninguém foi
// olhar para o painel — e um motorista que espera dois dias desiste.
export async function notificarAdminsMotoristaPronto({ nome, telefone }) {
  const admins = await administradores();
  if (!admins.length) return { enviadas: 0 };
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: n('prontoTitulo', a.lingua),
      body: n('prontoTexto', a.lingua, {
        nome: nome || n('umMotorista', a.lingua),
        telefone: telefone ? ` · ${telefone}` : '',
      }),
      data: { tipo: 'driver:pronto' },
      priority: 'high',
    }))
  );
}

// Um pedido de carregamento novo. Os termos prometem os dias em 24 horas, e
// o prazo só se cumpre se alguém souber que há um pedido à espera.
export async function notificarAdminsPagamento({ nome, dias, valor, referencia }) {
  const admins = await administradores();
  if (!admins.length) return { enviadas: 0 };
  return enviar(
    admins.map((a) => ({
      to: a.push_token,
      sound: 'default',
      title: n('pagamentoTitulo', a.lingua),
      body: n('pagamentoTexto', a.lingua, {
        nome: nome || n('umMotorista', a.lingua),
        dias,
        valor,
        referencia,
      }),
      data: { tipo: 'pagamento:novo' },
      priority: 'high',
    }))
  );
}

// A decisão sobre o pedido, para o motorista não ter de ir ver.
export async function notificarMotoristaPagamento(quem, { confirmado, dias, motivo }) {
  const d = destino(quem);
  if (!d) return { enviadas: 0 };
  return enviar([
    {
      to: d.to,
      sound: 'default',
      title: n(confirmado ? 'pagamentoConfirmadoTitulo' : 'pagamentoRecusadoTitulo', d.lingua),
      body: confirmado
        ? n('pagamentoConfirmadoTexto', d.lingua, { dias })
        : n('pagamentoRecusadoTexto', d.lingua, { motivo }),
      data: { tipo: 'pagamento:decidido' },
    },
  ]);
}
