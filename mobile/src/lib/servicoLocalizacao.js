import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { lerToken } from './cofreSessao.js';
import { getApiUrl } from '../serverUrl.js';

// O MOTORISTA COM O TELEMÓVEL NO BOLSO (21/09/2026).
//
// PORQUE ISTO EXISTE. A posição do motorista era lida pelo JavaScript da app.
// Enquanto ela está à frente, funciona. Mas um motorista não conduz a olhar
// para o ecrã: põe o telemóvel no suporte e o ecrã apaga, ou guarda-o no
// bolso. Nesse instante o sistema suspende o JavaScript — imediatamente no
// iPhone, ao fim de segundos ou minutos no Android — e a app deixa de
// existir para todos os efeitos. O carro congelava no mapa do passageiro, e
// o motorista saía do serviço sem perceber porquê.
//
// A única forma de continuar a receber posições nesse estado é pedir ao
// SISTEMA que as entregue: no Android com um serviço em primeiro plano (a
// notificação permanente que se vê na barra), no iPhone com o modo de
// localização em segundo plano. É o que as apps de transporte todas fazem, e
// é por isso que a notificação existe — não é decoração, é a contrapartida
// de o sistema manter a app viva.
//
// PORQUE VAI POR HTTP E NÃO PELO SOCKET. Quando isto corre, o socket pode já
// não existir: foi ele o primeiro a morrer quando o processo adormeceu. Um
// pedido HTTP não precisa de ligação permanente — abre, entrega e fecha. O
// servidor faz exactamente o mesmo com as duas portas (posicaoMotorista.js).
//
// O TOKEN LÊ-SE DO COFRE a cada envio, e não se guarda aqui: esta tarefa
// pode acordar com a app fechada, sem nada em memória. É uma leitura do
// Keystore de meio em meio minuto no pior caso — barato, e sem uma cópia do
// token a viver num módulo.
export const TAREFA_POSICAO = 'tgr-posicao-motorista';

// Quem quer saber onde estamos, dentro da app. O mapa do motorista mostra a
// sua própria posição; como a tarefa corre fora do ciclo do React, avisa por
// aqui em vez de mexer em estado directamente.
const ouvintes = new Set();
export function ouvirPosicao(cb) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

TaskManager.defineTask(TAREFA_POSICAO, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  // A ÚLTIMA E SÓ A ÚLTIMA. O sistema pode entregar várias de uma vez quando
  // a app acorda — foram guardadas enquanto ela dormia. Enviar todas seria
  // contar uma história antiga a quem só quer saber onde o carro está agora.
  const pos = data.locations[data.locations.length - 1];
  // A PRECISÃO VAI JUNTO (22/09/2026). O receptor diz, em cada leitura, de
  // quantos metros pode estar enganado, e nós deitávamos o número fora. Quem
  // desenha precisa dele para saber em que leituras acreditar; o servidor
  // guarda-o para um dia haver medida em vez de opinião. Ver
  // `lib/filtroPosicao.js`.
  const aqui = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    precisao: pos.coords.accuracy ?? null,
    quando: pos.timestamp ?? Date.now(),
  };
  for (const cb of ouvintes) {
    try {
      cb(aqui);
    } catch {
      /* um ouvinte com defeito não impede o envio */
    }
  }

  try {
    const token = await lerToken();
    if (!token) return;
    await fetch(`${getApiUrl()}/driver/localizacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(aqui),
    });
  } catch {
    // Sem rede agora. Não se guarda para mandar depois de propósito: uma
    // posição de há cinco minutos não diz onde o carro está, diz onde
    // esteve — e mostrá-la ao passageiro seria pior do que não mostrar nada.
  }
});

// Começar e parar. Idempotentes: chamar duas vezes não duplica nada.
//
// AS DUAS CADÊNCIAS, e a segunda tem uma subtileza que já me mordeu uma vez
// hoje:
//
//   • EM VIAGEM: 25 metros, com leitura de alta precisão. Há alguém a olhar
//     para o mapa à espera de ver o carro mexer-se.
//
//   • À ESPERA DE PEDIDOS: sem filtro de distância e de quatro em quatro
//     minutos. Podia parecer que o filtro de distância servia aqui também —
//     e não serve: um carro PARADO não produz actualização nenhuma, e a
//     posição é justamente o que diz ao servidor que este motorista continua
//     ao serviço (ele tira de serviço quem não dá sinal há dez minutos).
//     Com um filtro de distância, um motorista à sombra à espera de trabalho
//     saía do serviço sozinho — exactamente o que estávamos a tentar
//     resolver. O tempo é que é a batida; a posição vem de borla.
export async function comecarAEnviarPosicao({ emViagem }) {
  const jaCorre = await Location.hasStartedLocationUpdatesAsync(TAREFA_POSICAO).catch(() => false);
  if (jaCorre) await pararDeEnviarPosicao();

  await Location.startLocationUpdatesAsync(TAREFA_POSICAO, {
    // EM VIAGEM, O MÁXIMO QUE O APARELHO DÁ (22/09/2026). Estava em `High`
    // (~10 m); `BestForNavigation` é o modo que os navegadores usam e é para
    // isto mesmo — há alguém a olhar para o mapa a ver o carro aproximar-se.
    // Gasta mais bateria, por isso NÃO se usa à espera de pedidos, que é
    // onde o motorista passa a maior parte do dia.
    accuracy: emViagem ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
    distanceInterval: emViagem ? 25 : 0,
    timeInterval: emViagem ? 8000 : 240000,
    // Sem isto o Android mata o serviço ao fim de minutos. A notificação é o
    // preço — e é também honestidade: quem está a ser localizado tem direito
    // a ver que está.
    foregroundService: {
      notificationTitle: 'TimorgianaRide — ao serviço',
      notificationBody: 'A tua posição está a ser enviada para quem te espera.',
      notificationColor: '#0E5C54',
    },
    pausesUpdatesAutomatically: false,
    // iPhone: a seta azul na barra, pela mesma razão da notificação.
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
  });
}

export async function pararDeEnviarPosicao() {
  try {
    const corre = await Location.hasStartedLocationUpdatesAsync(TAREFA_POSICAO);
    if (corre) await Location.stopLocationUpdatesAsync(TAREFA_POSICAO);
  } catch {
    /* já não corria */
  }
}
