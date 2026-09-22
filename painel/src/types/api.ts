// OS TIPOS DA API, copiados das respostas de backend/src/routes/admin.js.
//
// Não são uma promessa do servidor — são uma descrição do que ele devolve a
// 17/09/2026. Quando uma rota mudar lá, muda aqui; o TypeScript aponta cada
// ecrã que usava o campo antigo.

export type TipoVeiculo = 'motorbike' | 'car' | 'carry';
export type EstadoMotorista = 'pending' | 'approved' | 'rejected' | 'suspended';
export type TipoDocumento =
  | 'photo'
  | 'identity'
  | 'licence'
  | 'cartaverso'
  | 'vehicle'
  | 'inspection';

export interface Veiculo {
  type: TipoVeiculo;
  model: string | null;
  plate: string | null;
  color: string | null;
  seats: number | null;
  carroceria: string | null;
  capacidade: string | null;
  ano: number | null;
}

export interface UtilizadorPublico {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  emailConfirmado: boolean;
  role: 'passenger' | 'driver';
  ratingAvg: number | null;
  ratingCount: number | null;
  createdAt: string;
  driverStatus: EstadoMotorista | null;
  podeConduzir: boolean;
  driverStatusMotivo?: string;
  vehicle?: Veiculo;
  isAdmin?: boolean;
}

export interface DocumentoResumo {
  id: number;
  kind: TipoDocumento;
  mime: string;
  expiresOn: string | null;
  expirado: boolean;
  motivo: string | null;
  porRever: boolean;
}

export interface Motorista extends UtilizadorPublico {
  documents: DocumentoResumo[];
  online: boolean;
  viagens: number;
  cancelou: number;
  fotoHoje: boolean;
  validadeMin: string | null;
  ultimaVez: string | null;
}

export interface RespostaMotoristas {
  contagens: Partial<Record<EstadoMotorista | 'todos', number>>;
  drivers: Motorista[];
}

export interface AlertaSos {
  id: number;
  rideId: number | null;
  quem: string;
  tipo: string;
  telefone: string | null;
  papel: string | null;
  destino: string | null;
  estadoViagem: string | null;
  lat: number | null;
  lng: number | null;
  nota: string | null;
  quando: string;
}

export interface Resumo {
  pendentes: number;
  aprovados: number;
  disponiveis: number;
  passageiros: number;
  sos: number;
  viagens24h: number;
  concluidas: number;
  esperando: number;
  veiculosServico: number;
  canceladas24h: number;
  semMotorista24h: number;
  tarifas24h: number;
  carryMotoristas: number;
  carry24h: number;
}

export type NivelNotificacao = 'mau' | 'aviso' | 'neutro';
export interface ItemNotificacao {
  chave:
    | 'sos'
    | 'pagamentosAtrasados'
    | 'pagamentos'
    | 'docsCaducados'
    | 'aprovacoes'
    | 'semResposta'
    | 'docsACaducar'
    | 'canceladas'
    | 'suspensas';
  n: number;
  nivel: NivelNotificacao;
  seccao: string;
}
export interface RespostaNotificacoes {
  itens: ItemNotificacao[];
  porTratar: number;
}

export type EstadoViagem =
  | 'requested'
  | 'accepted'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Carga {
  tipo: string;
  tipos: string[];
  volume: string | null;
  ajuda: string | null;
  notas: string | null;
  outro: string | null;
  fotos: number;
  declaradoEm?: string | null;
}

// A encomenda (jastip) de uma viagem. `compras` e `total` só existem depois
// de o motorista registar o talão: antes disso ninguém sabe o valor, e um
// zero ali seria uma afirmação falsa.
export interface ItemEncomenda {
  nome: string;
  quantos: number;
  detalhe?: string;
}

export interface Jastip {
  lista: string;
  // Só as encomendas pedidas a partir de 21/09/2026 têm artigos; as de antes
  // têm apenas o texto corrido que a pessoa escreveu.
  itens: ItemEncomenda[] | null;
  loja: string | null;
  teto: number;
  taxa: number;
  compras: number | null;
  compradoEm: string | null;
  total: number | null;
  fotos?: number;
}

export interface ViagemLinha {
  id: number;
  estado: EstadoViagem;
  origem: string | null;
  destino: string | null;
  preco: number | null;
  km: number | null;
  min: number | null;
  pessoas: number | null;
  motivoCancelamento: string | null;
  canceladoPeloPassageiro: boolean | null;
  veiculo: TipoVeiculo;
  paragens: string[];
  carga: Carga | null;
  passageiro: string;
  telPassageiro: string | null;
  motorista: string | null;
  telMotorista: string | null;
  quando: string;
}

export interface Ponto {
  nome: string | null;
  lat: number | null;
  lng: number | null;
}

export interface EventoViagem {
  que: string;
  quando: string;
  quem: string | null;
  quemId: number | null;
  de: string | null;
  para: string | null;
  onde: { lat: number; lng: number } | null;
  preco: number | null;
  detalhe: Record<string, unknown> | null;
}

export interface ViagemDetalhe {
  id: number;
  estado: EstadoViagem;
  origem: Ponto;
  destino: Ponto;
  preco: number | null;
  km: number | null;
  min: number | null;
  veiculo: TipoVeiculo;
  pessoas: number | null;
  paragens: Ponto[];
  carga: Carga | null;
  jastip: Jastip | null;
  codigoRecolha: string | null;
  pedida: string;
  comecou: string | null;
  actualizada: string | null;
  cancelamento: { por: string | null; motivo: string | null; quem: 'passageiro' | 'motorista' } | null;
  passageiro: { id: number; nome: string; telefone: string | null; estrelas: number | null };
  motorista: {
    id: number;
    nome: string;
    telefone: string | null;
    estrelas: number | null;
    veiculo: { tipo: TipoVeiculo; modelo: string | null; matricula: string | null; cor: string | null };
  } | null;
  nMensagens: number;
  avaliacoes: { estrelas: number; de: string; para: string; quando: string }[];
}

export interface RespostaViagemDetalhe {
  eventos: EventoViagem[];
  viagem: ViagemDetalhe;
}

export interface UtilizadorLinha {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  driverStatus: EstadoMotorista | null;
  isAdmin: boolean;
  online: boolean;
  estrelas: number | null;
  avaliacoes: number | null;
  desde: string;
  ultimaVez: string | null;
  veiculo: { tipo: TipoVeiculo; matricula: string } | null;
  viagensPassageiro: number;
  viagensMotorista: number;
}

export interface RespostaUtilizadores {
  utilizadores: UtilizadorLinha[];
  haMais: boolean;
  pagina: number;
}

export interface Pacote {
  dias: number;
  usd: number;
}

export interface ContaDetalhe extends UtilizadorPublico {
  desde: string;
  ultimaVez: string | null;
  // Só existem quando a pessoa corrigiu o nome alguma vez.
  nomeAnterior?: string;
  nomeAlteradoEm?: string;
  online: boolean;
  ultimaPosicao: { lat: number; lng: number } | null;
  termos: {
    passageiro: { versao: string; quando: string } | null;
    motorista: { versao: string; quando: string } | null;
  };
  cidadaoTL: { declarou: boolean; quando: string } | null;
  decisao: { motivo: string | null; quando: string; por: number | null } | null;
  dias: number;
  pacotes: Pacote[];
  formasPagamento: string[];
  referencia: string;
}

export interface RespostaContaDetalhe {
  conta: ContaDetalhe;
  documentos: {
    id: number;
    tipo: TipoDocumento;
    tamanho: number;
    quando: string;
    validade: string | null;
    caducado: boolean;
    motivo: string | null;
    porRever: boolean;
  }[];
  viagens: {
    id: number;
    estado: EstadoViagem;
    origem: string | null;
    destino: string | null;
    preco: number | null;
    km: number | null;
    quando: string;
    papel: 'motorista' | 'passageiro';
  }[];
  avaliacoes: { estrelas: number; de: string; viagem: number; quando: string }[];
  turnos: { id: number; dia: string; quando: string }[];
  emergencias: {
    id: number;
    tipo: string;
    resolvido: boolean;
    quando: string;
    viagem: number | null;
    posicao: { lat: number; lng: number } | null;
  }[];
}

export interface AcessoRegistado {
  id: string;
  que: string;
  alvo: number | null;
  alvoNome: string | null;
  alvoApagado: boolean;
  vezes: number;
  admins: string[];
  quando: string;
  quandos: string[];
}

export interface PontoDiario {
  dia: string;
  pedidos: number;
  concluidas: number;
  canceladas: number;
  semMotorista: number;
  motoristas: number;
  passageiros: number;
}

export interface Estatisticas {
  dias: number;
  cancelamentos: { motivo: string; n: number }[];
  aceites: number;
  semResposta: number;
  segundosAteAceitar: number | null;
  pedidos: number;
  canceladas: number;
  satisfacao: { media: number; n: number } | null;
  documentosACaducar: { userId: number; nome: string; telefone: string; tipo: TipoDocumento; ate: string }[];
  // Acrescentado a 17/09/2026 para os gráficos do painel.
  porDia?: PontoDiario[];
}

export type EstadoPedidoPagamento = 'pendente' | 'confirmado' | 'recusado' | 'cancelado';
export interface PedidoPagamento {
  id: number;
  userId: number;
  nome: string;
  telefone: string;
  tipo: TipoVeiculo | null;
  dias: number;
  valorUsd: number;
  metodo: string;
  referencia: string | null;
  temComprovativo: boolean;
  estado: EstadoPedidoPagamento;
  motivo: string | null;
  quando: string;
  decididoEm: string | null;
  decididoPor: string | null;
  horas: number;
}

export interface FormaPagamento {
  id: string;
  ativo: boolean;
  instrucoes: string;
  comPedido: boolean;
  temQr?: boolean;
}

export interface RespostaPagamentos {
  pendentes: PedidoPagamento[];
  decididos: PedidoPagamento[];
  formas: FormaPagamento[];
  prazoHoras: number;
}

export interface Carregamento {
  id: number;
  userId: number;
  nome: string | null;
  tipo: TipoVeiculo | null;
  dias: number;
  valorUsd: number | null;
  metodo: string | null;
  referencia: string | null;
  quando: string;
  por: string | null;
}

// GET /api/admin/pagamentos/resumo — acrescentado a 17/09/2026.
export interface ResumoPagamentos {
  gratuitoAte: string;
  comprasAbrem: string;
  emPeriodoGratuito: boolean;
  hoje: number;
  mes: number;
  total: number;
  devolvido: number;
  carregamentos: number;
  pacotes: Record<TipoVeiculo, Pacote[]>;
  ultimos: Carregamento[];
}

export interface Devolucao {
  dias: number;
  valorUsd: number;
  oferecidos: number;
  partes: { quando: string | null; dias: number; porDia: number; valor: number }[];
}

// GET /api/admin/servicos — o que a plataforma oferece e o que está ligado.
export interface Servico {
  id: string;
  familia: 'viagem' | 'entrega' | string;
  emConstrucao: boolean;
  ativo: boolean;
  atualizado: { em: string; por: number | null } | null;
}

// GET /api/admin/jastip — as regras da encomenda, os valores de fábrica e os
// limites dentro dos quais o painel pode mexer.
export interface RegrasJastip {
  tetoUsd: number;
  viagensMinimas: number;
  exigeEmailConfirmado: boolean;
  escaloes: { ate: number; taxa: number }[];
}

export interface EstadoJastip {
  regras: RegrasJastip;
  padrao: RegrasJastip;
  limites: {
    tetoUsd: { min: number; max: number };
    viagensMinimas: { min: number; max: number };
    taxa: { min: number; max: number };
  };
}

export interface EstadoCarry {
  ativo: boolean;
  tarifa: Record<string, number | null>;
  padrao: Record<string, number | null>;
  campos: { chave: string; min: number; max: number }[];
  atualizado: { em: string; por: number | null } | null;
}

export interface RespostaCarry extends EstadoCarry {
  atualizadoPorNome: string | null;
  exemplos: { km: number; min: number; volume?: string; ajuda?: string; paragens?: number; pessoas?: number; preco: number }[];
  motoristas: { capacidade: string; n: number; online: number }[];
  pedidos7d: { total: number; concluidas: number; canceladas: number; sem_resposta: number };
  recusas7d: { motivo: string | null; n: number }[];
  ultimasRecusas: {
    rideId: number;
    quando: string;
    motivo: string | null;
    motorista: string | null;
    volume: string | null;
    destino: string | null;
  }[];
}

export type EstadoLugar = 'novo' | 'aceite' | 'recusado';
export interface LugarProposto {
  id: number;
  nome: string;
  nomeMapa: string | null;
  lat: number;
  lng: number;
  estado: EstadoLugar;
  quando: string;
  quem: string | null;
  tipo: string | null;
  morada: string | null;
  etiquetas: string;
  etiqueta: string | null;
  editar: string;
}

export interface Parada {
  id: number;
  nome: string;
  lat: number;
  lng: number;
  parada_lat: number;
  parada_lng: number;
  raio_m: number;
  created_at: string;
  criada_por: string | null;
}

export interface Retencao {
  eventos: { linhas: number; maisAntigo: string | null; meses: number };
  acessos: { linhas: number; maisAntigo: string | null; meses: number };
  viagens: { linhas: number; meses: null };
}

export interface Saude {
  service: string;
  versao: string;
  desde: string;
  ok?: boolean;
}
