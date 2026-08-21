import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { saveDocument, listDocuments } from '../documents.js';
import { setOnline, savePushToken } from '../drivers.js';
import { toPublicUser } from '../users.js';
import { notificarAdminsMotoristaPronto } from '../push.js';

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

// POST /api/driver/availability — ficar disponível ou indisponível
driverRouter.post(
  '/availability',
  wrap(async (req, res) => {
    const { online } = req.body || {};
    if (typeof online !== 'boolean') {
      return res.status(400).json({ error: 'Valor inválido.' });
    }
    if ((req.user.driver_status || 'pending') !== 'approved') {
      return res.status(403).json({ error: 'A tua conta ainda não foi aprovada.' });
    }
    const row = await setOnline(req.user.id, online);

    // Manter as salas do tempo real em sintonia com a base de dados.
    // Sem isto, mudar a disponibilidade por aqui gravava o estado mas
    // deixava o socket fora das salas: o motorista aparecia disponível
    // e não recebia pedido nenhum.
    const io = req.app.get('io');
    const salas = ['drivers', `drivers:${req.user.vehicle_type || 'car'}`];
    const alvo = io.in(`user:${req.user.id}`);
    if (row?.is_online) await alvo.socketsJoin(salas);
    else await alvo.socketsLeave(salas);

    res.json({ online: !!row?.is_online });
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

      // Só avisa quando o conjunto ficar completo. Avisar a cada ficheiro
      // daria três notificações pela mesma pessoa e ensinaria a ignorá-las.
      const todos = await listDocuments(req.user.id);
      const tipos = new Set(todos.map((d) => d.kind));
      const completo = ['licence', 'vehicle', 'photo'].every((k) => tipos.has(k));
      if (completo && (req.user.driver_status || 'pending') === 'pending') {
        req.app.get('io').to('admins').emit('driver:pronto', { id: req.user.id });
        notificarAdminsMotoristaPronto({ nome: req.user.name, telefone: req.user.phone })
          .catch(() => {});
      }

      return res.status(201).json({
        document: { kind: doc.kind, sizeBytes: doc.size_bytes, createdAt: doc.created_at },
      });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);
