import { query } from './db.js';

// REGISTO DE EVENTOS DA VIAGEM
//
// PORQUE ISTO EXISTE. Até agora a linha da viagem era reescrita por cima: o
// `status` mudava, o `updated_at` guardava só a última alteração, e tudo o que
// tinha acontecido antes desaparecia. Ficava o estado final e mais nada.
//
// Isso chega enquanto ninguém se queixa. À primeira queixa a sério — "eu não
// cancelei", "ele nunca apareceu", "cobrou-me o dobro" — não há como
// reconstruir o que se passou. Fica a palavra de um contra a do outro, e quem
// tem de decidir não tem nada em que se apoiar.
//
// Esta tabela é APENAS DE ESCRITA. Nada no código faz UPDATE ou DELETE nela, e
// é de propósito: um registo que se pode alterar não prova coisa nenhuma. Se um
// evento estiver errado, escreve-se outro a corrigi-lo — não se apaga o
// primeiro.
//
// NUNCA REBENTA. Todas as funções engolem o erro e escrevem na consola. Uma
// falha a registar não pode fazer falhar a viagem: perder o registo de uma
// viagem é mau, não deixar a viagem acontecer é pior.

// Os eventos que se registam. Lista fechada de propósito: um nome escrito à mão
// em cada sítio diverge, e depois não se consegue contar nada.
export const EVENTOS = {
  PEDIDA: 'pedida',
  ACEITE: 'aceite',
  A_CAMINHO: 'a_caminho',
  COMECOU: 'comecou',
  CODIGO_ERRADO: 'codigo_errado',
  TERMINOU: 'terminou',
  CANCELADA: 'cancelada',
  TARIFA_ALTERADA: 'tarifa_alterada',
  SOS: 'sos',
};

// Regista um evento.
//
// `por` é quem o provocou (pode ser nulo — o sistema também provoca eventos).
// `de`/`para` são os estados, quando a coisa foi uma transição.
// `detalhe` é para o que não cabe nas colunas: o motivo do cancelamento, o
// código errado que foi tentado, a razão da recusa de cobertura.
export async function registar({
  rideId,
  que,
  por = null,
  de = null,
  para = null,
  lat = null,
  lng = null,
  fareUsd = null,
  detalhe = null,
}) {
  if (!rideId || !que) return;
  try {
    await query(
      `INSERT INTO ride_events (ride_id, que, por, de, para, lat, lng, fare_usd, detalhe)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        rideId,
        que,
        por,
        de,
        para,
        Number.isFinite(Number(lat)) ? Number(lat) : null,
        Number.isFinite(Number(lng)) ? Number(lng) : null,
        Number.isFinite(Number(fareUsd)) ? Number(fareUsd) : null,
        detalhe ? JSON.stringify(detalhe) : null,
      ]
    );
  } catch (e) {
    // Sem `throw`. Ver o cabeçalho: registar é importante, mas nunca ao ponto
    // de impedir a viagem.
    console.error('[eventos] não foi possível registar', que, 'da viagem', rideId, '—', e.message);
  }
}

// Versão que não espera. Para os sítios onde a resposta ao utilizador não deve
// atrasar por causa de uma escrita de registo.
export function registarSemEsperar(dados) {
  registar(dados).catch(() => {});
}

// A história de uma viagem, do princípio ao fim. Para o painel e para responder
// a quem se queixa.
export function historicoDe(rideId) {
  return query(
    `SELECT e.id, e.que, e.por, e.de, e.para, e.lat, e.lng, e.fare_usd, e.detalhe,
            e.created_at, u.name AS por_nome
       FROM ride_events e
       LEFT JOIN users u ON u.id = e.por
      WHERE e.ride_id = $1
      ORDER BY e.id ASC`,
    [rideId]
  );
}
