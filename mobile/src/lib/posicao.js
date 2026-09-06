import * as Location from 'expo-location';

// Ler a posição como o Google lê: várias vezes, e ficando com a melhor.
//
// PORQUE ISTO EXISTE. A app pedia UMA leitura e congelava-a. O Simão
// comparou o pino da app com o ponto azul do Google Maps, no mesmo sítio e
// com um minuto de diferença, e estavam em edifícios diferentes.
//
// A primeira leitura de um GPS é quase sempre a pior. O receptor ainda está
// a apanhar satélites, e a posição melhora nos segundos seguintes — foi por
// isso que o ponto azul do Google apareceu com um halo largo e depois
// encolheu. O que a app fazia era ficar com o halo largo para sempre.
//
// PIOR: uma leitura pode ERRAR MUITO e DECLARAR-SE BOA. No ecrã do Simão não
// apareceu o círculo de incerteza, o que quer dizer que o telemóvel disse
// "erro abaixo de 15 metros" — estando a uns 30 do sítio certo. Dentro de um
// edifício isso é normal, e não há código que corrija uma leitura de
// satélite. O que há é não acreditar na primeira.
//
// COMO FUNCIONA. Devolve a primeira leitura de imediato, por `onPrimeira`,
// para o mapa não ficar parado à espera. Depois continua a ouvir e chama
// `onMelhor` sempre que chegar uma leitura mais precisa, até ao prazo ou até
// ser boa que chegue. Quem chama decide se aceita a melhoria — o utilizador
// pode ter arrastado o pino entretanto, e nesse caso ele sabe melhor do que
// o satélite.
// Vinte segundos e não oito.
//
// Com oito, o pino ficava perto do ponto azul mas não em cima dele: o GPS
// ainda estava a melhorar quando desistíamos. O Google continua a afinar
// enquanto o mapa está aberto, e é com ele que a app é comparada.
//
// Não custa espera a ninguém: a primeira leitura aparece de imediato e o
// resto acontece por baixo, enquanto a pessoa escolhe o destino. E pára
// mal o erro desça abaixo de doze metros, que é o caso normal na rua.
const PRAZO_MS = 20000;
const BOA_QUE_CHEGUE_M = 12;

export async function seguirPosicao({ onPrimeira, onMelhor, prazoMs = PRAZO_MS }) {
  let melhor = null;
  let sub = null;
  let relogio = null;

  const parar = () => {
    if (relogio) clearTimeout(relogio);
    relogio = null;
    if (sub) sub.remove();
    sub = null;
  };

  return new Promise((resolve) => {
    const acabar = () => {
      parar();
      resolve(melhor);
    };

    relogio = setTimeout(acabar, prazoMs);

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
      (pos) => {
        const erro = pos.coords.accuracy ?? Number.POSITIVE_INFINITY;
        const primeira = melhor === null;
        // Sem precisão declarada não há como comparar: fica-se com a
        // primeira e não se troca por outra às cegas.
        const melhorou = melhor !== null && erro < (melhor.coords.accuracy ?? Infinity) - 1;
        if (!primeira && !melhorou) return;

        melhor = pos;
        if (primeira) onPrimeira?.(pos);
        else onMelhor?.(pos);

        // Abaixo disto, esperar mais não compensa: o erro já é menor do que
        // a largura de uma rua, e cada segundo a mais é o passageiro à
        // espera de um mapa que já está certo.
        if (erro <= BOA_QUE_CHEGUE_M) acabar();
      }
    )
      .then((s) => {
        // O prazo pode ter disparado antes de a subscrição existir.
        if (relogio === null) s.remove();
        else sub = s;
      })
      .catch(() => acabar());
  });
}
