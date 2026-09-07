import { query, one } from './db.js';

// TRAVÃO ÀS TENTATIVAS DE ENTRADA
//
// Até 07/09/2026 não existia limite nenhum em todo o backend. `POST
// /api/auth/login` aceitava tentativas à velocidade que a rede desse, e a
// palavra-passe mínima tem seis caracteres. Com um número de telemóvel — que
// não é segredo nenhum — a conta abria-se por força bruta.
//
// São duas camadas, e cada uma tapa o que a outra deixa passar:
//
//   1. POR CONTA, na base de dados. É a que conta. Sobrevive aos reinícios do
//      Render, que no plano gratuito acontecem a toda a hora — um contador em
//      memória apagava-se neles, e bastaria esperar pelo reinício seguinte.
//
//   2. POR ENDEREÇO, em memória. Apanha o que a primeira não vê: tentativas
//      espalhadas por muitas contas diferentes, e registos em série. É
//      deliberadamente generosa, porque atrás do Render toda a gente pode
//      partilhar o mesmo endereço aparente — apertá-la seria arriscar
//      bloquear uma aldeia inteira por causa de um router.

// ── 1. Por conta ────────────────────────────────────────────────────────

// AS QUATRO PRIMEIRAS FALHAS NÃO CUSTAM NADA.
//
// Quem escreve mal a senha escreve-a mal duas ou três vezes; é o normal e não
// se deve castigar. A partir da quinta deixa de ser distracção, e a espera
// começa a crescer.
//
// A espera CRESCE em vez de bloquear de vez, e isso é uma escolha: um bloqueio
// permanente deixa qualquer pessoa trancar a conta de outra de propósito, só
// por errar a senha dela vinte vezes. Com o tecto nos quinze minutos, o
// prejuízo máximo de um ataque desses são quinze minutos — e para quem tenta
// adivinhar, quinze minutos por cada quatro tentativas torna a coisa inútil.
const ESPERAS_SEGUNDOS = [0, 0, 0, 0, 30, 60, 120, 300, 900];
const TECTO_SEGUNDOS = 900;

function esperaPara(falhas) {
  return ESPERAS_SEGUNDOS[Math.min(falhas, ESPERAS_SEGUNDOS.length - 1)] ?? TECTO_SEGUNDOS;
}

// Quantos segundos faltam até esta conta poder tentar outra vez. Zero = pode.
export async function segundosDeEspera(userId) {
  if (!userId) return 0;
  const r = await one(
    `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (login_espera_ate - NOW()))))::int AS faltam
       FROM users WHERE id = $1 AND login_espera_ate IS NOT NULL`,
    [userId]
  );
  return r?.faltam > 0 ? r.faltam : 0;
}

// Uma tentativa falhada. Conta e, se já forem muitas, adia a seguinte.
export async function registarFalha(userId) {
  if (!userId) return;
  const r = await one(
    `UPDATE users SET login_falhas = login_falhas + 1 WHERE id = $1 RETURNING login_falhas`,
    [userId]
  );
  const segundos = esperaPara(r?.login_falhas ?? 1);
  if (segundos > 0) {
    await query(
      `UPDATE users SET login_espera_ate = NOW() + ($2 || ' seconds')::interval WHERE id = $1`,
      [userId, String(segundos)]
    );
  }
}

// Entrou. Esquece tudo o que falhou antes — senão uma pessoa que erra a senha
// de manhã ficava a arrastar o contador o dia inteiro.
export async function limparFalhas(userId) {
  if (!userId) return;
  await query(
    `UPDATE users SET login_falhas = 0, login_espera_ate = NULL
      WHERE id = $1 AND (login_falhas > 0 OR login_espera_ate IS NOT NULL)`,
    [userId]
  );
}

// ── 2. Por endereço ─────────────────────────────────────────────────────

// Janela deslizante simples, em memória. Sem dependências novas de propósito:
// acrescentar um pacote obriga a um `npm install` no alojamento, e isto são
// vinte linhas.
const janelas = new Map();

// Limpeza preguiçosa: em vez de um temporizador a correr sempre, varre-se de
// vez em quando à boleia de um pedido. O servidor adormece quando ninguém o
// usa, e um temporizador não correria de qualquer maneira.
let ultimaLimpeza = Date.now();
function limparVelhas(agora, janelaMs) {
  if (agora - ultimaLimpeza < 60000) return;
  ultimaLimpeza = agora;
  for (const [k, marcas] of janelas) {
    if (!marcas.length || agora - marcas[marcas.length - 1] > janelaMs) janelas.delete(k);
  }
}

// Middleware. `max` tentativas em `minutos`, por endereço e por rota.
export function porEndereco({ max = 30, minutos = 15 } = {}) {
  const janelaMs = minutos * 60000;
  return (req, res, next) => {
    const agora = Date.now();
    limparVelhas(agora, janelaMs);

    const chave = `${req.ip || 'sem-ip'}:${req.path}`;
    const marcas = (janelas.get(chave) || []).filter((t) => agora - t < janelaMs);
    if (marcas.length >= max) {
      janelas.set(chave, marcas);
      return res.status(429).json({
        error: 'Demasiadas tentativas. Espera uns minutos e tenta outra vez.',
      });
    }
    marcas.push(agora);
    janelas.set(chave, marcas);
    next();
  };
}
