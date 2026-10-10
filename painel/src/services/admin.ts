import { pedir } from './cliente';
import type {
  Espaco,
  MoradaDoPonto,
  MunicipioArvore,
  AcessoRegistado,
  Devolucao,
  EstadoCarry,
  EstadoJastip,
  EstadoLugar,
  EstadoMotorista,
  Estatisticas,
  FormaPagamento,
  LugarProposto,
  Parada,
  RegrasJastip,
  RespostaCarry,
  RespostaDestinosCarry,
  DestinoCarry,
  RespostaContaDetalhe,
  RespostaMotoristas,
  RespostaNotificacoes,
  RespostaPagamentos,
  RespostaUtilizadores,
  RespostaViagemDetalhe,
  Resumo,
  ResumoPagamentos,
  Retencao,
  Saude,
  Servico,
  AlertaSos,
  EstadoOcorrencia,
  Ocorrencia,
  TipoVeiculo,
  UtilizadorPublico,
  ViagemLinha,
ErroApp, GrupoContribuicao } from '@/types/api';

// Uma função por rota do servidor. Os ecrãs nunca escrevem um endereço à mão:
// se uma rota mudar, muda aqui e o TypeScript mostra quem a usava.

const q = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') s.set(k, String(v));
  const t = s.toString();
  return t ? `?${t}` : '';
};

export const api = {
  // Sessão
  // Com o código por email (28/09/2026) a resposta pode ser o SEGUNDO PASSO:
  // `passo: 'codigo'`, sem token — ver `confirmarCodigo`.
  entrar: (phone: string, password: string) =>
    pedir<
      | { token: string; user: UtilizadorPublico; passo?: undefined }
      | { passo: 'codigo'; desafio: number; para: string; token?: undefined; user?: undefined }
    >('/auth/login', {
      method: 'POST',
      // `origem` diz ao servidor que isto é o painel, e não um telemóvel
      // (23/09/2026). Sem isto, abrir o painel no portátil deitaria a app
      // fora do telemóvel do administrador — uma conta tem uma sessão de
      // app e uma de painel, não uma só.
      corpo: { phone, password, origem: 'painel' },
    }),
  confirmarCodigo: (desafio: number, codigo: string) =>
    pedir<{ token: string; user: UtilizadorPublico }>('/auth/login/codigo', {
      method: 'POST',
      corpo: { desafio, codigo },
    }),
  eu: () => pedir<{ user: UtilizadorPublico }>('/auth/me'),
  // Fecha a sessão do painel no servidor (28/09/2026).
  sair: () => pedir<{ ok: true }>('/auth/sair', { method: 'POST' }),
  saude: () => pedir<Saude>('/health'),

  // Aprovações e motoristas
  motoristas: (status: EstadoMotorista | 'todos') =>
    pedir<RespostaMotoristas>('/admin/drivers' + q({ status })),
  decidir: (id: number, decision: 'approved' | 'rejected' | 'suspended', motivo?: string) =>
    pedir<{ driver: UtilizadorPublico }>(`/admin/drivers/${id}/decision`, {
      method: 'POST',
      corpo: { decision, motivo },
    }),
  confirmarTelefone: (id: number) =>
    pedir<{ ok: true }>(`/admin/utilizadores/${id}/telefone-confirmado`, { method: 'POST' }),
  documentoRevisto: (id: number) =>
    pedir<{ ok: true }>(`/admin/documents/${id}/revisto`, { method: 'POST' }),
  pedirCorrecao: (id: number, motivo: string) =>
    pedir<{ ok: true }>(`/admin/documents/${id}/correcao`, { method: 'POST', corpo: { motivo } }),
  retirarCorrecao: (id: number) =>
    pedir<{ ok: true }>(`/admin/documents/${id}/correcao`, { method: 'DELETE' }),

  // Serviço
  resumo: () => pedir<{ resumo: Resumo }>('/admin/resumo'),
  notificacoes: () => pedir<RespostaNotificacoes>('/admin/notificacoes'),
  sos: () => pedir<{ alertas: AlertaSos[] }>('/admin/sos'),
  contribuicoesMapa: () => pedir<{ grupos: GrupoContribuicao[] }>('/admin/mapa/contribuicoes'),
  decidirContribuicao: (ids: number[], aceitar: boolean) =>
    pedir<{ ok: true; decididas: number }>('/admin/mapa/contribuicoes/decidir', { method: 'POST', corpo: { ids, aceitar } }),
  errosApp: (resolvidos = false) => pedir<{ erros: ErroApp[] }>('/admin/erros' + (resolvidos ? '?resolvidos=1' : '')),
  resolverErroApp: (assinatura: string) =>
    pedir<{ ok: true; resolvidos: number }>('/admin/erros/resolver', { method: 'POST', corpo: { assinatura } }),
  ocorrencias: (filtro: 'abertas' | 'todas') =>
    pedir<{ ocorrencias: Ocorrencia[] }>('/admin/ocorrencias' + q({ filtro })),
  tratarOcorrencia: (id: number, corpo: { estado: EstadoOcorrencia; resposta?: string; notaInterna?: string }) =>
    pedir<{ ok: true }>(`/admin/ocorrencias/${id}`, { method: 'POST', corpo }),
  resolverSos: (id: number) => pedir<{ ok: true }>(`/admin/sos/${id}/resolver`, { method: 'POST' }),

  // Viagens
  viagens: (horas: number, veiculo: TipoVeiculo | 'todos') =>
    pedir<{ viagens: ViagemLinha[] }>('/admin/viagens' + q({ horas, veiculo })),
  viagem: (id: number) => pedir<RespostaViagemDetalhe>(`/admin/viagens/${id}`),
  // O número de uma viagem pelo código que alguém ditou (TR-XXXXXX).
  viagemPorCodigo: (codigo: string) =>
    pedir<{ id: number; referencia: string }>(`/admin/viagens/codigo/${encodeURIComponent(codigo)}`),

  // Contas
  utilizadores: (params: { q?: string; papel?: string; pagina?: number }) =>
    pedir<RespostaUtilizadores>('/admin/utilizadores' + q(params)),
  conta: (id: number) => pedir<RespostaContaDetalhe>(`/admin/utilizadores/${id}`),
  codigoRecuperacao: (id: number) =>
    pedir<{ codigo: string; minutos: number; nome: string }>(`/admin/utilizadores/${id}/recuperacao`, {
      method: 'POST',
    }),
  registo: (dias: 1 | 7 | 30) => pedir<{ acessos: AcessoRegistado[] }>('/admin/registo' + q({ dias })),

  // Pagamentos da Taxa de Acesso
  pagamentos: () => pedir<RespostaPagamentos>('/admin/pagamentos'),
  resumoPagamentos: () => pedir<ResumoPagamentos>('/admin/pagamentos/resumo'),
  // Anunciar (data) ou retirar (null) o fim do período gratuito.
  anunciarCobranca: (inicio: string | null) =>
    pedir<{ inicio: string | null; gratuitoAte: string | null }>('/admin/assinatura/cobranca', {
      method: 'PUT',
      corpo: { inicio },
    }),
  confirmarPagamento: (id: number) =>
    pedir<{ ok: true; saldo: number }>(`/admin/pagamentos/${id}/confirmar`, { method: 'POST' }),
  recusarPagamento: (id: number, motivo: string) =>
    pedir<{ ok: true }>(`/admin/pagamentos/${id}/recusar`, { method: 'POST', corpo: { motivo } }),
  gravarFormas: (formas: FormaPagamento[]) =>
    pedir<{ formas: FormaPagamento[] }>('/admin/pagamentos/formas', { method: 'PUT', corpo: { formas } }),
  gravarQr: (mime: string, base64: string) =>
    pedir<{ ok: true }>('/admin/pagamentos/qr', { method: 'PUT', corpo: { mime, base64 } }),
  apagarQr: () => pedir<{ ok: true }>('/admin/pagamentos/qr', { method: 'DELETE' }),
  carregarDias: (id: number, corpo: { dias: number; valorUsd: number; metodo: string; referencia?: string }) =>
    pedir<{ dias: number }>(`/admin/drivers/${id}/carregar`, { method: 'POST', corpo }),
  devolucao: (id: number) => pedir<Devolucao>(`/admin/drivers/${id}/devolucao`),

  // Dados
  estatisticas: (dias: number) => pedir<Estatisticas>('/admin/estatisticas' + q({ dias })),
  retencao: () => pedir<Retencao>('/admin/retencao'),
  apagarViagens: (ate: string) =>
    pedir<{ viagens: number; retidasPorSocorro: number }>('/admin/exportar/viagens/apagar', {
      method: 'POST',
      corpo: { ate, confirmar: 'APAGAR' },
    }),

  // Paragens e lugares
  paradas: () => pedir<{ paradas: Parada[] }>('/admin/paradas'),
  criarParada: (corpo: { nome: string; lat: number; lng: number; paradaLat: number; paradaLng: number; raioM: number }) =>
    pedir<{ parada: Parada }>('/admin/paradas', { method: 'POST', corpo }),
  apagarParada: (id: number) => pedir<{ ok: true; nome: string }>(`/admin/paradas/${id}`, { method: 'DELETE' }),
  lugares: (estado: EstadoLugar | 'todos') => pedir<{ lugares: LugarProposto[] }>('/admin/lugares' + q({ estado })),
  estadoLugar: (id: number, estado: EstadoLugar) =>
    pedir<{ ok: true }>(`/admin/lugares/${id}/estado`, { method: 'POST', corpo: { estado } }),
  // Só aceita recusados — o servidor recusa os outros.
  eliminarLugar: (id: number) => pedir<{ ok: true; nome: string }>(`/admin/lugares/${id}`, { method: 'DELETE' }),
  // Baptizar um sítio: entra aceite (30/09/2026).
  baptizarLugar: (corpo: {
    nome: string;
    lat: number;
    lng: number;
    mostrarSempre: boolean;
    tipo?: string | null;
    tipoOutro?: string | null;
    categoria?: string | null;
    endereco?: string | null;
    municipio?: string | null;
    posto?: string | null;
    suco?: string | null;
    aldeia?: string | null;
    bairro?: string | null;
  }) =>
    pedir<{ lugar: { id: number; nome: string } }>('/admin/lugares', { method: 'POST', corpo }),
  arvoreLugares: () => pedir<{ municipios: MunicipioArvore[] }>('/admin/lugares/municipios'),
  moradaDoPonto: (lat: number, lng: number) => pedir<MoradaDoPonto>('/admin/lugares/administrativo' + q({ lat, lng })),
  mostrarLugar: (id: number, mostrarSempre: boolean) =>
    pedir<{ ok: true }>(`/admin/lugares/${id}/mostrar`, { method: 'POST', corpo: { mostrarSempre } }),

  // Serviços da plataforma
  espaco: () => pedir<Espaco>('/admin/espaco'),
  servicos: () => pedir<{ servicos: Servico[] }>('/admin/servicos'),
  ligarServico: (id: string, ativo: boolean) =>
    pedir<{ servicos: Servico[] }>(`/admin/servicos/${id}/ativo`, { method: 'PUT', corpo: { ativo } }),

  // Regras da encomenda (jastip)
  jastip: () => pedir<EstadoJastip>('/admin/jastip'),
  gravarJastip: (regras: RegrasJastip) => pedir<EstadoJastip>('/admin/jastip', { method: 'PUT', corpo: regras }),

  // Definições do Carry
  carry: () => pedir<RespostaCarry>('/admin/carry'),
  gravarTarifaCarry: (valores: Record<string, number>) =>
    pedir<EstadoCarry>('/admin/carry/tarifa', { method: 'PUT', corpo: { valores } }),
  destinosCarry: () => pedir<RespostaDestinosCarry>('/admin/carry/destinos'),
  // `null` repõe os destinos de partida.
  gravarDestinosCarry: (destinos: Omit<DestinoCarry, 'id'>[] | (Partial<DestinoCarry> & object)[] | null) =>
    pedir<RespostaDestinosCarry>('/admin/carry/destinos', { method: 'PUT', corpo: { destinos } }),
  carryAtivo: (ativo: boolean) => pedir<EstadoCarry>('/admin/carry/ativo', { method: 'PUT', corpo: { ativo } }),
};

export const caminhos = {
  documento: (id: number) => `/api/admin/documents/${id}`,
  comprovativo: (id: number) => `/api/admin/pagamentos/${id}/comprovativo`,
  fotoCarga: (viagem: number, n: number) => `/api/admin/viagens/${viagem}/foto/${n}`,
  exportarViagens: (ate: string) => `/api/admin/exportar/viagens?ate=${encodeURIComponent(ate)}`,
};
