import { Router } from 'express';
import { criarAlerta, cancelamentosRecentes } from '../sos.js';
import { requireAuth, requireRole, requireApprovedDriver } from '../auth.js';
import {
  createRide,
  getRideById,
  getActiveRideForUser,
  getRideHistoryForUser,
  getAvailableRidesForDriver,
  acceptRide,
  setRideStatus,
  setRideFare,
  toPublicRide,
  iniciarViagem,
} from '../rides.js';
import { addMessage, addSystemMessage, listMessages } from '../messages.js';
import { addRating, hasRated } from '../ratings.js';
import { notificarPedidoNovo, notificarAceite, notificarAdminsSOS } from '../push.js';
import { one, query } from '../db.js';
import { rota, preco } from '../routing.js';
import { config } from '../config.js';

// Motivos possíveis para cancelar. Os primeiros quatro são do passageiro,
// os quatro seguintes do motorista; a app mostra os que interessam a cada
// um. Guardar o código e não a frase permite contá-los depois.
const MOTIVOS_VALIDOS = [
  'mudei_de_ideias', 'motorista_demora', 'enganei_destino', 'outro_transporte',
  'longe_demais', 'passageiro_nao_aparece', 'problema_veiculo', 'destino_inacessivel',
  'outro',
];

export const ridesRouter = Router();

ridesRouter.use(requireAuth);

// O Express 4 não apanha erros de funções assíncronas: uma falha da base
// de dados deixaria o pedido pendurado até expirar. Este invólucro
// encaminha qualquer erro para o tratamento normal.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Cada lado recebe uma versão sua. O passageiro leva o código de recolha;
// o motorista não. Enviar o mesmo objecto aos dois seria dar-lhe a senha
// que ele tem de pedir.
function notify(io, ride, event) {
  io.to(`user:${ride.passenger_id}`).emit(event, toPublicRide(ride, { paraPassageiro: true }));
  if (ride.driver_id) io.to(`user:${ride.driver_id}`).emit(event, toPublicRide(ride));
}

async function rideForParticipant(rideId, userId) {
  const row = await getRideById(rideId);
  if (!row) return null;
  if (row.passenger_id !== userId && row.driver_id !== userId) return null;
  return row;
}

// POST /api/rides — passageiro pede uma viagem
ridesRouter.post(
  '/',
  // Sem guarda de papel: toda a gente pode pedir uma viagem, incluindo
  // quem também conduz.
  wrap(async (req, res) => {
    const {
      destLabel, destLat, destLng,
      originLabel, originLat, originLng,
      vehicleType, fareUsd, passengers,
    } = req.body || {};
    if (!destLabel || !destLabel.trim()) {
      return res.status(400).json({ error: 'Indica o destino.' });
    }

    const existing = await getActiveRideForUser(req.user);
    if (existing) {
      return res
        .status(409)
        .json({
        error: 'Já tens uma viagem a decorrer.',
        // É a viagem dele: leva o código, senão quem reabre a app por aqui
        // fica sem a senha que tem de dizer ao motorista.
        ride: toPublicRide(existing, { paraPassageiro: true }),
      });
    }

    // O preço é calculado AQUI, a partir da rota real. Se viesse da app,
    // bastaria alterar a distância no telemóvel para pagar sempre o
    // mínimo. Sem coordenadas (destino escrito à mão) aceita-se o valor
    // proposto, que nesse caso volta a ser combinado entre as pessoas.
    let precoFinal = fareUsd;
    let kmViagem = null;
    let minViagem = null;
    const temCoords =
      originLat != null && originLng != null && destLat != null && destLng != null;
    if (temCoords) {
      const viagem = await rota(
        { lat: Number(originLat), lng: Number(originLng) },
        { lat: Number(destLat), lng: Number(destLng) }
      );
      precoFinal = preco(vehicleType === 'motorbike' ? 'motorbike' : 'car', viagem.km);
      kmViagem = viagem.km;
      minViagem = viagem.min;
    }

    const row = await createRide({
      passengerId: req.user.id,
      destLabel, destLat, destLng,
      originLabel, originLat, originLng,
      vehicleType,
      fareUsd: precoFinal,
      distanceKm: kmViagem,
      durationMin: minViagem,
      // Só em carro: numa motorizada vai sempre uma pessoa.
      passengers: vehicleType === 'car' ? passengers : null,
    });
    // Quem criou a viagem é o passageiro: leva o código.
    const ride = toPublicRide(row, { paraPassageiro: true });
    // O que vai para os motoristas não o leva.
    const paraMotoristas = toPublicRide(row);

    const io = req.app.get('io');
    io.to(row.vehicle_type ? `drivers:${row.vehicle_type}` : 'drivers').emit('ride:new', paraMotoristas);

    // Notificação para quem tem a app fechada. Deliberadamente sem await:
    // se o serviço de notificações estiver lento, o passageiro não fica à
    // espera — o pedido já foi criado e entregue em tempo real.
    notificarPedidoNovo(paraMotoristas).catch(() => {});

    return res.status(201).json({ ride });
  })
);

// GET /api/rides/active
ridesRouter.get(
  '/active',
  wrap(async (req, res) => {
    const row = await getActiveRideForUser(req.user);
    // Quem pergunta decide o que vê: só o passageiro da viagem leva o
    // código de recolha, mesmo que quem chame seja o motorista dela.
    const souOPassageiro = !!row && row.passenger_id === req.user.id;
    return res.json({ ride: row ? toPublicRide(row, { paraPassageiro: souOPassageiro }) : null });
  })
);

// GET /api/rides/history
ridesRouter.get(
  '/history',
  wrap(async (req, res) => {
    const rows = await getRideHistoryForUser(req.user);
    return res.json({ rides: rows.map((r) => toPublicRide(r)) });
  })
);

// GET /api/rides/available — só motoristas
ridesRouter.get(
  '/available',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rows = await getAvailableRidesForDriver(
      req.user.vehicle_type || 'car',
      req.user.last_lat,
      req.user.last_lng,
      req.user.vehicle_seats
    );
    return res.json({ rides: rows.map((r) => toPublicRide(r)) });
  })
);

// POST /api/rides/:id/accept
ridesRouter.post(
  '/:id/accept',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { fareUsd } = req.body || {};
    const fare = fareUsd != null && fareUsd !== '' ? Number(fareUsd) : null;
    if (fare != null && (Number.isNaN(fare) || fare < 0)) {
      return res.status(400).json({ error: 'Tarifa inválida.' });
    }

    const row = await acceptRide(rideId, req.user.id, fare, req.user.vehicle_seats);
    if (!row) {
      // Duas causas possíveis; distingui-las poupa uma chamada de telefone
      // ao motorista a perguntar porque é que não conseguiu aceitar.
      const atual = await getRideById(rideId);
      if (
        atual?.status === 'requested' &&
        atual.passengers != null &&
        req.user.vehicle_seats != null &&
        atual.passengers > req.user.vehicle_seats
      ) {
        return res
          .status(409)
          .json({ error: `Esta viagem é para ${atual.passengers} pessoas e o teu carro leva ${req.user.vehicle_seats}.` });
      }
      return res.status(409).json({ error: 'Esta viagem já não está disponível.' });
    }

    const io = req.app.get('io');
    const ride = toPublicRide(row);
    notify(io, row, 'ride:update');
    io.to('drivers').emit('ride:taken', { id: row.id });

    // Uma linha na conversa a dizer que o motorista aceitou. Serve de
    // ponto de partida: uma conversa vazia não convida ninguém a escrever,
    // e é útil o passageiro poder responder logo com uma referência do
    // sítio onde está à espera.
    addSystemMessage(rideId, 'aceite')
      .then((m) => {
        io.to(`user:${row.passenger_id}`).emit('message:new', m);
        io.to(`user:${row.driver_id}`).emit('message:new', m);
      })
      .catch(() => {});

    // Avisar o passageiro, que pode ter fechado a app à espera
    one('SELECT push_token FROM users WHERE id = $1', [row.passenger_id])
      .then((u) => notificarAceite(u?.push_token, ride))
      .catch(() => {});

    return res.json({ ride });
  })
);

// POST /api/rides/:id/status
ridesRouter.post(
  '/:id/status',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { status } = req.body || {};
    if (!['arriving', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const row = await getRideById(rideId);
    if (!row || row.driver_id !== req.user.id) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }
    // 'arriving' só a caminho; 'completed' só depois de a viagem ter
    // começado — ou de estados antigos, para não travar viagens que já
    // estavam em curso quando isto foi acrescentado.
    const permitido =
      status === 'arriving'
        ? ['accepted']
        : ['in_progress', 'accepted', 'arriving'];
    if (!permitido.includes(row.status)) {
      return res.status(409).json({ error: 'Não é possível mudar o estado desta viagem.' });
    }

    const updated = await setRideStatus(rideId, status);
    notify(req.app.get('io'), updated, 'ride:update');
    return res.json({ ride: toPublicRide(updated) });
  })
);

// POST /api/rides/:id/start — começar a viagem com o código do passageiro
//
// É aqui que se prova que quem entrou no carro é quem pediu. O motorista
// nunca vê o código: pergunta-o em voz alta e escreve o que ouvir.
ridesRouter.post(
  '/:id/start',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { code } = req.body || {};
    if (!/^\d{4}$/.test(String(code || '').trim())) {
      return res.status(400).json({ error: 'O código tem quatro algarismos.' });
    }

    const updated = await iniciarViagem(rideId, req.user.id, code);
    if (!updated) {
      const atual = await getRideById(rideId);
      if (!atual || atual.driver_id !== req.user.id) {
        return res.status(404).json({ error: 'Viagem não encontrada.' });
      }
      if (!['accepted', 'arriving'].includes(atual.status)) {
        return res.status(409).json({ error: 'Esta viagem já começou ou terminou.' });
      }
      return res.status(403).json({ error: 'Código errado. Pergunta outra vez ao passageiro.' });
    }

    notify(req.app.get('io'), updated, 'ride:update');
    return res.json({ ride: toPublicRide(updated) });
  })
);

// POST /api/rides/:id/fare
ridesRouter.post(
  '/:id/fare',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const fare = Number(req.body?.fareUsd);
    if (Number.isNaN(fare) || fare < 0) return res.status(400).json({ error: 'Tarifa inválida.' });

    const row = await getRideById(rideId);
    if (!row || row.driver_id !== req.user.id) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }
    const updated = await setRideFare(rideId, fare);
    notify(req.app.get('io'), updated, 'ride:update');
    return res.json({ ride: toPublicRide(updated) });
  })
);

// GET /api/rides/:id/messages
ridesRouter.get(
  '/:id/messages',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    return res.json({ messages: await listMessages(rideId) });
  })
);

// POST /api/rides/:id/messages
ridesRouter.post(
  '/:id/messages',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    if (!row.driver_id) return res.status(409).json({ error: 'A viagem ainda não foi aceite.' });

    const message = await addMessage(rideId, req.user.id, body);
    const otherId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
    req.app.get('io').to(`user:${otherId}`).emit('message:new', message);

    return res.status(201).json({ message });
  })
);

// POST /api/rides/:id/rate
ridesRouter.post(
  '/:id/rate',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const stars = Number(req.body?.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Avaliação inválida.' });
    }

    const row = await rideForParticipant(rideId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    if (row.status !== 'completed') {
      return res.status(409).json({ error: 'Só podes avaliar uma viagem concluída.' });
    }
    if (await hasRated(rideId, req.user.id)) {
      return res.status(409).json({ error: 'Já avaliaste esta viagem.' });
    }

    const rateeId = row.passenger_id === req.user.id ? row.driver_id : row.passenger_id;
    await addRating({ rideId, raterId: req.user.id, rateeId, stars });
    return res.json({ ok: true });
  })
);

// POST /api/rides/:id/sos — pedido de ajuda durante uma viagem.
//
// Regista sempre, mesmo sem posição e mesmo sem viagem activa: quando
// alguém carrega neste botão, o pior resultado possível é o pedido
// perder-se por causa de um campo em falta.
ridesRouter.post(
  '/:id/sos',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id) || null;
    const { lat, lng, note } = req.body || {};

    if (rideId) {
      const row = await getRideById(rideId);
      const seuDono = row && (row.passenger_id === req.user.id || row.driver_id === req.user.id);
      if (!seuDono) return res.status(403).json({ error: 'Sem permissão.' });
    }

    const alerta = await criarAlerta({
      rideId,
      userId: req.user.id,
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
      note,
    });

    // Toca a todos os administradores em simultâneo, por socket e por push.
    req.app.get('io').to('admins').emit('sos:novo', { id: alerta.id });
    notificarAdminsSOS({ nome: req.user.name, rideId, lat, lng }).catch(() => {});

    return res.status(201).json({ alerta: { id: alerta.id }, emergencia: config.numeroEmergencia });
  })
);

// POST /api/rides/:id/cancel
ridesRouter.post(
  '/:id/cancel',
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const row = await getRideById(rideId);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });

    const isOwner = row.passenger_id === req.user.id || row.driver_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: 'Sem permissão.' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ error: 'Esta viagem já terminou.' });
    }

    // Motivo em lista fechada: texto livre não se conta, e o objectivo é
    // perceber padrões — se metade dos motoristas cancela por "passageiro
    // não aparece", isso muda o produto, não é uma queixa isolada.
    const motivo = MOTIVOS_VALIDOS.includes(req.body?.reason) ? req.body.reason : 'outro';
    await query('UPDATE rides SET cancel_reason = $1 WHERE id = $2', [motivo, rideId]);

    const updated = await setRideStatus(rideId, 'cancelled', req.user.id);
    const io = req.app.get('io');
    notify(io, updated, 'ride:update');
    if (row.status === 'requested') io.to('drivers').emit('ride:taken', { id: row.id });

    // Cancelar depois de o motorista já ter aceitado custa-lhe tempo e
    // combustível. Não bloqueamos ninguém — devolvemos o número para a app
    // poder avisar quem está a ganhar o hábito.
    const jaAceite = row.status !== 'requested';
    const cancelamentos = jaAceite ? await cancelamentosRecentes(req.user.id) : 0;

    return res.json({
      ride: toPublicRide(updated),
      cancelamentos,
      aviso: cancelamentos >= config.avisoCancelamentos ? 'demasiados' : null,
    });
  })
);
