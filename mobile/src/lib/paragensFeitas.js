// AS PARAGENS DO PICKUP POR ONDE O MOTORISTA JÁ PASSOU (29/09/2026).
//
// O servidor guarda as paragens de uma viagem (até duas) mas não sabe quais
// já foram feitas. Sem isso, o «Navegar» levava sempre ao destino final e
// saltava as paragens — e, se as levasse todas, voltava a mandar o motorista
// a uma paragem onde já tinha estado.
//
// Marca-se aqui, NO TELEMÓVEL DO MOTORISTA, quando ele passa a menos de 60 m
// de uma — pelo GPS da app (DriverHomeScreen) ou pela navegação nossa, que
// avisa quando passa por uma (NavegarScreen). Fica em memória: se a app for
// fechada a meio da viagem, as paragens voltam a contar como por fazer, e o
// pior que acontece é o «Navegar» propor uma que já foi feita.
const feitas = new Map(); // id da viagem → Set de "lat,lng"
const RAIO_M = 60;

const chave = (p) => `${Number(p.lat).toFixed(5)},${Number(p.lng).toFixed(5)}`;

function metros(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r;
  const dLo = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A paragem da viagem mais perto deste ponto (a navegação manda o ponto já
// encostado à estrada, que não é exactamente o guardado).
export function marcarParagemFeita(ride, ponto) {
  if (!ride?.id || !ponto) return;
  let melhor = null;
  for (const p of ride.destinos || []) {
    const d = metros(p, ponto);
    if (d < 200 && (!melhor || d < melhor.d)) melhor = { p, d };
  }
  if (!melhor) return;
  if (!feitas.has(ride.id)) feitas.set(ride.id, new Set());
  feitas.get(ride.id).add(chave(melhor.p));
}

export function paragensPorFazer(ride) {
  const s = feitas.get(ride?.id);
  return (ride?.destinos || []).filter((p) => !s?.has(chave(p)));
}

// Chamado a cada posição do motorista, com a viagem em curso.
export function verificarParagens(ride, posicao) {
  if (!ride || ride.status !== 'in_progress' || !posicao) return;
  for (const p of paragensPorFazer(ride)) {
    if (metros(p, posicao) < RAIO_M) marcarParagemFeita(ride, p);
  }
}
