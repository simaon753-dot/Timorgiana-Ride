import { getApiUrl } from '../serverUrl.js';

// A língua da app, para o servidor responder nela (15/09/26). Posta pelo
// I18nProvider sempre que a língua muda; vai em cada pedido (X-Lingua).
let linguaActual = null;
export function definirLingua(l) {
  linguaActual = l;
}

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

// REPETIR SÓ O QUE SE PODE REPETIR (21/09/2026).
//
// A repetição nasceu para o servidor adormecido e resolvia isso bem. O que
// não distinguia era LER de ESCREVER — e aí há uma diferença que só aparece
// na rede de Díli: um pedido que CHEGOU ao servidor e cuja resposta se
// perdeu é, visto daqui, idêntico a um que nunca chegou. Repeti-lo escreve
// duas vezes.
//
// Custou duas coisas reais:
//   1. Uma viagem criada com sucesso respondia à segunda tentativa com «Já
//      tens uma viagem a decorrer» — o passageiro via um ERRO por uma viagem
//      que estava a ser despachada, e podia desistir dela.
//   2. As mensagens do chat, que não têm chave nenhuma a impedi-lo, ficavam
//      duplicadas na conversa dos dois lados.
//
// Uma leitura repetida não faz mal a ninguém: pede-se outra vez a mesma
// coisa. Por isso o GET mantém as três tentativas, e tudo o resto tem uma.
const SO_LEITURA = ['GET', 'HEAD'];

// O QUE FAZER QUANDO A SESSÃO MORRE.
//
// Posto pelo AuthProvider. Sem isto, um token expirado (duram 30 dias),
// revogado, ou invalidado por uma senha mudada noutro telemóvel, deixava a
// app num estado sem saída: cada ecrã mostrava o seu próprio erro e nenhum
// levava a pessoa ao ecrã de entrada. Ficava a parecer avariada.
let aoPerderSessao = null;
export function definirAoPerderSessao(fn) {
  aoPerderSessao = fn;
}

// O canal de tempo real também sabe disto: quando a conta é aberta noutro
// telemóvel, o servidor avisa pelo socket e corta. Sem esta porta, quem
// estivesse parado num ecrã só descobria no pedido seguinte — um motorista à
// espera de viagens podia ficar minutos a olhar para uma app já expulsa.
export function perderSessao(motivo) {
  if (aoPerderSessao) aoPerderSessao(motivo);
}

// A SESSÃO POR UM FIO — avisar sem deitar fora (23/09/2026).
//
// Decisão do Simão: uma conta aberta noutro telemóvel não pode cortar quem
// está a transportar um passageiro. O servidor deixa a sessão antiga
// trabalhar até a viagem acabar e diz-o em duas vozes, porque nenhuma
// sozinha chega: o canal de tempo real avisa no instante, e o cabeçalho
// `X-Sessao` apanha quem tinha a app fechada quando isso aconteceu.
let aoAvisarSessao = null;
export function definirAoAvisarSessao(fn) {
  aoAvisarSessao = fn;
}
export function avisarSessao() {
  if (aoAvisarSessao) aoAvisarSessao();
}

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
      ...(linguaActual ? { 'X-Lingua': linguaActual } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  let res;

  // Numa escrita, uma tentativa — mas com a paciência das três somadas: o
  // problema que a repetição resolvia era o servidor a acordar, e isso é
  // tempo, não é número de tentativas.
  const prazos = SO_LEITURA.includes(method.toUpperCase())
    ? TENTATIVAS
    : [TENTATIVAS.reduce((a, b) => a + b, 0)];

  for (let i = 0; i < prazos.length; i++) {
    if (i > 0 && onSlow) onSlow(true); // a partir da 2.ª: avisar que está lento
    try {
      res = await fetchComPrazo(`${getApiUrl()}${path}`, options, prazos[i]);
      break;
    } catch {
      // falha de rede — tentar de novo com mais paciência
    }
  }

  if (onSlow) onSlow(false);

  if (!res) {
    throw new ApiError('NETWORK', 0);
  }

  // Lido em TODAS as respostas, e não só nas que falham: enquanto a sessão
  // estiver por um fio o servidor marca-as todas, e é assim que o aviso
  // reaparece mesmo que a app tenha sido reiniciada entretanto.
  if (res.headers?.get?.('X-Sessao') === 'a-terminar') avisarSessao();

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // A SESSÃO MORREU: avisa quem sabe tratar disso, uma vez, e continua a
    // atirar o erro para quem chamou não ficar sem resposta.
    //
    // Só com token: um 401 sem token é o servidor a dizer «isto precisa de
    // sessão», não «a tua sessão acabou» — e terminar sessão a quem ainda
    // não entrou não faz sentido nenhum.
    if (res.status === 401 && token && aoPerderSessao) aoPerderSessao(data?.motivo);
    throw new ApiError(data?.error || 'Erro inesperado.', res.status, data?.motivo);
  }
  return data;
}

export const api = {
  // Definir palavra-passe nova com o código dado pelo administrador.
  recuperar: (body) => request('/auth/recuperar', { method: 'POST', body }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  health: () => request('/health'),
  fares: () => request('/config/fares'),
  // A linha da viagem, pedida ao NOSSO servidor e não a um serviço de rotas
  // directamente. É o servidor que sabe a chave do Google e que conta as
  // chamadas; e assim a linha vem da mesma fonte do mapa.
  // A paragem definida à mão para este ponto, se houver alguma.
  paragemPara: (token, corpo) => request('/quote/paragem', { method: 'POST', body: corpo, token }),
  linhaDaRota: (token, corpo) => request('/quote/linha', { method: 'POST', body: corpo, token }),
  quote: (token, body) => request('/quote', { method: 'POST', body, token }),

  createRide: (token, body) => request('/rides', { method: 'POST', body, token }),
  // Uma fotografia dos bens, enviada DEPOIS da viagem existir: a fotografia
  // agarra-se a um `id`, e antes de criar a viagem esse `id` não existe.
  enviarFotoDaCarga: (token, id, { mime, base64 }) =>
    request(`/rides/${id}/carga-foto`, { method: 'POST', body: { mime, base64 }, token }),
  activeRide: (token) => request('/rides/active', { token }),
  // Uma viagem concreta, terminada ou não. Serve para a app se pôr em dia
  // depois de perder a ligação: `activeRide` exclui as terminadas e não
  // sabe dizer o que aconteceu à que se estava a seguir.
  ride: (token, id) => request(`/rides/${id}`, { token }),
  rideHistory: (token) => request('/rides/history', { token }),
  availableRides: (token) => request('/rides/available', { token }),
  // As etapas da entrega (carregada / no_destino / descarregada), pelo motorista.
  // ── Encomenda (jastip), 20/09/2026 ──
  regrasDaEncomenda: (token) => request('/quote/jastip', { token }),
  marcarComprado: (token, id, valorUsd) =>
    request(`/rides/${id}/comprado`, { method: 'POST', body: { valorUsd }, token }),
  enviarTalao: (token, id, { mime, base64 }) =>
    request(`/rides/${id}/talao`, { method: 'POST', body: { mime, base64 }, token }),

  marcarEtapaCarga: (token, id, etapa) =>
    request(`/rides/${id}/etapa-carga`, { method: 'POST', body: { etapa }, token }),
  // "Avisar quando houver motorista", e desistir do aviso.
  pedirAviso: (token, dados) => request('/rides/aviso', { method: 'POST', body: dados, token }),
  cancelarAviso: (token) => request('/rides/aviso', { method: 'DELETE', token }),
  // Pôr um pedido de lado, com o motivo (14/09/26).
  recusarPedido: (token, id, motivo) =>
    request(`/rides/${id}/recusar`, { method: 'POST', body: { motivo }, token }),
  // Carroçaria, capacidade e ano do Carry, para quem se registou antes.
  definirCapacidade: (token, dados) =>
    request('/driver/capacidade', { method: 'POST', body: dados, token }),
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
  // Pôr a data de validade sem voltar a fotografar. Os documentos enviados
  // antes de existir o campo ficaram sem data, e agora isso bloqueia.
  definirValidadeDoc: (token, kind, expiresOn) =>
    request('/driver/documents/validade', { method: 'POST', body: { kind, expiresOn }, token }),
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

  // Termos de passageiro e privacidade. Separado do de motorista porque são
  // consentimentos diferentes, guardados em colunas diferentes.
  aceitarTermos: (token, versoes) =>
    request('/auth/termos', { method: 'POST', body: versoes, token }),
  acceptDriverTerms: (token, version) =>
    request('/driver/terms', { method: 'POST', body: { version }, token }),

  adminResumo: (token) => request('/admin/resumo', { token }),
  // Gestão do Carry (14/09/26): estado, preços, motoristas, recusas.
  adminCarry: (token) => request('/admin/carry', { token }),
  adminCarryTarifa: (token, valores) =>
    request('/admin/carry/tarifa', { method: 'PUT', body: { valores }, token }),
  adminCarryAtivo: (token, ativo) =>
    request('/admin/carry/ativo', { method: 'PUT', body: { ativo }, token }),
  // Que serviços estão ligados (o Carry pode ser desligado no painel).
  servicos: (token) => request('/quote/servicos', { token }),
  adminSos: (token) => request('/admin/sos', { token }),
  adminNotificacoes: (token) => request('/admin/notificacoes', { token }),
  assinatura: (token) => request('/driver/assinatura', { token }),
  // Carregar dias (14/09/26): o pedido com o comprovativo, e desistir dele.
  pedirCarregamento: (token, body) =>
    request('/driver/assinatura/pedidos', { method: 'POST', body, token }),
  cancelarCarregamento: (token, id) =>
    request(`/driver/assinatura/pedidos/${id}`, { method: 'DELETE', token }),
  proporLugar: (token, body) => request('/lugares/propor', { method: 'POST', body, token }),
  // Onde fica este ponto, na divisão administrativa. Devolve também os
  // sucos do posto e as aldeias que já foram escritas neles.
  // Os sítios com nome à volta de um ponto. Alimenta a lista que aparece
  // por baixo do mapa enquanto se aponta.
  confirmarEmail: (token, codigo) =>
    request('/auth/email/confirmar', { method: 'POST', token, body: { codigo } }),
  reenviarEmail: (token) => request('/auth/email/reenviar', { method: 'POST', token, body: {} }),
  mudarEmail: (token, email) => request('/auth/email', { method: 'POST', token, body: { email } }),
  mudarNome: (token, nome) => request('/auth/nome', { method: 'POST', token, body: { nome } }),

  cobertura: (token, lat, lng) => request(`/lugares/cobertura?lat=${lat}&lng=${lng}`, { token }),

  lugaresPerto: (token, lat, lng, raio) =>
    request(`/lugares/perto?lat=${lat}&lng=${lng}${raio ? `&raio=${Math.round(raio)}` : ''}`, {
      token,
    }),
  lugarAdministrativo: (token, lat, lng) =>
    request(`/lugares/administrativo?lat=${lat}&lng=${lng}`, { token }),
  // A árvore toda, para escolher à mão quando as coordenadas não chegam.
  lugarMunicipios: (token) => request('/lugares/municipios', { token }),
  adminLugares: (token, estado = 'novo') => request(`/admin/lugares?estado=${estado}`, { token }),
  adminLugarEstado: (token, id, estado) =>
    request(`/admin/lugares/${id}/estado`, { method: 'POST', body: { estado }, token }),
  adminCarregar: (token, id, body) =>
    request(`/admin/drivers/${id}/carregar`, { method: 'POST', body, token }),
  // Pagamentos da assinatura (14/09/26): confirmar contra o extracto, recusar
  // com motivo, as formas que o motorista vê, e as devoluções.
  adminPagamentos: (token) => request('/admin/pagamentos', { token }),
  adminConfirmarPagamento: (token, id) =>
    request(`/admin/pagamentos/${id}/confirmar`, { method: 'POST', token }),
  adminRecusarPagamento: (token, id, motivo) =>
    request(`/admin/pagamentos/${id}/recusar`, { method: 'POST', body: { motivo }, token }),
  adminFormasPagamento: (token, formas) =>
    request('/admin/pagamentos/formas', { method: 'PUT', body: { formas }, token }),
  // A imagem do QR TUQR (15/09/26).
  adminQr: (token, { mime, base64 }) =>
    request('/admin/pagamentos/qr', { method: 'PUT', body: { mime, base64 }, token }),
  adminApagarQr: (token) => request('/admin/pagamentos/qr', { method: 'DELETE', token }),
  adminDevolucao: (token, id) => request(`/admin/drivers/${id}/devolucao`, { token }),
  adminRegistarDevolucao: (token, id, motivo) =>
    request(`/admin/drivers/${id}/devolucao`, { method: 'POST', body: { motivo }, token }),
  // Confirmar um documento que o motorista substituiu depois de aprovado.
  adminDocRevisto: (token, id) =>
    request(`/admin/documents/${id}/revisto`, { method: 'POST', token }),
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
