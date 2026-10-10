import express from 'express';
import { requireAuth } from '../auth.js';
import { adiar, guardarResposta, perguntasPara, viagemParaContribuir } from '../mapaComunidade.js';

// «AJUDE A MELHORAR O MAPA» (10/10/2026). Ver mapaComunidade.js.
export const mapaComunidadeRouter = express.Router();
mapaComunidadeRouter.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/mapa/perguntas?rideId= — as perguntas desta viagem (pode ser []).
mapaComunidadeRouter.get(
  '/perguntas',
  wrap(async (req, res) => {
    const ride = await viagemParaContribuir(Number(req.query.rideId), req.user.id);
    if (!ride) return res.json({ perguntas: [] });
    res.json({ perguntas: await perguntasPara(req.user, ride) });
  })
);

// POST /api/mapa/respostas — uma resposta de cada vez.
mapaComunidadeRouter.post(
  '/respostas',
  wrap(async (req, res) => {
    const ride = await viagemParaContribuir(Number(req.body?.rideId), req.user.id);
    if (!ride) return res.status(404).json({ error: 'Viagem não encontrada.' });
    try {
      await guardarResposta(req.user.id, ride, req.body);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    res.status(201).json({ ok: true });
  })
);

// POST /api/mapa/adiar — «Agora não»: o convite cala-se uns dias.
mapaComunidadeRouter.post(
  '/adiar',
  wrap(async (req, res) => {
    await adiar(req.user.id);
    res.json({ ok: true });
  })
);
