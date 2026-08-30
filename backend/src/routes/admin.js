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
    registarAcesso(req.user.id, 'documento', doc.user_id);
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
        (SELECT COUNT(*) FROM rides WHERE status='requested')::int AS esperando,
        -- Veículos em serviço: motoristas com uma viagem a decorrer neste
        -- momento. Não é o mesmo que "disponíveis" — um motorista pode estar
        -- online sem passageiro, e é essa diferença que interessa ver.
        (SELECT COUNT(DISTINCT driver_id) FROM rides
          WHERE status IN ('accepted','arriving','in_progress') AND driver_id IS NOT NULL)::int
          AS "veiculosServico",
        (SELECT COUNT(*) FROM rides
          WHERE status='cancelled' AND created_at > NOW() - INTERVAL '24 hours')::int
          AS "canceladas24h",
        -- Soma das tarifas cobradas PELOS MOTORISTAS nas viagens concluídas.
        -- Não é receita da TimorgianaRide: a plataforma não cobra comissão e
        -- não recebe nada. Chamar-lhe receita seria dizer, no próprio painel
        -- da empresa, o contrário do que os termos afirmam.
        (SELECT COALESCE(SUM(fare_usd),0) FROM rides
          WHERE status='completed' AND created_at > NOW() - INTERVAL '24 hours')::float8
          AS "tarifas24h"
    `);
    res.json({ resumo: n });
  })
);

// GET /api/admin/notificacoes — o que precisa de atenção
//
// Não é uma tabela de notificações guardadas: é uma leitura do estado
// actual. Uma notificação guardada tem de ser criada, marcada como lida e
// depois limpa — três sítios onde pode ficar dessincronizada da realidade.
// Aqui, quando o motorista for aprovado a notificação desaparece sozinha,
// porque a razão dela desapareceu.
adminRouter.get(
  '/notificacoes',
  wrap(async (_req, res) => {
    const [n] = await query(`
      SELECT
        (SELECT COUNT(*) FROM users
          WHERE role='driver' AND COALESCE(driver_status,'pending')='pending')::int
          AS "aprovacoes",
        (SELECT COUNT(*) FROM sos_alerts WHERE resolved=FALSE)::int AS "sos",
        (SELECT COUNT(*) FROM rides
          WHERE status='requested' AND created_at < NOW() - INTERVAL '5 minutes')::int
          AS "semResposta",
        (SELECT COUNT(DISTINCT user_id) FROM driver_documents
          WHERE expires_on IS NOT NULL AND expires_on < CURRENT_DATE)::int
          AS "docsCaducados",
        (SELECT COUNT(DISTINCT user_id) FROM driver_documents
          WHERE expires_on IS NOT NULL AND expires_on >= CURRENT_DATE
            AND expires_on < CURRENT_DATE + 30)::int AS "docsACaducar",
        (SELECT COUNT(*) FROM rides
          WHERE status='cancelled' AND created_at > NOW() - INTERVAL '24 hours')::int
          AS "canceladas",
        (SELECT COUNT(*) FROM users WHERE driver_status='suspended')::int AS "suspensas"
    `);

    // Cada item traz a gravidade consigo. O ecrã não deve ter de decidir se
    // um SOS é mais grave do que um documento caducado — isso é regra de
    // negócio, e vive aqui.
    const itens = [
      { chave: 'sos', n: n.sos, nivel: 'mau', seccao: 'resumo' },
      { chave: 'docsCaducados', n: n.docsCaducados, nivel: 'mau', seccao: 'motoristas' },
      { chave: 'aprovacoes', n: n.aprovacoes, nivel: 'aviso', seccao: 'motoristas' },
      { chave: 'semResposta', n: n.semResposta, nivel: 'aviso', seccao: 'viagens' },
      { chave: 'docsACaducar', n: n.docsACaducar, nivel: 'aviso', seccao: 'motoristas' },
      { chave: 'canceladas', n: n.canceladas, nivel: 'neutro', seccao: 'viagens' },
      { chave: 'suspensas', n: n.suspensas, nivel: 'neutro', seccao: 'contas' },
    ].filter((i) => i.n > 0);

    // O número do sino conta só o que exige acção. Canceladas e suspensas
    // são informação, não tarefas — se entrassem na conta, o sino estava
    // sempre aceso e deixava de querer dizer nada.
    const porTratar = itens
      .filter((i) => i.nivel !== 'neutro')
      .reduce((soma, i) => soma + i.n, 0);

    res.json({ itens, porTratar });
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

// Regista um acesso a conteúdo privado.
//
// Já não há chat para registar — a administração deixou de o poder ler.
// Fica para os DOCUMENTOS: cartas de condução e fotografias de
// identificação continuam a ser dados pessoais sensíveis, e quem os vê
// deve ficar registado.
//
// Não trava nada e nunca faz o pedido falhar: se o registo falhar, o
// administrador continua a ver o que pediu. Um painel que deixa de
// funcionar porque a auditoria falhou é pior do que um sem auditoria.
function registarAcesso(adminId, que, alvoId) {
  query('INSERT INTO admin_acessos (admin_id, que, alvo_id) VALUES ($1,$2,$3)', [
    adminId,
    que,
    alvoId ?? null,
  ]).catch(() => {});
}

// GET /api/admin/utilizadores — TODAS as contas, não só motoristas
//
// Os passageiros não apareciam em lado nenhum do painel. Metade das
// pessoas do sistema era invisível a quem o administra — e é do lado dos
// passageiros que vêm as queixas sobre motoristas.
adminRouter.get(
  '/utilizadores',
  wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const papel = String(req.query.papel || 'todos');
    const pagina = Math.max(0, Number(req.query.pagina) || 0);
    const POR_PAGINA = 30;

    // Filtros construídos com parâmetros, nunca por concatenação: um nome
    // com aspa simples chegaria à consulta.
    const cond = [];
    const args = [];
    if (q) {
      args.push(`%${q}%`);
      cond.push(`(u.name ILIKE $${args.length} OR u.phone ILIKE $${args.length})`);
    }
    if (papel === 'motoristas') cond.push('u.driver_status IS NOT NULL');
    if (papel === 'passageiros') cond.push('u.driver_status IS NULL');
    if (papel === 'admins') cond.push('u.is_admin = TRUE');
    if (papel === 'suspensas') cond.push("u.driver_status = 'suspended'");
    const onde = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    args.push(POR_PAGINA + 1, pagina * POR_PAGINA);
    const rows = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.driver_status, u.is_admin, u.is_online,
              u.rating_avg, u.rating_count, u.created_at, u.last_seen_at,
              u.vehicle_type, u.vehicle_plate,
              (SELECT COUNT(*) FROM rides r WHERE r.passenger_id = u.id) AS como_passageiro,
              (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id) AS como_motorista
       FROM users u ${onde}
       ORDER BY u.id DESC
       LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args
    );

    // Pede-se um a mais do que cabe: se vier, há página seguinte. Evita um
    // COUNT(*) sobre a tabela inteira a cada folha.
    const haMais = rows.length > POR_PAGINA;
    res.json({
      utilizadores: rows.slice(0, POR_PAGINA).map((u) => ({
        id: u.id,
        nome: u.name,
        telefone: u.phone,
        email: u.email || null,
        driverStatus: u.driver_status,
        isAdmin: u.is_admin,
        online: u.is_online,
        estrelas: u.rating_avg,
        avaliacoes: u.rating_count,
        desde: u.created_at,
        ultimaVez: u.last_seen_at,
        veiculo: u.vehicle_plate ? { tipo: u.vehicle_type, matricula: u.vehicle_plate } : null,
        viagensPassageiro: Number(u.como_passageiro),
        viagensMotorista: Number(u.como_motorista),
      })),
      haMais,
      pagina,
    });
  })
);

// GET /api/admin/utilizadores/:id — tudo sobre uma pessoa
adminRouter.get(
  '/utilizadores/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const u = await one('SELECT * FROM users WHERE id = $1', [id]);
    if (!u) return res.status(404).json({ error: 'Conta não encontrada.' });

    const [docs, viagens, avaliacoes, turnos, sos] = await Promise.all([
      query(
        `SELECT id, kind, size_bytes, created_at, TO_CHAR(expires_on,'YYYY-MM-DD') AS expires_on,
                (expires_on IS NOT NULL AND expires_on < CURRENT_DATE) AS caducado
         FROM driver_documents WHERE user_id = $1 ORDER BY kind`,
        [id]
      ),
      query(
        `SELECT r.id, r.status, r.origin_label, r.dest_label, r.fare_usd, r.distance_km,
                r.created_at, r.driver_id = $1 AS conduziu
         FROM rides r WHERE r.passenger_id = $1 OR r.driver_id = $1
         ORDER BY r.id DESC LIMIT 40`,
        [id]
      ),
      query(
        `SELECT a.stars, a.created_at, a.ride_id, q.name AS de
         FROM ratings a JOIN users q ON q.id = a.rater_id
         WHERE a.ratee_id = $1 ORDER BY a.id DESC LIMIT 20`,
        [id]
      ),
      query(
        `SELECT id, TO_CHAR(dia,'YYYY-MM-DD') AS dia, created_at
         FROM driver_shifts WHERE user_id = $1 ORDER BY dia DESC`,
        [id]
      ),
      query(
        `SELECT id, tipo, lat, lng, resolved, created_at, ride_id
         FROM sos_alerts WHERE user_id = $1 ORDER BY id DESC LIMIT 10`,
        [id]
      ),
    ]);

    res.json({
      conta: {
        ...toPublicUser(u),
        email: u.email || null,
        desde: u.created_at,
        ultimaVez: u.last_seen_at,
        online: u.is_online,
        ultimaPosicao: u.last_lat != null ? { lat: u.last_lat, lng: u.last_lng } : null,
        // Aceitação dos termos: numa disputa, é a primeira coisa que se
        // pergunta e não estava guardada em sítio nenhum visível.
        termos: {
          passageiro: u.terms_version
            ? { versao: u.terms_version, quando: u.terms_accepted_at }
            : null,
          motorista: u.driver_terms_version
            ? { versao: u.driver_terms_version, quando: u.driver_terms_accepted_at }
            : null,
        },
        decisao: u.driver_status_em
          ? { motivo: u.driver_status_motivo, quando: u.driver_status_em, por: u.driver_status_por }
          : null,
      },
      documentos: docs.map((d) => ({
        id: d.id,
        tipo: d.kind,
        tamanho: d.size_bytes,
        quando: d.created_at,
        validade: d.expires_on,
        caducado: !!d.caducado,
      })),
      viagens: viagens.map((r) => ({
        id: r.id,
        estado: r.status,
        origem: r.origin_label,
        destino: r.dest_label,
        preco: r.fare_usd,
        km: r.distance_km,
        quando: r.created_at,
        papel: r.conduziu ? 'motorista' : 'passageiro',
      })),
      avaliacoes: avaliacoes.map((a) => ({
        estrelas: a.stars,
        de: a.de,
        viagem: a.ride_id,
        quando: a.created_at,
      })),
      turnos: turnos.map((t) => ({ id: t.id, dia: t.dia, quando: t.created_at })),
      emergencias: sos.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        resolvido: s.resolved,
        quando: s.created_at,
        viagem: s.ride_id,
        posicao: s.lat != null ? { lat: s.lat, lng: s.lng } : null,
      })),
    });
  })
);

// GET /api/admin/viagens/:id — tudo sobre uma viagem
adminRouter.get(
  '/viagens/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const r = await one(
      `SELECT r.*, p.name AS p_nome, p.phone AS p_tel, p.rating_avg AS p_estrelas,
              d.name AS d_nome, d.phone AS d_tel, d.rating_avg AS d_estrelas,
              c.name AS cancelou_nome,
              (SELECT COUNT(*) FROM messages m WHERE m.ride_id = r.id) AS n_mensagens
       FROM rides r
       JOIN users p ON p.id = r.passenger_id
       LEFT JOIN users d ON d.id = r.driver_id
       LEFT JOIN users c ON c.id = r.cancelled_by
       WHERE r.id = $1`,
      [id]
    );
    if (!r) return res.status(404).json({ error: 'Viagem não encontrada.' });

    const avaliacoes = await query(
      `SELECT a.stars, a.created_at, q.name AS de, w.name AS para
       FROM ratings a JOIN users q ON q.id = a.rater_id JOIN users w ON w.id = a.ratee_id
       WHERE a.ride_id = $1`,
      [id]
    );

    res.json({
      viagem: {
        id: r.id,
        estado: r.status,
        origem: { nome: r.origin_label, lat: r.origin_lat, lng: r.origin_lng },
        destino: { nome: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
        preco: r.fare_usd,
        km: r.distance_km,
        min: r.duration_min,
        veiculo: r.vehicle_type,
        pessoas: r.passengers,
        // O código de recolha só faz sentido enquanto a viagem não começou;
        // depois disso é um segredo gasto que não precisa de ser mostrado.
        codigoRecolha: ['requested', 'accepted', 'arriving'].includes(r.status)
          ? r.pickup_code
          : null,
        pedida: r.created_at,
        comecou: r.started_at,
        actualizada: r.updated_at,
        cancelamento: r.cancelled_by
          ? { por: r.cancelou_nome, motivo: r.cancel_reason, quem: r.cancelled_by === r.passenger_id ? 'passageiro' : 'motorista' }
          : null,
        passageiro: { id: r.passenger_id, nome: r.p_nome, telefone: r.p_tel, estrelas: r.p_estrelas },
        motorista: r.driver_id
          ? {
              id: r.driver_id,
              nome: r.d_nome,
              telefone: r.d_tel,
              estrelas: r.d_estrelas,
              veiculo: {
                tipo: r.vehicle_type,
                modelo: r.vehicle_model,
                matricula: r.vehicle_plate,
                cor: r.vehicle_color,
              },
            }
          : null,
        nMensagens: Number(r.n_mensagens),
        avaliacoes: avaliacoes.map((a) => ({
          estrelas: a.stars,
          de: a.de,
          para: a.para,
          quando: a.created_at,
        })),
      },
    });
  })
);

// GET /api/admin/registo — quem viu que documentos
adminRouter.get(
  '/registo',
  wrap(async (req, res) => {
    // O período é filtrado no SQL e não no telemóvel. Filtrar depois de
    // trazer as 100 linhas mais recentes daria um filtro que mente: com
    // movimento a sério, "30 dias" mostraria apenas o que coubesse nessas
    // 100 — e quem consulta uma auditoria não pode desconfiar do que vê.
    const dias = [1, 7, 30].includes(Number(req.query.dias)) ? Number(req.query.dias) : 30;
    const rows = await query(
      `SELECT a.id, a.que, a.alvo_id, a.created_at, u.name AS admin
       FROM admin_acessos a JOIN users u ON u.id = a.admin_id
       WHERE a.created_at > NOW() - ($1 || ' days')::interval
       ORDER BY a.id DESC LIMIT 200`,
      [String(dias)]
    );
    res.json({
      acessos: rows.map((a) => ({
        id: a.id,
        que: a.que,
        alvo: a.alvo_id,
        admin: a.admin,
        quando: a.created_at,
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
