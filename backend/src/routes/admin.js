import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query, one } from '../db.js';
import { getDocument } from '../documents.js';
import { toPublicUser } from '../users.js';
import { alertasAbertos, resolverAlerta } from '../sos.js';
import { fotosDeHoje, getFotoDeTurno } from '../turnos.js';

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
         SELECT json_agg(json_build_object(
           'id', d.id, 'kind', d.kind, 'mime', d.mime,
           'expiresOn', TO_CHAR(d.expires_on,'YYYY-MM-DD'),
           'expirado', (d.expires_on IS NOT NULL AND d.expires_on < CURRENT_DATE)))
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

// GET /api/admin/sos — pedidos de ajuda por resolver
adminRouter.get(
  '/sos',
  wrap(async (_req, res) => {
    const rows = await alertasAbertos();
    res.json({
      alertas: rows.map((r) => ({
        id: r.id,
        rideId: r.ride_id,
        quem: r.quem,
        tipo: r.tipo || 'outro',
        telefone: r.telefone,
        papel: r.papel,
        destino: r.dest_label,
        estadoViagem: r.estado_viagem,
        lat: r.lat,
        lng: r.lng,
        nota: r.note,
        quando: r.created_at,
      })),
    });
  })
);

// POST /api/admin/sos/:id/resolver — marcar como tratado
adminRouter.post(
  '/sos/:id/resolver',
  wrap(async (req, res) => {
    const row = await resolverAlerta(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Alerta não encontrado.' });
    res.json({ ok: true });
  })
);

// GET /api/admin/resumo — o estado do serviço num ecrã só
adminRouter.get(
  '/resumo',
  wrap(async (_req, res) => {
    const [n] = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='driver' AND COALESCE(driver_status,'pending')='pending')::int AS pendentes,
        (SELECT COUNT(*) FROM users WHERE role='driver' AND driver_status='approved')::int AS aprovados,
        (SELECT COUNT(*) FROM users WHERE role='driver' AND driver_status='approved' AND is_online)::int AS disponiveis,
        (SELECT COUNT(*) FROM users WHERE role='passenger')::int AS passageiros,
        (SELECT COUNT(*) FROM sos_alerts WHERE resolved=FALSE)::int AS sos,
        (SELECT COUNT(*) FROM rides WHERE created_at > NOW() - INTERVAL '24 hours')::int AS viagens24h,
        (SELECT COUNT(*) FROM rides WHERE status='completed')::int AS concluidas,
        (SELECT COUNT(*) FROM rides WHERE status='requested')::int AS esperando
    `);
    res.json({ resumo: n });
  })
);

// GET /api/admin/turnos — quem está ao volante hoje
adminRouter.get(
  '/turnos',
  wrap(async (_req, res) => {
    const rows = await fotosDeHoje();
    res.json({
      turnos: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        nome: r.name,
        telefone: r.phone,
        quando: r.created_at,
        // Para comparar lado a lado com a foto do registo
        fotoRegistoId: r.foto_registo,
      })),
    });
  })
);

// GET /api/admin/turnos/:id/foto
adminRouter.get(
  '/turnos/:id/foto',
  wrap(async (req, res) => {
    const f = await getFotoDeTurno(Number(req.params.id));
    if (!f) return res.status(404).json({ error: 'Fotografia não encontrada.' });
    res.setHeader('Content-Type', f.mime);
    res.send(f.bytes);
  })
);
