import { Router } from 'express';
import {
  createUser,
  findUserByPhone,
  verifyPassword,
  toPublicUser,
  normalizePhone,
} from '../users.js';
import { signToken, requireAuth } from '../auth.js';
import { savePushToken } from '../drivers.js';

export const authRouter = Router();

const ROLES = ['passenger', 'driver'];

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role, vehicle, termsVersion, privacyVersion } =
      req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    if (!phone || normalizePhone(phone).length < 7) {
      return res.status(400).json({ error: 'Número de telemóvel inválido.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: 'Tipo de conta inválido.' });
    }
    if (role === 'driver' && (!vehicle || !vehicle.plate || !vehicle.plate.trim())) {
      return res.status(400).json({ error: 'Motoristas têm de indicar a matrícula do veículo.' });
    }
    // Exigido no servidor e não só na app: a caixa marcada no telemóvel é
    // uma cortesia da interface; o que fica como prova é isto.
    if (!termsVersion) {
      return res.status(400).json({ error: 'É preciso aceitar os termos de utilização.' });
    }

    if (await findUserByPhone(phone)) {
      return res.status(409).json({ error: 'Já existe uma conta com este número de telemóvel.' });
    }

    const created = await createUser({
      name,
      phone,
      email,
      password,
      role,
      vehicle,
      termsVersion,
      privacyVersion,
    });
    return res.status(201).json({ user: toPublicUser(created), token: signToken(created) });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Erro ao criar a conta.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ error: 'Telemóvel e palavra-passe são obrigatórios.' });
    }

    const row = await findUserByPhone(phone);
    if (!row || !(await verifyPassword(row, password))) {
      return res.status(401).json({ error: 'Telemóvel ou palavra-passe incorretos.' });
    }

    return res.json({ user: toPublicUser(row), token: signToken(row) });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Erro ao iniciar sessão.' });
  }
});

// POST /api/auth/push-token — guardar o destino das notificações
authRouter.post('/push-token', requireAuth, async (req, res) => {
  try {
    await savePushToken(req.user.id, req.body?.token || null);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/push-token]', err.message);
    res.status(500).json({ error: 'Erro ao guardar.' });
  }
});

// GET /api/auth/me — valida o token e devolve o utilizador atual
authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});
