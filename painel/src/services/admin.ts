import { pedir } from './cliente';
import type {
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
  TipoVeiculo,
  UtilizadorPublico,
  ViagemLinha,
} from '@/types/api';

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
  entrar: (phone: string, password: string) =>
    pedir<{ token: string; user: UtilizadorPublico }>('/auth/login', {
      method: 'POST',
      corpo: { phone, password },
    }),
  eu: () => pedir<{ user: UtilizadorPublico }>('/auth/me'),
  saude: () => pedir<Saude>('/health'),

  // Aprovações e motoristas
  motoristas: (status: EstadoMotorista | 'todos') =>
    pedir<RespostaMotoristas>('/admin/drivers' + q({ status })),
  decidir: (id: number, decision: 'approved' | 'rejected' | 'suspended', motivo?: string) =>
    pedir<{ driver: UtilizadorPublico }>(`/admin/drivers/${id}/decision`, {
      method: 'POST',
      corpo: { decision, motivo },
    }),
  documentoRevisto: (id: number) =>
    pedir<{ ok: true }>(`/admin/documents/${id}/revisto`, { method: 'POST' }),

  // Serviço
  resumo: () => pedir<{ resumo: Resumo }>('/admin/resumo'),
  notificacoes: () => pedir<RespostaNotificacoes>('/admin/notificacoes'),
  sos: () => pedir<{ alertas: AlertaSos[] }>('/admin/sos'),
  resolverSos: (id: number) => pedir<{ ok: true }>(`/admin/sos/${id}/resolver`, { method: 'POST' }),

  // Viagens
  viagens: (horas: number, veiculo: TipoVeiculo | 'todos') =>
    pedir<{ viagens: ViagemLinha[] }>('/admin/viagens' + q({ horas, veiculo })),
  viagem: (id: number) => pedir<RespostaViagemDetalhe>(`/admin/viagens/${id}`),

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

  // Serviços da plataforma
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
  carryAtivo: (ativo: boolean) => pedir<EstadoCarry>('/admin/carry/ativo', { method: 'PUT', corpo: { ativo } }),
};

export const caminhos = {
  documento: (id: number) => `/api/admin/documents/${id}`,
  comprovativo: (id: number) => `/api/admin/pagamentos/${id}/comprovativo`,
  fotoCarga: (viagem: number, n: number) => `/api/admin/viagens/${viagem}/foto/${n}`,
  exportarViagens: (ate: string) => `/api/admin/exportar/viagens?ate=${encodeURIComponent(ate)}`,
};
