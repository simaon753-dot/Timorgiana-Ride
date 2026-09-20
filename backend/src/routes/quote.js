import { Router } from 'express';
import { servicoEstaAtivo } from '../configServico.js';
import { taxaDe, viagensDoPassageiro } from '../jastip.js';
import { requireAuth } from '../auth.js';
import { preco, etaMinutos, straightKm } from '../routing.js';
import { rotaCompleta } from '../rotas.js';
import { limparDestinos } from '../destinosDaViagem.js';
import { paragensQueCobrem } from '../paradas.js';
import { nearestDrivers } from '../drivers.js';
import { taxasPara } from '../taxasDeEntrada.js';
// A LISTA DOS TIPOS, que faltava desde a fase 1 do Carry. Sem ela cada
// cotação rebentava com ReferenceError e a app ficava sem preço — só o pedido
// (routes/rides.js, que a importa) calculava o valor. Ver
// scripts/verificar-nomes.mjs, que nasceu disto.
import { TIPOS_VEICULO, SERVICOS, config } from '../config.js';

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
    // Quantas pessoas vão. Só muda o preço do CARRO e só a partir de cinco —
    // ver a nota em config.js. Sem este número, a cotação assumia sempre uma
    // pessoa e um grupo de seis via o preço de quatro até pedir a viagem.
    const pessoas = num(req.body?.passengers);
    // A CARGA ENTRA NA COTAÇÃO e não só no pedido.
    //
    // O volume multiplica a distância e a ajuda soma uma parcela fixa. Se a
    // cotação os ignorasse, o preço mostrado no ecrã seria o de uma carga
    // pequena sem ajuda — e o cobrado no fim seria outro. Um preço firme
    // antes de entrar é o que faz as pessoas confiarem num sistema a
    // dinheiro; mostrar um e cobrar outro desfá-lo de uma vez.
    const carga = {
      volume: req.body?.cargaVolume || null,
      ajuda: req.body?.cargaAjuda || null,
    };

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
    // As paragens entram na MESMA chamada: a Routes v2 leva-as como
    // `intermediates` e devolve os totais da rota inteira, por uma só
    // chamada ao contador diário.
    const paragens = limparDestinos(req.body?.destinos);
    // O modo do Carry, explícito — ver a nota em routes/rides.js.
    const carryPessoas = req.body?.carryModo === 'pessoas';
    // As paragens contam no preço do Carry (a taxa por paragem do painel).
    carga.paragens = paragens.length;
    const viagem = await rotaCompleta({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }, paragens);

    // Para cada tipo de veículo: preço e quanto falta até chegar o mais
    // próximo. Sem motoristas disponíveis, a opção aparece indisponível
    // em vez de desaparecer — o passageiro percebe porque não pode pedir.
    // COM PARAGENS, SÓ O CARRY.
    //
    // Esta cotação calcula UM `km` e reparte-o pelos três veículos. Com
    // desvios pelo meio, esse km traz os desvios dentro — e o preço de carro
    // e motorizada apareceria inflacionado por caminhos que não vão fazer.
    //
    // Mostrar um preço e cobrar outro é a única coisa que esta app não pode
    // fazer: é dinheiro em mão, sem recibo e sem estorno. Havendo paragens, a
    // resposta traz a opção que corresponde ao que foi calculado, e mais
    // nenhuma.
    // O CARRY DESLIGADO NO PAINEL não aparece na cotação: mostrar um preço
    // de um serviço que não aceita pedidos seria prometer o que não há.
    // Qualquer serviço desligado no painel sai da cotação: mostrar um preço de
    // um serviço que não aceita pedidos seria prometer o que não há.
    const tiposPossiveis = (paragens.length ? ['carry'] : TIPOS_VEICULO).filter(servicoEstaAtivo);

    // A TAXA DA ENCOMENDA entra em TODAS as opções, e não à parte.
    //
    // O passageiro compara preços de mota e carro; se a taxa aparecesse só na
    // conta final, ele escolhia por um número e pagava outro. A taxa é pelo
    // trabalho de comprar — vai com a viagem, seja em que veículo for.
    //
    // Calculada pelo TETO que ele autorizou; se as compras ficarem num escalão
    // mais barato, é esse que se cobra (ver `taxaCobrada` em jastip.js).
    const encomenda = req.body?.servico === 'jastip' && servicoEstaAtivo('jastip');
    const taxaEncomenda = encomenda ? taxaDe(req.body?.jastipTeto) : 0;
    const opcoes = await Promise.all(
      tiposPossiveis.map(async (tipo) => {
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
          fareUsd:
            Math.round(
              (preco(
                tipo,
                viagem.km,
                viagem.min,
                tipo === 'car' || (tipo === 'carry' && carryPessoas) ? pessoas : null,
                tipo === 'carry' && carryPessoas ? null : carga
              ) +
                taxaEncomenda) *
                100
            ) / 100,
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
      // A parcela da encomenda, à vista: o ecrã mostra "viagem + $1,50 por
      // comprar", e não um total que ninguém sabe de onde veio.
      ...(encomenda ? { taxaJastip: taxaEncomenda } : {}),
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

// GET /api/quote/servicos — que serviços estão ligados agora.
//
// Para o ecrã inicial saber se mostra o Carry como disponível. Vai com a
// cotação porque é a mesma pergunta: "o que posso pedir?".
quoteRouter.get(
  '/servicos',
  wrap(async (_req, res) =>
    res.json({
      servicos: Object.fromEntries(SERVICOS.map((s) => [s.id, { ativo: servicoEstaAtivo(s.id) }])),
    })
  )
);

// GET /api/quote/jastip — as regras da encomenda, e se esta conta já pode.
//
// Num pedido só, porque é o que o ecrã precisa de saber ANTES de se desenhar:
// o teto, os escalões, e quantas viagens faltam a quem ainda não pode pedir.
// Dizer "não podes" sem dizer quanto falta é uma porta sem maçaneta.
quoteRouter.get(
  '/jastip',
  wrap(async (req, res) => {
    const feitas = await viagensDoPassageiro(req.user.id);
    res.json({
      ativo: servicoEstaAtivo('jastip'),
      tetoMax: config.jastip.tetoUsd,
      escaloes: config.jastip.escaloes,
      viagensMinimas: config.jastip.viagensMinimas,
      viagensFeitas: feitas,
      podePedir: servicoEstaAtivo('jastip') && feitas >= config.jastip.viagensMinimas,
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
    // Também aqui: a linha desenhada durante a viagem tem de passar pelas
    // paragens. Sem isto, o mapa mostrava um caminho directo enquanto o
    // preço cobrado incluía os desvios.
    const v = await rotaCompleta(
      { lat: oLat, lng: oLng },
      { lat: dLat, lng: dLng },
      limparDestinos(req.body?.destinos)
    );
    return res.json({ linha: v.linha, km: v.km, min: v.min, fonte: v.fonte });
  })
);

// POST /api/quote/paragem — onde é que o carro pára para este ponto.
//
// A app perguntava directamente ao serviço de rotas qual era a estrada mais
// próxima. Isso acerta quase sempre e falha nos sítios que mais interessam: no
// Cristo Rei a estrada mais perto em linha recta passa por cima do monumento, e
// ninguém é largado ali — quem lá vai é deixado em baixo, no Dolok Oan.
//
// Perguntando ao NOSSO servidor, a resposta pode ser corrigida à mão uma vez e
// passar a valer para toda a gente. Sem paragem definida, o comportamento é o
// mesmo de antes.
quoteRouter.post(
  '/paragem',
  wrap(async (req, res) => {
    const lat = num(req.body?.lat);
    const lng = num(req.body?.lng);
    if (lat == null || lng == null) return res.status(400).json({ error: 'Faltam coordenadas.' });

    const nossas = await paragensQueCobrem(lat, lng);
    if (nossas.length) {
      const principal = nossas[0];
      return res.json({
        // A MAIS PERTO CONTINUA A VIR EM PRIMEIRO e nestes mesmos campos.
        //
        // Não é indecisão: é o que mantém as versões antigas da app a
        // funcionar. Há telemóveis com o APK de há semanas que chamam este
        // mesmo endereço e só sabem ler `lat`, `lng` e `nome`. Se eu tivesse
        // trocado isto por uma lista, essas passavam a não ter paragem
        // nenhuma — e ninguém ligava o defeito a esta alteração.
        //
        // A lista vai a mais, num campo novo, que quem não o conhece ignora.
        lat: principal.lat,
        lng: principal.lng,
        nome: principal.nome,
        // Diz de onde veio, para se poder perceber no ecrã porque é que o
        // carro pára ali e não noutro sítio.
        fonte: 'nossa',
        // TODAS, incluindo a primeira. A app precisa da lista inteira para
        // saber quais são as outras — mandar só as restantes obrigava-a a
        // remontar o conjunto, e é o género de conta que se faz mal uma vez.
        paragens: nossas.map((p) => ({
          id: p.id,
          nome: p.nome,
          lat: p.lat,
          lng: p.lng,
        })),
      });
    }
    return res.json({ fonte: 'nenhuma' });
  })
);
