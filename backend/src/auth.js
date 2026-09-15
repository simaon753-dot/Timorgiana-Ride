import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { findUserById } from './users.js';
import { query } from './db.js';
import { LINGUAS } from './mensagens.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

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
    return (await findUserById(payload.sub)) || null;
  } catch {
    return null;
  }
}
