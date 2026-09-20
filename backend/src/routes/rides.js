import { Router } from 'express';
import { marcarEtapaCarga } from '../rides.js';
import { notificarComprado, notificarEtapaCarga } from '../push.js';
import { criarAviso, cancelarAvisos } from '../avisos.js';
import { servicoEstaAtivo } from '../configServico.js';
import { jaTemEncomendaAberta, marcarComprado, porqueNaoPode, taxaDe } from '../jastip.js';
import {
  TIPOS_CARGA,
  TIPOS_VEICULO,
  MOTIVOS_RECUSA,
  VOLUMES_CARGA,
  ETAPAS_CARGA,
} from '../config.js';
import { cabe } from '../capacidade.js';
import { criarAlerta, cancelamentosRecentes } from '../sos.js';
import { ultimaFotoDeTurno } from '../turnos.js';
import { getOwnDocument } from '../documents.js';
import { guardarFotoDaCarga, fotoDaCarga } from '../fotosDaCarga.js';
import { limparDestinos } from '../destinosDaViagem.js';
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
  motoristaOcupado,
} from '../rides.js';
import { registarSemEsperar, EVENTOS } from '../eventos.js';
import { addMessage, addSystemMessage, listMessages } from '../messages.js';
import { addRating, hasRated } from '../ratings.js';
import { notificarPedidoNovo, notificarAceite, notificarAdminsSOS } from '../push.js';
import { one, query } from '../db.js';
import { rota, preco, straightKm } from '../routing.js';
import { podeIr } from '../cobertura.js';
import { config } from '../config.js';
import { registarDia } from '../assinatura.js';

// Motivos possíveis para cancelar. Os primeiros quatro são do passageiro,
// os quatro seguintes do motorista; a app mostra os que interessam a cada
// um. Guardar o código e não a frase permite contá-los depois.
const MOTIVOS_VALIDOS = [
  'mudei_de_ideias',
  'motorista_demora',
  'enganei_destino',
  'outro_transporte',
  'longe_demais',
  'passageiro_nao_aparece',
  'problema_veiculo',
  'destino_inacessivel',
  'outro',
  // Não é de ninguém: é o pedido a morrer sozinho ao fim de dez minutos sem
  // resposta. Fica na mesma lista para poder ser contado com os outros — se
  // aparecer muito, o problema não é o passageiro nem o motorista, é não haver
  // motoristas àquela hora.
  'sem_motorista',
];

// Número ou nulo. As posições vêm de sítios diferentes — corpo do pedido,
// última posição conhecida do motorista — e nem todas trazem número.
function num2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Metros entre a posição do utilizador e o destino da viagem. Só para o
// registo: serve para responder a "ele deixou-me longe do sítio" com um
// número em vez de uma opinião.
function metrosEntre(quem, viagem) {
  const a = { lat: num2(quem?.last_lat), lng: num2(quem?.last_lng) };
  const b = { lat: num2(viagem?.dest_lat), lng: num2(viagem?.dest_lng) };
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  return Math.round(straightKm(a, b) * 1000);
}

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

// OS LUGARES DA CABINE NÃO CONTAM NUM CARRY.
//
// O filtro "a viagem cabe no veículo" existe para o carro: seis pessoas não
// entram num carro de quatro. Num Carry as pessoas vão na CAIXA, e os dois
// lugares da cabine não dizem nada sobre quantas cabem. Sem isto, um
// motorista de Carry com lugares registados deixava de ver os grupos — o
// único pedido de pessoas para que o Carry serve.
//
// Resolvido aqui e não no SQL: `null` já faz as consultas deixarem passar
// tudo — é o mesmo caminho de quem não tem lugares registados.
function lugaresQueContam(user) {
  return user?.vehicle_type === 'carry' ? null : (user?.vehicle_seats ?? null);
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
      destLabel,
      destLat,
      destLng,
      originLabel,
      originLat,
      originLng,
      vehicleType,
      fareUsd,
      passengers,
      viajanteNome,
      viajanteTelefone,
      viajanteMenor,
      consentimentoMenor,
      cargaTipo,
      cargaVolume,
      cargaAjuda,
      cargaNotas,
      cargaDeclarada,
      destinos,
      carryModo,
      cargaOutro,
      cargaTipos,
      // A encomenda (jastip): o que comprar e até quanto gastar.
      servico,
      jastip,
    } = req.body || {};
    if (!destLabel || !destLabel.trim()) {
      return res.status(400).json({ error: 'Indica o destino.' });
    }

    // UM SERVIÇO DESLIGADO NO PAINEL não aceita pedidos novos. As viagens já a
    // decorrer continuam: desligar é para parar de receber, não para largar
    // ninguém a meio.
    //
    // Vale para qualquer serviço e não só para o Pickup — é a mesma regra, e
    // duas cópias dela acabariam a divergir no dia em que uma mudasse.
    if (!servicoEstaAtivo(vehicleType)) {
      return res.status(503).json({
        error:
          vehicleType === 'carry'
            ? 'O Pickup está temporariamente indisponível.'
            : 'Este serviço está temporariamente indisponível.',
      });
    }

    // ── Comprar por encomenda (jastip) ─────────────────────────────
    //
    // TRÊS PORTAS, e nenhuma delas é conveniência da app: o serviço tem de
    // estar ligado, quem pede tem de ter história na app, e uma encomenda de
    // cada vez. Cada encomenda é dinheiro de um motorista na rua; três ao
    // mesmo tempo eram três motoristas a arriscar pela mesma pessoa antes de
    // ela ter pago a primeira.
    const ehEncomenda = servico === 'jastip';
    if (ehEncomenda) {
      if (!servicoEstaAtivo('jastip')) {
        return res.status(503).json({ error: 'Este serviço está temporariamente indisponível.' });
      }
      const impede = await porqueNaoPode({
        userId: req.user.id,
        lista: jastip?.lista,
        tetoUsd: jastip?.teto,
      });
      if (impede) return res.status(400).json({ error: impede });
      if (await jaTemEncomendaAberta(req.user.id)) {
        return res.status(409).json({ error: 'Já tens uma encomenda a decorrer.' });
      }
    }

    // ── Transporte de bens ─────────────────────────────────────────
    //
    // Validado AQUI e não só na app, pela mesma razão das regras abaixo: a
    // app é conveniência, um telemóvel modificado manda o que quiser, e estas
    // duas são as que dão sentido ao serviço.
    //
    // A DECLARAÇÃO é condição de o pedido existir, não um aviso. Sem ela não
    // se cria viagem nenhuma — e o que fica gravado é a HORA em que foi feita,
    // porque um "sim" diz que alguém concordou alguma vez e a hora diz que
    // concordou antes daquela viagem.
    if (vehicleType === 'carry') {
      if (!TIPOS_CARGA.includes(cargaTipo)) {
        return res.status(400).json({ error: 'Indica o que vais transportar.' });
      }
      if (!cargaDeclarada) {
        return res.status(400).json({
          error: 'Confirma que os bens são legais, seguros e cabem no veículo.',
        });
      }
    }

    // ── Pedir para outra pessoa ────────────────────────────────────
    //
    // Validado AQUI e não só na app. A app é conveniência; um telemóvel
    // modificado manda o que quiser, e estas três regras são as que dão
    // sentido ao resto.
    const nomeOutro = String(viajanteNome || '').trim();
    if (nomeOutro) {
      // O TELEFONE É OBRIGATÓRIO quando quem viaja não é quem pede.
      //
      // Sem ele o motorista chega ao ponto de recolha e não tem a quem
      // ligar: quem atende o telefone da conta está em casa, e quem está
      // no passeio não tem forma de dizer "estou aqui". É a diferença
      // entre uma viagem e uma pessoa à espera de um carro que não a vê.
      if (!String(viajanteTelefone || '').trim()) {
        return res.status(400).json({
          error: 'Indica o telemóvel de quem vai viajar — o motorista precisa de lhe ligar.',
        });
      }
      // O CONSENTIMENTO É EXIGIDO PARA MENORES, e é uma declaração de quem
      // pede: que é responsável pelo menor, ou tem autorização de quem o é.
      // Sem ela não se cria a viagem — não é uma caixa de aviso que se pode
      // fechar, é a condição de existir o pedido.
      if (viajanteMenor && !consentimentoMenor) {
        return res.status(400).json({
          error: 'Para uma pessoa menor de idade, é preciso declarar a autorização dos pais.',
        });
      }
    } else if (viajanteTelefone || viajanteMenor) {
      // Telefone ou marca de menor sem nome é um pedido mal formado, e
      // deixá-lo passar criava uma viagem que diz ser para outra pessoa e
      // não sabe dizer para quem.
      return res.status(400).json({ error: 'Indica o nome de quem vai viajar.' });
    }

    // DÁ PARA LÁ IR?
    //
    // Verificado AQUI e não só na app. Sem isto, um pedido para o meio do mar
    // criava uma viagem: o motorista recebia-a, não podia lá chegar, e o
    // passageiro ficava à espera de um carro que nunca ia aparecer — nenhum
    // dos dois a perceber porquê.
    //
    // Só o DESTINO. A recolha vem do GPS ou de um ponto encostado à estrada,
    // e recusá-la a meio de uma leitura má seria impedir alguém de pedir uma
    // viagem por o satélite ter tremido.
    if (destLat != null && destLng != null) {
      const cobertura = await podeIr(Number(destLat), Number(destLng));
      if (!cobertura.ok) {
        return res.status(400).json({
          error: 'Não há serviço nesse sítio.',
          razao: cobertura.razao,
        });
      }
    }

    const existing = await getActiveRideForUser(req.user);
    if (existing) {
      return res.status(409).json({
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
    // PARAGENS SÓ NO CARRY.
    //
    // Não é uma limitação da rota — os três níveis aceitam N pontos. É uma
    // decisão de âmbito: o caso real que justifica isto é a entrega de bens
    // (recolher na loja, largar em dois sítios), e alargá-lo às viagens de
    // pessoas obrigaria a mexer no ecrã do pedido, onde `destino` aparece em
    // oitenta sítios — a guarda contra a corrida do GPS, a dependência da
    // cotação, a máquina de toques no mapa. Assim isto é aditivo: quem não
    // pede Carry não nota diferença nenhuma, porque não há nenhuma.
    const paragens = vehicleType === 'carry' ? limparDestinos(destinos) : [];

    // CARRY COM PESSOAS: o modo vem EXPLÍCITO da app, não se deduz. A app
    // manda sempre um número de pessoas (o ecrã começa em 1); lido sem o modo,
    // um Carry de bens contaria como pessoas e apanhava o mínimo de $5.
    const carryPessoas = vehicleType === 'carry' && carryModo === 'pessoas';
    const pessoasContam = vehicleType === 'car' || carryPessoas;

    let precoFinal = fareUsd;
    let kmViagem = null;
    let minViagem = null;
    const temCoords = originLat != null && originLng != null && destLat != null && destLng != null;
    if (temCoords) {
      const viagem = await rota(
        { lat: Number(originLat), lng: Number(originLng) },
        { lat: Number(destLat), lng: Number(destLng) },
        // Os desvios entram na distância, e é dessa distância que sai o
        // preço. Calcular sem eles e conduzir com eles seria o motorista a
        // pagar o desvio do seu bolso.
        paragens
      );
      // O TIPO VEM DA LISTA, e não de um ternário de dois.
      //
      // Estava `vehicleType === 'motorbike' ? 'motorbike' : 'car'`, sobra do
      // tempo em que só havia dois tipos. Com o Carry passou a ser um DEFEITO
      // A SÉRIO, e esteve em produção desde a fase 1: o ecrã mostrava o preço
      // de Carry e a viagem nascia com o preço de CARRO. Onze dólares vistos,
      // sete cobrados — e a app inteira assenta em o preço ser firme antes de
      // se entrar.
      //
      // A carga vai junto pela mesma razão que o número de pessoas: o volume
      // multiplica a distância e a ajuda soma uma parcela. Ignorados aqui, o
      // passageiro via um preço no ecrã e a viagem nascia com outro.
      precoFinal = preco(
        TIPOS_VEICULO.includes(vehicleType) ? vehicleType : 'car',
        viagem.km,
        viagem.min,
        // O MESMO NÚMERO QUE A COTAÇÃO VIU. Se aqui se ignorasse, o passageiro
        // via um preço no ecrã e a viagem nascia com outro — e o do ecrã é o
        // que ele aceitou.
        pessoasContam ? passengers : null,
        carryPessoas ? null : { volume: cargaVolume, ajuda: cargaAjuda, paragens: paragens.length }
      );
      kmViagem = viagem.km;
      minViagem = viagem.min;
    }

    // A TAXA DA ENCOMENDA soma-se à viagem, como a ajuda a carregar se soma
    // no Pickup: é trabalho e risco que não dependem da distância. Calculada
    // pelo TETO — o que o passageiro autorizou — e acertada para baixo quando
    // o motorista disser quanto gastou (ver `taxaCobrada` em jastip.js).
    const taxaEncomenda = ehEncomenda ? taxaDe(jastip?.teto) : null;
    if (taxaEncomenda != null && precoFinal != null) {
      precoFinal = Math.round((Number(precoFinal) + taxaEncomenda) * 100) / 100;
    }

    const row = await createRide({
      passengerId: req.user.id,
      destLabel,
      destLat,
      destLng,
      originLabel,
      originLat,
      originLng,
      vehicleType,
      fareUsd: precoFinal,
      servico: ehEncomenda ? 'jastip' : null,
      jastipLista: ehEncomenda ? jastip?.lista : null,
      jastipTeto: ehEncomenda ? jastip?.teto : null,
      jastipTaxa: taxaEncomenda,
      distanceKm: kmViagem,
      durationMin: minViagem,
      // Só onde se pergunta: numa motorizada vai sempre uma pessoa, e num
      // Carry não vai nenhuma. Lido da lista de tipos e não com um
      // `=== 'car'`, que era o que sobrava de quando havia só dois.
      passengers: pessoasContam ? passengers : null,
      // Um pedido é de bens OU de pessoas. Com pessoas, a carga não entra.
      cargaTipo: carryPessoas ? null : cargaTipo,
      cargaVolume,
      cargaAjuda,
      cargaNotas,
      cargaDeclarada: !!cargaDeclarada,
      cargaOutro,
      cargaTipos: carryPessoas ? [] : cargaTipos,
      viajanteNome: nomeOutro || null,
      viajanteTelefone,
      viajanteMenor: !!viajanteMenor,
      destinos: paragens,
    });
    // Quem criou a viagem é o passageiro: leva o código.
    const ride = toPublicRide(row, { paraPassageiro: true });
    // O que vai para os motoristas não o leva.
    const paraMotoristas = toPublicRide(row);

    // Primeira linha da história desta viagem. Ver `eventos.js`.
    registarSemEsperar({
      rideId: row.id,
      que: EVENTOS.PEDIDA,
      por: req.user.id,
      para: 'requested',
      lat: num2(originLat),
      lng: num2(originLng),
      fareUsd: row.fare_usd,
      detalhe: {
        destino: row.dest_label,
        veiculo: row.vehicle_type,
        km: kmViagem,
        min: minViagem,
        paraOutraPessoa: !!row.viajante_nome,
        menor: !!row.viajante_menor,
      },
    });

    const io = req.app.get('io');
    // Só para o município da recolha. Sem município — viagem sem coordenadas
    // de origem — vai para todos: mais vale um pedido a mais na lista de
    // alguém do que um pedido que ninguém chega a ver.
    const salaTipo = row.vehicle_type ? `drivers:${row.vehicle_type}` : 'drivers';
    const sala = row.municipio && row.vehicle_type ? `${salaTipo}:${row.municipio}` : salaTipo;
    io.to(sala).emit('ride:new', paraMotoristas);

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
    // QUEM ESTÁ INDISPONÍVEL NÃO VÊ PEDIDOS (14/09/26).
    //
    // As salas do tempo real já faziam isto — quem se desliga sai delas e
    // deixa de ouvir os anúncios —, mas esta lista não perguntava nada: a app
    // pede-a ao abrir e em cada religação, e um motorista desligado via os
    // pedidos todos e podia aceitá-los. O Simão apanhou-o a testar.
    //
    // Lista vazia e não erro: estar desligado é um estado normal, não uma
    // falha. `indisponivel` diz à app porquê.
    if (!req.user.is_online) return res.json({ rides: [], indisponivel: true });
    const rows = await getAvailableRidesForDriver(
      req.user.vehicle_type || 'car',
      req.user.last_lat,
      req.user.last_lng,
      lugaresQueContam(req.user),
      req.user.vehicle_capacidade
    );
    return res.json({ rides: rows.map((r) => toPublicRide(r)) });
  })
);

// POST /api/rides/aviso — "avisar quando houver motorista"
ridesRouter.post(
  '/aviso',
  wrap(async (req, res) => {
    const { vehicleType, originLat, originLng, cargaVolume } = req.body || {};
    const lat = Number(originLat);
    const lng = Number(originLng);
    if (!TIPOS_VEICULO.includes(vehicleType) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Faltam o tipo de veículo ou a recolha.' });
    }
    const aviso = await criarAviso({
      passengerId: req.user.id,
      vehicleType,
      lat,
      lng,
      cargaVolume: VOLUMES_CARGA.includes(cargaVolume) ? cargaVolume : null,
    });
    return res.status(201).json({ ok: true, expiraEm: aviso?.expira_em ?? null });
  })
);

// DELETE /api/rides/aviso — já não é preciso avisar
ridesRouter.delete(
  '/aviso',
  wrap(async (req, res) => {
    await cancelarAvisos(req.user.id);
    return res.json({ ok: true });
  })
);

// POST /api/rides/:id/etapa-carga — o motorista marca uma etapa da entrega
ridesRouter.post(
  '/:id/etapa-carga',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const etapa = String(req.body?.etapa || '');
    if (!ETAPAS_CARGA.includes(etapa)) {
      return res.status(400).json({ error: 'Etapa desconhecida.' });
    }
    const updated = await marcarEtapaCarga(rideId, req.user.id, etapa);
    if (!updated) {
      return res.status(409).json({ error: 'Esta etapa não se pode marcar agora.' });
    }
    registarSemEsperar({
      rideId,
      que: EVENTOS.ETAPA_CARGA,
      por: req.user.id,
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      detalhe: { etapa },
    });
    notify(req.app.get('io'), updated, 'ride:update');
    // A notificação ao passageiro, sem esperar: a etapa já está marcada.
    one('SELECT push_token, lingua FROM users WHERE id = $1', [updated.passenger_id])
      .then((p) => notificarEtapaCarga(p, etapa, rideId))
      .catch(() => {});
    return res.json({ ride: toPublicRide(updated) });
  })
);

// POST /api/rides/:id/comprado — o motorista diz quanto gastou na encomenda
//
// É o passo que o jastip tem a mais: entre aceitar e entregar há uma compra,
// feita com dinheiro do motorista. O valor entra aqui e a fotografia do talão
// entra pelo caminho das fotografias da carga — a mesma porta, porque é a
// mesma coisa: prova do que se passou nesta viagem.
//
// O passageiro é avisado na hora. Ele autorizou um teto e tem direito a saber
// o que foi gasto ANTES de a encomenda lhe chegar à porta.
ridesRouter.post(
  '/:id/comprado',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const r = await marcarComprado(rideId, req.user.id, req.body?.valorUsd);
    if (r.erro) return res.status(409).json({ error: r.erro });

    const atualizada = await getRideById(rideId);
    registarSemEsperar({
      rideId,
      que: EVENTOS.COMPRADO,
      por: req.user.id,
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      detalhe: { valorUsd: Number(req.body?.valorUsd) },
    });
    notify(req.app.get('io'), atualizada, 'ride:update');
    one('SELECT push_token, lingua FROM users WHERE id = $1', [atualizada.passenger_id])
      .then((p) => notificarComprado(p, atualizada))
      .catch(() => {});
    return res.json({ ride: toPublicRide(atualizada) });
  })
);

// POST /api/rides/:id/talao — a fotografia do talão da encomenda
//
// PELO MOTORISTA, e é essa a diferença para as fotografias da carga, que são
// de quem pede. Aqui quem tem o papel na mão é quem comprou.
//
// Fica no mesmo sítio das outras (ride_fotos): é prova da mesma viagem, apaga-se
// com o mesmo prazo, e vê-se no painel pelo mesmo caminho. Um segundo
// armazém para fotografias seria a mesma coisa escrita duas vezes.
ridesRouter.post(
  '/:id/talao',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const { mime, base64 } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Fotografia em falta.' });

    const ride = await getRideById(Number(req.params.id));
    // 404 e não 403 a quem não é o motorista desta viagem: um 403 confirmaria
    // que ela existe.
    if (!ride || ride.driver_id !== req.user.id || ride.servico !== 'jastip') {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(409).json({ error: 'A viagem já terminou.' });
    }

    try {
      const r = await guardarFotoDaCarga({ rideId: ride.id, mime, base64 });
      return res.status(201).json({ ok: true, total: r.total });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);

// POST /api/rides/:id/recusar — pôr um pedido de lado, com o motivo
//
// O pedido continua para os outros motoristas; só se regista quem o pôs de
// lado e porquê. "Carga incompatível com o veículo" repetida no mesmo pedido
// diz que a carga está mal descrita ou que chegou aos veículos errados.
ridesRouter.post(
  '/:id/recusar',
  requireApprovedDriver,
  wrap(async (req, res) => {
    const rideId = Number(req.params.id);
    const motivo = MOTIVOS_RECUSA.includes(req.body?.motivo) ? req.body.motivo : 'agora';
    const ride = await getRideById(rideId);
    if (ride?.status === 'requested') {
      registarSemEsperar({
        rideId,
        que: EVENTOS.RECUSADA,
        por: req.user.id,
        detalhe: { motivo, capacidade: req.user.vehicle_capacidade || null },
      });
    }
    return res.json({ ok: true });
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
    // Indisponível não aceita. A mesma condição vai também DENTRO do UPDATE
    // (acceptRide): esta dá a mensagem certa, aquela fecha a corrida entre
    // desligar e aceitar no mesmo instante.
    if (!req.user.is_online) {
      return res.status(403).json({
        error: 'Estás indisponível. Liga-te para aceitar pedidos.',
        motivo: 'indisponivel',
      });
    }

    const row = await acceptRide(
      rideId,
      req.user.id,
      fare,
      lugaresQueContam(req.user),
      req.user.vehicle_capacidade
    );
    if (!row) {
      // Duas causas possíveis; distingui-las poupa uma chamada de telefone
      // ao motorista a perguntar porque é que não conseguiu aceitar.
      const atual = await getRideById(rideId);
      if (
        atual?.status === 'requested' &&
        atual.passengers != null &&
        lugaresQueContam(req.user) != null &&
        atual.passengers > lugaresQueContam(req.user)
      ) {
        return res.status(409).json({
          error: `Esta viagem é para ${atual.passengers} pessoas e o teu carro leva ${req.user.vehicle_seats}.`,
        });
      }
      // O motorista já tem uma viagem a decorrer. Passou a ser recusado no
      // próprio UPDATE; sem esta mensagem, quem tem uma viagem em curso lia
      // "já não está disponível" e ia procurar o problema no sítio errado.
      if (atual?.status === 'requested' && !cabe(atual.carga_volume, req.user.vehicle_capacidade)) {
        return res.status(409).json({
          error: 'Esta carga é maior do que a capacidade do teu veículo.',
          motivo: 'capacidade',
        });
      }
      if (await motoristaOcupado(req.user.id)) {
        return res.status(409).json({
          error: 'Já tens uma viagem a decorrer. Termina-a antes de aceitar outra.',
        });
      }
      return res.status(409).json({ error: 'Esta viagem já não está disponível.' });
    }

    registarSemEsperar({
      rideId,
      que: EVENTOS.ACEITE,
      por: req.user.id,
      de: 'requested',
      para: 'accepted',
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      fareUsd: row.fare_usd,
    });

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
    one('SELECT push_token, lingua FROM users WHERE id = $1', [row.passenger_id])
      .then((u) => notificarAceite(u, ride))
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
      status === 'arriving' ? ['accepted'] : ['in_progress', 'accepted', 'arriving'];
    if (!permitido.includes(row.status)) {
      return res.status(409).json({ error: 'Não é possível mudar o estado desta viagem.' });
    }

    const updated = await setRideStatus(rideId, status);

    // ONDE ESTAVA O CARRO QUANDO ISTO ACONTECEU.
    //
    // Não se recusa uma conclusão longe do destino — recusar deixaria uma
    // viagem aberta por um GPS mau. Regista-se. Depois, se alguém se queixar
    // de ter sido deixado a meio, há onde ver.
    registarSemEsperar({
      rideId,
      que: status === 'completed' ? EVENTOS.TERMINOU : EVENTOS.A_CAMINHO,
      por: req.user.id,
      de: row.status,
      para: status,
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      fareUsd: updated?.fare_usd,
      detalhe:
        status === 'completed' && updated?.dest_lat != null
          ? { metrosAoDestino: metrosEntre(req.user, updated) }
          : null,
    });

    // A viagem concluída é o que faz o dia contar. Em `try` porque a
    // conclusão da viagem NUNCA pode falhar por causa da cobrança: se o
    // registo do dia rebentar, o motorista trabalhou de graça — chato,
    // mas muito melhor do que a viagem não fechar e ele ficar sem poder
    // receber o passageiro seguinte.
    if (status === 'completed' && updated?.driver_id) {
      try {
        await registarDia(updated.driver_id, rideId);
      } catch (e) {
        console.error('[assinatura] não foi possível registar o dia:', e?.message);
      }
    }
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
      // O CÓDIGO ERRADO TAMBÉM SE REGISTA.
      //
      // Uma tentativa errada é distracção. Seis são outra coisa — ou o
      // motorista está a tentar começar a viagem sem a pessoa, ou está no
      // carro errado. Sem registo, nada disto se vê.
      registarSemEsperar({
        rideId,
        que: EVENTOS.CODIGO_ERRADO,
        por: req.user.id,
        lat: num2(req.user.last_lat),
        lng: num2(req.user.last_lng),
      });
      return res.status(403).json({ error: 'Código errado. Pergunta outra vez ao passageiro.' });
    }

    registarSemEsperar({
      rideId,
      que: EVENTOS.COMECOU,
      por: req.user.id,
      para: 'in_progress',
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      fareUsd: updated.fare_usd,
    });

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
    // Devolve `null` quando a viagem tem preço calculado da rota real. Nesse
    // caso o preço é firme e não se escreve por cima — ver `setRideFare`.
    if (!updated) {
      return res.status(409).json({
        error: 'O preço desta viagem foi calculado pela distância e não se altera.',
      });
    }

    registarSemEsperar({
      rideId,
      que: EVENTOS.TARIFA_ALTERADA,
      por: req.user.id,
      fareUsd: fare,
      detalhe: { antes: row.fare_usd },
    });
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
    const { lat, lng, note, tipo } = req.body || {};

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
      tipo,
    });

    registarSemEsperar({
      rideId,
      que: EVENTOS.SOS,
      por: req.user.id,
      lat: num2(lat),
      lng: num2(lng),
      detalhe: { tipo: alerta.tipo, alertaId: alerta.id },
    });

    // Toca a todos os administradores em simultâneo, por socket e por push.
    req.app.get('io').to('admins').emit('sos:novo', { id: alerta.id });
    notificarAdminsSOS({ nome: req.user.name, rideId, lat, lng }).catch(() => {});

    return res.status(201).json({
      alerta: { id: alerta.id, tipo: alerta.tipo },
      // Os números vão na resposta para o telemóvel poder marcar o certo
      // mesmo que os seus valores embutidos estejam desactualizados.
      numeros: config.numerosEmergencia,
      emergencia: config.numerosEmergencia.policia,
    });
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

    registarSemEsperar({
      rideId,
      que: EVENTOS.CANCELADA,
      por: req.user.id,
      de: row.status,
      para: 'cancelled',
      lat: num2(req.user.last_lat),
      lng: num2(req.user.last_lng),
      detalhe: {
        motivo,
        // De que lado veio, e em que altura. "Cancelou" diz pouco; "o
        // passageiro cancelou depois de o motorista ter aceitado" diz tudo.
        lado: row.passenger_id === req.user.id ? 'passageiro' : 'motorista',
      },
    });

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

// GET /api/rides/:id/retrato — o rosto do motorista, para quem vai entrar no
// carro dele.
//
// PORQUE EXISTE. A política de segurança manda o passageiro confirmar "a
// matrícula, o modelo do veículo e o nome/fotografia do motorista" antes de
// entrar. A matrícula e o modelo estavam no ecrã; a fotografia não estava em
// lado nenhum, e a instrução era impossível de cumprir.
//
// A ESCOLHA DA FOTOGRAFIA É A MESMA de `/driver/retrato`, e de propósito: a do
// turno mais recente primeiro, a do registo depois. Quem vai entrar no carro
// quer saber quem está ao volante HOJE, e a do turno é a prova mais fresca
// disso. Duas regras diferentes para a mesma pergunta acabariam a mostrar
// caras diferentes ao motorista e ao passageiro.
//
// QUEM PODE VER. Só as duas pessoas da viagem, e só enquanto ela não
// terminou — a mesma regra que já esconde os telefones. Uma cara não é menos
// pessoal do que um número: acabada a viagem, deixa de haver motivo para
// alguém a rever, e o histórico não a mostra.
ridesRouter.get(
  '/:id/retrato',
  wrap(async (req, res) => {
    const ride = await getRideById(Number(req.params.id));
    if (!ride || !ride.driver_id) return res.status(404).json({ error: 'Sem motorista.' });

    const meu = ride.passenger_id === req.user.id || ride.driver_id === req.user.id;
    const terminada = ride.status === 'completed' || ride.status === 'cancelled';
    // 404 e não 403 a quem não é da viagem: um 403 confirmaria que aquela
    // viagem existe e que tem motorista. Quem não é dela não fica a saber
    // nada, nem sequer que há algo ali.
    if (!meu || terminada) return res.status(404).json({ error: 'Sem fotografia.' });

    const turno = await ultimaFotoDeTurno(ride.driver_id);
    const foto = turno || (await getOwnDocument(ride.driver_id, 'photo'));
    if (!foto) return res.status(404).json({ error: 'Sem fotografia.' });

    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Content-Type', foto.mime);
    res.send(foto.bytes);
  })
);

// POST /api/rides/:id/carga-foto — as fotografias dos bens
//
// SÓ QUEM PEDIU. A carga é dele, e mais ninguém tem o que fotografar ali.
//
// ATÉ A VIAGEM TERMINAR, e não só enquanto está à espera de motorista. Servem
// duas coisas diferentes e ambas contam: antes de ser aceite, ajudam o
// motorista a decidir; na recolha, ficam a dizer em que estado os bens
// saíram. Fechar a porta cedo demais deitava fora a segunda.
//
// 404 e não 403 a quem não é o dono: um 403 confirmaria que a viagem existe.
ridesRouter.post(
  '/:id/carga-foto',
  wrap(async (req, res) => {
    const { mime, base64 } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Fotografia em falta.' });

    const ride = await getRideById(Number(req.params.id));
    if (!ride || ride.passenger_id !== req.user.id) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(409).json({ error: 'A viagem já terminou.' });
    }

    try {
      const r = await guardarFotoDaCarga({ rideId: ride.id, mime, base64 });
      return res.status(201).json({ ok: true, total: r.total });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  })
);

// GET /api/rides/:id/carga-foto/:n — uma das fotografias, pelo seu lugar
//
// QUEM PODE VER. Aqui a regra do `/retrato` NÃO serve, e percebê-lo é a
// diferença entre esta funcionalidade existir e nascer inútil.
//
// O retrato mostra-se "às duas pessoas da viagem". Se as fotografias da carga
// seguissem essa regra, o motorista só as via DEPOIS de aceitar — ou seja,
// depois de já se ter comprometido a levar aquilo. Exactamente o momento em
// que saber já não muda nada.
//
// Por isso são TRÊS portas:
//   · quem pediu — são os bens dele;
//   · o motorista da viagem — precisa delas até entregar;
//   · qualquer motorista APROVADO, mas só enquanto a viagem não tem dono.
//
// A terceira é a que faz sentido à fase inteira e também a única que deixa
// alguém de fora ver: fica travada pelas três condições ao mesmo tempo, e
// fecha-se sozinha no instante em que alguém aceita. É a mesma porta por onde
// o pedido já lhe apareceu na lista — `getAvailableRidesForDriver` filtra por
// `status = 'requested' AND driver_id IS NULL`. Não estou a abrir nada novo;
// estou a deixar ver o que já lhe foi mostrado.
//
// ACABADA A VIAGEM, ACABAM AS FOTOGRAFIAS — a mesma regra dos telefones e do
// retrato. Continuam na base sete dias, para uma queixa poder ser respondida,
// mas deixam de se mostrar a ninguém no histórico.
ridesRouter.get(
  '/:id/carga-foto/:n',
  wrap(async (req, res) => {
    const ride = await getRideById(Number(req.params.id));
    if (!ride) return res.status(404).json({ error: 'Sem fotografia.' });

    const terminada = ride.status === 'completed' || ride.status === 'cancelled';
    const meu = ride.passenger_id === req.user.id || ride.driver_id === req.user.id;
    const porAceitar = ride.status === 'requested' && !ride.driver_id;
    // Aprovado E ao serviço: é a mesma porta da lista de pedidos, e quem está
    // indisponível deixou de ver a lista — não pode continuar a ver as
    // fotografias dela.
    const motoristaAoServico = req.user.driver_status === 'approved' && !!req.user.is_online;

    if (terminada || !(meu || (porAceitar && motoristaAoServico))) {
      return res.status(404).json({ error: 'Sem fotografia.' });
    }

    const foto = await fotoDaCarga(ride.id, req.params.n);
    if (!foto) return res.status(404).json({ error: 'Sem fotografia.' });

    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Content-Type', foto.mime);
    res.send(foto.bytes);
  })
);

// GET /api/rides/:id — uma viagem, para quem participa nela.
//
// PORQUE EXISTE. Só havia `/rides/active`, e "activa" exclui de propósito as
// viagens terminadas. Isso chega enquanto a ligação ao vivo aguenta — quem
// está ligado recebe a conclusão pelo socket e o ecrã acompanha.
//
// Não chega quando a ligação cai. Um passageiro com o ecrã apagado, a app em
// segundo plano ou uma rede fraca perde o aviso; ao voltar, `/rides/active`
// responde "nenhuma" e a app não fica a saber o que aconteceu à que tinha —
// se foi concluída, se foi cancelada, ou por quem. O ecrã ficava preso em
// "Motorista a chegar" para sempre.
//
// Aqui pergunta-se pela viagem CONCRETA e recebe-se o estado final dela,
// terminada ou não. É o que permite à app acordar e pôr-se em dia.
//
// `rideForParticipant` já devolve nulo a quem não é da viagem, e a resposta é
// 404 e não 403: quem não participa não fica a saber sequer que ela existe.
ridesRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const row = await rideForParticipant(Number(req.params.id), req.user.id);
    if (!row) return res.status(404).json({ error: 'Viagem não encontrada.' });
    return res.json({
      ride: toPublicRide(row, { paraPassageiro: row.passenger_id === req.user.id }),
    });
  })
);
