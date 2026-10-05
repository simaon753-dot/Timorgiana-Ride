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
  | 'inspection'
  | 'veiculofrente'
  | 'veiculotras'
  | 'veiculoesquerda'
  | 'veiculodireita';

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
  telefoneConfirmado?: boolean;
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
  // Correção pedida pelo painel, com o motivo (04/10/2026). Nula quando não há.
  correcao?: string | null;
  correcaoEm?: string | null;
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

// UMA OCORRÊNCIA («Reportar» na app), com o retrato da viagem tirado no
// momento da queixa — continua legível mesmo que a viagem seja apagada.
export type EstadoOcorrencia = 'aberta' | 'em_analise' | 'resolvida' | 'arquivada';
export interface PessoaDaOcorrencia {
  id: number;
  nome: string | null;
  telefone: string | null;
}
export interface Ocorrencia {
  id: number;
  rideId: number | null;
  papelAutor: 'passenger' | 'driver';
  autor: string | null;
  autorTelefone: string | null;
  categoria: string;
  grave: boolean;
  descricao: string | null;
  estado: EstadoOcorrencia;
  resposta: string | null;
  notaInterna: string | null;
  viagem: {
    viagem: number;
    estado: string;
    pedidaEm: string;
    iniciadaEm: string | null;
    veiculo: string | null;
    origem: { rotulo: string | null; lat: number | null; lng: number | null };
    destino: { rotulo: string | null; lat: number | null; lng: number | null };
    km: number | null;
    minutos: number | null;
    precoUsd: number | null;
    passageiro: PessoaDaOcorrencia;
    motorista:
      | (PessoaDaOcorrencia & { matricula: string | null; modelo: string | null; cor: string | null })
      | null;
  };
  tratadaPor: string | null;
  tratadaEm: string | null;
  criadaEm: string;
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
    | 'ocorrenciasGraves'
    | 'ocorrencias'
    | 'pagamentosAtrasados'
    | 'pagamentos'
    | 'docsCaducados'
    | 'aprovacoes'
    | 'semResposta'
    | 'docsACaducar'
    | 'canceladas'
    | 'suspensas'
    | 'espaco';
  n: number;
  // Só no `espaco`: a percentagem usada do tecto da base de dados.
  pct?: number;
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
  // O código que o passageiro ou o motorista dita («Booking ID», 30/09/2026).
  referencia: string | null;
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
  referencia: string | null;
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

// O caminho feito, com o GPS do motorista: [lat, lng] por ordem. Antes de
// `recolhaIndice` é a ida à recolha; daí em diante, com o passageiro.
export interface PercursoViagem {
  pontos: [number, number][];
  recolhaIndice: number | null;
}

export interface RespostaViagemDetalhe {
  eventos: EventoViagem[];
  viagem: ViagemDetalhe;
  // Nulo nas viagens anteriores a 27/09/2026 e nas que ninguém conduziu.
  percurso?: PercursoViagem | null;
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
  // Sem taxa de acesso até novo aviso oficial (28/09/2026): nulos até o
  // administrador anunciar o dia em que a cobrança começa.
  inicioCobranca: string | null;
  gratuitoAte: string | null;
  avisoMinimoDias: number;
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

// A TABELA DE DESTINOS DO PICKUP (28/09/2026) — preço fixo entre Díli e cada
// destino, reconhecido por um ponto e um raio.
export interface DestinoCarry {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  raioKm: number;
  precoUsd: number;
  ativo: boolean;
  regra: 'desde_dili' | 'dentro';
}
type Limite = { min: number; max: number };
export interface RespostaDestinosCarry {
  destinos: DestinoCarry[];
  personalizados: boolean;
  padrao: DestinoCarry[];
  limites: { maximo: number; nome: Limite; lat: Limite; lng: Limite; raioKm: Limite; precoUsd: Limite };
  atualizado: { em: string; porNome: string | null } | null;
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
  // Escrever o nosso nome no mapa mesmo onde o Google já tem outro (30/09/2026).
  mostrarSempre?: boolean;
  // `true` o Google já o escreve, `false` não o conhece, `null` por perguntar.
  googleConhece?: boolean | null;
  // O que se escreveu ao escolher o tipo «Outro» (30/09/2026).
  tipoOutro?: string | null;
}

// A árvore administrativa (dados da ONU), e o que as coordenadas dizem dela —
// as mesmas duas respostas que o formulário da app usa (30/09/2026).
export interface SucoArvore {
  id: string;
  nome: string;
}
export interface PostoArvore {
  id: string;
  nome: string;
  sucos: SucoArvore[];
}
export interface MunicipioArvore {
  id: string;
  nome: string;
  postos: PostoArvore[];
}
export interface MoradaDoPonto {
  municipio: { id: string; nome: string } | null;
  posto: { id: string; nome: string } | null;
  sucos: SucoArvore[];
  sugestaoAldeia: string | null;
  aldeias: { suco: string; aldeia: string; vezes: number }[];
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
