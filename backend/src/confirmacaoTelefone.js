import { query, one } from './db.js';

// CONFIRMAR O NÚMERO DE TELEMÓVEL COM UM CÓDIGO POR SMS (05/10/2026, pedido
// do Simão, para passageiros e motoristas).
//
// PORQUE EXISTE. Sem isto, qualquer pessoa registava uma conta com o número
// de outra — e o motorista que ligasse para «o passageiro» ligava a um
// desconhecido. Em Timor-Leste cada SIM está registado num cartão de
// identidade, por isso um número confirmado é quase uma pessoa confirmada.
//
// QUEM GERA E MANDA O CÓDIGO É O TWILIO VERIFY, não nós: escolhe o remetente
// que funciona em cada país, guarda o código e conta as tentativas. Aqui só
// se pede «manda» e «este código está certo?».
//
// ADORMECIDO ATÉ HAVER CHAVES, como o email. Sem as três variáveis no Render,
// `ligado()` é falso, ninguém é obrigado a confirmar nada e a app nem mostra
// o ecrã. Ligar é pôr as chaves; desligar é tirá-las.
//
//   TWILIO_ACCOUNT_SID   — «Account SID», no painel do Twilio
//   TWILIO_AUTH_TOKEN    — «Auth Token», no mesmo sítio
//   TWILIO_VERIFY_SID    — o «Service SID» do serviço Verify (começa por VA)
//   SMS_TECTO_DIARIO     — opcional; máximo de SMS por dia (por omissão 150)
//
// CADA SMS CUSTA DINHEIRO, e há quem abuse disso de propósito (fazer o
// servidor mandar milhares de SMS para números caros). Por isso três tectos:
// 3 por conta por hora, 6 por conta por dia, e um tecto diário para todos.
const PRAZO_MS = 10000;
const POR_HORA = 3;
const POR_DIA = 6;
const tectoDiario = () => Number(process.env.SMS_TECTO_DIARIO || 150);

let ultimoErro = null;

export function ligado() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SID
  );
}

export function estadoDoSms() {
  return { ligado: ligado(), ultimoErro };
}

// O número como o Twilio o quer (E.164). Os de Timor-Leste estão guardados
// com 8 algarismos e sem indicativo; os de fora já trazem o «+».
export function emE164(phone) {
  const p = String(phone || '').replace(/[\s()\-.]/g, '');
  if (p.startsWith('+')) return p;
  if (/^\d{8}$/.test(p)) return `+670${p}`;
  return null;
}

async function twilio(caminho, campos) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const chave = process.env.TWILIO_AUTH_TOKEN;
  const servico = process.env.TWILIO_VERIFY_SID;
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
  try {
    const r = await fetch(`https://verify.twilio.com/v2/Services/${servico}/${caminho}`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${chave}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(campos).toString(),
      signal: ctrl.signal,
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      ultimoErro = {
        http: r.status,
        quando: new Date().toISOString(),
        diz: String(corpo?.message || '').slice(0, 300),
      };
    } else {
      ultimoErro = null;
    }
    return { ok: r.ok, http: r.status, corpo };
  } catch (e) {
    ultimoErro = { http: 0, quando: new Date().toISOString(), diz: e?.message || 'sem resposta' };
    return { ok: false, http: 0, corpo: {} };
  } finally {
    clearTimeout(relogio);
  }
}

// Manda o código. Devolve { ok } ou { erro, status } com a frase para a app.
export async function enviarCodigo(user, lingua = 'pt') {
  if (!ligado()) return { erro: 'A confirmação por SMS não está ligada.', status: 409 };
  if (user.telefone_confirmado) return { ok: true, jaEstava: true };
  const para = emE164(user.phone);
  if (!para) return { erro: 'Número de telemóvel inválido.', status: 400 };

  const c = await one(
    `SELECT
       COUNT(*) FILTER (WHERE user_id = $1 AND criado_em > NOW() - INTERVAL '1 hour')::int AS hora,
       COUNT(*) FILTER (WHERE user_id = $1 AND criado_em > NOW() - INTERVAL '1 day')::int AS dia,
       COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '1 day')::int AS todos
     FROM sms_envios`,
    [user.id]
  );
  if (c.hora >= POR_HORA || c.dia >= POR_DIA) {
    return {
      erro: 'Já pediu vários códigos. Espere um pouco antes de pedir outro.',
      status: 429,
    };
  }
  if (c.todos >= tectoDiario()) {
    console.error('[sms] tecto diário atingido:', c.todos);
    return { erro: 'Não é possível mandar o código agora. Tente mais tarde.', status: 503 };
  }

  // O Verify tem as mensagens em português e inglês; o tétum não existe lá,
  // e o português lê-se em Timor-Leste.
  const r = await twilio('Verifications', {
    To: para,
    Channel: 'sms',
    Locale: lingua === 'en' ? 'en' : 'pt',
  });
  await query(`INSERT INTO sms_envios (user_id, ok) VALUES ($1, $2)`, [user.id, r.ok]);
  if (!r.ok) {
    console.error('[sms] envio falhou:', r.http, ultimoErro?.diz);
    return { erro: 'Não foi possível mandar o código agora. Tente mais tarde.', status: 502 };
  }
  return { ok: true };
}

// Confere o código e, se estiver certo, marca o número como confirmado.
export async function confirmarCodigo(user, codigo) {
  if (!ligado()) return { erro: 'A confirmação por SMS não está ligada.', status: 409 };
  const c = String(codigo || '').replace(/\D/g, '');
  if (c.length < 4 || c.length > 10)
    return { erro: 'Código inválido ou expirado. Peça outro.', status: 400 };
  const para = emE164(user.phone);
  if (!para) return { erro: 'Número de telemóvel inválido.', status: 400 };
  const r = await twilio('VerificationCheck', { To: para, Code: c });
  if (!r.ok || r.corpo?.status !== 'approved') {
    return { erro: 'Código inválido ou expirado. Peça outro.', status: 400 };
  }
  await marcarConfirmado(user.id, null);
  return { ok: true };
}

// `porAdmin`: o administrador confirmou à mão (por exemplo, o SMS não chega
// àquela operadora e a pessoa mostrou o telemóvel no escritório).
export function marcarConfirmado(userId, porAdmin) {
  return query(
    `UPDATE users SET telefone_confirmado = TRUE, telefone_confirmado_em = NOW(),
            telefone_confirmado_por = $2
      WHERE id = $1`,
    [userId, porAdmin || null]
  );
}

// Falta confirmar? Só conta quando o serviço está ligado: sem ele, ninguém
// pode confirmar, e exigir o impossível era fechar a porta a toda a gente.
export function faltaConfirmar(user) {
  return ligado() && !user?.telefone_confirmado;
}
