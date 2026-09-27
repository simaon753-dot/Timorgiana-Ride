import { query, one } from './db.js';

// AS OCORRÊNCIAS — «Reportar» a partir de uma viagem (27/09/2026).
//
// PORQUE EXISTE. A avaliação diz COMO correu, e os motivos das estrelas
// baixas dizem o que correu menos bem. Mas há coisas que não são uma nota: um
// objecto esquecido no banco de trás, uma cobrança acima do preço, um
// assédio. Isso precisa de alguém do lado da TimorgianaRide que leia, trate e
// responda — e de ficar PRESO À VIAGEM, para quem trata saber logo quem
// conduzia, quem viajava, quando e por onde, sem ter de perguntar.
//
// QUEM VÊ O QUÊ. Quem reporta vê as suas ocorrências e o estado delas. A
// outra pessoa da viagem não vê nada: saber que foi reportada, por quem e
// porquê, expunha quem fez a queixa — e, num assédio, é precisamente quem
// não pode ficar exposto. Só o painel vê tudo.
//
// CATEGORIAS E NÃO SÓ TEXTO LIVRE, pela mesma razão dos motivos das estrelas
// (ver `ratings.js`): contam-se, traduzem-se e as graves podem disparar um
// aviso. Mas aqui há também um campo de texto, e é de propósito: uma
// ocorrência é para ser lida por uma pessoa, e «esqueci-me de um guarda-chuva
// azul» não cabe numa categoria. Esse texto nunca é mostrado a mais ninguém
// senão ao painel.

// A LISTA DEPENDE DO LUGAR DE QUEM REPORTA NESTA VIAGEM, e não do papel da
// conta: uma conta de motorista também pede viagens como passageira.
//
// Estas duas listas estão copiadas em `mobile/src/screens/ReportarScreen.js`
// — a app mostra-as mesmo sem rede —, e o `verificar-tipos.mjs` da app não
// deixa as duas cópias divergirem.
export const CATEGORIAS_DO_PASSAGEIRO = [
  'conducaoPerigosa',
  'assedio',
  'cobrancaIndevida',
  'percurso',
  'veiculoDiferente',
  'objetoPerdido',
  'outro',
];
export const CATEGORIAS_DO_MOTORISTA = [
  'ameaca',
  'assedio',
  'naoPagou',
  'danos',
  'objetoPerdido',
  'outro',
];

// AS GRAVES chegam ao telemóvel dos administradores logo que são feitas, e
// contam no sino como urgentes. As outras esperam por quem abrir o painel.
export const CATEGORIAS_GRAVES = ['conducaoPerigosa', 'assedio', 'ameaca'];

export const ESTADOS = ['aberta', 'em_analise', 'resolvida', 'arquivada'];

// DECIDIDO A 28/09/2026 (o Simão delegou-me; ficaram as propostas de 27/09).
// O Aviso de Privacidade diz que só a equipa vê a ocorrência, que a outra
// pessoa não é avisada e que se guarda 24 meses depois de tratada
// (`retencao.js`). Mudar qualquer destes obriga a mudar o aviso.
//
// 30 dias para reportar. Chega para quem só dá pela falta de um objecto dias
// depois, e não deixa reabrir uma viagem de há meses — nessa altura já
// ninguém se lembra de nada, e uma queixa assim não se consegue apurar.
export const PRAZO_DIAS = 30;
// Três por pessoa e por viagem. Uma viagem pode ter duas coisas diferentes (o
// objecto esquecido E a cobrança); mais do que três é repetir a mesma.
export const MAX_POR_VIAGEM = 3;
export const DESCRICAO_MAX = 1000;
// «Outro» sem descrição não diz nada a quem trata.
export const DESCRICAO_MIN_OUTRO = 10;

export function categoriasPara(papel) {
  return papel === 'driver' ? CATEGORIAS_DO_MOTORISTA : CATEGORIAS_DO_PASSAGEIRO;
}

// Até quando esta viagem ainda pode ser reportada. Conta a partir de quando
// foi pedida — é a única data que todas as viagens têm, concluídas ou não.
export function prazoDe(ride) {
  const base = new Date(ride.created_at);
  return new Date(base.getTime() + PRAZO_DIAS * 24 * 3600 * 1000);
}

// O que se pode reportar: o que aparece no histórico — concluídas, e
// canceladas que chegaram a ter motorista. Um pedido que ninguém aceitou não
// teve ninguém do outro lado.
export function viagemReportavel(ride) {
  return ride.status === 'completed' || (ride.status === 'cancelled' && ride.driver_id != null);
}

// O RETRATO DA VIAGEM NO MOMENTO DA QUEIXA.
//
// Guarda-se com a ocorrência, e não só o número da viagem, por duas razões.
// O administrador pode exportar e apagar viagens antigas (ver `/exportar`);
// uma ocorrência que só apontasse para a viagem ficava a apontar para nada.
// E os nomes, a matrícula e o telefone podem mudar depois — o que interessa
// é quem era, naquele dia.
function retratoDe(ride) {
  return {
    viagem: ride.id,
    estado: ride.status,
    pedidaEm: ride.created_at,
    iniciadaEm: ride.started_at ?? null,
    veiculo: ride.vehicle_type ?? null,
    servico: ride.servico ?? null,
    origem: { rotulo: ride.origin_label ?? null, lat: ride.origin_lat, lng: ride.origin_lng },
    destino: { rotulo: ride.dest_label ?? null, lat: ride.dest_lat, lng: ride.dest_lng },
    km: ride.distance_km ?? null,
    minutos: ride.duration_min ?? null,
    precoUsd: ride.fare_usd ?? null,
    passageiro: { id: ride.passenger_id, nome: ride.p_name, telefone: ride.p_phone },
    motorista: ride.driver_id
      ? {
          id: ride.driver_id,
          nome: ride.d_name,
          telefone: ride.d_phone,
          matricula: ride.d_vplate ?? null,
          modelo: ride.d_vmodel ?? null,
          cor: ride.d_vcolor ?? null,
        }
      : null,
  };
}

// Cria a ocorrência. Devolve `{ erro }` com a mensagem para quem pediu, ou
// `{ ocorrencia }`. As mensagens estão em português e são traduzidas à saída
// (ver `mensagens.js`).
export async function criarOcorrencia({ ride, autorId, categoria, descricao }) {
  const papel = ride.driver_id === autorId ? 'driver' : 'passenger';
  if (!viagemReportavel(ride)) {
    return { erro: 'Esta viagem não pode ser reportada.' };
  }
  if (Date.now() > prazoDe(ride).getTime()) {
    return { erro: 'Já passou o prazo para reportar esta viagem.' };
  }
  if (!categoriasPara(papel).includes(categoria)) {
    return { erro: 'Escolha o tipo de problema.' };
  }
  const texto = typeof descricao === 'string' ? descricao.trim().slice(0, DESCRICAO_MAX) : '';
  if (categoria === 'outro' && texto.length < DESCRICAO_MIN_OUTRO) {
    return { erro: 'Descreva o que aconteceu.' };
  }
  const { n } = await one(
    'SELECT COUNT(*)::int AS n FROM ocorrencias WHERE ride_id = $1 AND autor_id = $2',
    [ride.id, autorId]
  );
  if (n >= MAX_POR_VIAGEM) {
    return { erro: 'Já reportou esta viagem várias vezes. A equipa vai analisar.' };
  }
  const visado = papel === 'driver' ? ride.passenger_id : ride.driver_id;
  const ocorrencia = await one(
    `INSERT INTO ocorrencias (ride_id, autor_id, papel_autor, visado_id, categoria, descricao, resumo)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [ride.id, autorId, papel, visado, categoria, texto || null, retratoDe(ride)]
  );
  return { ocorrencia, grave: CATEGORIAS_GRAVES.includes(categoria) };
}

// O que quem reportou vê: a categoria, o que escreveu, o estado e a resposta.
// Nunca a nota interna do painel.
export function ocorrenciaPublica(o) {
  return {
    id: o.id,
    categoria: o.categoria,
    descricao: o.descricao,
    estado: o.estado,
    resposta: o.resposta ?? null,
    criadaEm: o.created_at,
    tratadaEm: o.tratada_em ?? null,
  };
}

export function ocorrenciasDoAutor(rideId, autorId) {
  return query('SELECT * FROM ocorrencias WHERE ride_id = $1 AND autor_id = $2 ORDER BY id DESC', [
    rideId,
    autorId,
  ]);
}

// PARA O PAINEL. `abertas` são as que ainda precisam de alguém: abertas e em
// análise. As graves primeiro, e dentro delas as mais antigas — é a ordem em
// que devem ser tratadas.
export function ocorrenciasParaAdmin(filtro = 'abertas') {
  const onde = filtro === 'todas' ? '' : `WHERE o.estado IN ('aberta','em_analise')`;
  return query(
    `SELECT o.*, a.name AS autor_nome, a.phone AS autor_telefone,
            t.name AS tratada_por_nome
       FROM ocorrencias o
       LEFT JOIN users a ON a.id = o.autor_id
       LEFT JOIN users t ON t.id = o.tratada_por
       ${onde}
      ORDER BY (o.estado IN ('aberta','em_analise')) DESC,
               (o.categoria = ANY($1)) DESC,
               CASE WHEN o.estado IN ('aberta','em_analise') THEN o.created_at END ASC,
               o.created_at DESC
      LIMIT 200`,
    [CATEGORIAS_GRAVES]
  );
}

export async function tratarOcorrencia({ id, estado, resposta, notaInterna, adminId }) {
  if (!ESTADOS.includes(estado)) return null;
  const limpar = (v) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, DESCRICAO_MAX) : null;
  return one(
    `UPDATE ocorrencias
        SET estado = $2,
            resposta = COALESCE($3, resposta),
            nota_interna = COALESCE($4, nota_interna),
            tratada_por = $5,
            tratada_em = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, estado, limpar(resposta), limpar(notaInterna), adminId]
  );
}
