// Encostar um ponto à estrada mais próxima.
//
// PORQUE ISTO EXISTE. O GPS põe a pessoa onde ela está — e ela está dentro
// de um edifício, ou num pátio, ou a meio de um quarteirão. Um carro não vai
// lá. O motorista chegava à coordenada, não via ninguém, e telefonava.
//
// É o que o Grab faz e o Simão reparou: mostra um "pickup point" na rua e uma
// linha aos pontinhos desde onde a pessoa está até lá. Não é só bonito — diz
// à pessoa ONDE ESPERAR, que é uma pergunta que ela tem e ninguém respondia.
//
// DE ONDE VEM O PONTO, por esta ordem (desde 27/09/2026):
//   1. uma paragem definida à mão no painel, se houver para este sítio;
//   2. o nosso mapa, no servidor — só estradas por onde passam mota, carro e
//      pick-up (ver `backend/mapa/estradas.js`);
//   3. o `nearest` do OSRM público, só se o servidor não conseguir ler o
//      mapa. Era o primeiro até 27/09, e encostava a pátios e trilhos.

const PRAZO_MS = 6000;

// LIMITES, e os dois importam.
//
// Abaixo de 10 metros não se mexe: a pessoa já está à beira da estrada, e
// mover o pino seria trocar uma coordenada certa por outra igual, com o
// incómodo de o ver saltar.
//
// Acima de 120 metros não se mexe TAMBÉM, e este é o que protege de verdade.
// Uma distância grande quer dizer que o OSRM não encontrou estrada por perto
// e foi buscar uma longe — do outro lado de um muro, de um ribeiro, de um
// aeroporto. Encostar aí mandava o motorista para um sítio a que a pessoa
// não consegue chegar a pé, o que é pior do que não encostar nada.
const PERTO_DE_MAIS_M = 10;
const LONGE_DE_MAIS_M = 120;

import { api } from '../api/client.js';

// AS NOSSAS PARAGENS VÊM PRIMEIRO, e é o que faz esta função valer alguma
// coisa nos sítios difíceis.
//
// Encostar à estrada mais próxima acerta quase sempre e falha exactamente
// onde mais interessa. No Cristo Rei a estrada mais perto em linha recta passa
// por cima do monumento; ninguém é largado ali. O Simão verificou que o Google
// também erra nesse sítio — não é um serviço melhor que resolve, é saber a
// terra.
//
// Se ele tiver definido uma paragem que cubra este ponto, é essa. Só se não
// houver é que se pergunta ao serviço de rotas.
//
// E SE HOUVER MAIS DO QUE UMA, VÃO TODAS. O servidor deixou de desempatar
// pela mais próxima e passou a mandar a lista: duas paragens a cobrir o mesmo
// sítio não são um empate nosso para resolver, são duas maneiras de lá chegar,
// e quem sabe qual serve é quem vai. A primeira continua a ser a que fica
// posta; as outras aparecem no mapa para se poder tocar numa delas.
// `atual`: a paragem que já está à vista, se houver — ver a estabilidade
// em backend/src/escolherParagem.js.
export async function pontoNaEstrada(lat, lng, token, atual = null) {
  if (token) {
    try {
      const nossa = await api.paragemPara(token, {
        lat,
        lng,
        atual: atual?.lat != null ? { lat: atual.lat, lng: atual.lng } : undefined,
      });
      if (nossa?.fonte === 'nossa' && nossa.lat != null) {
        return {
          // De onde veio: só uma paragem do painel MUDA a coordenada da
          // viagem. Ver `paraRota` no ecrã de pedir.
          fonte: 'nossa',
          lat: nossa.lat,
          lng: nossa.lng,
          metros: null,
          rua: nossa.nome || null,
          // Só quando há escolha a fazer. Uma paragem só não é uma lista de
          // uma — é o caso normal, e quem recebe isto não deve ter de saber
          // a diferença entre "sem alternativas" e "uma alternativa que é
          // ela própria".
          paragens:
            Array.isArray(nossa.paragens) && nossa.paragens.length > 1 ? nossa.paragens : null,
        };
      }
      // O NOSSO MAPA (27/09/2026). O servidor procura a estrada mais próxima
      // entre as que servem para mota, carro e pick-up — sem caminhos de
      // serviço, carreiros nem passeios, e com os trilhos só como último
      // recurso. Ver `backend/mapa/estradas.js`.
      //
      // Se ele responde que NÃO HÁ estrada no raio, não se pergunta ao OSRM:
      // ele encontraria precisamente o pátio ou o trilho que se quis evitar.
      // Não encostar é melhor do que encostar a um sítio onde o carro não
      // entra. Os mesmos limites de sempre (`PERTO_DE_MAIS_M`, `LONGE_...`).
      if (nossa?.fonte === 'mapa') {
        if (nossa.semEstrada || nossa.lat == null) return null;
        const metros = Number(nossa.metros);
        if (!Number.isFinite(metros) || metros < PERTO_DE_MAIS_M || metros > LONGE_DE_MAIS_M) {
          return null;
        }
        return {
          fonte: 'mapa',
          lat: nossa.lat,
          lng: nossa.lng,
          metros: Math.round(metros),
          rua: nossa.rua || null,
        };
      }
    } catch {
      // Sem resposta nossa segue-se para o serviço de rotas, como sempre.
    }
  }
  return pontoNaEstradaAutomatico(lat, lng);
}

async function pontoNaEstradaAutomatico(lat, lng) {
  const url = 'https://router.project-osrm.org/nearest/v1/driving/' + `${lng},${lat}?number=1`;
  try {
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(relogio);
    if (!r.ok) return null;
    const j = await r.json();
    const w = j?.waypoints?.[0];
    const loc = w?.location;
    if (!Array.isArray(loc) || loc.length < 2) return null;

    const metros = Number(w.distance);
    if (!Number.isFinite(metros) || metros < PERTO_DE_MAIS_M || metros > LONGE_DE_MAIS_M) {
      return null;
    }
    return {
      fonte: 'osrm',
      lat: loc[1],
      lng: loc[0],
      metros: Math.round(metros),
      rua: w.name || null,
    };
  } catch {
    // Sem rede fica o ponto do GPS. Uma recolha aproximada é melhor do que
    // nenhuma, e a pessoa continua a poder arrastar o pino.
    return null;
  }
}
