// SERVIDOR DE DEMONSTRAÇÃO do painel — só para desenvolvimento, neste computador.
//
// Responde às mesmas rotas que backend/src/routes/admin.js, com DADOS
// FICTÍCIOS guardados em memória: aprovar, recusar ou confirmar um pagamento
// muda o estado até se reiniciar o servidor. NÃO liga a base de dados nenhuma
// — e é esse o ponto: ver e testar o painel sem tocar em dados de pessoas.
//
//   npm run demo          → http://localhost:4790/painel  (a versão compilada)
//   npm run dev           → http://localhost:5180/painel  (com recarregamento)
//
// Qualquer telefone e palavra-passe entram.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// A tabela de destinos do Pickup é a do próprio servidor (só contas, sem base de dados).
import { DESTINOS_PADRAO, LIMITES_DESTINOS, validarDestinos } from '../../backend/src/destinosCarry.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const COMPILADO = path.join(RAIZ, 'backend/publico/painel');
const PORTA = Number(process.env.PORTA) || 4790;

const IMAGENS = [
  'mobile/assets/ilustracoes/passageiro@3x.png',
  'mobile/assets/ilustracoes/inicio@3x.png',
  'mobile/assets/ilustracoes/viagens@3x.png',
  'mobile/assets/ilustracoes/rendimento@3x.png',
].map((p) => path.join(RAIZ, p));

// Números "aleatórios" mas sempre os mesmos, para a demonstração não mudar a
// cada arranque.
let semente = 7;
const acaso = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
const inteiro = (a, b) => a + Math.floor(acaso() * (b - a + 1));

const agora = Date.now();
const ha = (horas) => new Date(agora - horas * 3600_000).toISOString();
const dia = (n) => new Date(agora + n * 86400_000).toISOString().slice(0, 10);

const NOMES = [
  'Motorista Exemplo A', 'Motorista Exemplo B', 'Motorista Exemplo C', 'Motorista Exemplo D',
  'Motorista Exemplo E', 'Motorista Exemplo F', 'Motorista Exemplo G', 'Motorista Exemplo H',
];
const MODELOS = { motorbike: 'Honda Vario 125', car: 'Toyota Avanza', carry: 'Suzuki Carry' };

let idDoc = 100;
const doc = (kind, dias, extra = {}) => ({
  id: idDoc++, kind, mime: 'image/png', expiresOn: dias == null ? null : dia(dias),
  expirado: dias != null && dias < 0, motivo: null, porRever: false, correcao: null, correcaoEm: null, ...extra,
});
const seis = (validades = {}) => [
  doc('photo'), doc('identity'), doc('licence', validades.licence ?? 900), doc('cartaverso'),
  doc('vehicle', validades.vehicle ?? 600), doc('inspection', validades.inspection ?? 200),
];

// As quatro fotografias do veículo (04/10/2026).
const quatroFotos = () => ['veiculofrente', 'veiculotras', 'veiculoesquerda', 'veiculodireita'].map((k) => doc(k));

const motoristas = [
  { estado: 'pending', tipo: 'motorbike', docs: [...seis({ inspection: 18 }), ...quatroFotos()], cor: 'Preta', h: 3, online: true },
  { estado: 'pending', tipo: 'car', docs: seis().filter((d) => d.kind !== 'inspection'), cor: '', h: 26 },
  { estado: 'pending', tipo: 'carry', docs: seis({ inspection: 1100 }).map((d) => (d.kind === 'licence' ? { ...d, correcao: 'A fotografia não se lê — tire outra com mais luz e sem tremer.', correcaoEm: ha(5) } : d)), cor: 'Branca', h: 50 },
  { estado: 'approved', tipo: 'car', docs: [...seis(), ...quatroFotos()], cor: 'Prateada', h: 400, online: true, viagens: 42 },
  { estado: 'approved', tipo: 'motorbike', docs: seis({ licence: -10 }), cor: 'Vermelha', h: 900, viagens: 118 },
  { estado: 'approved', tipo: 'carry', docs: seis().map((d) => (d.kind === 'inspection' ? { ...d, porRever: true, motivo: 'caducado' } : d)), cor: 'Azul', h: 700, viagens: 23 },
  { estado: 'rejected', tipo: 'car', docs: seis(), cor: 'Branca', h: 240, motivo: 'Os documentos não se leem — envie fotografias mais nítidas.' },
  { estado: 'suspended', tipo: 'motorbike', docs: seis(), cor: 'Preta', h: 1500, motivo: 'Queixa de um passageiro em análise.', viagens: 64 },
].map((m, i) => ({
  id: i + 1,
  name: NOMES[i],
  phone: `7700000${i + 1}`,
  email: `motorista${i + 1}@example.com`,
  emailConfirmado: i % 3 !== 1,
  role: 'driver',
  ratingAvg: m.viagens ? 4.6 : null,
  ratingCount: m.viagens ? Math.round(m.viagens * 0.6) : 0,
  createdAt: ha(m.h),
  driverStatus: m.estado,
  podeConduzir: m.estado === 'approved',
  ...(m.motivo ? { driverStatusMotivo: m.motivo } : {}),
  vehicle: {
    type: m.tipo, model: MODELOS[m.tipo], plate: `DEMO ${String(i + 1).padStart(3, '0')}`, color: m.cor,
    seats: m.tipo === 'car' ? 6 : null, carroceria: m.tipo === 'carry' ? 'aberta' : null,
    capacidade: m.tipo === 'carry' ? 'media' : null, ano: m.tipo === 'carry' ? 2019 : null,
  },
  documents: m.docs,
  online: !!m.online,
  viagens: m.viagens || 0,
  cancelou: m.viagens ? inteiro(0, 4) : 0,
  fotoHoje: !!m.online,
  validadeMin: null,
  ultimaVez: m.online ? ha(0.05) : ha(inteiro(5, 200)),
}));

const passageiros = [1, 2, 3, 4, 5].map((n) => ({
  id: 20 + n, nome: `Passageiro Exemplo ${n}`, telefone: `7710000${n}`, email: n % 2 ? `passageiro${n}@example.com` : null,
  driverStatus: null, isAdmin: false, online: n === 1, estrelas: 4.8, avaliacoes: n * 2, desde: ha(n * 300),
  ultimaVez: ha(n * 5), veiculo: null, viagensPassageiro: n * 3, viagensMotorista: 0,
}));
const admin = {
  id: 99, nome: 'Administrador (demonstração)', telefone: '77009999', email: 'admin@example.com', driverStatus: null,
  isAdmin: true, online: true, estrelas: null, avaliacoes: 0, desde: ha(3000), ultimaVez: ha(0), veiculo: null,
  viagensPassageiro: 0, viagensMotorista: 0,
};

const LUGARES_DILI = [
  'Aeroporto Presidente Nicolau Lobato', 'Cristo Rei', 'Mercado de Taibessi', 'Palácio do Governo', 'Colmera',
  'Bairro Pité', 'Comoro', 'Becora', 'Farol', 'Kampung Alor', 'Hospital Nacional Guido Valadares', 'Timor Plaza',
];
const ESTADOS_V = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'in_progress', 'requested', 'accepted'];
const viagens = Array.from({ length: 28 }).map((_, i) => {
  const estado = ESTADOS_V[i % ESTADOS_V.length];
  const m = motoristas[[3, 4, 5, 7][i % 4]];
  const semMotorista = estado === 'requested' || (estado === 'cancelled' && i % 2 === 0);
  const veiculo = m.vehicle.type;
  const km = Math.round((2 + acaso() * 12) * 10) / 10;
  return {
    id: 1060 - i,
    referencia: `TR-${'7K3Q9M4HV2JRXCPW'.slice(i % 10, (i % 10) + 6)}`,
    estado,
    origem: LUGARES_DILI[i % LUGARES_DILI.length],
    destino: LUGARES_DILI[(i + 5) % LUGARES_DILI.length],
    preco: Math.round((1.5 + km * 0.5) * 100) / 100,
    km,
    min: Math.round(km * 3),
    pessoas: 1,
    motivoCancelamento: estado === 'cancelled' ? (semMotorista ? 'sem_motorista' : 'motorista_demora') : null,
    canceladoPeloPassageiro: estado === 'cancelled' ? true : null,
    veiculo,
    paragens: i % 7 === 0 ? ['Colmera'] : [],
    // Uma viagem em cada sete é uma encomenda, para o detalhe ter o que
    // mostrar. As que já terminaram têm talão; as outras ainda não compraram.
    jastip:
      i % 7 === 3
        ? {
            lista: '2 × Arroz (Bola Mas, 5 kg)\n1 × Óleo (1 litro)\n3 × Pão',
            itens: [
              { nome: 'Arroz', quantos: 2, detalhe: 'Bola Mas, 5 kg' },
              { nome: 'Óleo', quantos: 1, detalhe: '1 litro' },
              { nome: 'Pão', quantos: 3 },
            ],
            loja: 'Kmanek de Comoro',
            teto: 25,
            taxa: 1.5,
            compras: estado === 'completed' ? 18.4 : null,
            compradoEm: estado === 'completed' ? ha(i * 2.7) : null,
            total: estado === 'completed' ? Math.round((1.5 + km * 0.5 + 18.4) * 100) / 100 : null,
            fotos: estado === 'completed' ? 1 : 0,
          }
        : null,
    carga: veiculo === 'carry' && i % 2 === 1
      ? { tipo: 'moveis', tipos: ['moveis'], volume: 'grande', ajuda: 'ambas', notas: 'Um armário e duas cadeiras.', outro: null, fotos: 2 }
      : null,
    passageiro: passageiros[i % passageiros.length].nome,
    telPassageiro: passageiros[i % passageiros.length].telefone,
    motorista: semMotorista ? null : m.name,
    telMotorista: semMotorista ? null : m.phone,
    quando: ha(i * 2.7 + 0.3),
  };
});

// OCORRÊNCIAS FICTÍCIAS (27/09/2026) — nomes e números inventados.
const viagemDemo = (id, horas, extra = {}) => ({
  viagem: id, estado: 'completed', pedidaEm: new Date(agora - horas * 3600_000).toISOString(), iniciadaEm: null,
  veiculo: 'car', origem: { rotulo: 'Mercado de Taibessi', lat: -8.574, lng: 125.596 },
  destino: { rotulo: 'Aeroporto Nicolau Lobato', lat: -8.547, lng: 125.525 }, km: 9.4, minutos: 24, precoUsd: 4.5,
  passageiro: { id: 901, nome: 'Passageiro Exemplo', telefone: '77000001' },
  motorista: { id: 902, nome: 'Motorista Exemplo', telefone: '77000002', matricula: '00-000 TL', modelo: 'Toyota Avanza', cor: 'Prata' },
  ...extra,
});
// O fim do período gratuito, anunciado no painel (28/09/2026). Nulo = sem taxa até novo aviso.
let inicioCobranca = null;
let destinosDemo = null;
let ocorrencias = [
  { id: 3, rideId: 1204, papelAutor: 'passenger', autor: 'Passageiro Exemplo', autorTelefone: '77000001', categoria: 'conducaoPerigosa', grave: true,
    descricao: 'Ia muito depressa na avenida de Comoro e passou dois semáforos vermelhos.', estado: 'aberta', resposta: null, notaInterna: null,
    viagem: viagemDemo(1204, 3), tratadaPor: null, tratadaEm: null, criadaEm: new Date(agora - 2 * 3600_000).toISOString() },
  { id: 2, rideId: 1198, papelAutor: 'passenger', autor: 'Outra Passageira', autorTelefone: '77000003', categoria: 'objetoPerdido', grave: false,
    descricao: 'Esqueci um guarda-chuva azul no banco de trás.', estado: 'em_analise', resposta: null, notaInterna: 'Liguei ao motorista; vai procurar.',
    viagem: viagemDemo(1198, 26), tratadaPor: 'Administrador (demonstração)', tratadaEm: new Date(agora - 20 * 3600_000).toISOString(), criadaEm: new Date(agora - 25 * 3600_000).toISOString() },
  { id: 1, rideId: 1150, papelAutor: 'driver', autor: 'Motorista Exemplo', autorTelefone: '77000002', categoria: 'naoPagou', grave: false,
    descricao: null, estado: 'resolvida', resposta: 'Falámos com o passageiro e o valor foi pago.', notaInterna: null,
    viagem: viagemDemo(1150, 80), tratadaPor: 'Administrador (demonstração)', tratadaEm: new Date(agora - 50 * 3600_000).toISOString(), criadaEm: new Date(agora - 78 * 3600_000).toISOString() },
];

let sos = [
  { id: 1, rideId: 1055, quem: 'Passageiro Exemplo 2', tipo: 'medica', telefone: '77100002', papel: 'passenger',
    destino: 'Hospital Nacional Guido Valadares', estadoViagem: 'in_progress', lat: -8.5569, lng: 125.5603,
    nota: null, quando: ha(0.2) },
];

let pedidos = [
  { id: 501, userId: 4, nome: NOMES[3], telefone: '77000004', tipo: 'car', dias: 30, valorUsd: 30, metodo: 'bnu', referencia: 'TR0004', temComprovativo: true, estado: 'pendente', motivo: null, quando: ha(3), decididoEm: null, decididoPor: null, horas: 3 },
  { id: 502, userId: 5, nome: NOMES[4], telefone: '77000005', tipo: 'motorbike', dias: 10, valorUsd: 6, metodo: 'tuqr', referencia: 'TR0005', temComprovativo: true, estado: 'pendente', motivo: null, quando: ha(30), decididoEm: null, decididoPor: null, horas: 30 },
  { id: 490, userId: 6, nome: NOMES[5], telefone: '77000006', tipo: 'carry', dias: 30, valorUsd: 30, metodo: 'mandiri', referencia: 'TR0006', temComprovativo: true, estado: 'confirmado', motivo: null, quando: ha(80), decididoEm: ha(70), decididoPor: 'Administrador (demonstração)', horas: 80 },
  { id: 489, userId: 8, nome: NOMES[7], telefone: '77000008', tipo: 'motorbike', dias: 3, valorUsd: 2, metodo: 'telemor', referencia: 'TR0008', temComprovativo: true, estado: 'recusado', motivo: 'Valor diferente do pacote', quando: ha(120), decididoEm: ha(110), decididoPor: 'Administrador (demonstração)', horas: 120 },
];

let formas = ['tuqr', 'mandiri', 'bnu', 'bnctl', 'bri', 'telemor', 'escritorio', 'agente'].map((id, i) => ({
  id, ativo: i < 3 || id === 'escritorio', instrucoes: i < 3 || id === 'escritorio' ? `Instruções fictícias para ${id}.` : '',
  comPedido: id !== 'escritorio', ...(id === 'tuqr' ? { temQr: true } : {}),
}));

const PACOTES = {
  car: [{ dias: 3, usd: 4 }, { dias: 10, usd: 12 }, { dias: 30, usd: 30 }],
  motorbike: [{ dias: 3, usd: 2 }, { dias: 10, usd: 6 }, { dias: 30, usd: 15 }],
  carry: [{ dias: 3, usd: 4 }, { dias: 10, usd: 12 }, { dias: 30, usd: 30 }],
};

let paradas = [
  { id: 1, nome: 'Cristo Rei', lat: -8.51956, lng: 125.60763, parada_lat: -8.5221, parada_lng: 125.6105, raio_m: 150, created_at: ha(500), criada_por: 'Administrador (demonstração)' },
  { id: 2, nome: 'Aeroporto Presidente Nicolau Lobato', lat: -8.54694, lng: 125.52472, parada_lat: -8.5462, parada_lng: 125.5261, raio_m: 250, created_at: ha(300), criada_por: 'Administrador (demonstração)' },
];
let idParada = 3;

let lugares = [
  ['Loja Exemplo de Becora', 'shop', 'novo', 'Becora', 'Cristo Rei', 'Díli'],
  ['Escola Exemplo de Comoro', 'school', 'novo', 'Comoro', 'Dom Aleixo', 'Díli'],
  ['Igreja Exemplo de Farol', 'place_of_worship', 'aceite', 'Motael', 'Vera Cruz', 'Díli'],
  ['Restaurante Exemplo', 'restaurant', 'recusado', 'Colmera', 'Vera Cruz', 'Díli'],
].map(([nome, tipo, estado, suco, posto, municipio], i) => ({
  id: i + 1, nome, nomeMapa: null, lat: -8.55 - i * 0.004, lng: 125.57 + i * 0.01, estado, quando: ha(10 + i * 30),
  quem: passageiros[i].nome, tipo, morada: [suco, posto, municipio].join(', '),
  etiquetas: `name=${nome}\n${tipo === 'shop' ? 'shop=yes' : `amenity=${tipo}`}\naddr:suburb=${suco}`,
  etiqueta: tipo === 'shop' ? 'shop=yes' : `amenity=${tipo}`,
  editar: `https://www.openstreetmap.org/edit#map=19/${(-8.55 - i * 0.004).toFixed(5)}/${(125.57 + i * 0.01).toFixed(5)}`,
}));

// Um bocado da árvore administrativa, para o formulário de baptizar.
const ARVORE_DEMO = [
  {
    id: 'TL07', nome: 'Díli', postos: [
      { id: 'TL0701', nome: 'Vera Cruz', sucos: [{ id: 'TL070101', nome: 'Caicoli' }, { id: 'TL070102', nome: 'Colmera' }, { id: 'TL070103', nome: 'Motael' }] },
      { id: 'TL0702', nome: 'Dom Aleixo', sucos: [{ id: 'TL070201', nome: 'Comoro' }, { id: 'TL070202', nome: 'Bairro Pite' }] },
    ],
  },
  { id: 'TL02', nome: 'Aileu', postos: [{ id: 'TL0201', nome: 'Aileu Vila', sucos: [{ id: 'TL020101', nome: 'Aisirimou' }] }] },
];

// Na demonstração há um serviço por acabar, para se ver que não se liga.
const servicos = [
  { id: 'motorbike', familia: 'viagem', emConstrucao: false, ativo: true, atualizado: null },
  { id: 'car', familia: 'viagem', emConstrucao: false, ativo: true, atualizado: null },
  { id: 'carry', familia: 'entrega', emConstrucao: false, ativo: true, atualizado: { em: ha(300), por: 99 } },
  // Só na demonstração: serve para ver o estado "em construção" — o
  // interruptor fica bloqueado e o servidor recusa ligá-lo.
  { id: 'jastip', familia: 'encomenda', emConstrucao: true, ativo: false, atualizado: null },
];

// As regras da encomenda, iguais às de fábrica do servidor a sério.
const JASTIP_PADRAO = {
  tetoUsd: 25,
  viagensMinimas: 3,
  exigeEmailConfirmado: true,
  escaloes: [
    { ate: 10, taxa: 1 },
    { ate: 25, taxa: 1.5 },
  ],
};
const LIMITES_JASTIP = {
  tetoUsd: { min: 1, max: 100 },
  viagensMinimas: { min: 0, max: 20 },
  taxa: { min: 0, max: 10 },
};
let jastip = JSON.parse(JSON.stringify(JASTIP_PADRAO));

const carry = {
  ativo: true,
  tarifa: { base: 3, porKm: 0.6, porMinuto: 0.05, minimo: 5, minimoPessoas: 8, porParagem: 1, 'volume.pequeno': 1, 'volume.medio': 1.3, 'volume.grande': 1.7, 'ajuda.carregar': 3, 'ajuda.descarregar': 3, 'ajuda.ambas': 5 },
};
const PADRAO_CARRY = { ...carry.tarifa };
const CAMPOS_CARRY = [
  ['base', 0, 20], ['porKm', 0, 5], ['porMinuto', 0, 1], ['minimo', 0, 50], ['minimoPessoas', 0, 100], ['porParagem', 0, 20],
  ['volume.pequeno', 1, 5], ['volume.medio', 1, 5], ['volume.grande', 1, 5], ['ajuda.carregar', 0, 50], ['ajuda.descarregar', 0, 50], ['ajuda.ambas', 0, 50],
].map(([chave, min, max]) => ({ chave, min, max }));

const EU = { id: 99, name: 'Administrador (demonstração)', phone: '77009999', email: 'admin@example.com', emailConfirmado: true, role: 'passenger', ratingAvg: null, ratingCount: 0, createdAt: ha(3000), driverStatus: null, podeConduzir: false, isAdmin: true };

// ─────────────────────────────────────────────────────────────────────────

const json = (res, corpo, estado = 200) => {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
};
// O ficheiro lê-se ANTES de começar a resposta: se falhar a meio, o erro
// ainda pode ir como resposta, em vez de derrubar o servidor (30/09/2026).
const imagem = (res, n) => {
  const dados = fs.readFileSync(IMAGENS[Math.abs(n) % IMAGENS.length]);
  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.end(dados);
};
const corpoDe = (req) =>
  new Promise((ok) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        ok(b ? JSON.parse(b) : {});
      } catch {
        ok({});
      }
    });
  });

const contagens = () => {
  const c = { todos: 0 };
  for (const m of motoristas) {
    c[m.driverStatus] = (c[m.driverStatus] || 0) + 1;
    c.todos++;
  }
  return c;
};

function notificacoes() {
  const n = {
    sos: sos.length,
    ocorrenciasGraves: ocorrencias.filter((o) => o.grave && ['aberta', 'em_analise'].includes(o.estado)).length,
    ocorrencias: ocorrencias.filter((o) => !o.grave && ['aberta', 'em_analise'].includes(o.estado)).length,
    pagamentosAtrasados: pedidos.filter((p) => p.estado === 'pendente' && p.horas >= 24).length,
    pagamentos: pedidos.filter((p) => p.estado === 'pendente' && p.horas < 24).length,
    docsCaducados: motoristas.filter((m) => m.documents.some((d) => d.expirado)).length,
    aprovacoes: motoristas.filter((m) => m.driverStatus === 'pending').length,
    semResposta: viagens.filter((v) => v.estado === 'requested').length,
    docsACaducar: 1,
    canceladas: viagens.filter((v) => v.estado === 'cancelled' && v.motorista).length,
    suspensas: motoristas.filter((m) => m.driverStatus === 'suspended').length,
  };
  const niveis = { sos: 'mau', ocorrenciasGraves: 'mau', ocorrencias: 'aviso', pagamentosAtrasados: 'mau', pagamentos: 'aviso', docsCaducados: 'mau', aprovacoes: 'aviso', semResposta: 'aviso', docsACaducar: 'aviso', canceladas: 'neutro', suspensas: 'neutro' };
  const itens = Object.entries(n).filter(([, v]) => v > 0).map(([chave, v]) => ({ chave, n: v, nivel: niveis[chave], seccao: '' }));
  // A base a 74% do espaço, para se ver o aviso (05/10/2026).
  itens.unshift({ chave: 'espaco', n: 1, pct: 74, nivel: 'aviso', seccao: 'definicoes' });
  return { itens, porTratar: itens.filter((i) => i.nivel !== 'neutro').reduce((s, i) => s + i.n, 0) };
}

function porDia(dias) {
  const r = [];
  for (let i = dias - 1; i >= 0; i--) {
    const pedidosDia = inteiro(8, 40);
    const canceladas = inteiro(0, Math.round(pedidosDia * 0.15));
    const semMotorista = inteiro(0, Math.round(pedidosDia * 0.1));
    r.push({
      dia: dia(-i), pedidos: pedidosDia, concluidas: pedidosDia - canceladas - semMotorista, canceladas, semMotorista,
      motoristas: inteiro(3, 9), passageiros: inteiro(6, 30),
    });
  }
  return r;
}

async function api(req, res, url) {
  const p = url.pathname.replace(/^\/api/, '');
  const m = (re) => re.exec(p);
  let x;

  if (p === '/health') return json(res, { service: 'TimorgianaRide', versao: 'demo', desde: ha(1), ok: true });
  // O SEGUNDO PASSO, como no servidor (28/09/2026). Na demonstração não se
  // manda email nenhum: qualquer código de 6 algarismos serve.
  if (p === '/auth/login') return json(res, { passo: 'codigo', desafio: 1, para: 'a•••••o@exemplo.tl' });
  if (p === '/auth/login/codigo') {
    const b = await corpoDe(req);
    if (!/^\d{6}$/.test(String(b.codigo || ''))) return json(res, { error: 'Código errado ou expirado. Peça outro, entrando de novo.' }, 401);
    return json(res, { token: 'demo', user: EU });
  }
  if (p === '/auth/sair') return json(res, { ok: true });
  if (p === '/auth/me') return json(res, { user: EU });

  if (p === '/admin/drivers') {
    const s = url.searchParams.get('status') || 'pending';
    return json(res, { contagens: contagens(), drivers: motoristas.filter((d) => s === 'todos' || d.driverStatus === s) });
  }
  if ((x = m(/^\/admin\/drivers\/(\d+)\/decision$/))) {
    const { decision, motivo } = await corpoDe(req);
    const d = motoristas.find((o) => o.id === Number(x[1]));
    if (!d) return json(res, { error: 'Motorista não encontrado.' }, 404);
    if (decision !== 'approved' && !String(motivo || '').trim()) return json(res, { error: 'Indica o motivo da decisão.' }, 400);
    d.driverStatus = decision;
    d.podeConduzir = decision === 'approved';
    if (motivo) d.driverStatusMotivo = motivo;
    else delete d.driverStatusMotivo;
    return json(res, { driver: d });
  }
  if ((x = m(/^\/admin\/documents\/(\d+)\/correcao$/))) {
    const { motivo } = req.method === 'POST' ? await corpoDe(req) : {};
    if (req.method === 'POST' && String(motivo || '').trim().length < 3) {
      return json(res, { error: 'Indique o motivo: o motorista precisa de saber o que corrigir.' }, 400);
    }
    for (const d of motoristas) for (const o of d.documents) if (o.id === Number(x[1])) {
      o.correcao = req.method === 'POST' ? String(motivo).trim() : null;
      o.correcaoEm = req.method === 'POST' ? new Date().toISOString() : null;
    }
    return json(res, { ok: true });
  }
  if ((x = m(/^\/admin\/documents\/(\d+)\/revisto$/))) {
    for (const d of motoristas) for (const o of d.documents) if (o.id === Number(x[1])) o.porRever = false;
    return json(res, { ok: true });
  }
  if ((x = m(/^\/admin\/documents\/(\d+)$/))) return imagem(res, Number(x[1]));
  if ((x = m(/^\/admin\/viagens\/(\d+)\/foto\/(\d+)$/))) return imagem(res, Number(x[2]) + 1);
  if ((x = m(/^\/admin\/pagamentos\/(\d+)\/comprovativo$/))) return imagem(res, Number(x[1]));

  if (p === '/admin/resumo') {
    return json(res, {
      resumo: {
        pendentes: contagens().pending || 0, aprovados: contagens().approved || 0, disponiveis: 2, passageiros: passageiros.length,
        sos: sos.length, viagens24h: viagens.filter((v) => Date.parse(v.quando) > agora - 86400_000).length,
        concluidas: viagens.filter((v) => v.estado === 'completed').length, esperando: viagens.filter((v) => v.estado === 'requested').length,
        veiculosServico: viagens.filter((v) => ['accepted', 'arriving', 'in_progress'].includes(v.estado)).length,
        canceladas24h: 1, semMotorista24h: 2, tarifas24h: 41.5, carryMotoristas: 1, carry24h: 3,
      },
    });
  }
  if (p === '/admin/notificacoes') return json(res, notificacoes());
  if (p === '/admin/espaco')
    return json(res, {
      base: { usadoMb: 14.5, limiteMb: 512, pct: 3, maiores: [{ tabela: 'driver_documents', mb: 2.3 }, { tabela: 'driver_shifts', mb: 1.4 }, { tabela: 'rides', mb: 0.2 }] },
      servidor: { memoriaMb: 142.3, limiteMb: 512, pct: 28, ligadoDesde: new Date(Date.now() - 3 * 3600e3).toISOString() },
    });
  if (p === '/admin/sos') return json(res, { alertas: sos });
  if (p === '/admin/ocorrencias') {
    const todas = url.searchParams.get('filtro') === 'todas';
    return json(res, { ocorrencias: ocorrencias.filter((o) => todas || ['aberta', 'em_analise'].includes(o.estado)) });
  }
  if ((x = m(/^\/admin\/ocorrencias\/(\d+)$/)) && req.method === 'POST') {
    const b = await corpoDe(req);
    ocorrencias = ocorrencias.map((o) =>
      o.id === Number(x[1])
        ? { ...o, estado: b.estado, resposta: b.resposta || o.resposta, notaInterna: b.notaInterna || o.notaInterna,
            tratadaPor: 'Administrador (demonstração)', tratadaEm: new Date().toISOString() }
        : o
    );
    return json(res, { ok: true });
  }
  if ((x = m(/^\/admin\/sos\/(\d+)\/resolver$/))) {
    sos = sos.filter((a) => a.id !== Number(x[1]));
    return json(res, { ok: true });
  }

  if (p === '/admin/viagens') {
    const horas = Number(url.searchParams.get('horas')) || 24;
    const veiculo = url.searchParams.get('veiculo') || 'todos';
    return json(res, {
      viagens: viagens.filter((v) => Date.parse(v.quando) > agora - horas * 3600_000 && (veiculo === 'todos' || v.veiculo === veiculo)),
    });
  }
  if ((x = m(/^\/admin\/viagens\/codigo\/([^/]+)$/))) {
    const cod = decodeURIComponent(x[1]).toUpperCase().replace(/[\s-]/g, '').replace(/^TR/, '');
    const v = viagens.find((o) => o.referencia === `TR-${cod}`);
    if (!v) return json(res, { error: 'Viagem não encontrada.' }, 404);
    return json(res, { id: v.id, referencia: v.referencia });
  }
  if ((x = m(/^\/admin\/viagens\/(\d+)$/))) {
    const v = viagens.find((o) => o.id === Number(x[1]));
    if (!v) return json(res, { error: 'Viagem não encontrada.' }, 404);
    const mot = motoristas.find((o) => o.name === v.motorista);
    const t0 = Date.parse(v.quando);
    const em = (min) => new Date(t0 + min * 60_000).toISOString();
    const eventos = [{ que: 'pedida', quando: em(0), quem: v.passageiro }];
    if (v.motorista) eventos.push({ que: 'aceite', quando: em(1.5), quem: v.motorista }, { que: 'a_caminho', quando: em(2), quem: v.motorista });
    if (['in_progress', 'completed'].includes(v.estado)) eventos.push({ que: 'comecou', quando: em(9), quem: v.motorista });
    if (v.estado === 'completed') eventos.push({ que: 'terminou', quando: em(9 + v.min), quem: v.motorista, preco: v.preco });
    if (v.estado === 'cancelled') eventos.push({ que: 'cancelada', quando: em(6), quem: v.passageiro, detalhe: { motivo: v.motivoCancelamento } });
    // UM PERCURSO FICTÍCIO nas concluídas: a ida à recolha e a viagem, por
    // pontos inventados ao longo de Díli (não é o GPS de ninguém).
    const percurso = v.estado === 'completed'
      ? {
          pontos: [
            [-8.5602, 125.5701], [-8.5580, 125.5729], [-8.5561, 125.5755], [-8.5536, 125.5783],
            [-8.5521, 125.5820], [-8.5490, 125.5861], [-8.5462, 125.5905], [-8.5408, 125.5942],
            [-8.5350, 125.5980], [-8.5289, 125.6021], [-8.5240, 125.6050], [-8.5196, 125.6076],
          ],
          recolhaIndice: 3,
        }
      : null;
    return json(res, {
      percurso,
      eventos: eventos.map((e) => ({ quemId: null, de: null, para: null, onde: null, preco: null, detalhe: null, ...e })),
      viagem: {
        id: v.id, referencia: v.referencia, estado: v.estado,
        origem: { nome: v.origem, lat: -8.5536, lng: 125.5783 }, destino: { nome: v.destino, lat: -8.5196, lng: 125.6076 },
        preco: v.preco, km: v.km, min: v.min, veiculo: v.veiculo, pessoas: 1,
        paragens: v.paragens.map((n) => ({ nome: n, lat: -8.5580, lng: 125.5790 })),
        carga: v.carga ? { ...v.carga, declaradoEm: v.quando } : null,
        jastip: v.jastip,
        codigoRecolha: ['requested', 'accepted', 'arriving'].includes(v.estado) ? '4821' : null,
        pedida: v.quando, comecou: ['in_progress', 'completed'].includes(v.estado) ? em(9) : null, actualizada: em(9 + v.min),
        cancelamento: v.estado === 'cancelled' && v.motorista ? { por: v.passageiro, motivo: v.motivoCancelamento, quem: 'passageiro' } : null,
        passageiro: { id: 21, nome: v.passageiro, telefone: v.telPassageiro, estrelas: 4.8 },
        motorista: mot ? { id: mot.id, nome: mot.name, telefone: mot.phone, estrelas: 4.6, veiculo: { tipo: mot.vehicle.type, modelo: mot.vehicle.model, matricula: mot.vehicle.plate, cor: mot.vehicle.color } } : null,
        nMensagens: 2,
        avaliacoes: v.estado === 'completed' ? [{ estrelas: 5, de: v.passageiro, para: v.motorista, quando: em(10 + v.min) }] : [],
      },
    });
  }

  if (p === '/admin/utilizadores') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const papel = url.searchParams.get('papel') || 'todos';
    const linhasMot = motoristas.map((d) => ({
      id: d.id, nome: d.name, telefone: d.phone, email: d.email, driverStatus: d.driverStatus, isAdmin: false, online: d.online,
      estrelas: d.ratingAvg, avaliacoes: d.ratingCount, desde: d.createdAt, ultimaVez: d.ultimaVez,
      veiculo: { tipo: d.vehicle.type, matricula: d.vehicle.plate }, viagensPassageiro: 0, viagensMotorista: d.viagens,
    }));
    let todas = [admin, ...linhasMot, ...passageiros];
    if (q) todas = todas.filter((u) => u.nome.toLowerCase().includes(q) || u.telefone.includes(q));
    if (papel === 'motoristas') todas = todas.filter((u) => u.driverStatus);
    if (papel === 'passageiros') todas = todas.filter((u) => !u.driverStatus);
    if (papel === 'admins') todas = todas.filter((u) => u.isAdmin);
    if (papel === 'suspensas') todas = todas.filter((u) => u.driverStatus === 'suspended');
    return json(res, { utilizadores: todas, haMais: false, pagina: 0 });
  }
  if ((x = m(/^\/admin\/utilizadores\/(\d+)\/recuperacao$/))) {
    return json(res, { codigo: '000000', minutos: 30, nome: 'Conta de demonstração' });
  }
  if ((x = m(/^\/admin\/utilizadores\/(\d+)$/))) {
    const id = Number(x[1]);
    const d = motoristas.find((o) => o.id === id);
    const pa = passageiros.find((o) => o.id === id) || (id === 99 ? admin : null);
    if (!d && !pa) return json(res, { error: 'Conta não encontrada.' }, 404);
    const base = d || {
      id: pa.id, name: pa.nome, phone: pa.telefone, email: pa.email, emailConfirmado: !!pa.email, role: 'passenger',
      ratingAvg: pa.estrelas, ratingCount: pa.avaliacoes, createdAt: pa.desde, driverStatus: null, podeConduzir: false, ...(pa.isAdmin ? { isAdmin: true } : {}),
    };
    return json(res, {
      conta: {
        ...base, desde: base.createdAt, ultimaVez: d ? d.ultimaVez : pa.ultimaVez, online: d ? d.online : pa.online,
        ultimaPosicao: { lat: -8.5569, lng: 125.5603 },
        termos: { passageiro: { versao: '2026-09-15', quando: base.createdAt }, motorista: d ? { versao: '2026-09-15', quando: base.createdAt } : null },
        cidadaoTL: d ? { declarou: true, quando: base.createdAt } : null,
        decisao: d?.driverStatusMotivo ? { motivo: d.driverStatusMotivo, quando: ha(20), por: 99 } : null,
        dias: d ? 12 : 0, pacotes: PACOTES[d?.vehicle.type || 'car'], formasPagamento: formas.map((f) => f.id), referencia: `TR${String(id).padStart(4, '0')}`,
      },
      documentos: (d?.documents || []).map((o) => ({ id: o.id, tipo: o.kind, tamanho: 900000, quando: base.createdAt, validade: o.expiresOn, caducado: o.expirado, motivo: o.motivo, porRever: o.porRever })),
      viagens: viagens.filter((v) => v.motorista === base.name || v.passageiro === base.name).slice(0, 8).map((v) => ({
        id: v.id, estado: v.estado, origem: v.origem, destino: v.destino, preco: v.preco, km: v.km, quando: v.quando, papel: d ? 'motorista' : 'passageiro',
      })),
      avaliacoes: d?.viagens ? [{ estrelas: 5, de: 'Passageiro Exemplo 1', viagem: 1057, quando: ha(12) }, { estrelas: 4, de: 'Passageiro Exemplo 3', viagem: 1049, quando: ha(40) }] : [],
      turnos: d?.online ? [{ id: 1, dia: dia(0), quando: ha(4) }] : [],
      emergencias: [],
    });
  }
  if (p === '/admin/registo') {
    return json(res, {
      acessos: motoristas.slice(0, 5).map((d, i) => ({
        id: `documento:${d.id}`, que: i === 4 ? 'código de recuperação' : 'documento', alvo: d.id, alvoNome: d.name, alvoApagado: false,
        vezes: 1 + (i % 3), admins: ['Administrador (demonstração)'], quando: ha(i * 5 + 1), quandos: [ha(i * 5 + 1)],
      })),
    });
  }

  if (p === '/admin/pagamentos') {
    return json(res, {
      pendentes: pedidos.filter((o) => o.estado === 'pendente'),
      decididos: pedidos.filter((o) => o.estado !== 'pendente'),
      formas, prazoHoras: 24,
    });
  }
  if (p === '/admin/carry/destinos') {
    if (req.method === 'PUT') {
      const b = await corpoDe(req);
      if (b.destinos == null) destinosDemo = null;
      else {
        const v = validarDestinos(b.destinos);
        if (v.erro) return json(res, { error: v.erro }, 400);
        destinosDemo = v.limpos;
      }
    }
    const lista = (destinosDemo || DESTINOS_PADRAO).map((d) => ({ regra: 'desde_dili', ...d }));
    return json(res, {
      destinos: lista, personalizados: !!destinosDemo, padrao: DESTINOS_PADRAO, limites: LIMITES_DESTINOS,
      atualizado: destinosDemo ? { em: new Date().toISOString(), porNome: 'Administrador (demonstração)' } : null,
    });
  }
  if (p === '/admin/assinatura/cobranca' && req.method === 'PUT') {
    const b = await corpoDe(req);
    const minimo = new Date(agora + 30 * 86400_000).toISOString().slice(0, 10);
    if (b.inicio && b.inicio < minimo) return json(res, { error: 'A cobrança tem de ser anunciada com pelo menos 30 dias de antecedência.' }, 400);
    inicioCobranca = b.inicio || null;
    return json(res, { inicio: inicioCobranca, gratuitoAte: null });
  }
  if (p === '/admin/pagamentos/resumo') {
    const confirmados = pedidos.filter((o) => o.estado === 'confirmado');
    return json(res, {
      inicioCobranca, gratuitoAte: inicioCobranca ? new Date(Date.parse(inicioCobranca) - 86400_000).toISOString().slice(0, 10) : null, avisoMinimoDias: 30, emPeriodoGratuito: true,
      hoje: 0, mes: confirmados.reduce((s, o) => s + o.valorUsd, 0), total: confirmados.reduce((s, o) => s + o.valorUsd, 0) + 48,
      carregamentos: confirmados.length + 3, pacotes: PACOTES,
      ultimos: confirmados.map((o) => ({ id: o.id, userId: o.userId, nome: o.nome, tipo: o.tipo, dias: o.dias, valorUsd: o.valorUsd, metodo: o.metodo, referencia: o.referencia, quando: o.decididoEm, por: o.decididoPor })),
    });
  }
  if ((x = m(/^\/admin\/pagamentos\/(\d+)\/confirmar$/))) {
    const o = pedidos.find((y) => y.id === Number(x[1]));
    if (!o || o.estado !== 'pendente') return json(res, { error: 'Este pedido já foi decidido.' }, 409);
    Object.assign(o, { estado: 'confirmado', decididoEm: new Date().toISOString(), decididoPor: 'Administrador (demonstração)' });
    return json(res, { ok: true, saldo: o.dias });
  }
  if ((x = m(/^\/admin\/pagamentos\/(\d+)\/recusar$/))) {
    const { motivo } = await corpoDe(req);
    const o = pedidos.find((y) => y.id === Number(x[1]));
    if (!o || o.estado !== 'pendente') return json(res, { error: 'Este pedido já não está à espera.' }, 409);
    if (!String(motivo || '').trim()) return json(res, { error: 'Indique o motivo: o motorista precisa de saber o que corrigir.' }, 400);
    Object.assign(o, { estado: 'recusado', motivo, decididoEm: new Date().toISOString(), decididoPor: 'Administrador (demonstração)' });
    return json(res, { ok: true });
  }
  if (p === '/admin/pagamentos/formas' && req.method === 'PUT') {
    const { formas: novas } = await corpoDe(req);
    const falta = (novas || []).find((f) => f.ativo && !String(f.instrucoes || '').trim());
    if (falta) return json(res, { error: 'Escreva as instruções (conta, titular ou morada) antes de ligar esta forma.' }, 400);
    formas = formas.map((f) => ({ ...f, ...((novas || []).find((n) => n.id === f.id) || {}) }));
    return json(res, { formas });
  }
  if (p === '/admin/pagamentos/qr') {
    if (req.method === 'DELETE') {
      if (formas.find((f) => f.id === 'tuqr').ativo) return json(res, { error: 'Desligue o pagamento por QR antes de retirar a imagem.' }, 400);
      formas = formas.map((f) => (f.id === 'tuqr' ? { ...f, temQr: false } : f));
    } else {
      formas = formas.map((f) => (f.id === 'tuqr' ? { ...f, temQr: true } : f));
    }
    return json(res, { ok: true });
  }

  if (p === '/admin/estatisticas') {
    const dias = Math.min(90, Math.max(1, Number(url.searchParams.get('dias')) || 7));
    semente = 11 + dias;
    const serie = porDia(dias);
    const soma = (k) => serie.reduce((s, d) => s + d[k], 0);
    return json(res, {
      dias,
      cancelamentos: [
        { motivo: 'motorista_demora', n: Math.round(soma('canceladas') * 0.4) },
        { motivo: 'mudei_de_ideias', n: Math.round(soma('canceladas') * 0.3) },
        { motivo: 'passageiro_nao_aparece', n: Math.round(soma('canceladas') * 0.2) },
        { motivo: 'outro', n: Math.round(soma('canceladas') * 0.1) },
      ],
      aceites: soma('pedidos') - soma('semMotorista'), semResposta: soma('semMotorista'), segundosAteAceitar: 74,
      pedidos: soma('pedidos'), canceladas: soma('canceladas'), satisfacao: { media: 4.7, n: Math.round(soma('concluidas') * 0.5) },
      documentosACaducar: [{ userId: 1, nome: NOMES[0], telefone: '77000001', tipo: 'inspection', ate: dia(18) }],
      porDia: serie,
    });
  }
  if (p === '/admin/retencao') {
    return json(res, { eventos: { linhas: 412, maisAntigo: ha(2000), meses: 6 }, acessos: { linhas: 37, maisAntigo: ha(900), meses: 24 }, viagens: { linhas: 380, meses: null } });
  }
  if (p === '/admin/exportar/viagens') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="demo.json"' });
    return res.end(JSON.stringify({ demonstracao: true, viagens: [] }));
  }
  if (p === '/admin/exportar/viagens/apagar') return json(res, { viagens: 0, retidasPorSocorro: 0 });

  if (p === '/admin/paradas' && req.method === 'POST') {
    const b = await corpoDe(req);
    const nova = { id: idParada++, nome: b.nome, lat: b.lat, lng: b.lng, parada_lat: b.paradaLat, parada_lng: b.paradaLng, raio_m: Number(b.raioM) || 150, created_at: new Date().toISOString(), criada_por: 'Administrador (demonstração)' };
    paradas.push(nova);
    return json(res, { parada: nova }, 201);
  }
  if (p === '/admin/paradas') return json(res, { paradas });
  if ((x = m(/^\/admin\/paradas\/(\d+)$/))) {
    const fora = paradas.find((o) => o.id === Number(x[1]));
    paradas = paradas.filter((o) => o.id !== Number(x[1]));
    return fora ? json(res, { ok: true, nome: fora.nome }) : json(res, { error: 'Paragem não encontrada.' }, 404);
  }
  // A árvore e o «onde fica», em pequeno: só Díli, e fictício na ordem dos
  // sucos. O servidor a sério lê a árvore da ONU e pergunta ao Nominatim.
  if (p === '/admin/lugares/municipios') return json(res, { municipios: ARVORE_DEMO });
  if (p === '/admin/lugares/administrativo') {
    const d = ARVORE_DEMO[0];
    const vc = d.postos[0];
    return json(res, {
      municipio: { id: d.id, nome: d.nome },
      posto: { id: vc.id, nome: vc.nome },
      sucos: vc.sucos,
      sugestaoAldeia: 'Koreo',
      aldeias: [{ suco: 'Caicoli', aldeia: 'Koreo', vezes: 2 }, { suco: 'Caicoli', aldeia: 'Rai Nain', vezes: 1 }],
    });
  }
  // Baptizar um sítio (30/09/2026): entra aceite, como no servidor a sério.
  if (p === '/admin/lugares' && req.method === 'POST') {
    const b = await corpoDe(req);
    const nome = String(b.nome || '').trim();
    if (nome.length < 2 || nome.length > 120) return json(res, { error: 'O nome tem de ter entre 2 e 120 letras.' }, 400);
    if (!(b.lat > -9.6 && b.lat < -8.1 && b.lng > 124 && b.lng < 127.4)) {
      return json(res, { error: 'Essas coordenadas não são de Timor-Leste.' }, 400);
    }
    const novo = {
      id: Math.max(0, ...lugares.map((l) => l.id)) + 1, nome, nomeMapa: null, lat: b.lat, lng: b.lng, estado: 'aceite',
      quando: new Date().toISOString(), quem: 'Administrador (demonstração)', tipo: b.tipo || null,
      tipoOutro: b.tipo === 'outro' ? b.tipoOutro || null : null,
      categoria: b.categoria || null,
      morada: [b.endereco, b.aldeia, b.bairro, b.suco, b.posto, b.municipio].filter(Boolean).join(', ') || null,
      etiquetas: `name=${nome}`, etiqueta: null, mostrarSempre: b.mostrarSempre === true, googleConhece: null,
      editar: `https://www.openstreetmap.org/edit#map=19/${Number(b.lat).toFixed(5)}/${Number(b.lng).toFixed(5)}`,
    };
    lugares.unshift(novo);
    return json(res, { lugar: { id: novo.id, nome } }, 201);
  }
  if ((x = m(/^\/admin\/lugares\/(\d+)\/mostrar$/))) {
    const { mostrarSempre } = await corpoDe(req);
    if (!lugares.some((l) => l.id === Number(x[1]))) return json(res, { error: 'Lugar não encontrado.' }, 404);
    lugares = lugares.map((l) => (l.id === Number(x[1]) ? { ...l, mostrarSempre: mostrarSempre === true } : l));
    return json(res, { ok: true });
  }
  if (p === '/admin/lugares') {
    const e = url.searchParams.get('estado') || 'novo';
    return json(res, { lugares: lugares.filter((l) => e === 'todos' || l.estado === e) });
  }
  if ((x = m(/^\/admin\/lugares\/(\d+)$/)) && req.method === 'DELETE') {
    const fora = lugares.find((l) => l.id === Number(x[1]) && l.estado === 'recusado');
    if (!fora) return json(res, { error: 'Só se podem eliminar lugares recusados.' }, 409);
    lugares = lugares.filter((l) => l.id !== fora.id);
    return json(res, { ok: true, nome: fora.nome });
  }
  if ((x = m(/^\/admin\/lugares\/(\d+)\/estado$/))) {
    const { estado } = await corpoDe(req);
    lugares = lugares.map((l) => (l.id === Number(x[1]) ? { ...l, estado } : l));
    return json(res, { ok: true });
  }

  if (p === '/admin/servicos') {
    return json(res, { servicos: servicos.map((x) => ({ ...x, ativo: x.emConstrucao ? false : x.ativo })) });
  }
  if ((x = m(/^\/admin\/servicos\/([a-z]+)\/ativo$/))) {
    const s = servicos.find((y) => y.id === x[1]);
    if (!s) return json(res, { error: 'Serviço desconhecido.' }, 400);
    if (s.emConstrucao) return json(res, { error: 'Este serviço ainda está em construção.' }, 400);
    s.ativo = !!(await corpoDe(req)).ativo;
    if (s.id === 'carry') carry.ativo = s.ativo;
    return json(res, { servicos });
  }
  if (p === '/admin/jastip') {
    if (req.method === 'PUT') jastip = { ...JASTIP_PADRAO, ...((await corpoDe(req)) || {}) };
    return json(res, { regras: jastip, padrao: JASTIP_PADRAO, limites: LIMITES_JASTIP });
  }
  if (p === '/admin/carry') {
    return json(res, {
      ativo: carry.ativo, tarifa: carry.tarifa, padrao: PADRAO_CARRY, campos: CAMPOS_CARRY, atualizado: null, atualizadoPorNome: null,
      exemplos: [
        { km: 5, min: 15, volume: 'pequeno', ajuda: 'nenhuma', paragens: 0, preco: 6.75 },
        { km: 5, min: 15, volume: 'medio', ajuda: 'carregar', paragens: 0, preco: 11.8 },
        { km: 10, min: 30, volume: 'grande', ajuda: 'ambas', paragens: 1, preco: 24.1 },
        { km: 10, min: 30, pessoas: 8, preco: 10.5 },
      ],
      motoristas: [{ capacidade: 'media', n: 1, online: 0 }],
      pedidos7d: { total: 9, concluidas: 6, canceladas: 1, sem_resposta: 2 },
      recusas7d: [{ motivo: 'incompativel', n: 2 }],
      ultimasRecusas: [],
    });
  }
  if (p === '/admin/carry/ativo') {
    carry.ativo = !!(await corpoDe(req)).ativo;
    return json(res, { ativo: carry.ativo, tarifa: carry.tarifa, padrao: PADRAO_CARRY, campos: CAMPOS_CARRY, atualizado: null });
  }
  if (p === '/admin/carry/tarifa') {
    const { valores } = await corpoDe(req);
    carry.tarifa = { ...PADRAO_CARRY, ...(valores || {}) };
    return json(res, { ativo: carry.ativo, tarifa: carry.tarifa, padrao: PADRAO_CARRY, campos: CAMPOS_CARRY, atualizado: null });
  }
  if ((x = m(/^\/admin\/drivers\/(\d+)\/devolucao$/))) {
    return json(res, { dias: 12, valorUsd: 12, oferecidos: 0, partes: [{ quando: dia(-10), dias: 12, porDia: 1, valor: 12 }] });
  }
  if ((x = m(/^\/admin\/drivers\/(\d+)\/carregar$/))) return json(res, { dias: 42 });

  return json(res, { error: 'Não existe na demonstração.' }, 404);
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (url.pathname === '/mapa/estilo.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Em backend/mapa/ desde a separação do mapa (29/09/2026); o caminho
        // antigo deixou a demonstração sem mapa nenhum, sem erro à vista.
        return res.end(fs.readFileSync(path.join(RAIZ, 'backend/mapa/publico/estilo.json')));
      }
      if (url.pathname === '/' ) {
        res.writeHead(302, { Location: '/painel/' });
        return res.end();
      }
      if (url.pathname.startsWith('/painel')) {
        const rel = url.pathname.replace(/^\/painel\/?/, '');
        const ficheiro = path.join(COMPILADO, rel);
        if (rel && fs.existsSync(ficheiro) && fs.statSync(ficheiro).isFile()) {
          res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ficheiro)] || 'application/octet-stream' });
          return res.end(fs.readFileSync(ficheiro));
        }
        const indice = path.join(COMPILADO, 'index.html');
        if (!fs.existsSync(indice)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Ainda não há painel compilado. Corra `npm run compilar`, ou use `npm run dev`.');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(fs.readFileSync(indice));
      }
      res.writeHead(404);
      res.end();
    } catch (e) {
      // Uma resposta já começada não se recomeça — tentar era o que derrubava
      // o servidor inteiro (ERR_HTTP_HEADERS_SENT).
      if (res.headersSent) res.end();
      else json(res, { error: String(e?.message || e) }, 500);
    }
  })
  .listen(PORTA, () => console.log(`Painel de demonstração (dados fictícios) em http://localhost:${PORTA}/painel`));
