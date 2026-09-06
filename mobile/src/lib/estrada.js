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
// Usa o serviço `nearest` do OSRM, o mesmo motor que já desenha as rotas.
// Gratuito, e devolve a que distância ficou — que é o que permite decidir se
// vale a pena mexer no ponto.

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

export async function pontoNaEstrada(lat, lng) {
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
    return { lat: loc[1], lng: loc[0], metros: Math.round(metros), rua: w.name || null };
  } catch {
    // Sem rede fica o ponto do GPS. Uma recolha aproximada é melhor do que
    // nenhuma, e a pessoa continua a poder arrastar o pino.
    return null;
  }
}
