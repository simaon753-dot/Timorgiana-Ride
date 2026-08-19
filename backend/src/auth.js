import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { findUserById } from './users.js';

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

// Verifica um token "à mão" (usado pelo Socket.io, que não passa por Express)
export async function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return (await findUserById(payload.sub)) || null;
  } catch {
    return null;
  }
}
