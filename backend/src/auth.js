import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { findUserById } from './users.js';

// Assina um token para um utilizador
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Middleware Express: exige um token válido no cabeçalho Authorization
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token em falta.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Utilizador não encontrado.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware extra: restringe a rota a um tipo de conta
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Sem permissão para esta ação.' });
    }
    next();
  };
}

// Verifica um token "à mão" (usado pelo Socket.io, que não passa por Express)
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return findUserById(payload.sub) || null;
  } catch {
    return null;
  }
}
