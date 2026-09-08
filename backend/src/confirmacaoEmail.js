import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, one } from './db.js';
import { enviarEmail } from './email.js';

// Confirmar que o email escrito no registo é mesmo o da pessoa.
//
// PORQUE EXISTE. O email serve para recuperar a conta no dia em que a senha
// se perde. Um endereço mal escrito nesse dia não vale nada — e a altura de
// descobrir que está errado é HOJE, não daqui a seis meses com a pessoa sem
// forma de entrar.
//
// Um endereço mal FORMADO apanha-se no registo, sem enviar nada. Um endereço
// bem formado mas ERRADO (`simao@gmial.com`) não se apanha de maneira
// nenhuma: existe, é válido, só não é dela. O código é o único mecanismo que
// os distingue, porque um deles não chega a lado nenhum.
//
// NÃO BLOQUEIA A ENTRADA. Quem se regista entra logo e usa a app. Fica uma
// faixa no perfil até confirmar. Bloquear punha um serviço de fora no caminho
// de quem se está a inscrever — e na rede de Díli isso são utilizadores
// perdidos à porta, pela funcionalidade que só serve num dia mau.
const VALIDADE_MINUTOS = 60;
const TENTATIVAS = 5;

function gerarCodigo() {
  // `randomInt` e não `Math.random`: seis dígitos que dão acesso a uma conta
  // não se tiram de um gerador previsível.
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export async function emitirConfirmacao(userId) {
  const u = await one('SELECT id, name, email, email_confirmado FROM users WHERE id = $1', [
    userId,
  ]);
  if (!u || !u.email || u.email_confirmado) return null;

  const codigo = gerarCodigo();
  // Guardado com bcrypt, como uma palavra-passe: se a base de dados um dia
  // sair de casa, os códigos que lá estiverem não confirmam nada.
  const hash = await bcrypt.hash(codigo, 10);
  await query(
    `UPDATE users
        SET email_codigo_hash = $2,
            email_codigo_expira = NOW() + ($3 || ' minutes')::interval,
            email_codigo_tentativas = 0
      WHERE id = $1`,
    [userId, hash, String(VALIDADE_MINUTOS)]
  );

  const enviado = await enviarEmail({
    para: u.email,
    assunto: `TimorgianaRide — código ${codigo}`,
    texto:
      `Olá${u.name ? ' ' + u.name : ''},\n\n` +
      `O seu código de confirmação é: ${codigo}\n\n` +
      `Escreva-o na aplicação, em Perfil, para confirmar este endereço.\n` +
      `Serve para recuperar a sua conta se esquecer a palavra-passe.\n\n` +
      `O código expira dentro de ${VALIDADE_MINUTOS} minutos.\n` +
      `Se não foi o senhor que se registou, ignore esta mensagem.\n\n` +
      `TimorgianaRide — Díli, Timor-Leste`,
  });

  // Devolve se conseguiu enviar, mas quem chama não deve falhar por isso.
  // O código fica guardado na mesma: se o envio falhou por o serviço estar em
  // baixo, um "reenviar" daqui a um minuto usa este mesmo mecanismo.
  return { enviado, minutos: VALIDADE_MINUTOS };
}

export async function confirmarComCodigo(userId, codigo) {
  const u = await one(
    `SELECT id, email_codigo_hash, email_codigo_tentativas, email_confirmado,
            email_codigo_expira > NOW() AS valido
       FROM users WHERE id = $1`,
    [userId]
  );
  if (!u) return { ok: false, erro: 'nao_encontrado' };
  if (u.email_confirmado) return { ok: true, jaEstava: true };

  // UMA SÓ MENSAGEM PARA TODAS AS FALHAS.
  //
  // Código errado, expirado, tentativas esgotadas, nenhum código pedido —
  // tudo devolve o mesmo. Distinguir ensinaria a quem tentasse adivinhar
  // onde está a errar, e a quem se enganou não ajuda nada: a acção é a
  // mesma nos quatro casos, que é pedir outro código.
  const falhou = { ok: false, erro: 'codigo_invalido' };
  if (!u.email_codigo_hash || !u.valido) return falhou;
  if ((u.email_codigo_tentativas ?? 0) >= TENTATIVAS) return falhou;

  const certo = await bcrypt.compare(String(codigo || ''), u.email_codigo_hash);
  if (!certo) {
    await query(
      'UPDATE users SET email_codigo_tentativas = email_codigo_tentativas + 1 WHERE id = $1',
      [userId]
    );
    return falhou;
  }

  // O código morre ao ser usado. Um código que continuasse a servir era uma
  // segunda senha a viver numa caixa de correio.
  await query(
    `UPDATE users
        SET email_confirmado = TRUE,
            email_codigo_hash = NULL,
            email_codigo_expira = NULL,
            email_codigo_tentativas = 0
      WHERE id = $1`,
    [userId]
  );
  return { ok: true };
}
