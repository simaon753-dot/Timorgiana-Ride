// Enviar email.
//
// ADORMECIDO ATÉ HAVER SERVIÇO, de propósito, como a camada do Google na
// busca. Sem `RESEND_API_KEY`, esta função devolve `false` e mais nada
// acontece — o registo continua a funcionar, o código continua a ser gerado
// e guardado, e a pessoa continua a entrar. Só não recebe a mensagem.
//
// É a mesma regra que hoje já se aplicou três vezes: um serviço de fora não
// pode estar no caminho crítico. Quem se está a inscrever não pode ficar à
// porta porque um servidor de correio em Amesterdão está lento.
//
// PORQUE HTTP E NÃO SMTP. O SMTP obriga a uma biblioteca, a credenciais de
// servidor e a portas que muitos alojamentos bloqueiam. Um POST é uma linha,
// e falha de maneira que se percebe.
//
// PARA LIGAR, no Render:
//   RESEND_API_KEY  — a chave do serviço
//   EMAIL_DE        — o remetente, num domínio verificado lá
//
// Sem domínio verificado, o serviço recusa: é assim que o correio impede
// qualquer um de escrever em nome de outro.

const PRAZO_MS = 10000;

// O último erro, para o /api/health o poder mostrar.
//
// Existe pela mesma razão do `ultimoErroGoogle`: sem isto, um email que não
// chega é indistinguível de um email que ninguém abriu. E a diferença é toda
// — num caso corrige-se a configuração, no outro telefona-se à pessoa.
let ultimoErro = null;

export async function enviarEmail({ para, assunto, texto }) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_DE;
  if (!chave || !de || !para) return false;

  try {
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({ from: de, to: [para], subject: assunto, text: texto }),
      signal: ctrl.signal,
    });
    clearTimeout(relogio);
    if (r.ok) {
      ultimoErro = null;
      return true;
    }
    const corpo = await r.text().catch(() => '');
    ultimoErro = { http: r.status, quando: new Date().toISOString(), diz: corpo.slice(0, 300) };
    return false;
  } catch (e) {
    ultimoErro = { http: 0, quando: new Date().toISOString(), diz: e?.message || 'sem resposta' };
    return false;
  }
}

export function estadoDoEmail() {
  return {
    ligado: !!(process.env.RESEND_API_KEY && process.env.EMAIL_DE),
    ultimoErro,
  };
}

// Um endereço mal formado apanha-se aqui; um endereço errado não se apanha
// em lado nenhum.
//
// `simao@gmial.com` é perfeitamente válido — existe, só não é o dele. Nenhuma
// verificação de formato apanha isso, e é por isso que existe o código de
// confirmação: ele é o ÚNICO mecanismo que distingue um endereço que a pessoa
// abre de um que ela escreveu mal.
//
// Deliberadamente simples. Uma expressão que tente cumprir a norma inteira
// recusa endereços válidos e raros, e o custo de recusar o email de alguém
// que se quer inscrever é maior do que o de aceitar um que não existe — esse
// a confirmação apanha.
export function emailBemFormado(email) {
  const e = String(email || '').trim();
  if (e.length < 6 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e);
}
