// Sítios onde entrar custa dinheiro.
//
// Em Díli há lugares onde o carro paga para entrar no recinto: o
// estacionamento do Timor Plaza e o aeroporto. Quem paga é o PASSAGEIRO, e é
// por isso que isto existe.
//
// O problema que resolve não é técnico. Um passageiro que não sabe da taxa
// chega à cancela, recusa-se a pagar, e quem fica a perder é o motorista —
// que já entrou e tem de sair pela mesma cancela. É uma discussão à porta de
// um carro, entre duas pessoas que não têm culpa nenhuma, por causa de uma
// informação que ninguém lhes deu.
//
// Dizer isto ANTES de pedir a viagem custa uma linha no ecrã e evita a
// discussão inteira.
//
// A taxa NÃO entra na tarifa. O dinheiro é entregue na cancela, não ao
// motorista — e a TimorgianaRide continua a não tocar em dinheiro nenhum. É
// só um aviso.

export const LOCAIS_COM_TAXA = [
  {
    id: 'timor_plaza',
    nome: 'Timor Plaza',
    lat: -8.55374,
    lng: 125.54155,
    // O recinto tem parque próprio e várias entradas. 250 metros cobre o
    // edifício e o estacionamento sem apanhar a avenida inteira.
    raioM: 250,
    onde: 'estacionamento',
    // No Timor Plaza só o carro paga. A motorizada entra sem taxa.
    taxa: {
      // Um dólar, valor dado pelo Simão em 01/09/2026. Marcado como taxa de
      // ENTRADA e não por hora: ele disse "a entrada do carro é paga", ao
      // contrário do aeroporto onde especificou o preço à hora. Se afinal for
      // por hora, muda-se 'entrada' para 'hora' e publica-se.
      car: { usd: 1, por: 'entrada' },
      motorbike: null,
    },
  },
  {
    id: 'aeroporto',
    nome: 'Aeroporto Nicolau Lobato',
    lat: -8.5476,
    lng: 125.52229,
    // O recinto do aeroporto é maior, e a cancela fica antes do terminal.
    raioM: 700,
    onde: 'recinto',
    // Aqui pagam os dois, e é por hora. Entrar só para deixar o passageiro
    // custa o mesmo — a cancela não distingue.
    taxa: {
      car: { usd: 1, por: 'hora' },
      motorbike: { usd: 0.5, por: 'hora' },
    },
  },
];

function metros(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * 111320;
  const dLng = (bLng - aLng) * 111320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function perto(lat, lng, local) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return metros(lat, lng, local.lat, local.lng) <= local.raioM;
}

// Que taxas se aplicam a esta viagem.
//
// Verifica a ORIGEM e o DESTINO. Ir buscar alguém ao aeroporto custa o mesmo
// que lá o deixar: o carro entra na mesma, e a cancela cobra na mesma.
export function taxasPara({ originLat, originLng, destLat, destLng }) {
  const encontradas = [];
  for (const local of LOCAIS_COM_TAXA) {
    const naOrigem = perto(originLat, originLng, local);
    const noDestino = perto(destLat, destLng, local);
    if (!naOrigem && !noDestino) continue;

    encontradas.push({
      id: local.id,
      nome: local.nome,
      onde: local.onde,
      // 'destino' quando é só à chegada, 'origem' quando é só à partida,
      // 'ambos' quando a viagem começa e acaba no mesmo recinto.
      quando: naOrigem && noDestino ? 'ambos' : naOrigem ? 'origem' : 'destino',
      taxa: local.taxa,
    });
  }
  return encontradas;
}
