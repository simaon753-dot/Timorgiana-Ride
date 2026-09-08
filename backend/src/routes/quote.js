import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { preco, etaMinutos, straightKm } from '../routing.js';
import { rotaCompleta } from '../rotas.js';
import { nearestDrivers } from '../drivers.js';
import { taxasPara } from '../taxasDeEntrada.js';

export const quoteRouter = Router();
quoteRouter.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const num = (v) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);

// POST /api/quote — tudo o que o ecrã de pedir viagem precisa, num pedido:
// a rota, o preço de cada tipo de veículo, e quanto tempo até chegar um.
quoteRouter.post(
  '/',
  wrap(async (req, res) => {
    const oLat = num(req.body?.originLat);
    const oLng = num(req.body?.originLng);
    const dLat = num(req.body?.destLat);
    const dLng = num(req.body?.destLng);

    if (oLat == null || oLng == null || dLat == null || dLng == null) {
      return res.status(400).json({ error: 'Faltam as coordenadas de origem ou destino.' });
    }

    // A MESMA CHAMADA SERVE O PREÇO E O DESENHO.
    //
    // Antes o servidor calculava a distância para o preço e a app pedia a
    // linha por sua conta, a outro serviço. Duas fontes: o preço saía de um
    // caminho e a linha desenhava outro. Numa discussão sobre a tarifa não
    // havia forma de mostrar por onde é que o preço tinha passado.
    //
    // Agora é uma só, e vai também a linha na resposta.
    const viagem = await rotaCompleta({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng });

    // Para cada tipo de veículo: preço e quanto falta até chegar o mais
    // próximo. Sem motoristas disponíveis, a opção aparece indisponível
    // em vez de desaparecer — o passageiro percebe porque não pode pedir.
    const opcoes = await Promise.all(
      ['motorbike', 'car'].map(async (tipo) => {
        const perto = await nearestDrivers({
          lat: oLat,
          lng: oLng,
          vehicleType: tipo,
          limit: 1,
          maxKm: 20,
        });
        const maisPerto = perto[0];
        return {
          type: tipo,
          fareUsd: preco(tipo, viagem.km, viagem.min),
          etaMin: maisPerto ? etaMinutos(maisPerto.km) : null,
          available: !!maisPerto,
        };
      })
    );

    return res.json({
      distanceKm: viagem.km,
      durationMin: viagem.min,
      approximate: viagem.aproximado,
      // A linha por onde este preço passou. A app desenha-a tal como vem —
      // deixa de a ir buscar a outro serviço, e deixa de poder mostrar um
      // caminho diferente daquele que foi cobrado.
      linha: viagem.linha || null,
      fonteDaRota: viagem.fonte,
      currency: 'USD',
      options: opcoes,
      // Sítios onde entrar custa dinheiro — o estacionamento do Timor Plaza, o
      // recinto do aeroporto. Vai com a tarifa e não à parte porque é aqui que
      // já se sabem as duas pontas da viagem, e porque o passageiro tem de
      // saber ANTES de pedir, não depois de estar à cancela.
      //
      // Não entra no preço: o dinheiro é entregue na cancela, não ao motorista.
      taxasDeEntrada: taxasPara({ originLat: oLat, originLng: oLng, destLat: dLat, destLng: dLng }),
    });
  })
);

// POST /api/quote/linha — só a linha da viagem.
//
// Para os ecrãs que não pedem cotação: o do passageiro e o do motorista
// durante a viagem. Mesma fonte da cotação, para a linha ser a mesma em todos
// os ecrãs — e para a app deixar de falar directamente com um serviço de
// rotas, que era o que a fazia desenhar sobre um mapa que não é o dela.
quoteRouter.post(
  '/linha',
  wrap(async (req, res) => {
    const oLat = num(req.body?.originLat);
    const oLng = num(req.body?.originLng);
    const dLat = num(req.body?.destLat);
    const dLng = num(req.body?.destLng);
    if (oLat == null || oLng == null || dLat == null || dLng == null) {
      return res.status(400).json({ error: 'Faltam coordenadas.' });
    }
    const v = await rotaCompleta({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng });
    return res.json({ linha: v.linha, km: v.km, min: v.min, fonte: v.fonte });
  })
);
