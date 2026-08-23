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
    const status = ['pending', 'approved', 'rejected', 'suspended', 'todos'].includes(
      req.query.status
    )
      ? req.query.status
      : 'pending';

    const rows = await query(
      `SELECT u.*,
         (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status='completed')::int AS viagens,
         (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status='cancelled'
            AND r.cancelled_by = u.id)::int AS cancelou,
         (SELECT TO_CHAR(MIN(d.expires_on),'YYYY-MM-DD') FROM driver_documents d
            WHERE d.user_id = u.id AND d.expires_on IS NOT NULL) AS validade_min,
         EXISTS (SELECT 1 FROM driver_shifts s
            WHERE s.user_id = u.id AND s.dia = (NOW() AT TIME ZONE 'Asia/Dili')::date) AS foto_hoje,
       (
         SELECT json_agg(json_build_object(
           'id', d.id, 'kind', d.kind, 'mime', d.mime,
           'expiresOn', TO_CHAR(d.expires_on,'YYYY-MM-DD'),
           'expirado', (d.expires_on IS NOT NULL AND d.expires_on < CURRENT_DATE)))
         FROM driver_documents d WHERE d.user_id = u.id
       ) AS docs
       FROM users u
       WHERE u.driver_status IS NOT NULL
         AND ($1 = 'todos' OR u.driver_status = $1)
       ORDER BY
         -- Quem espera decisão aparece primeiro: é a única coisa nesta
         -- lista que depende de alguém agir.
         (u.driver_status = 'pending') DESC,
         u.is_online DESC,
         u.created_at ASC`,
      [status]
    );

    res.json({
      drivers: rows.map((r) => ({
        ...toPublicUser(r),
        documents: r.docs || [],
        online: !!r.is_online,
        viagens: r.viagens,
        cancelou: r.cancelou,
        fotoHoje: !!r.foto_hoje,
        validadeMin: r.validade_min || null,
        ultimaVez: r.last_seen_at || null,
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
    const { decision, motivo } = req.body || {};
    if (!['approved', 'rejected', 'suspended'].includes(decision)) {
      return res.status(400).json({ error: 'Decisão inválida.' });
    }
    // Suspender e recusar exigem motivo. Aprovar não: o motivo de aprovar
    // são os documentos, que já lá estão.
    if (decision !== 'approved' && !String(motivo || '').trim()) {
      return res.status(400).json({ error: 'Indica o motivo da decisão.' });
    }

    const row = await one(
      `UPDATE users
       SET driver_status = $1,
           driver_status_motivo = $2,
           driver_status_em = NOW(),
           driver_status_por = $3,
           -- Quem deixa de poder conduzir fica offline na mesma acção. Se
           -- ficasse online, continuaria a receber pedidos até se lembrar
           -- de desligar — e um motorista suspenso a receber pedidos é o
           -- contrário de uma suspensão.
           is_online = CASE WHEN $1 = 'approved' THEN is_online ELSE FALSE END
       WHERE id = $4 AND driver_status IS NOT NULL
       RETURNING *`,
      [decision, String(motivo || '').trim() || null, req.user.id, Number(req.params.id)]
    );
    if (!row) return res.status(404).json({ error: 'Motorista não encontrado.' });

    const io = req.app.get('io');
    // Avisar o motorista na hora, para ele não ficar a recarregar a app
    io.to(`user:${row.id}`).emit('driver:status', { status: decision, motivo: row.driver_status_motivo });
    // E tirá-lo das salas do tempo real, senão continuava a receber
    // pedidos até fechar a app.
    if (decision !== 'approved') {
      await io.in(`user:${row.id}`).socketsLeave(['drivers', `drivers:${row.vehicle_type || 'car'}`]);
    }

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

// GET /api/admin/viagens — o que se passou nas últimas horas
//
// Sem isto, quem gere o serviço não sabe se ele está a funcionar. Os
// números do resumo dizem quantas; isto diz quais, e o que lhes aconteceu.
adminRouter.get(
  '/viagens',
  wrap(async (req, res) => {
    const horas = Math.min(168, Math.max(1, Number(req.query.horas) || 24));
    const rows = await query(
      `SELECT r.id, r.status, r.dest_label, r.origin_label, r.fare_usd,
              r.distance_km, r.duration_min, r.passengers, r.cancel_reason,
              r.created_at, r.started_at,
              p.name AS passageiro, p.phone AS tel_passageiro,
              d.name AS motorista, d.phone AS tel_motorista,
              r.cancelled_by = r.passenger_id AS cancelou_passageiro
       FROM rides r
       JOIN users p ON p.id = r.passenger_id
       LEFT JOIN users d ON d.id = r.driver_id
       WHERE r.created_at > NOW() - ($1 || ' hours')::interval
       ORDER BY r.id DESC
       LIMIT 60`,
      [String(horas)]
    );
    res.json({
      viagens: rows.map((r) => ({
        id: r.id,
        estado: r.status,
        origem: r.origin_label,
        destino: r.dest_label,
        preco: r.fare_usd,
        km: r.distance_km,
        min: r.duration_min,
        pessoas: r.passengers,
        motivoCancelamento: r.cancel_reason,
        canceladoPeloPassageiro: r.cancelou_passageiro,
        passageiro: r.passageiro,
        telPassageiro: r.tel_passageiro,
        motorista: r.motorista,
        telMotorista: r.tel_motorista,
        quando: r.created_at,
      })),
    });
  })
);

// GET /api/admin/estatisticas — o que está a correr mal, e com que peso
adminRouter.get(
  '/estatisticas',
  wrap(async (req, res) => {
    const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 7));
    const intervalo = `${dias} days`;

    const [cancelamentos, tempos, docs] = await Promise.all([
      // Motivos de cancelamento, do mais frequente ao menos. É a lista que
      // diz o que corrigir a seguir.
      query(
        `SELECT COALESCE(cancel_reason,'outro') AS motivo, COUNT(*)::int AS n
         FROM rides
         WHERE status='cancelled' AND created_at > NOW() - $1::interval
         GROUP BY 1 ORDER BY n DESC`,
        [intervalo]
      ),
      // Quanto tempo um pedido espera até alguém o aceitar. Acima de dois
      // ou três minutos, o passageiro desiste.
      one(
        `SELECT
           COUNT(*) FILTER (WHERE driver_id IS NOT NULL)::int AS aceites,
           COUNT(*) FILTER (WHERE status='cancelled' AND driver_id IS NULL)::int AS sem_resposta,
           ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
                 FILTER (WHERE driver_id IS NOT NULL))::int AS segundos_ate_aceitar
         FROM rides WHERE created_at > NOW() - $1::interval`,
        [intervalo]
      ),
      // Documentos a caducar nos próximos 30 dias: dá tempo de avisar
      // antes de alguém deixar de poder trabalhar de um dia para o outro.
      query(
        `SELECT u.id, u.name, u.phone, d.kind,
                TO_CHAR(d.expires_on,'YYYY-MM-DD') AS ate
         FROM driver_documents d JOIN users u ON u.id = d.user_id
         WHERE d.expires_on IS NOT NULL
           AND d.expires_on < CURRENT_DATE + 30
           AND u.driver_status = 'approved'
         ORDER BY d.expires_on ASC`
      ),
    ]);

    res.json({
      dias,
      cancelamentos: cancelamentos.map((c) => ({ motivo: c.motivo, n: c.n })),
      aceites: tempos?.aceites ?? 0,
      semResposta: tempos?.sem_resposta ?? 0,
      segundosAteAceitar: tempos?.segundos_ate_aceitar ?? null,
      documentosACaducar: docs.map((d) => ({
        userId: d.id,
        nome: d.name,
        telefone: d.phone,
        tipo: d.kind,
        ate: d.ate,
      })),
    });
  })
);
