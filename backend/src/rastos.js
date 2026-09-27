import { query } from './db.js';

// OS RASTOS DAS VIAGENS — a matéria-prima de um mapa nosso (27/09/2026).
//
// PORQUE EXISTE. O Simão perguntou se devíamos ter um mapa nosso, como o
// GrabMaps. Hoje não: o do Google é melhor do que qualquer coisa que se
// fizesse agora. Mas o GrabMaps não nasceu de cartógrafos — nasceu dos
// rastos de GPS dos motoristas, que mostram por onde se passa DE FACTO e
// quanto tempo demora. Esses só se juntam com viagens, e cada viagem que
// não se guarda é uma que não volta. Por isso começa-se já, a guardar.
//
// ANÓNIMO, e o que isso quer dizer aqui:
//   • sem viagem, sem motorista, sem passageiro — nenhum número que ligue;
//   • só a parte COM passageiro (`in_progress`): a aproximação começa onde o
//     motorista está, que muitas vezes é a casa dele;
//   • corta-se tudo a menos de `CORTE_M` da recolha e do destino, que são
//     muitas vezes a casa ou o trabalho de quem viajou;
//   • a data fica só o mês. Ficam a hora e o dia da semana, porque é isso
//     que diz se Comoro às 17h é diferente de Comoro às 10h.
//
// O QUE NÃO É. Enquanto a tabela das viagens existir, alguém com acesso às
// duas podia tentar casar um rasto com uma viagem pelo mês, pela hora e pelo
// percurso. Os cortes nas pontas tornam isso difícil, não impossível. Está
// escrito aqui para ninguém prometer mais do que isto.
//
// DESLIGADO ATÉ A POLÍTICA DE PRIVACIDADE O DIZER. A política actual diz que
// a localização serve para encaminhar pedidos, acompanhar a viagem,
// segurança e apoio — melhorar mapas é uma finalidade nova. O texto é do
// Simão; quando ele o aprovar e estiver publicado, muda-se isto para `true`.
// Desligado, nada se junta nem se guarda: o modo que pode causar dano não é
// o que se obtém por omissão.
export const RASTOS_LIGADOS = false;
// Só o teste liga isto sem mudar a constante (ver `_paraTeste`).
let ligados = RASTOS_LIGADOS;

// Os números, e porque são estes.
//
// 250 m: mais do que o erro de um GPS mau (50 m) e do que um quarteirão de
// Díli, para a porta de casa não se adivinhar pela última curva.
const CORTE_M = 250;
// Uma leitura com mais erro do que isto não ensina nada sobre a estrada.
const PRECISAO_MAX_M = 30;
// Um ponto a cada 20 m chega para seguir as curvas de uma rua e mantém o
// tamanho em conta: uma viagem de 10 km fica à volta de 3 KB. O plano da
// base é de 500 MB partilhados com tudo o resto.
const PASSO_M = 20;
// Um rasto com menos pontos do que isto, depois dos cortes, é uma viagem
// curta de mais para dizer alguma coisa — e curta de mais para ser anónima.
const MINIMO_DE_PONTOS = 10;
// Uma viagem nunca tem mais do que isto; é um tecto contra um defeito, não
// um limite que se espere atingir (2000 × 20 m = 40 km).
const MAXIMO_DE_PONTOS = 2000;
// Um rasto que não recebe nada há duas horas é de uma viagem cancelada ou
// perdida num reinício. Deita-se fora.
const ABANDONADO_MS = 2 * 60 * 60 * 1000;

// Em memória e não na base: escrever uma linha por leitura de GPS seriam
// milhares de escritas por viagem para guardar uma no fim. Se o servidor
// reiniciar a meio, perde-se esse rasto — é o preço, e é pequeno.
const emCurso = new Map(); // rideId → { veiculo, inicio, pontos: [[lat, lng, seg]], em }

function metros(a, b) {
  const r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r);
  const y = (b[0] - a[0]) * r;
  return Math.hypot(x, y) * 6371000;
}

// Chamado a cada posição do motorista (ver `posicaoMotorista.js`). Nunca
// lança: um rasto é um extra, e uma posição nunca pode falhar por causa dele.
export function juntarPonto(viagem, lat, lng, precisao) {
  if (!ligados || !viagem || viagem.status !== 'in_progress') return;
  if (precisao == null || precisao > PRECISAO_MAX_M) return;
  const agora = Date.now();
  let r = emCurso.get(viagem.id);
  if (!r) {
    r = { veiculo: viagem.vehicle_type || null, inicio: agora, pontos: [], em: agora };
    emCurso.set(viagem.id, r);
  }
  r.em = agora;
  const p = [lat, lng, Math.round((agora - r.inicio) / 1000)];
  const ultimo = r.pontos[r.pontos.length - 1];
  if (ultimo && metros(ultimo, p) < PASSO_M) return;
  if (r.pontos.length >= MAXIMO_DE_PONTOS) return;
  r.pontos.push(p);
}

// Chamado quando a viagem acaba bem. `viagem` traz a recolha e o destino,
// que é à volta deles que se corta. Uma viagem cancelada não chama isto: o
// rasto dela fica a expirar em `varrerAbandonados`.
export async function fecharRasto(viagem) {
  const r = emCurso.get(viagem?.id);
  emCurso.delete(viagem?.id);
  if (!ligados || !r) return;
  const pontas = [
    [viagem.origin_lat, viagem.origin_lng],
    [viagem.dest_lat, viagem.dest_lng],
  ].filter((p) => p[0] != null && p[1] != null);
  const ficam = r.pontos.filter((p) => pontas.every((q) => metros(p, q) >= CORTE_M));
  if (ficam.length < MINIMO_DE_PONTOS) return;
  // Os segundos passam a contar do primeiro ponto que ficou: contados do
  // início real, diriam quanto tempo se andou dentro da zona cortada.
  const t0 = ficam[0][2];
  const inicio = new Date(r.inicio);
  // A hora e o dia da semana de Díli (UTC+9), que é onde o trânsito acontece.
  const dili = new Date(inicio.getTime() + 9 * 3600000);
  try {
    await query(
      `INSERT INTO rastos (veiculo, mes, dia_semana, hora, pontos, n)
       VALUES ($1, date_trunc('month', $2::timestamptz)::date, $3, $4, $5, $6)`,
      [
        r.veiculo,
        inicio.toISOString(),
        dili.getUTCDay(),
        dili.getUTCHours(),
        codificar(ficam.map((p) => [p[0], p[1], p[2] - t0])),
        ficam.length,
      ]
    );
  } catch (e) {
    console.error('[rastos] não foi possível guardar:', e?.message);
  }
}

export function varrerAbandonados() {
  const limite = Date.now() - ABANDONADO_MS;
  for (const [id, r] of emCurso) if (r.em < limite) emCurso.delete(id);
}

// A CODIFICAÇÃO DAS LINHAS DO GOOGLE, com uma terceira coluna: os segundos.
//
// É o formato que qualquer biblioteca de mapas lê (para as duas primeiras
// colunas), e é compacto: diferenças entre pontos seguidos, em texto. Um
// ponto custa à volta de 8 bytes em vez dos 40 de um JSON.
export function codificar(pontos) {
  let saida = '';
  const antes = [0, 0, 0];
  for (const p of pontos) {
    const v = [Math.round(p[0] * 1e5), Math.round(p[1] * 1e5), Math.round(p[2])];
    for (let i = 0; i < 3; i++) {
      let d = v[i] - antes[i];
      antes[i] = v[i];
      d = d < 0 ? ~(d << 1) : d << 1;
      while (d >= 0x20) {
        saida += String.fromCharCode((0x20 | (d & 0x1f)) + 63);
        d >>= 5;
      }
      saida += String.fromCharCode(d + 63);
    }
  }
  return saida;
}

// O inverso, para quem um dia for ler isto — e para o teste.
export function descodificar(texto) {
  const pontos = [];
  const v = [0, 0, 0];
  let i = 0;
  while (i < texto.length) {
    const p = [];
    for (let k = 0; k < 3; k++) {
      let r = 0;
      let s = 0;
      let b;
      do {
        b = texto.charCodeAt(i++) - 63;
        r |= (b & 0x1f) << s;
        s += 5;
      } while (b >= 0x20);
      v[k] += r & 1 ? ~(r >> 1) : r >> 1;
      p.push(k < 2 ? v[k] / 1e5 : v[k]);
    }
    pontos.push(p);
  }
  return pontos;
}

export const _paraTeste = {
  codificar,
  emCurso,
  CORTE_M,
  ligar: (v) => {
    ligados = v;
  },
};
