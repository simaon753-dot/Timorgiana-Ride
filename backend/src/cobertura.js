import { normalizar } from './texto.js';

// Onde é que uma viagem pode ir de facto.
//
// PORQUE EXISTE. O mapa deixa apontar em qualquer sítio do mundo, e a app
// aceitava tudo: o meio do mar, o cimo do Ramelau, Kupang. O motorista recebia
// um pedido para onde não pode ir, e o passageiro ficava à espera de um carro
// que nunca ia chegar — nenhum dos dois a perceber porquê.
//
// TRÊS PERGUNTAS, e cada uma apanha coisas que as outras não apanham.
//
// 1. HÁ ESTRADA PERTO? Pergunta-se ao OSRM, o mesmo motor das rotas. Apanha o
//    mar ao largo (9 km à estrada mais próxima), o meio das lagoas (387 m) e
//    as montanhas sem caminho (839 m). Uma rua de Díli está a 20 metros.
//
// 2. É EM TIMOR-LESTE? O Nominatim devolve o código do país. Kupang responde
//    `id`, e há estrada lá — só que do outro lado da fronteira.
//
// 3. DÁ PARA LÁ CHEGAR DE CARRO A PARTIR DE DÍLI? Ataúro é uma ilha e Oecusse
//    é um enclave rodeado pela Indonésia. Os dois são Timor-Leste e os dois
//    têm estradas, mas nenhum se alcança conduzindo daqui. As duas primeiras
//    perguntas dizem que sim; esta diz que não.
//
// O QUE ISTO NÃO APANHA, e não faz mal: um ponto cinquenta metros dentro de
// água ao pé da Avenida de Portugal. A estrada está a 53 metros e o ponto
// passa — mas o encostar à estrada, que já existe, leva-o para a avenida. O
// resultado é o certo: quem apontou para a água é recolhido na berma ao lado.
//
// Não é uma falha tapada. É o caso em que a resposta certa não é recusar.
const LONGE_DA_ESTRADA_M = 200;

// Escrevem-se de várias maneiras, e o Nominatim usa a sua: "Oe-Cusse
// Ambeno", "Oecusse", "Oé-Cusse", "Ataúru", "Atauro". Compara-se guardando
// SÓ AS LETRAS — sem acentos, sem hífenes, sem espaços — porque a primeira
// versão tinha "oe cusse ambeno" com espaço e o Nominatim devolve com hífen.
// O Oecusse passou por essa fenda e apareceu como disponível.
const SEM_LIGACAO_POR_ESTRADA = ['atauru', 'atauro', 'oecusse', 'oecussi'];

// E o código ISO, que é mais fiável do que qualquer nome: não muda com a
// grafia nem com a língua em que a resposta vem.
const ISO_SEM_LIGACAO = ['TL-OE', 'TL-AT'];

function soLetras(t) {
  return normalizar(t).replace(/[^a-z]/g, '');
}

const PRAZO_MS = 7000;
const UA = 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)';

async function comPrazo(url, opcoes = {}) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
  try {
    const r = await fetch(url, { ...opcoes, signal: ctrl.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

export async function podeIr(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { ok: false, razao: 'sem_coordenadas' };
  }

  const [estrada, onde] = await Promise.all([
    comPrazo(`https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`),
    comPrazo(
      'https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1' +
        `&zoom=14&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json', 'User-Agent': UA } }
    ),
  ]);

  // SEM RESPOSTA, DEIXA PASSAR.
  //
  // Se os dois serviços estiverem em baixo, não sabemos — e não saber não é
  // razão para impedir alguém de pedir uma viagem à esquina. O erro de deixar
  // passar um ponto mau custa uma viagem cancelada; o de bloquear tudo numa
  // falha de rede custa a app inteira.
  if (!estrada && !onde) return { ok: true, razao: null };

  const metros = Number(estrada?.waypoints?.[0]?.distance);
  if (Number.isFinite(metros) && metros > LONGE_DA_ESTRADA_M) {
    return { ok: false, razao: 'sem_estrada' };
  }

  const pais = String(onde?.address?.country_code || '').toLowerCase();
  if (pais && pais !== 'tl') return { ok: false, razao: 'fora_do_pais' };

  const morada = onde?.address || {};
  const iso = String(morada['ISO3166-2-lvl4'] || '').toUpperCase();
  if (ISO_SEM_LIGACAO.includes(iso)) return { ok: false, razao: 'sem_ligacao' };

  // O nome, para quando o ISO não vem — o Ataúro, por exemplo, respondeu sem
  // ele. Duas maneiras de perguntar a mesma coisa, porque nenhuma delas
  // responde sempre.
  const regiao = soLetras(`${morada.state || ''} ${morada.county || ''}`);
  if (regiao && SEM_LIGACAO_POR_ESTRADA.some((x) => regiao.includes(x))) {
    return { ok: false, razao: 'sem_ligacao' };
  }

  return { ok: true, razao: null };
}
