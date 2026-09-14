import { config } from './config.js';
import { query } from './db.js';

// OS PREÇOS DO CARRY, EDITÁVEIS NO PAINEL (14/09/26).
//
// O Simão escreveu "não colocar preços fixos no código; o administrador
// configura". Os valores de config.js (e das variáveis de ambiente) continuam
// a ser os de PARTIDA; o que o administrador gravar no painel vai para a
// tabela config_servico e é aplicado por cima deles. "Repor" apaga o que foi
// mudado e volta aos de partida.
//
// O cálculo não muda de sítio: `preco()` continua a ler
// config.tarifas.carry. Este módulo só troca esse objecto pelo que resulta
// dos de partida mais as alterações — por isso a cotação e a viagem, que
// passam as duas por `preco()`, nunca podem ver preços diferentes.
//
// Os limites de cada campo existem para um engano de dedo não pôr o
// quilómetro a $85: um preço absurdo gravado aqui chega a todos os
// passageiros no pedido seguinte.
const PADRAO_CARRY = JSON.parse(JSON.stringify(config.tarifas.carry));
if (PADRAO_CARRY.porParagem == null) PADRAO_CARRY.porParagem = 0;

export const CAMPOS_CARRY = [
  { chave: 'base', min: 0, max: 20 },
  { chave: 'porKm', min: 0, max: 5 },
  { chave: 'porMinuto', min: 0, max: 1 },
  { chave: 'minimo', min: 0, max: 50 },
  { chave: 'minimoPessoas', min: 0, max: 100 },
  { chave: 'porParagem', min: 0, max: 20 },
  { chave: 'volume.pequeno', min: 1, max: 5 },
  { chave: 'volume.medio', min: 1, max: 5 },
  { chave: 'volume.grande', min: 1, max: 5 },
  { chave: 'ajuda.carregar', min: 0, max: 50 },
  { chave: 'ajuda.descarregar', min: 0, max: 50 },
  { chave: 'ajuda.ambas', min: 0, max: 50 },
];

let carryAtivo = true;
let atualizado = null;

function lerCampo(obj, chave) {
  return chave.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function escreverCampo(obj, chave, valor) {
  const partes = chave.split('.');
  let o = obj;
  for (const k of partes.slice(0, -1)) {
    o[k] = o[k] || {};
    o = o[k];
  }
  o[partes[partes.length - 1]] = valor;
}
function plano(obj) {
  return Object.fromEntries(CAMPOS_CARRY.map((c) => [c.chave, lerCampo(obj, c.chave) ?? null]));
}
function aplicar(alteracoes) {
  const t = JSON.parse(JSON.stringify(PADRAO_CARRY));
  for (const [k, v] of Object.entries(alteracoes || {})) {
    if (CAMPOS_CARRY.some((c) => c.chave === k) && Number.isFinite(Number(v))) {
      escreverCampo(t, k, Number(v));
    }
  }
  config.tarifas.carry = t;
}

// Os valores de partida ficam em vigor desde o arranque do módulo, e não só
// depois de ler a base: se a leitura falhar, o estado continua coerente — a
// taxa por paragem existe (a 0) e o painel mostra os mesmos valores que a
// cotação usa.
aplicar({});

// Só os campos conhecidos, só números, só dentro dos limites.
export function validarTarifa(valores) {
  const limpo = {};
  for (const [k, v] of Object.entries(valores || {})) {
    const campo = CAMPOS_CARRY.find((c) => c.chave === k);
    if (!campo) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < campo.min || n > campo.max) {
      return { erro: `Valor fora dos limites em ${k} (${campo.min} a ${campo.max}).` };
    }
    limpo[k] = Math.round(n * 100) / 100;
  }
  return { limpo };
}

export async function carregarConfigServico() {
  try {
    const rows = await query(
      `SELECT chave, valor, atualizado_em, atualizado_por FROM config_servico
       WHERE chave IN ('carry.tarifa', 'carry.ativo')`
    );
    const tarifa = rows.find((r) => r.chave === 'carry.tarifa');
    const ativo = rows.find((r) => r.chave === 'carry.ativo');
    aplicar(tarifa?.valor || {});
    carryAtivo = ativo ? ativo.valor !== false : true;
    atualizado = tarifa ? { em: tarifa.atualizado_em, por: tarifa.atualizado_por } : null;
  } catch (e) {
    // Sem a tabela ou sem rede, ficam os valores de partida: o serviço
    // continua a funcionar com os preços que sempre teve.
    console.error('[config] não foi possível ler a configuração do Carry:', e.message);
  }
}

export function carryEstaAtivo() {
  return carryAtivo;
}

export function estadoCarry() {
  return {
    ativo: carryAtivo,
    tarifa: plano(config.tarifas.carry),
    padrao: plano(PADRAO_CARRY),
    campos: CAMPOS_CARRY,
    atualizado,
  };
}

async function gravar(chave, valor, porId) {
  await query(
    `INSERT INTO config_servico (chave, valor, atualizado_em, atualizado_por)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (chave) DO UPDATE
       SET valor = EXCLUDED.valor, atualizado_em = NOW(), atualizado_por = EXCLUDED.atualizado_por`,
    [chave, JSON.stringify(valor), porId || null]
  );
  await carregarConfigServico();
}

export function gravarTarifaCarry(valores, porId) {
  return gravar('carry.tarifa', valores, porId);
}
export function gravarCarryAtivo(ativo, porId) {
  return gravar('carry.ativo', !!ativo, porId);
}
