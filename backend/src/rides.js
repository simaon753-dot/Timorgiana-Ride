import { query, one } from './db.js';
import { jastipPublico, MAX_LOJA, validarItens } from './jastip.js';
import {
  TIPOS_VEICULO,
  TIPOS_CARGA,
  VOLUMES_CARGA,
  CAPACIDADES,
  AJUDAS_CARGA,
  MAX_PESSOAS_CARRY,
} from './config.js';
import { municipioDe } from './municipios.js';
import { guardarDestinos } from './destinosDaViagem.js';

// Estados que ainda contam como "viagem a decorrer"
// Estados em que a viagem AINDA ESTÁ A ACONTECER e tem de aparecer ao
// abrir a app. Faltar aqui um estado faz a viagem desaparecer do ecrã de
// quem a está a fazer — foi o que aconteceu com 'in_progress': no
// instante em que o passageiro entrava no carro, os dois perdiam o mapa,
// a conversa, o botão de emergência e o botão de concluir.
const ACTIVE_PASSENGER = ['requested', 'accepted', 'arriving', 'in_progress'];
// Exportada de propósito. Havia uma segunda cópia desta lista escrita à mão
// dentro do socket, e essa cópia ficou sem 'in_progress' — o que fez a
// posição do motorista deixar de chegar ao passageiro assim que a viagem
// começava. Uma lista de estados escrita em dois sítios diverge; escrita num
// só, não pode.
export const ACTIVE_DRIVER = ['accepted', 'arriving', 'in_progress'];

// Um par de coordenadas, ou nada. As duas têm de estar lá: meia coordenada
// desenha um pino no meio do oceano.
function pontoEscolhido(lat, lng) {
  return lat != null && lng != null ? { lat, lng } : null;
}

function num(v) {
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
}

// Traz a viagem já com os dados do passageiro e do motorista numa só
// consulta. Antes eram consultas separadas por cada viagem — com uma
// lista de 20 pedidos isso eram 40 idas à base de dados.
const RIDE_SELECT = `
  SELECT r.*,
         p.name  AS p_name,  p.phone AS p_phone,
         d.name  AS d_name,  d.phone AS d_phone,
         -- As médias das estrelas, para o cartão do motorista (visto pelo
         -- passageiro) e do passageiro (visto pelo motorista). Só a média,
         -- como o Simão pediu; o número de avaliações não sai.
         p.rating_avg AS p_rating, d.rating_avg AS d_rating,
         d.vehicle_type AS d_vtype, d.vehicle_model AS d_vmodel,
         d.vehicle_plate AS d_vplate, d.vehicle_color AS d_vcolor,
         -- A VÍRGULA AQUI EM CIMA faltou durante dois dias (11 a 13/09/26). A
         -- linha do d_vcolor era a ÚLTIMA da lista; acrescentei colunas a
         -- seguir sem lhe pôr vírgula, e deixei uma a mais antes do FROM. O
         -- SQL ficou inválido e TODAS as viagens deram erro: criar, a activa,
         -- o histórico, a lista dos motoristas. O /api/health não usa esta
         -- consulta e continuou verde.
         --
         -- Nenhum verificador o apanhou: aqui o SQL é texto dentro de um
         -- template literal, e o node --check só vê o JavaScript à volta.
         -- QUANTAS FOTOGRAFIAS DA CARGA, sem trazer um único byte.
         --
         -- O cartão do motorista precisa de saber que ELAS EXISTEM para
         -- desenhar as miniaturas; os bytes vêm depois, num pedido por
         -- fotografia, e só para quem abre o cartão.
         --
         -- Sem isto a app teria de adivinhar: pedir a 0, a 1 e a 2 e apanhar
         -- dois 404 em cada cartão da lista. Funcionava, e seria desperdício
         -- desenhado de propósito.
         (SELECT COUNT(*) FROM ride_fotos cf WHERE cf.ride_id = r.id)::int AS carga_fotos,
         -- AS PARAGENS DO MEIO, já pela ordem do percurso.
         --
         -- Agregadas aqui e não numa segunda consulta: quem pede uma viagem
         -- precisa delas — o mapa para os pinos, o motorista para saber
         -- quantas são. Uma consulta à parte por viagem, numa lista de
         -- sessenta, seriam sessenta idas à base.
         --
         -- NULL quando não há nenhuma, e não um array vazio: é isso que
         -- deixa o toPublicRide omitir o campo nas viagens directas, que
         -- são quase todas. (Sem crases: isto vive dentro de um template
         -- literal, e uma crase aqui fecha a string a meio do SQL.)
         (SELECT json_agg(json_build_object('label', rd.label, 'lat', rd.lat, 'lng', rd.lng)
                          ORDER BY rd.ordem)
            FROM ride_destinos rd WHERE rd.ride_id = r.id) AS destinos_meio
  FROM rides r
  JOIN users p ON p.id = r.passenger_id
  LEFT JOIN users d ON d.id = r.driver_id
`;

// Converte a linha (já com os JOINs) num objeto público.
//
// O código de recolha só sai se for pedido explicitamente. Se o motorista
// o visse, deixava de provar o que quer que fosse — podia começar a viagem
// sem o passageiro estar no carro.
//
// O segundo argumento é um OBJECTO e não um booleano, por uma razão
// aprendida à força: `rows.map(toPublicRide)` passa o ÍNDICE como segundo
// argumento. Com um booleano, o índice 0 era falso (seguro) e o 1 em
// diante era verdadeiro — a partir da segunda viagem de qualquer lista, o
// código vazava. Com um objecto, um número não tem a propriedade e o valor
// seguro mantém-se, aconteça o que acontecer.
export function toPublicRide(row, opcoes = {}) {
  if (!row) return null;
  const paraPassageiro = opcoes?.paraPassageiro === true;
  // ACABOU A VIAGEM, ACABAM OS TELEFONES.
  //
  // O histórico chamava esta função sem opções, e como a viagem terminada tem
  // `driver_id`, a regra de baixo deixava passar o número do passageiro. Ou
  // seja: cada motorista tinha, no ecrã do histórico, a lista de todas as
  // pessoas que levou, com telemóvel — e com as coordenadas de onde as foi
  // buscar, que para quem é apanhado à porta de casa é a morada.
  //
  // O número serve para o motorista ligar a quem vai buscar. Depois de chegar
  // ao destino não há mais nada para combinar, e o que sobra é uma lista de
  // contactos que ninguém deu.
  //
  // Vale para os dois lados e para o telefone do terceiro — que no caso de um
  // menor é o que mais importa.
  const terminada = row.status === 'completed' || row.status === 'cancelled';
  const podeVerTelefones = !terminada;
  return {
    ...(paraPassageiro && row.pickup_code ? { pickupCode: row.pickup_code } : {}),
    ...(row.my_stars !== undefined ? { myStars: row.my_stars } : {}),
    ...(row.pickup_km !== undefined
      ? { pickupKm: row.pickup_km != null ? Math.round(row.pickup_km * 10) / 10 : null }
      : {}),
    id: row.id,
    status: row.status,
    destLabel: row.dest_label,
    destLat: row.dest_lat ?? null,
    destLng: row.dest_lng ?? null,
    originLabel: row.origin_label || null,
    originLat: row.origin_lat ?? null,
    originLng: row.origin_lng ?? null,
    // ONDE A PESSOA APONTOU, quando não é onde o carro encosta. Ver a coluna
    // em `db.js`. Nulo — o caso mais comum — quer dizer «o pino é no ponto da
    // estrada», e quem desenha não tem de saber mais nada.
    originEscolhido: pontoEscolhido(row.origin_escolhido_lat, row.origin_escolhido_lng),
    destEscolhido: pontoEscolhido(row.dest_escolhido_lat, row.dest_escolhido_lng),
    vehicleType: row.vehicle_type || null,
    // O QUE se pediu, ao lado de em QUE se anda. Numa viagem normal é nulo.
    servico: row.servico || null,
    jastip: jastipPublico(row),
    passengers: row.passengers ?? null,
    startedAt: row.started_at ?? null,
    acceptedAt: row.accepted_at ?? null,
    // As horas da linha do tempo (14/09/26). As três últimas só numa entrega.
    aChegarEm: row.a_chegar_em ?? null,
    carregadaEm: row.carregada_em ?? null,
    noDestinoEm: row.no_destino_em ?? null,
    descarregadaEm: row.descarregada_em ?? null,
    fareUsd: row.fare_usd ?? null,
    distanceKm: row.distance_km ?? null,
    durationMin: row.duration_min ?? null,
    createdAt: row.created_at,
    // QUANTO TEMPO ESTE PEDIDO AINDA TEM (22/09/2026).
    //
    // A app precisa disto para desenhar a conta decrescente de quem espera.
    // Vem do servidor, e não escrito na app, pela mesma razão que já vinha na
    // cotação: o número vive em MINUTOS_ATE_DESISTIR e num sítio só. Escrito
    // à mão no telemóvel, mudá-lo aqui deixava o relógio do passageiro a
    // contar para um fim que já não era o verdadeiro.
    //
    // Só num pedido à espera: numa viagem aceite não há nada a contar.
    ...(row.status === 'requested' ? { minutosAteDesistir: MINUTOS_ATE_DESISTIR } : {}),
    updatedAt: row.updated_at,
    // PORQUE É QUE A VIAGEM ACABOU.
    //
    // Faltava, e passou a fazer falta quando os pedidos sem resposta
    // começaram a fechar-se sozinhos ao fim de dez minutos: sem o motivo, a
    // viagem desaparecia do ecrã do passageiro sem explicação nenhuma — que é
    // indistinguível de uma avaria.
    cancelReason: row.cancel_reason || null,
    // O TELEFONE SÓ SAI DEPOIS DE HAVER MOTORISTA.
    //
    // A lista de pedidos por aceitar vai para TODOS os motoristas
    // disponíveis do município, e levava o número do passageiro com ela.
    // Bastava um motorista ficar ao serviço e não aceitar nada o dia
    // inteiro para recolher os números de toda a gente que pediu viagem
    // nesse dia — sem nunca ter conduzido ninguém.
    //
    // O número serve para o motorista ligar a quem vai buscar. Antes de
    // aceitar não há a quem ligar, logo não há razão para o ver. Depois de
    // aceitar há uma viagem combinada entre os dois, e aí faz sentido.
    //
    // `driver_id` é a linha que separa as duas situações, e é a mesma
    // condição do lado do motorista lá em baixo.
    passenger: {
      id: row.passenger_id,
      name: row.p_name,
      // Zero quer dizer "ainda ninguém avaliou", não "péssimo": sai como nulo.
      rating: row.p_rating > 0 ? Math.round(row.p_rating * 10) / 10 : null,
      ...(podeVerTelefones && (paraPassageiro || row.driver_id) ? { phone: row.p_phone } : {}),
    },
    // ── Quem viaja, quando não é quem pede ──────────────────────────
    //
    // Antes de aceitar, o motorista recebe só o que precisa para DECIDIR:
    // que a viagem é para outra pessoa, e se essa pessoa é menor. É o que
    // torna o consentimento dele um consentimento — se soubesse depois de
    // aceitar, já não estaria a escolher.
    //
    // O nome e o telefone entram com a aceitação, pela mesma razão do
    // telefone do passageiro aqui em cima: antes disso não há a quem ligar
    // nem por quem perguntar.
    ...(row.viajante_nome
      ? {
          viajante: {
            menor: !!row.viajante_menor,
            // A QUEM DIZ RESPEITO, e não "depois de aceitar".
            //
            // A primeira versão escondia o nome e o telefone até haver
            // motorista. Protegia bem contra o motorista errado e apanhava
            // também QUEM PEDIU — que os acabou de escrever e precisa de os
            // reler no ecrã da viagem para confirmar que não trocou um
            // algarismo do número.
            //
            // Quem pediu vê sempre. O motorista vê depois de aceitar. Antes
            // disso recebe só o que precisa para decidir, que é saber que a
            // viagem é para outra pessoa e se essa pessoa é menor.
            ...(paraPassageiro || row.driver_id
              ? {
                  nome: row.viajante_nome,
                  ...(podeVerTelefones ? { telefone: row.viajante_telefone || null } : {}),
                }
              : {}),
          },
        }
      : {}),
    // AS PARAGENS, quando as há. Omitido nas viagens directas em vez de ir
    // um array vazio em cada resposta.
    ...(row.destinos_meio ? { destinos: row.destinos_meio } : {}),
    // A carga, quando a há. Mesmo molde do `viajante`: um grupo que só existe
    // num caso, em vez de cinco campos a nulo em todas as outras viagens.
    ...(row.carga_tipo
      ? {
          carga: {
            tipo: row.carga_tipo,
            // Todos os tipos, o principal primeiro. Uma viagem antiga tem só um.
            tipos: [row.carga_tipo, ...(row.carga_extra ? row.carga_extra.split(',') : [])],
            volume: row.carga_volume || null,
            ajuda: row.carga_ajuda || null,
            notas: row.carga_notas || null,
            outro: row.carga_outro || null,
            fotos: Number(row.carga_fotos) || 0,
            // O INSTANTE da declaração, e não um "sim". Ver a nota em db.js.
            declaradoEm: row.carga_declarado_em || null,
          },
        }
      : {}),
    driver: row.driver_id
      ? {
          id: row.driver_id,
          name: row.d_name,
          rating: row.d_rating > 0 ? Math.round(row.d_rating * 10) / 10 : null,
          ...(podeVerTelefones ? { phone: row.d_phone } : {}),
          vehicle: {
            type: row.d_vtype || 'car',
            model: row.d_vmodel || null,
            plate: row.d_vplate || null,
            color: row.d_vcolor || null,
          },
        }
      : null,
  };
}

export function getRideById(id) {
  return one(`${RIDE_SELECT} WHERE r.id = $1`, [id]);
}

// Insere e depois lê. Em PostgreSQL não dá para fazer as duas coisas numa
// só instrução: todas as partes veem a base de dados como estava ANTES da
// instrução, por isso um SELECT no mesmo comando não encontraria a linha
// que o INSERT acabou de criar.
export async function createRide({
  passengerId,
  destLabel,
  destLat,
  destLng,
  originLabel,
  originLat,
  originLng,
  // Onde a pessoa apontou, se não for o mesmo ponto. Nulo no caso normal.
  originEscolhido = null,
  destEscolhido = null,
  vehicleType,
  fareUsd,
  distanceKm = null,
  durationMin = null,
  passengers = null,
  // Pontos do meio. Vazio no caso normal — e é o caso normal que manda: uma
  // viagem sem paragens comporta-se exactamente como se comportava antes.
  destinos = [],
  // Quem viaja, quando não é quem pede. Tudo nulo no caso normal.
  viajanteNome = null,
  viajanteTelefone = null,
  viajanteMenor = false,
  // O que vai dentro, quando a viagem é de bens. Tudo nulo numa de pessoas.
  cargaTipo = null,
  cargaVolume = null,
  cargaAjuda = null,
  cargaNotas = null,
  cargaDeclarada = false,
  // O que é, quando o tipo é "outros". Ignorado para qualquer outro tipo.
  cargaOutro = null,
  // Os OUTROS tipos, quando se escolheu mais do que um (14/09/26). O primeiro
  // continua em `cargaTipo`: é o que as listas, o painel e as estatísticas
  // lêem, e assim nada do que já existe muda de sentido.
  cargaTipos = [],
  // A ENCOMENDA (jastip, 20/09/2026). Tudo nulo numa viagem normal: o que
  // manda é o `servico`, como o tipo manda na carga.
  servico = null,
  jastipItens = null,
  jastipLoja = null,
  jastipTeto = null,
  jastipTaxa = null,
}) {
  // Quatro dígitos, com zeros à frente. Não é um segredo criptográfico —
  // é uma senha dita em voz alta à porta do carro, e vive uns minutos.
  const codigo = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  // O NOME MANDA. Sem nome não há viajante — o telefone e a marca de menor
  // ficam de fora também, mesmo que venham preenchidos.
  //
  // Sem isto, um pedido com telefone mas sem nome criava uma viagem que diz
  // "é para outra pessoa" e não sabe dizer para quem: o motorista chegava
  // sem saber por quem perguntar, e o registo do consentimento apontava a
  // ninguém.
  const nomeViajante =
    String(viajanteNome || '')
      .trim()
      .slice(0, 80) || null;
  const telefoneViajante = nomeViajante
    ? String(viajanteTelefone || '')
        .trim()
        .slice(0, 20) || null
    : null;
  const ehMenor = nomeViajante ? !!viajanteMenor : false;

  // O TIPO MANDA, como o nome manda no viajante. Sem tipo de carga não há
  // carga — o volume, a ajuda e as observações ficam de fora também, mesmo
  // que venham preenchidos. Uma viagem que diz "ajuda a carregar" e não sabe
  // dizer o quê manda o motorista decidir às cegas.
  const tipoCarga = TIPOS_CARGA.includes(cargaTipo) ? cargaTipo : null;
  const volumeCarga = tipoCarga && VOLUMES_CARGA.includes(cargaVolume) ? cargaVolume : null;
  const ajudaCarga = tipoCarga && AJUDAS_CARGA.includes(cargaAjuda) ? cargaAjuda : null;
  const notasCarga = tipoCarga
    ? String(cargaNotas || '')
        .trim()
        .slice(0, 400) || null
    : null;
  // "OUTRO" OBRIGA A DIZER O QUÊ. Um motorista que lê "Outros" e mais nada
  // está a decidir às cegas — é para isso que a lista existe.
  const extrasCarga = tipoCarga
    ? [
        ...new Set(
          (Array.isArray(cargaTipos) ? cargaTipos : []).filter(
            (x) => TIPOS_CARGA.includes(x) && x !== tipoCarga
          )
        ),
      ]
    : [];
  // "Outros" pode vir como segundo tipo: o texto do quê conta na mesma.
  const temOutros = tipoCarga === 'outros' || extrasCarga.includes('outros');
  const outroCarga = temOutros
    ? String(cargaOutro || '')
        .trim()
        .slice(0, 80) || null
    : null;
  // O SERVIÇO MANDA, como o tipo manda na carga: sem `servico = 'jastip'` não
  // há lista nem teto, mesmo que venham preenchidos. Uma viagem que diz "gasta
  // até $25" sem dizer em quê manda o motorista decidir às cegas.
  const ehEncomenda = servico === 'jastip';
  // A LISTA VEM EM ARTIGOS e é aqui que se transforma nas duas formas em que
  // vive: `jastip_itens` para quem a lê linha a linha, e `jastip_lista` para
  // quem só quer a frase. A conversão está num sítio só — duas cópias dela
  // acabariam a mostrar coisas diferentes no ecrã do motorista e no painel.
  const validos = ehEncomenda ? validarItens(jastipItens) : { erro: true };
  const itensJastip = validos.erro ? null : validos.itens;
  const listaJastip = itensJastip ? validos.texto : null;
  const lojaJastip = itensJastip
    ? String(jastipLoja || '')
        .trim()
        .slice(0, MAX_LOJA) || null
    : null;
  const tetoJastip = listaJastip ? num(jastipTeto) : null;
  const taxaJastip = tetoJastip != null ? num(jastipTaxa) : null;

  const inserted = await one(
    `INSERT INTO rides
       (passenger_id, dest_label, dest_lat, dest_lng, origin_label, origin_lat, origin_lng,
        origin_escolhido_lat, origin_escolhido_lng, dest_escolhido_lat, dest_escolhido_lng,
        vehicle_type, fare_usd, distance_km, duration_min, passengers,
        pickup_code, municipio,
        viajante_nome, viajante_telefone, viajante_menor, consentimento_em,
        carga_tipo, carga_volume, carga_ajuda, carga_notas, carga_declarado_em, carga_outro,
        carga_extra, servico, jastip_lista, jastip_itens, jastip_loja, jastip_teto, jastip_taxa,
        status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32::jsonb,$33,$34,$35,
             'requested')
     RETURNING id`,
    [
      passengerId,
      destLabel.trim(),
      num(destLat),
      num(destLng),
      originLabel?.trim() || null,
      num(originLat),
      num(originLng),
      num(originEscolhido?.lat),
      num(originEscolhido?.lng),
      num(destEscolhido?.lat),
      num(destEscolhido?.lng),
      TIPOS_VEICULO.includes(vehicleType) ? vehicleType : null,
      num(fareUsd),
      num(distanceKm),
      durationMin != null ? Math.round(Number(durationMin)) : null,
      // O 8 é do carro. Num Carry com pessoas o limite é outro, e cortar um
      // grupo de 15 em 8 era mandar metade da família a pé sem ninguém saber.
      passengers != null
        ? Math.max(1, Math.min(vehicleType === 'carry' ? MAX_PESSOAS_CARRY : 8, Number(passengers)))
        : null,
      codigo,
      // O município é o da RECOLHA, não o do destino. É de onde o passageiro
      // está à espera que interessa a quem o vai buscar: uma viagem de Díli
      // para Baucau é um pedido de Díli, e é em Díli que tem de aparecer.
      municipioDe(num(originLat), num(originLng)),
      nomeViajante,
      telefoneViajante,
      ehMenor,
      // O CONSENTIMENTO SÓ EXISTE SE HOUVER MENOR.
      //
      // Guardar a hora numa viagem de adulto seria guardar a declaração de
      // uma coisa que ninguém declarou. Um registo que diz mais do que
      // aconteceu não vale mais: vale menos, porque deixa de se poder
      // confiar nele.
      ehMenor ? new Date() : null,
      tipoCarga,
      volumeCarga,
      ajudaCarga,
      notasCarga,
      // A DECLARAÇÃO SÓ EXISTE SE HOUVER CARGA, pela mesma razão do
      // consentimento acima: guardar a hora de uma declaração numa viagem de
      // pessoas seria guardar a declaração de uma coisa que ninguém declarou.
      // Um registo que diz mais do que aconteceu vale menos, não mais.
      tipoCarga && cargaDeclarada ? new Date() : null,
      outroCarga,
      extrasCarga.length ? extrasCarga.join(',') : null,
      listaJastip ? servico : null,
      listaJastip,
      itensJastip ? JSON.stringify(itensJastip) : null,
      lojaJastip,
      tetoJastip,
      taxaJastip,
    ]
  );
  // AS PARAGENS, agora que a viagem tem id: a chave estrangeira aponta para
  // `rides(id)` e esse número só existe depois do INSERT. Mesma ordem das
  // fotografias da carga, pela mesma razão.
  //
  // Aqui o erro NÃO é engolido, ao contrário do que a app faz com as
  // fotografias. Uma viagem que nasce sem as paragens pedidas nasce com o
  // preço errado, porque o preço foi calculado COM elas — e falhar alto é o
  // que impede uma entrega de ser cobrada a mais e feita a menos.
  await guardarDestinos(inserted.id, destinos);

  return getRideById(inserted.id);
}

// Viagem ativa do utilizador, seja de que lado for.
//
// Já não se pergunta "esta pessoa é passageiro ou motorista?" — pergunta-se
// "esta pessoa está nalguma viagem a decorrer?". A mesma conta pode pedir
// hoje e conduzir amanhã, e nenhum dos dois casos deve esconder o outro.
//
// A ordem importa: uma viagem que EU conduzo tem precedência sobre uma que
// eu pedi, porque estar ao volante é o que exige atenção imediata. Na
// prática não acontecem as duas ao mesmo tempo, mas se acontecerem é essa
// que tem de aparecer.
export function getActiveRideForUser(user) {
  return one(
    `${RIDE_SELECT}
     WHERE (r.driver_id = $1 AND r.status = ANY($2))
        OR (r.passenger_id = $1 AND r.status = ANY($3))
     ORDER BY (r.driver_id = $1) DESC, r.id DESC
     LIMIT 1`,
    [user.id, ACTIVE_DRIVER, ACTIVE_PASSENGER]
  );
}

// Histórico: viagens terminadas, com as estrelas que ESTE utilizador deu
//
// NAS DUAS COLUNAS, e não na que o papel mandar.
//
// A versão anterior escolhia a coluna pelo `role`: passageiro via as viagens
// que pediu, motorista via as que conduziu. Parecia razoável até uma pessoa
// ser as duas coisas — que é o caso normal aqui, porque tornar-se motorista
// numa conta de passageiro é um caminho que a app tem de propósito. Uma
// pessoa em Timor-Leste só pode ter três números de telemóvel; obrigá-la a
// uma segunda conta para conduzir era gastar um deles.
//
// Ao passar a `role = 'driver'`, o histórico de passageiro dela desaparecia
// do ecrã. As viagens continuavam na base — mas quem as tinha feito deixava
// de as ver, e isso é indistinguível de as ter perdido.
//
// A viagem activa já procurava nas duas colunas. Isto passa a fazer o mesmo.
// O HISTÓRICO É DE VIAGENS. Um pedido que nenhum motorista aceitou (o
// passageiro desistiu, ou caducou ao fim de MINUTOS_ATE_DESISTIR) não é uma
// viagem cancelada, porque não chegou a haver viagem (decisão do Simão, 16/09/2026). Fica na base
// e o administrador vê-o à parte, como "sem motorista"; aqui não aparece.
export function getRideHistoryForUser(user, limit = 50) {
  return query(
    `SELECT sub.*, (
       SELECT stars FROM ratings WHERE ride_id = sub.id AND rater_id = $1
     ) AS my_stars
     FROM (${RIDE_SELECT}
            WHERE (r.passenger_id = $1 OR r.driver_id = $1)
              AND (r.status = 'completed'
                   OR (r.status = 'cancelled' AND r.driver_id IS NOT NULL))) sub
     ORDER BY sub.id DESC LIMIT $2`,
    [user.id, limit]
  );
}

// Pedidos por atribuir que um motorista pode aceitar, do mais próximo
// ao mais distante. Todos os elegíveis continuam a ver todos os pedidos —
// com poucos motoristas, enviar só ao mais próximo arrisca que um pedido
// fique sem resposta se essa pessoa estiver distraída.
// `driverSeats` = lugares do carro. Um pedido de 5 pessoas não deve
// sequer aparecer a quem tem 4 lugares: mostrar e depois recusar seria
// fazer o motorista perder tempo e o passageiro perder a viagem.
export function getAvailableRidesForDriver(
  driverVehicleType,
  driverLat,
  driverLng,
  driverSeats,
  driverCapacidade
) {
  // Município do motorista, calculado da posição dele.
  //
  // Sem posição conhecida, fica `null` e o filtro deixa passar tudo. É
  // deliberado: um motorista de quem não sabemos onde está não pode ficar
  // sem trabalho nenhum por causa disso. O mesmo vale para viagens sem
  // município — pedidos antigos, ou sem coordenadas de origem.
  const meuMunicipio = municipioDe(
    typeof driverLat === 'number' ? driverLat : null,
    typeof driverLng === 'number' ? driverLng : null
  );
  // Uma só forma de consulta, sempre com os mesmos quatro parâmetros. A
  // versão anterior montava o SQL de duas maneiras conforme houvesse
  // posição, e no caso sem posição sobravam parâmetros que a consulta não
  // referia — o PostgreSQL não consegue inferir o tipo de um parâmetro que
  // não é usado, e recusava tudo. Guardar a variação DENTRO do SQL, com
  // casts explícitos, evita duas formas que podem divergir.
  return query(
    `SELECT sub.*,
       CASE
         WHEN sub.origin_lat IS NULL OR $2::float IS NULL THEN NULL
         ELSE 6371 * 2 * asin(sqrt(
                power(sin(radians($2::float - sub.origin_lat) / 2), 2) +
                cos(radians(sub.origin_lat)) * cos(radians($2::float)) *
                power(sin(radians($3::float - sub.origin_lng) / 2), 2)
              ))
       END AS pickup_km
     FROM (${RIDE_SELECT}
       WHERE r.status = 'requested' AND r.driver_id IS NULL
         AND (r.vehicle_type IS NULL OR r.vehicle_type = $1)
         AND (r.passengers IS NULL OR $4::int IS NULL OR r.passengers <= $4::int)
         AND (r.municipio IS NULL OR $5::text IS NULL OR r.municipio = $5::text)
         -- A CARGA CABE NO VEÍCULO (14/09/26): pequena para todos, média para
         -- médios e grandes, grande só para grandes. Sem capacidade conhecida
         -- vê tudo (motoristas registados antes deste campo); sem volume é
         -- viagem de pessoas. A mesma ordem de capacidade.js.
         AND (r.carga_volume IS NULL OR $6::text IS NULL OR
              (CASE r.carga_volume WHEN 'pequeno' THEN 1 WHEN 'medio' THEN 2 ELSE 3 END)
              <= (CASE $6::text WHEN 'pequena' THEN 1 WHEN 'media' THEN 2 ELSE 3 END))) sub
     ORDER BY pickup_km ASC NULLS LAST, sub.id ASC`,
    [
      driverVehicleType,
      typeof driverLat === 'number' ? driverLat : null,
      typeof driverLng === 'number' ? driverLng : null,
      driverSeats ?? null,
      meuMunicipio,
      CAPACIDADES.includes(driverCapacidade) ? driverCapacidade : null,
    ]
  );
}

// Aceitar de forma ATÓMICA: a condição vai DENTRO do UPDATE, por isso se
// dois motoristas carregarem ao mesmo tempo só um encontra a linha livre.
export async function acceptRide(rideId, driverId, fareUsd, driverSeats, driverCapacidade) {
  // A condição dos lugares vai DENTRO do UPDATE, tal como a da corrida já
  // estar livre. A app filtra a lista, mas isso é conveniência — um
  // telemóvel modificado aceitaria à mesma, e ficariam pessoas de fé em
  // pé na rua.
  const updated = await one(
    `UPDATE rides
     SET driver_id = $1,
         -- A TARIFA CALCULADA NÃO SE DEIXA SUBSTITUIR.
         --
         -- Estava aqui um COALESCE do valor enviado, que escrevia o valor
         -- enviado pelo motorista, fosse ele qual fosse. Numa viagem com
         -- coordenadas o preço já foi calculado no servidor a partir da rota
         -- real — aceitar outro valor por cima era deitar fora essa garantia
         -- e deixar um telemóvel modificado escrever $50 numa viagem de $2.
         --
         -- Só se aceita valor de fora quando não HÁ preço calculado, que é o
         -- caso do destino escrito à mão: aí não há rota, não há distância, e
         -- o preço volta a ser combinado entre as duas pessoas.
         fare_usd = CASE WHEN distance_km IS NULL THEN COALESCE($2, fare_usd) ELSE fare_usd END,
         status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE id = $3 AND status = 'requested' AND driver_id IS NULL
       AND (passengers IS NULL OR $4::int IS NULL OR passengers <= $4::int)
       -- UM MOTORISTA, UMA VIAGEM DE CADA VEZ.
       --
       -- Faltava. O UPDATE verificava que a VIAGEM estava livre e nunca que o
       -- MOTORISTA estava — bastava uma corrida entre dois toques, ou um
       -- cliente modificado, para a mesma pessoa ficar com duas viagens. O
       -- segundo passageiro esperava por um carro que já ia a caminho de
       -- outro sítio, e é o mesmo mal do motorista fantasma por outra porta.
       AND NOT EXISTS (
         SELECT 1 FROM rides r2
          WHERE r2.driver_id = $1 AND r2.status = ANY($5)
       )
       -- SÓ QUEM ESTÁ AO SERVIÇO ACEITA (14/09/26). A rota já recusa quem
       -- está indisponível; aqui fecha-se a corrida de desligar e aceitar no
       -- mesmo instante.
       AND EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND u.is_online)
       -- A carga cabe no veículo — a mesma regra da lista (14/09/26).
       AND (carga_volume IS NULL OR $6::text IS NULL OR
            (CASE carga_volume WHEN 'pequeno' THEN 1 WHEN 'medio' THEN 2 ELSE 3 END)
            <= (CASE $6::text WHEN 'pequena' THEN 1 WHEN 'media' THEN 2 ELSE 3 END))
     RETURNING id`,
    [
      driverId,
      num(fareUsd),
      rideId,
      driverSeats ?? null,
      ACTIVE_DRIVER,
      CAPACIDADES.includes(driverCapacidade) ? driverCapacidade : null,
    ]
  );
  if (!updated) return null; // já aceite por outro, este já tem viagem, ou inexistente
  return getRideById(rideId);
}

// Este motorista já tem viagem a decorrer? Serve para distinguir as causas de
// uma recusa: dizer "já não está disponível" a quem na verdade tem uma viagem
// em curso manda a pessoa procurar o problema no sítio errado.
export function motoristaOcupado(driverId) {
  return one(`SELECT id FROM rides WHERE driver_id = $1 AND status = ANY($2) LIMIT 1`, [
    driverId,
    ACTIVE_DRIVER,
  ]);
}

// Começa a viagem SE o código estiver certo. A comparação vai dentro do
// UPDATE, como a da aceitação: assim não há um instante entre verificar e
// escrever em que outra coisa possa acontecer.
export async function iniciarViagem(rideId, driverId, codigo) {
  const linha = await one(
    `UPDATE rides
     SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2
       AND status IN ('accepted','arriving')
       AND pickup_code = $3
     RETURNING id`,
    [rideId, driverId, String(codigo || '').trim()]
  );
  if (!linha) return null;
  return getRideById(rideId);
}

export async function setRideStatus(rideId, status, porQuem = null) {
  await query(
    `UPDATE rides SET status = $1, updated_at = NOW(),
            cancelled_by = COALESCE($3, cancelled_by),
            -- A hora em que o motorista disse que chegou (linha do tempo).
            a_chegar_em = CASE WHEN $1 = 'arriving' THEN NOW() ELSE a_chegar_em END
     WHERE id = $2`,
    [status, rideId, porQuem]
  );
  return getRideById(rideId);
}

// AS ETAPAS DA ENTREGA, pela ordem e só pelo motorista da viagem (14/09/26).
//
// Uma consulta por etapa, com a anterior como condição DENTRO do UPDATE:
// "descarregada" antes de "no destino" não encontra linha, e marcar duas
// vezes a mesma também não. Só em viagens de bens a decorrer.
export async function marcarCarregada(rideId, driverId) {
  return one(
    `UPDATE rides SET carregada_em = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'in_progress' AND carga_tipo IS NOT NULL
       AND carregada_em IS NULL
     RETURNING id`,
    [rideId, driverId]
  );
}
export async function marcarNoDestino(rideId, driverId) {
  return one(
    `UPDATE rides SET no_destino_em = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'in_progress' AND carga_tipo IS NOT NULL
       AND carregada_em IS NOT NULL AND no_destino_em IS NULL
     RETURNING id`,
    [rideId, driverId]
  );
}
export async function marcarDescarregada(rideId, driverId) {
  return one(
    `UPDATE rides SET descarregada_em = NOW(), updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'in_progress' AND carga_tipo IS NOT NULL
       AND no_destino_em IS NOT NULL AND descarregada_em IS NULL
     RETURNING id`,
    [rideId, driverId]
  );
}
const MARCAR_ETAPA = {
  carregada: marcarCarregada,
  no_destino: marcarNoDestino,
  descarregada: marcarDescarregada,
};
export async function marcarEtapaCarga(rideId, driverId, etapa) {
  const marcar = MARCAR_ETAPA[etapa];
  if (!marcar) return null;
  const feito = await marcar(rideId, driverId);
  return feito ? getRideById(rideId) : null;
}

// Escrever a tarifa à mão. SÓ onde não há preço calculado.
//
// A versão anterior escrevia qualquer valor em qualquer viagem, sem olhar ao
// preço que o servidor tinha calculado da rota real. A app não usava isto — mas
// o endereço estava aberto, e um cliente modificado cobrava o que quisesse.
//
// Devolve `null` quando a viagem tem preço calculado, para quem chama poder
// dizer porquê em vez de fingir que gravou.
export async function setRideFare(rideId, fareUsd) {
  const linha = await one(
    `UPDATE rides SET fare_usd = $1, updated_at = NOW()
      WHERE id = $2 AND distance_km IS NULL
      RETURNING id`,
    [num(fareUsd), rideId]
  );
  if (!linha) return null;
  return getRideById(rideId);
}

// PEDIDOS QUE NINGUÉM ACEITOU.
//
// `requested` conta como viagem a decorrer, e uma viagem a decorrer impede a
// pessoa de pedir outra. Juntas, as duas regras faziam isto: às onze da noite,
// sem motoristas ao serviço, o passageiro pedia, não acontecia nada — e ficava
// impedido de pedir outra vez até perceber sozinho que tinha de cancelar à mão.
//
// Ao fim de MINUTOS_ATE_DESISTIR o pedido morre por si, e cancelado é melhor
// do que pendurado — cancelado deixa a pessoa pedir outra vez.
//
// CINCO MINUTOS, e não dez (decisão do Simão, 21/09/2026). Eram dez, pensados
// para o motorista que está a acabar uma viagem e ainda pode aceitar ao oitavo
// minuto. A decisão dele foi na direcção de quem está à espera no passeio: dez
// minutos a olhar para um ecrã que não diz nada são muito tempo, e ao quinto a
// pessoa já percebeu que ninguém vem.
//
// O número vive AQUI e mais em lado nenhum: a app recebe-o na cotação e
// escreve-o na frase que mostra a quem pede. Escrito à mão nos dois sítios,
// mudá-lo num deixaria o outro a mentir.
//
// A tabela é a autoridade e a hora é a do PostgreSQL — não a do processo. Se
// duas instâncias corressem isto ao mesmo tempo, o `status = 'requested'` na
// condição garante que cada viagem só é fechada uma vez.
export const MINUTOS_ATE_DESISTIR = Number(process.env.RIDE_TIMEOUT_MIN) || 5;

// TRAZ O TOKEN DE NOTIFICAÇÃO NO MESMO COMANDO (22/09/2026).
//
// O varrimento passou a avisar o passageiro por notificação, e para isso
// precisa do token e da língua dele. Ir buscá-los a seguir, um a um, seriam
// N idas à base de dados por varrimento — e, pior, uma leitura FORA da
// transação que fechou os pedidos.
//
// Com o `WITH`, o fecho e a leitura são o mesmo comando: as linhas que
// voltam são exactamente as que esta instância fechou, mesmo que outra
// esteja a correr o varrimento ao mesmo tempo.
export function expirarPedidosSemResposta() {
  return query(
    `WITH mortos AS (
       UPDATE rides
          SET status = 'cancelled', cancel_reason = 'sem_motorista', updated_at = NOW()
        WHERE status = 'requested' AND driver_id IS NULL
          AND created_at < NOW() - ($1 || ' minutes')::interval
        RETURNING id, passenger_id
     )
     SELECT m.id, m.passenger_id, u.push_token, u.lingua
       FROM mortos m JOIN users u ON u.id = m.passenger_id`,
    [String(MINUTOS_ATE_DESISTIR)]
  );
}
