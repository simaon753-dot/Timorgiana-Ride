import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { procurar } from '../lugares.js';
import { query } from '../db.js';

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

// POST /api/lugares/propor — o passageiro deu nome a um sítio
//
// Só se chama quando ele ESCREVEU um nome diferente do que lhe mostrámos.
// Aceitar o nome da rua que sugerimos não é informação nova; corrigi-lo é.
lugaresRouter.post(
  '/propor',
  wrap(async (req, res) => {
    const { nome, nomeMapa, lat, lng } = req.body || {};
    const n = String(nome || '').trim();
    if (n.length < 2 || n.length > 120) return res.status(400).json({ error: 'Nome inválido.' });
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Faltam as coordenadas.' });
    }
    // Se o que ele escreveu for igual ao que já lá estava, não há nada a
    // guardar. Guardar o mesmo nome vezes sem conta encheria a lista de
    // revisão de coisas que não são correcções nenhumas.
    if (n.toLowerCase() === String(nomeMapa || '').trim().toLowerCase()) {
      return res.json({ guardado: false, motivo: 'igual' });
    }
    await query(
      `INSERT INTO lugares_propostos (user_id, nome, nome_mapa, lat, lng)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, n, String(nomeMapa || '').trim() || null, lat, lng]
    );
    res.json({ guardado: true });
  })
);
