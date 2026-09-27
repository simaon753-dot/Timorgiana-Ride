import { query } from './db.js';
import { codificar, descodificar } from './rastos.js';

// O CAMINHO QUE A VIAGEM FEZ, para o painel (27/09/2026).
//
// PORQUE EXISTE. O mapa do detalhe de uma viagem desenhava uma recta da
// recolha ao destino, com a nota «não é o caminho feito». Com as ocorrências,
// isso deixou de chegar: uma queixa de «percurso errado» ou de «cobrou mais do
// que o preço» responde-se a olhar para o caminho, e o caminho não existia em
// lado nenhum.
//
// PORQUE NÃO A ROTA DO GOOGLE. Seria a linha PLANEADA, não a feita — e o que
// se discute numa queixa é precisamente a diferença entre as duas. E os termos
// do Google não deixam desenhar a linha dele sobre outro mapa, que é o que o
// painel usa (o nosso).
//
// ISTO NÃO É ANÓNIMO, ao contrário dos `rastos.js`: está preso à viagem, e é
// esse o ponto. Cabe no que a política de privacidade já diz — a localização
// do veículo durante a viagem, para acompanhamento, segurança e apoio — e
// apaga-se com a história minuto a minuto das viagens (`retencao.js`).
//
// Desde que o motorista ACEITA até a viagem acabar, em duas partes: até à
// recolha (a caminho do passageiro) e depois dela (com o passageiro). A
// fronteira é `recolha_indice`, o primeiro ponto já em `in_progress`.

const ESTADOS = ['accepted', 'arriving', 'in_progress'];
// Mais largo do que nos rastos (30 m): aqui não se está a aprender estradas,
// está-se a mostrar por onde o carro andou, e um ponto a 50 m ainda diz isso.
const PRECISAO_MAX_M = 50;
const PASSO_M = 15;
const MAXIMO_DE_PONTOS = 4000;
// De quanto em quanto tempo o que está em memória vai para a base. Um
// reinício do servidor (o plano gratuito adormece, e cada publicação
// reinicia) perde no máximo este bocado.
export const GRAVAR_A_CADA_MS = 60 * 1000;
// Sem posições há meia hora, a viagem acabou ou perdeu-se: grava-se o que
// houver e esquece-se.
const PARADO_MS = 30 * 60 * 1000;

const emCurso = new Map(); // rideId → { inicio, pontos, recolha, mudou, em }

function metros(a, b) {
  const r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r);
  const y = (b[0] - a[0]) * r;
  return Math.hypot(x, y) * 6371000;
}

// Chamado a cada posição do motorista (`posicaoMotorista.js`). Nunca lança.
export function juntarAoPercurso(viagem, lat, lng, precisao) {
  if (!viagem || !ESTADOS.includes(viagem.status)) return;
  if (precisao != null && precisao > PRECISAO_MAX_M) return;
  const agora = Date.now();
  let r = emCurso.get(viagem.id);
  if (!r) {
    r = { inicio: agora, pontos: [], recolha: null, mudou: false, em: agora, novo: true };
    emCurso.set(viagem.id, r);
  }
  r.em = agora;
  if (viagem.status === 'in_progress' && r.recolha == null) {
    r.recolha = r.pontos.length;
    r.mudou = true;
  }
  const p = [lat, lng, Math.round((agora - r.inicio) / 1000)];
  const ultimo = r.pontos[r.pontos.length - 1];
  if (ultimo && metros(ultimo, p) < PASSO_M) return;
  if (r.pontos.length >= MAXIMO_DE_PONTOS) return;
  r.pontos.push(p);
  r.mudou = true;
}

async function gravar(rideId, r) {
  // Uma viagem que o servidor já conhecia de antes de reiniciar: o que
  // estava gravado mantém-se, e o que chega agora junta-se no fim.
  await query(
    `INSERT INTO percursos (ride_id, pontos, n, recolha_indice, atualizado_em)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (ride_id) DO UPDATE
       SET pontos = EXCLUDED.pontos, n = EXCLUDED.n,
           recolha_indice = EXCLUDED.recolha_indice, atualizado_em = NOW()`,
    [rideId, codificar(r.pontos), r.pontos.length, r.recolha]
  );
  r.mudou = false;
}

// Corre de minuto a minuto (server.js). Grava o que mudou e larga o que parou.
//
// UMA PASSAGEM DE CADA VEZ: o fim de uma viagem chama isto fora do relógio, e
// duas passagens ao mesmo tempo juntavam os pontos já gravados duas vezes.
let passagem = null;
export function gravarPercursos() {
  if (!passagem) passagem = umaPassagem().finally(() => (passagem = null));
  return passagem;
}

async function umaPassagem() {
  const agora = Date.now();
  for (const [id, r] of emCurso) {
    try {
      if (r.novo) {
        // A primeira vez desde que o servidor arrancou: se já havia pontos
        // gravados desta viagem, ficam à frente dos novos.
        const antes = await query(
          'SELECT pontos, recolha_indice FROM percursos WHERE ride_id = $1',
          [id]
        );
        if (antes.length) {
          const velhos = descodificar(antes[0].pontos);
          const desvio = velhos.length ? velhos[velhos.length - 1][2] + 1 : 0;
          r.pontos = [...velhos, ...r.pontos.map((p) => [p[0], p[1], p[2] + desvio])];
          if (antes[0].recolha_indice != null) r.recolha = antes[0].recolha_indice;
          else if (r.recolha != null) r.recolha += velhos.length;
        }
        r.novo = false;
        r.mudou = true;
      }
      if (r.mudou && r.pontos.length) await gravar(id, r);
      if (agora - r.em > PARADO_MS) emCurso.delete(id);
    } catch (e) {
      console.error('[percursos] não foi possível gravar a viagem', id, e?.message);
    }
  }
}

// Quando a viagem acaba, grava já — sem esperar pelo minuto seguinte, que
// podia nunca chegar se o servidor adormecer.
export async function fecharPercurso(rideId) {
  const r = emCurso.get(rideId);
  if (!r) return;
  await gravarPercursos();
  emCurso.delete(rideId);
}

// Para o painel: os pontos e onde começa a parte com passageiro.
export async function percursoDe(rideId) {
  const rows = await query('SELECT pontos, recolha_indice FROM percursos WHERE ride_id = $1', [
    rideId,
  ]);
  if (!rows.length) return null;
  const pontos = descodificar(rows[0].pontos).map((p) => [p[0], p[1]]);
  return pontos.length > 1 ? { pontos, recolhaIndice: rows[0].recolha_indice } : null;
}

export const _paraTestePercurso = { emCurso };
