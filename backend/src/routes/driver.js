import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { saveDocument, listDocuments } from '../documents.js';
import { toPublicUser } from '../users.js';

export const driverRouter = Router();
driverRouter.use(requireAuth, requireRole('driver'));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/driver/status — estado da conta e documentos já enviados
driverRouter.get(
  '/status',
  wrap(async (req, res) => {
    const docs = await listDocuments(req.user.id);
    res.json({
      user: toPublicUser(req.user),
      documents: docs.map((d) => ({
        kind: d.kind,
        sizeBytes: d.size_bytes,
        createdAt: d.created_at,
      })),
    });
  })
);

// POST /api/driver/documents — enviar carta de condução ou documento do veículo
driverRouter.post(
  '/documents',
  wrap(async (req, res) => {
    const { kind, mime, base64 } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Ficheiro em falta.' });

    try {
      const doc = await saveDocument({ userId: req.user.id, kind, mime, base64 });
      return res.status(201).json({
        document: { kind: doc.kind, sizeBytes: doc.size_bytes, createdAt: doc.created_at },
      });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);
