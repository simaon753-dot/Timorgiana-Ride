import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, one } from './db.js';
import { enviarEmail } from './email.js';

// O SEGUNDO PASSO DO PAINEL — um código por email a cada entrada (28/09/2026).
//
// PORQUE EXISTE. O painel mostra os telefones, os documentos de identidade e
// os pagamentos de toda a gente, e até hoje bastava a palavra-passe. Uma
// palavra-passe perde-se de muitas maneiras que o dono não vê: escrita num
// papel, vista por cima do ombro, repetida noutro site que foi roubado. Com
// o código, quem a tiver continua à porta: falta-lhe a caixa de correio.
//
// SÓ NO PAINEL. A app do telemóvel fica como está: o próprio telemóvel já
// tem bloqueio, e um motorista em Díli com rede fraca não pode ficar à espera
// de um email para começar a trabalhar.
//
// Seis algarismos, 10 minutos, 5 tentativas, uso único, guardado com bcrypt
// como uma palavra-passe — as mesmas regras do código de confirmação de
// email (`confirmacaoEmail.js`), mais curtas no tempo porque aqui se está
// à frente do computador à espera dele.
const VALIDADE_MINUTOS = 10;
const TENTATIVAS = 5;
// No máximo tantos códigos por conta em 15 minutos: quem carrega em
// «Entrar» dez vezes não enche a caixa de correio de ninguém.
const MAX_EMISSOES = 5;

// DESLIGÁVEL SÓ NO RENDER, e ligado por omissão. É a porta de emergência para
// o dia em que o serviço de email falhar e for preciso entrar no painel: quem
// a abre tem de ter acesso ao Render, que é o próprio Simão. O modo menos
// seguro nunca é o que se obtém sem fazer nada.
export function codigoObrigatorio() {
  return String(process.env.PAINEL_CODIGO || '').toLowerCase() !== 'desligado';
}

// «s•••••3@gmail.com»: o bastante para a pessoa reconhecer a caixa, e não o
// bastante para quem está a tentar adivinhar ficar a saber o endereço.
export function mascarar(email) {
  const [nome, dominio] = String(email).split('@');
  if (!dominio) return '•••';
  const ver = nome.length <= 2 ? nome[0] : nome[0] + '•••••' + nome[nome.length - 1];
  return `${ver}@${dominio}`;
}

// Emite um código novo e manda-o. Devolve `{ erro }` ou `{ desafio, para }`.
// O `desafio` é o número deste pedido de entrada — é ele, e não o telefone,
// que o segundo passo apresenta, para o código só servir para esta entrada.
export async function emitirCodigoPainel(user) {
  const { n } = await one(
    `SELECT COUNT(*)::int AS n FROM codigos_painel
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
    [user.id]
  );
  if (n >= MAX_EMISSOES) {
    return { erro: 'Pediu demasiados códigos. Espere alguns minutos e tente de novo.' };
  }
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const hash = await bcrypt.hash(codigo, 10);
  const row = await one(
    `INSERT INTO codigos_painel (user_id, codigo_hash, expira)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval) RETURNING id`,
    [user.id, hash, String(VALIDADE_MINUTOS)]
  );
  const enviado = await enviarEmail({
    para: user.email,
    assunto: `HAKAT — código do painel ${codigo}`,
    texto:
      `Olá${user.name ? ' ' + user.name : ''},\n\n` +
      `O seu código para entrar no painel de administração é: ${codigo}\n\n` +
      `Expira dentro de ${VALIDADE_MINUTOS} minutos e serve uma só vez.\n\n` +
      `Se não foi o senhor que tentou entrar agora, alguém sabe a sua ` +
      `palavra-passe: mude-a na aplicação o quanto antes. Sem este código, ` +
      `essa pessoa não consegue entrar.\n\n` +
      `HAKAT — Díli, Timor-Leste`,
  });
  if (!enviado) {
    return {
      erro: 'Não foi possível enviar o código por email. Tente de novo dentro de um minuto.',
    };
  }
  return { desafio: row.id, para: mascarar(user.email) };
}

// Confere o código. Devolve o id da conta, ou null — uma só resposta para
// todas as falhas (errado, expirado, usado, tentativas esgotadas), pela mesma
// razão do código de email: distinguir só ajudava quem está a adivinhar.
export async function confirmarCodigoPainel(desafio, codigo) {
  const id = Number(desafio);
  if (!Number.isInteger(id) || id <= 0) return null;
  const c = await one(
    `SELECT id, user_id, codigo_hash, tentativas, usado, expira > NOW() AS valido
       FROM codigos_painel WHERE id = $1`,
    [id]
  );
  if (!c || c.usado || !c.valido || c.tentativas >= TENTATIVAS) return null;
  const certo = await bcrypt.compare(String(codigo || '').trim(), c.codigo_hash);
  if (!certo) {
    await query('UPDATE codigos_painel SET tentativas = tentativas + 1 WHERE id = $1', [id]);
    return null;
  }
  // Uso único, e os outros códigos desta conta morrem com este: um código
  // pedido e não usado não deve ficar à espera numa caixa de correio.
  await query('UPDATE codigos_painel SET usado = TRUE WHERE user_id = $1 AND usado = FALSE', [
    c.user_id,
  ]);
  return c.user_id;
}

// Os códigos velhos não servem para nada. Apagam-se com a limpeza de hora a
// hora (`retencao.js`).
export async function limparCodigosPainel() {
  const r = await query(
    `DELETE FROM codigos_painel WHERE created_at < NOW() - INTERVAL '1 day' RETURNING id`
  );
  return r.length;
}
