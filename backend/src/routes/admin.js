import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query, one } from '../db.js';
import { getDocument } from '../documents.js';
import { toPublicUser } from '../users.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Só quem tiver is_admin na base de dados. Não há forma de se tornar
// administrador pela app — marca-se à mão, de propósito.
adminRouter.use((req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Sem permissão.' });
  next();
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/admin/drivers?status=pending — motoristas a aguardar decisão
adminRouter.get(
  '/drivers',
  wrap(async (req, res) => {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status
      : 'pending';

    const rows = await query(
      `SELECT u.*, (
         SELECT json_agg(json_build_object('id', d.id, 'kind', d.kind, 'mime', d.mime))
         FROM driver_documents d WHERE d.user_id = u.id
       ) AS docs
       FROM users u
       WHERE u.role = 'driver' AND COALESCE(u.driver_status,'pending') = $1
       ORDER BY u.created_at ASC`,
      [status]
    );

    res.json({
      drivers: rows.map((r) => ({
        ...toPublicUser(r),
        documents: r.docs || [],
      })),
    });
  })
);

// GET /api/admin/documents/:id — ver o ficheiro enviado
adminRouter.get(
  '/documents/:id',
  wrap(async (req, res) => {
    const doc = await getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    res.setHeader('Content-Type', doc.mime);
    res.send(doc.bytes);
  })
);

// POST /api/admin/drivers/:id/decision — aprovar ou recusar
adminRouter.post(
  '/drivers/:id/decision',
  wrap(async (req, res) => {
    const { decision } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decisão inválida.' });
    }

    const row = await one(
      `UPDATE users SET driver_status = $1
       WHERE id = $2 AND role = 'driver'
       RETURNING *`,
      [decision, Number(req.params.id)]
    );
    if (!row) return res.status(404).json({ error: 'Motorista não encontrado.' });

    // Avisar o motorista na hora, para ele não ficar a recarregar a app
    req.app.get('io').to(`user:${row.id}`).emit('driver:status', { status: decision });

    res.json({ driver: toPublicUser(row) });
  })
);
