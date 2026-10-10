import { query, one } from './db.js';
import { enviarEmail } from './email.js';
import { notificarConta } from './push.js';
import { notificacao as n } from './mensagens.js';
import { COM_VALIDADE, SEGURO } from './documents.js';

// O MOTORISTA FICA A SABER DE CADA PASSO DO REGISTO (04/10/2026).
//
// Até aqui, aprovar, recusar ou suspender no painel só chegava ao motorista
// pelo socket — e só se ele tivesse a app aberta naquele minuto. Quem
// esperava aprovação há três dias abria a app para descobrir; quem tinha sido
// recusado não sabia porquê sem telefonar.
//
// Agora cada passo vai por NOTIFICAÇÃO e por EMAIL, com o mesmo texto, na
// língua que a pessoa usou da última vez:
//   · registo recebido (os documentos ficaram completos);
//   · aprovado, reactivado, recusado com o motivo, suspenso com o motivo;
//   · correcção pedida a um documento, com o motivo;
//   · validade a acabar: 30, 15 e 7 dias antes, na véspera, no dia, e depois.
//
// O EMAIL SÓ VAI PARA ENDEREÇOS CONFIRMADOS. Um endereço mal escrito é de
// outra pessoa — e «a sua conta foi suspensa por queixa de assédio» não pode
// ir parar à caixa de um desconhecido. A notificação não tem esse risco: o
// token é do telemóvel onde a conta entrou.
//
// NADA DISTO PODE FALHAR A DECISÃO. Quem chama não espera: um serviço de
// correio lento não pode deixar o administrador a olhar para um botão preso.

async function contaDe(userId) {
  return one(
    `SELECT id, name, email, email_confirmado, push_token, lingua FROM users WHERE id = $1`,
    [userId]
  );
}

// Manda o título e o texto pelos dois caminhos. `vars` entra nos dois.
async function avisar(userId, chaveTitulo, chaveTexto, vars = {}) {
  const u = await contaDe(userId);
  if (!u) return;
  const lingua = u.lingua || 'pt';
  const titulo = n(chaveTitulo, lingua, vars);
  const texto = n(chaveTexto, lingua, vars);
  await Promise.all([
    notificarConta(u, { titulo, texto, data: { tipo: 'registo' } }),
    u.email && u.email_confirmado
      ? enviarEmail({
          para: u.email,
          assunto: `HAKAT — ${titulo}`,
          texto:
            `${n('emailOla', lingua, { nome: u.name || '' })}\n\n` +
            `${texto}\n\n` +
            `${n('emailRodape', lingua)}\n\n` +
            `HAKAT — Díli, Timor-Leste`,
        })
      : null,
  ]);
}

// O nome do documento na língua da pessoa — o texto do aviso começa por ele.
async function nomeDoc(userId, kind) {
  const u = await one('SELECT lingua FROM users WHERE id = $1', [userId]);
  return n(`doc_${kind}`, u?.lingua || 'pt') || kind;
}

function semEsperar(promessa, oque) {
  promessa.catch((e) => console.error(`[avisos-registo] ${oque}:`, e?.message));
}

// ── A decisão do painel ────────────────────────────────────────────────
// `antes` é o estado de onde se veio: aprovar alguém que estava suspenso é
// reactivá-lo, e a frase é outra.
export function avisarDecisao(userId, decisao, motivo, antes) {
  const base = {
    approved: antes === 'suspended' ? 'registoReativado' : 'registoAprovado',
    rejected: 'registoRecusado',
    suspended: 'registoSuspenso',
  }[decisao];
  if (!base) return;
  semEsperar(
    avisar(userId, `${base}Titulo`, `${base}Texto`, { motivo: motivo || '' }),
    `decisão ${decisao} #${userId}`
  );
}

// ── O registo chegou completo ─────────────────────────────────────────
// Uma vez só por conta: a coluna fica marcada na mesma instrução que decide
// se se avisa, e dois envios ao mesmo tempo não avisam duas vezes.
export function avisarRegistoRecebido(userId) {
  semEsperar(
    (async () => {
      const r = await one(
        `UPDATE users SET registo_recebido_em = NOW()
          WHERE id = $1 AND registo_recebido_em IS NULL
          RETURNING id`,
        [userId]
      );
      if (r) await avisar(userId, 'registoRecebidoTitulo', 'registoRecebidoTexto');
    })(),
    `recebido #${userId}`
  );
}

// ── Correcção pedida a um documento ───────────────────────────────────
export function avisarCorrecao(userId, kind, motivo) {
  semEsperar(
    (async () => {
      const documento = await nomeDoc(userId, kind);
      await avisar(userId, 'correcaoTitulo', 'correcaoTexto', { documento, motivo });
    })(),
    `correcção ${kind} #${userId}`
  );
}

// ── Validade dos documentos ───────────────────────────────────────────
//
// OS MARCOS: 30, 15 e 7 dias antes, a véspera, o próprio dia, e depois de
// caducar. Cada documento recebe o aviso da FAIXA em que está — quem tem a
// carta a acabar daqui a 5 dias recebe o dos 7, e não os três de uma vez —,
// e a tabela `avisos_validade` garante que cada aviso vai uma vez só.
//
// Só a motoristas aprovados: quem ainda está à espera vê a data no registo,
// e quem foi recusado ou suspenso tem outra conversa a ter primeiro.
//
// Só entre as 7:00 e as 21:00 de Díli. O varrimento corre de hora a hora, e
// um aviso de papelada às três da manhã acorda alguém por nada.
export function marcoDe(dias) {
  if (dias < 0) return -1;
  if (dias === 0) return 0;
  if (dias === 1) return 1;
  if (dias <= 7) return 7;
  if (dias <= 15) return 15;
  if (dias <= 30) return 30;
  return null;
}

function paraMostrar(iso) {
  const [a, m, d] = String(iso).split('-');
  return `${d}/${m}/${a}`;
}

export async function varrerValidades() {
  const [{ hora }] = await query(
    `SELECT EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Dili')::int AS hora`
  );
  if (hora < 7 || hora >= 21) return { enviados: 0, foraDeHoras: true };

  // Os caducados há mais de 30 dias ficam de fora: o aviso deles já foi (ou,
  // na primeira vez que isto corre, chegaria tarde de mais para ajudar).
  const docs = await query(
    `SELECT d.id, d.user_id, d.kind,
            TO_CHAR(d.expires_on, 'YYYY-MM-DD') AS validade,
            (d.expires_on - (NOW() AT TIME ZONE 'Asia/Dili')::date)::int AS dias
       FROM driver_documents d
       JOIN users u ON u.id = d.user_id
      WHERE d.kind = ANY($1::text[])
        AND d.expires_on IS NOT NULL
        AND u.driver_status = 'approved'
        AND d.expires_on - (NOW() AT TIME ZONE 'Asia/Dili')::date BETWEEN -30 AND 30`,
    // O seguro também: caducado, o selo «Seguro ✓» desaparece (10/10/2026).
    [[...COM_VALIDADE, SEGURO]]
  );

  let enviados = 0;
  for (const d of docs) {
    const marco = marcoDe(d.dias);
    if (marco == null) continue;
    const novo = await one(
      `INSERT INTO avisos_validade (documento_id, validade, marco)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING documento_id`,
      [d.id, d.validade, marco]
    );
    if (!novo) continue;
    const documento = await nomeDoc(d.user_id, d.kind);
    const data = paraMostrar(d.validade);
    const [titulo, texto] =
      marco === -1
        ? ['validadeCaducouTitulo', 'validadeCaducouTexto']
        : marco === 0
          ? ['validadeTitulo', 'validadeHojeTexto']
          : marco === 1
            ? ['validadeTitulo', 'validadeAmanhaTexto']
            : ['validadeTitulo', 'validadeFaltamTexto'];
    try {
      await avisar(d.user_id, titulo, texto, { documento, data, dias: d.dias });
      enviados += 1;
    } catch (e) {
      console.error('[avisos-registo] validade', d.id, e?.message);
    }
  }
  return { enviados };
}
