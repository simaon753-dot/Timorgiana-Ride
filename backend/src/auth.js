import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { findUserById } from './users.js';
import { query } from './db.js';
import { LINGUAS } from './mensagens.js';

// UMA CONTA, UM TELEMÓVEL (23/09/2026). Ver a coluna `sessao` em `db.js`.
//
// O `sid` é o número desta sessão. Vai assinado dentro do token e uma cópia
// fica na conta; o `requireAuth` compara os dois. Entrar noutro aparelho
// escreve um número novo, e todos os tokens anteriores deixam de bater
// certo — incluindo os que foram copiados para fora do telemóvel.
export function signToken(user, sid, sup) {
  return jwt.sign({ sub: user.id, role: user.role, sid, sup }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// DUAS SUPERFÍCIES, DUAS SESSÕES — e não duas por pessoa.
//
// O painel de administração entra pelo MESMO `/auth/login` da app. Com uma
// só sessão por conta, o Simão abrir o painel no portátil deitava a app
// fora do telemóvel dele, e voltar ao telemóvel deitava o painel fora. A
// app e o painel são duas ferramentas da mesma pessoa; um telemóvel e outro
// telemóvel não são.
//
// A alternativa era isentar os administradores, e é pior: quem entra numa
// conta de administrador roubada passava a poder ficar lá sem que o dono
// desse por nada. Assim o aviso mantém-se dos dois lados.
const COLUNA = { app: 'sessao', painel: 'sessao_painel' };

// Abre uma sessão nova e devolve o token dela. É o único sítio que cria
// tokens: quem quiser um tem de passar por aqui, e passar por aqui fecha
// sempre a sessão anterior DESSA superfície.
export async function abrirSessao(user, superficie = 'app') {
  const coluna = COLUNA[superficie] || COLUNA.app;
  const sid = randomUUID();
  // Nome de coluna interpolado e não marcador: o Postgres não aceita um
  // marcador no lugar de uma coluna. Vem de `COLUNA`, que é uma constante
  // deste ficheiro — nunca do que chega no pedido.
  await query(`UPDATE users SET ${coluna} = $2, sessao_em = NOW() WHERE id = $1`, [user.id, sid]);
  return signToken(user, sid, superficie);
}

// PORQUE É QUE ISTO É UMA FUNÇÃO E NÃO UMA LINHA REPETIDA EM DOIS SÍTIOS.
//
// A regra tem de ser exactamente a mesma no Express e no Socket.io. Se
// divergirem, o aparelho expulso continua a receber pedidos pelo canal de
// tempo real que já estava aberto — que é o pior dos dois mundos: parece
// fora e continua dentro.
//
// Um token SEM `sid` é recusado. Todos os que existiam antes desta mudança
// são assim, e é de propósito que morram: o alcance de uma sessão que se
// não sabe de onde vem é precisamente o que isto existe para acabar.
export function sessaoValida(payload, user) {
  const coluna = COLUNA[payload.sup] || COLUNA.app;
  return !!payload.sid && payload.sid === user[coluna];
}

export const SESSAO_NOUTRO = 'sessao_noutro_aparelho';

// Middleware Express: exige um token válido no cabeçalho Authorization
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Token em falta.' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  try {
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Utilizador não encontrado.' });

    // A SESSÃO É DESTE APARELHO? Uma frase própria e um `motivo` próprio: a
    // app leva a pessoa ao ecrã de entrada em qualquer 401, mas só com isto
    // é que lhe pode dizer porquê. «Token inválido» a quem não fez nada
    // parece uma avaria; «a tua conta foi aberta noutro telemóvel» é um
    // aviso de segurança, e quem o receber sem ter sido ele muda a senha.
    if (!sessaoValida(payload, user)) {
      return res.status(401).json({
        error: 'A tua conta foi aberta noutro telemóvel. Entra de novo para continuares aqui.',
        motivo: SESSAO_NOUTRO,
      });
    }

    req.user = user;
    // A língua de quem pede fica na conta (15/09/26): as notificações saem
    // sem pedido nenhum à frente, e é daqui que sabem em que língua ir. Só
    // se escreve quando muda.
    const lingua = String(req.headers['x-lingua'] || '').toLowerCase();
    if (LINGUAS.includes(lingua) && user.lingua !== lingua) {
      user.lingua = lingua;
      query('UPDATE users SET lingua = $1 WHERE id = $2', [lingua, user.id]).catch(() => {});
    }
    next();
  } catch (err) {
    console.error('[auth] falha a consultar utilizador:', err.message);
    return res.status(503).json({ error: 'Serviço indisponível. Tenta de novo.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Sem permissão para esta ação.' });
    }
    next();
  };
}

// Motorista aprovado. Sem isto, alguém que se registasse como motorista
// começava a receber pedidos de imediato — sem carta, sem verificação,
// com passageiros reais a entrar no veículo.
// Conduzir depende de ter sido APROVADO, não do papel escolhido no
// registo. Uma pessoa em Díli tem no máximo três números de telemóvel; se
// o papel fosse uma parede, um motorista com a mota avariada teria de
// gastar um deles numa segunda conta só para pedir uma viagem.
export function requireApprovedDriver(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: 'Sem permissão para esta ação.' });
  }
  if (req.user.driver_status !== 'approved') {
    return res.status(403).json({
      error: 'A tua conta de motorista ainda não foi aprovada.',
      driverStatus: req.user.driver_status || null,
    });
  }
  next();
}

// Verifica um token "à mão" (usado pelo Socket.io, que não passa por Express)
export async function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(payload.sub);
    // A MESMA REGRA do Express, e não uma parecida: um aparelho expulso que
    // mantivesse o canal de tempo real continuava a receber pedidos.
    if (!user || !sessaoValida(payload, user)) return null;
    return user;
  } catch {
    return null;
  }
}
