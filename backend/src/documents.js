import { query, one } from './db.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB por documento
// 'fotoveiculo' (14/09/26): a fotografia do Carry com a matrícula à vista. OPCIONAL — não
// entra em OBRIGATORIOS, e por isso nunca bloqueia ninguém de trabalhar.
// 'cartaverso' (14/09/26): o VERSO da carta de condução, onde estão as categorias
// que dizem se a pessoa pode conduzir mota pequena ou grande, carro ou pickup.
// Obrigatório, sem data própria — a validade está na frente ('licence').
const TIPOS = [
  'licence',
  'cartaverso',
  'vehicle',
  'photo',
  'inspection',
  'identity',
  'fotoveiculo',
  'veiculofrente',
  'veiculotras',
  'veiculoesquerda',
  'veiculodireita',
];

// O dia em Díli, e não o dia do servidor.
//
// O Neon corre em UTC, e Díli está nove horas à frente. Com CURRENT_DATE, um
// cartão que caduca hoje só passaria a caducado às 09:00 de Díli — meia
// manhã de trabalho com um documento fora de prazo. Ao contrário, à noite,
// caducava um dia cedo. A assinatura já usa esta mesma expressão.
const HOJE_DILI = "(NOW() AT TIME ZONE 'Asia/Dili')::date";
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function isValidKind(kind) {
  return TIPOS.includes(kind);
}

// Guarda (ou substitui) um documento. O UNIQUE(user_id, kind) garante que
// um motorista tem no máximo um documento de cada tipo — reenviar
// substitui, em vez de acumular versões antigas.
// Motivos por que um documento verificado pode ser substituído.
//
// Lista fechada e não texto livre, de propósito: assim contam-se, e ao fim de
// um ano sabe-se quantos documentos se perdem em Díli — que é informação, e
// não uma pilha de frases para ler uma a uma.
export const MOTIVOS_ATUALIZACAO = ['caducado', 'perdido', 'danificado', 'errado'];

export function motivoValido(m) {
  return !m || MOTIVOS_ATUALIZACAO.includes(m);
}

export async function saveDocument({ userId, kind, mime, base64, expiresOn, motivo }) {
  if (!isValidKind(kind)) throw new Error('Tipo de documento inválido.');
  if (!MIMES.includes(mime)) throw new Error('Formato não aceite. Usa JPEG, PNG ou PDF.');

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new Error('Ficheiro vazio.');
  if (bytes.length > MAX_BYTES) throw new Error('Ficheiro demasiado grande (máximo 4 MB).');

  // A validade só se aceita em formato de data simples. Uma data mal
  // formada seria pior do que nenhuma: aparecia como se tivesse sido
  // verificada.
  const validade =
    expiresOn && /^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn)) ? String(expiresOn) : null;
  // As fotografias do veículo são imagens: um PDF ali não mostra carro nenhum.
  if (FOTOS_VEICULO.includes(kind) && mime === 'application/pdf') {
    throw new Error('Formato não aceite. Envie uma fotografia do veículo.');
  }

  return one(
    `INSERT INTO driver_documents
       (user_id, kind, mime, bytes, size_bytes, expires_on, motivo_atualizacao)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, kind)
     DO UPDATE SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes,
                   size_bytes = EXCLUDED.size_bytes, expires_on = EXCLUDED.expires_on,
                   motivo_atualizacao = EXCLUDED.motivo_atualizacao,
                   -- O documento novo responde ao pedido de correcção: a
                   -- marca sai, e quem aprova volta a vê-lo como novo.
                   correcao_motivo = NULL, correcao_em = NULL, correcao_por = NULL,
                   created_at = NOW()
     RETURNING id, kind, mime, size_bytes, expires_on, created_at`,
    [userId, kind, mime, bytes, bytes.length, validade, motivo || null]
  );
}

// Lista sem trazer os ficheiros: só o que é preciso para mostrar o estado
export function listDocuments(userId) {
  return query(
    `SELECT id, kind, mime, size_bytes, created_at,
            TO_CHAR(expires_on, 'YYYY-MM-DD') AS expires_on,
            (expires_on IS NOT NULL AND expires_on < ${HOJE_DILI}) AS caducado,
            (expires_on IS NOT NULL AND expires_on < ${HOJE_DILI} + 30) AS a_caducar,
            -- Quantos dias faltam. Negativo quer dizer que já passou.
            (expires_on - ${HOJE_DILI}) AS dias,
            motivo_atualizacao,
            -- Por rever quando foi substituído depois da última revisão.
            (motivo_atualizacao IS NOT NULL
               AND (revisto_em IS NULL OR revisto_em < created_at)) AS por_rever,
            correcao_motivo, correcao_em
     FROM driver_documents WHERE user_id = $1 ORDER BY kind`,
    [userId]
  );
}

// Pôr ou corrigir a data de validade sem voltar a fotografar.
//
// Existe por uma razão concreta: os documentos que já estavam na base foram
// enviados antes de haver campo de data, e ficaram sem nenhuma. Obrigar a
// refotografar uma carta de condução só para escrever uma data é trabalho
// que não serve para nada — e trabalho que não serve para nada não se faz.
export function definirValidade(userId, kind, expiresOn) {
  if (!isValidKind(kind)) throw new Error('Tipo de documento inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn || ''))) {
    throw new Error('Data inválida. Usa o formato AAAA-MM-DD.');
  }
  return one(
    `UPDATE driver_documents SET expires_on = $3
      WHERE user_id = $1 AND kind = $2
      RETURNING id, kind, TO_CHAR(expires_on,'YYYY-MM-DD') AS expires_on`,
    [userId, kind, String(expiresOn)]
  );
}

export function getDocument(id) {
  return one('SELECT * FROM driver_documents WHERE id = $1', [id]);
}

// O documento de uma pessoa, procurado pelo DONO e pelo tipo — nunca pelo
// id. Procurar por id obrigava a app a conhecer o número do documento, e
// bastaria trocar esse número para pedir o documento de outra pessoa. Com
// o dono na própria pesquisa, o pedido errado não devolve nada.
export function getOwnDocument(userId, kind) {
  if (!isValidKind(kind)) return Promise.resolve(null);
  return one('SELECT * FROM driver_documents WHERE user_id = $1 AND kind = $2', [userId, kind]);
}

// Documentos que caducam. A fotografia do motorista não caduca; a carta de
// condução, os papéis do veículo e o cartão de inspecção sim — e são
// justamente os que dão legitimidade para conduzir.
export const COM_VALIDADE = ['licence', 'vehicle', 'inspection'];

// O documento de identificação NÃO está na lista de cima, e é de propósito.
//
// O bilhete de identidade timorense e o passaporte têm validade, mas o que
// nos interessa neles é saber QUEM é a pessoa — e isso não caduca. Exigir
// uma data aqui suspenderia a conta de alguém cujo BI acabou, por um motivo
// que não tem nada a ver com conduzir.

// Todos são obrigatórios. O cartão de inspecção entrou nesta lista em
// 02/09/2026, a pedido do Simão.
// O verso da carta entrou a 14/09/2026, a pedido do Simão: sem ele não se vêem
// as categorias, e aprovava-se um motorista sem saber se pode conduzir aquele
// veículo.
export const OBRIGATORIOS = ['photo', 'identity', 'licence', 'cartaverso', 'vehicle', 'inspection'];

// AS FOTOGRAFIAS DO VEÍCULO, DOS QUATRO LADOS (04/10/2026, recomendação
// aceite pelo Simão). Tiradas pela câmara na app — não da galeria —, com a
// matrícula à vista à frente e atrás. Servem para quem aprova ver o carro
// que o passageiro vai ver: a cor, o estado, se a matrícula bate com a do
// cartão de registo.
//
// Contam para um REGISTO NOVO estar completo (ver `OBRIGATORIOS_REGISTO`),
// mas NÃO entram em `podeTrabalhar`: quem já está aprovado não fica parado
// por um pedido que não existia quando se registou. Pode juntá-las quando
// quiser, e o painel mostra quem ainda não as tem.
export const FOTOS_VEICULO = ['veiculofrente', 'veiculotras', 'veiculoesquerda', 'veiculodireita'];
export const OBRIGATORIOS_REGISTO = [...OBRIGATORIOS, ...FOTOS_VEICULO];

// Avisar quinze dias antes. Chega para tratar de um papel em Díli sem
// perder um dia de trabalho, e não é tão cedo que se esqueça.
export const DIAS_DE_AVISO = 15;

// Pode este motorista trabalhar hoje? Devolve o motivo, não só um sim ou
// não: dizer "não podes" sem dizer porquê gera um telefonema.
//
// A CONTA FICA SUSPENSA ENQUANTO UM DOCUMENTO ESTIVER FORA DE PRAZO, e volta
// sozinha assim que ele for renovado. A suspensão NÃO se escreve na tabela
// de propósito: escrita, obrigava alguém a desfazê-la à mão, e se esse
// alguém estivesse a dormir o motorista perdia um dia de trabalho por um
// documento que já tinha renovado. Calculada, a conta volta no segundo em
// que o cartão novo é enviado.
//
// E NÃO INTERROMPE UMA VIAGEM A MEIO. Isto só é perguntado ao ligar o
// serviço e ao entrar ao serviço — nunca durante uma viagem. Cortar um
// motorista à meia-noite deixava um passageiro na estrada por causa de um
// papel.
export async function podeTrabalhar(userId) {
  const docs = await listDocuments(userId);
  const porTipo = Object.fromEntries(docs.map((d) => [d.kind, d]));

  for (const k of OBRIGATORIOS) {
    if (!porTipo[k]) return { pode: false, motivo: 'documento_em_falta', qual: k };
  }

  // UM DOCUMENTO COM CORRECÇÃO PEDIDA NÃO SERVE (04/10/2026). Quem aprova
  // disse que aquela fotografia não se lê, ou que é o papel errado: contá-la
  // como entregue seria deixar trabalhar com um documento que ninguém
  // conseguiu verificar. Volta sozinho quando o motorista enviar o novo.
  for (const k of OBRIGATORIOS) {
    if (porTipo[k].correcao_motivo) {
      return {
        pode: false,
        motivo: 'documento_a_corrigir',
        qual: k,
        porque: porTipo[k].correcao_motivo,
      };
    }
  }

  // UM DOCUMENTO SEM DATA CONTA COMO FORA DE ORDEM, e esta linha é a que faz
  // a regra existir mesmo.
  //
  // Sem ela, `expires_on` a NULL nunca caduca — e como os documentos
  // enviados antes de haver campo de data ficaram todos a NULL, a
  // suspensão automática não suspenderia ninguém. Uma regra que nunca
  // dispara é pior do que nenhuma: dá a sensação de estar tratado.
  for (const k of COM_VALIDADE) {
    if (!porTipo[k].expires_on) {
      return { pode: false, motivo: 'documento_sem_validade', qual: k };
    }
  }

  for (const k of COM_VALIDADE) {
    if (porTipo[k].caducado) {
      return { pode: false, motivo: 'documento_caducado', qual: k, ate: porTipo[k].expires_on };
    }
  }

  // O que caduca nos próximos quinze dias, com quantos dias faltam, para o
  // aviso poder dizer "faltam 4 dias" em vez de "está quase".
  const aCaducar = COM_VALIDADE.filter(
    (k) => porTipo[k].dias != null && porTipo[k].dias <= DIAS_DE_AVISO
  )
    .map((k) => ({ qual: k, ate: porTipo[k].expires_on, dias: Number(porTipo[k].dias) }))
    .sort((a, b) => a.dias - b.dias);

  return { pode: true, aCaducar };
}

// ── PEDIR A CORRECÇÃO DE UM DOCUMENTO (04/10/2026) ──────────────────────
//
// Os motivos que o painel propõe. Não é lista fechada como a das
// substituições: aqui quem escreve é o administrador, e o que o motorista
// precisa é de ler a frase certa para aquele papel — «a data não se lê» não
// cabe numa caixa de escolha. As sugestões só poupam escrever o costume.
export const MAX_MOTIVO_CORRECAO = 200;

export async function pedirCorrecao(documentoId, motivo, adminId) {
  const m = String(motivo || '')
    .trim()
    .slice(0, MAX_MOTIVO_CORRECAO);
  if (!m) throw new Error('Indique o motivo: o motorista precisa de saber o que corrigir.');
  return one(
    `UPDATE driver_documents
        SET correcao_motivo = $2, correcao_em = NOW(), correcao_por = $3
      WHERE id = $1
      RETURNING id, user_id, kind, correcao_motivo`,
    [documentoId, m, adminId]
  );
}

// Retirar o pedido: o administrador enganou-se, ou resolveu-se por telefone.
export function retirarCorrecao(documentoId) {
  return one(
    `UPDATE driver_documents
        SET correcao_motivo = NULL, correcao_em = NULL, correcao_por = NULL
      WHERE id = $1
      RETURNING id, user_id, kind`,
    [documentoId]
  );
}
