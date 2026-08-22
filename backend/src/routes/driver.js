import { Router } from 'express';
import { one, query } from '../db.js';
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

// GET /api/driver/ganhos — quanto o motorista fez
//
// O dinheiro nunca passa por nós: é entregue em mão. Isto não é uma conta
// bancária, é a soma das viagens que ele concluiu — serve para ele saber
// se valeu a pena o dia, que é a pergunta que um motorista faz ao jantar.
//
// Os intervalos usam a hora de Díli (UTC+9). Sem isso, "hoje" acabava às
// 15h da tarde, porque o servidor pensa em UTC.
driverRouter.get(
  '/ganhos',
  wrap(async (req, res) => {
    const [n] = await query(
      `WITH minhas AS (
         SELECT fare_usd, (created_at AT TIME ZONE 'Asia/Dili') AS quando
         FROM rides WHERE driver_id = $1 AND status = 'completed'
       )
       SELECT
         COALESCE(SUM(fare_usd) FILTER (WHERE quando::date = (NOW() AT TIME ZONE 'Asia/Dili')::date), 0)::float AS hoje,
         COUNT(*) FILTER (WHERE quando::date = (NOW() AT TIME ZONE 'Asia/Dili')::date)::int AS viagensHoje,
         COALESCE(SUM(fare_usd) FILTER (WHERE quando > (NOW() AT TIME ZONE 'Asia/Dili') - INTERVAL '7 days'), 0)::float AS semana,
         COUNT(*) FILTER (WHERE quando > (NOW() AT TIME ZONE 'Asia/Dili') - INTERVAL '7 days')::int AS viagensSemana,
         COALESCE(SUM(fare_usd), 0)::float AS total,
         COUNT(*)::int AS viagensTotal
       FROM minhas`,
      [req.user.id]
    );

    // Últimos 7 dias, para o motorista ver que dias rendem mais
    const dias = await query(
      // Texto e não data: um 'date' viaja como instante e a app volta a
      // interpretá-lo no fuso dela, trocando o dia. 'YYYY-MM-DD' não tem
      // fuso nenhum para interpretar mal.
      `SELECT TO_CHAR((created_at AT TIME ZONE 'Asia/Dili')::date, 'YYYY-MM-DD') AS dia,
              COALESCE(SUM(fare_usd),0)::float AS valor,
              COUNT(*)::int AS viagens
       FROM rides
       WHERE driver_id = $1 AND status = 'completed'
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY 1 ORDER BY 1 DESC`,
      [req.user.id]
    );

    res.json({
      ganhos: {
        hoje: Math.round(n.hoje * 100) / 100,
        viagensHoje: n.viagenshoje,
        semana: Math.round(n.semana * 100) / 100,
        viagensSemana: n.viagenssemana,
        total: Math.round(n.total * 100) / 100,
        viagensTotal: n.viagenstotal,
        dias: dias.map((d) => ({
          dia: d.dia,
          valor: Math.round(d.valor * 100) / 100,
          viagens: d.viagens,
        })),
      },
    });
  })
);

// POST /api/driver/terms — aceitar os termos específicos de motorista
//
// Separado do registo de propósito: os termos de motorista falam de seguro,
// de documentos válidos e de trabalho independente. Aceitá-los ANTES de
// enviar os documentos seria aceitar no abstracto; aqui a pessoa já sabe
// exactamente o que entregou.
driverRouter.post(
  '/terms',
  wrap(async (req, res) => {
    const { version } = req.body || {};
    if (!version) return res.status(400).json({ error: 'Versão dos termos em falta.' });
    const row = await one(
      `UPDATE users SET driver_terms_version = $1, driver_terms_accepted_at = NOW()
       WHERE id = $2 RETURNING *`,
      [String(version), req.user.id]
    );
    res.json({ user: toPublicUser(row) });
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
