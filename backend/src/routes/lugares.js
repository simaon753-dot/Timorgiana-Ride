import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { procurar } from '../lugares.js';

export const lugaresRouter = Router();

// Autenticado de propósito. Sem isto, o endereço seria um proxy livre para o
// Google à custa da nossa quota — bastava alguém apontar um script a ele. Só
// quem tem conta procura, e é sempre o próprio destino de alguém.
lugaresRouter.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/lugares?q=timor plaza
lugaresRouter.get(
  '/',
  wrap(async (req, res) => {
    const r = await procurar(req.query.q);
    res.json(r);
  })
);
