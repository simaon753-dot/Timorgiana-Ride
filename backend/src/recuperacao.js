import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { one, query } from './db.js';

// Recuperar o acesso a uma conta, sem SMS e sem que ninguém saiba a senha de
// outra pessoa.
//
// O PROBLEMA. Não havia recuperação nenhuma: quem esquecesse a palavra-passe
// perdia a conta e tudo o que lá estava — os dias comprados, os documentos
// aprovados, o histórico. Em Timor-Leste isso é pior do que parece, porque
// criar outra conta gasta um dos três números que a pessoa pode ter.
//
// PORQUE NÃO É O ADMINISTRADOR A DEFINIR A SENHA. Seria mais simples: um
// botão, uma senha temporária dita ao telefone. Mas passava a haver alguém
// que sabe a palavra-passe de outra pessoa — e no dia em que houvesse uma
// disputa sobre uma viagem, um pagamento ou uma mensagem feita naquela conta,
// "o administrador sabia a senha" é um facto que estraga qualquer explicação.
//
// Com um código, o administrador prova que falou com a pessoa e mais nada. A
// senha nova nasce e morre no telemóvel dela.
//
// PORQUE NÃO POR SMS. Custa $0,26 por mensagem para Timor-Leste e obriga a
// manter viva uma conta de facturação com cartão — que é exactamente o que já
// falhou uma vez neste projecto e deixou o mapa do Google desligado. Quem
// esquece a senha telefona; o código diz-se nessa chamada.

const VALIDADE_MINUTOS = 30;
const MAX_TENTATIVAS = 5;

// Seis dígitos, do gerador criptográfico e não do Math.random.
//
// Math.random é previsível a partir de saídas anteriores. Aqui isso
// significaria adivinhar o código de recuperação de outra pessoa — o género
// de atalho que não se justifica poupar.
function gerarCodigo() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Emite um código para uma conta. Devolve-o EM CLARO uma única vez: é a
// única altura em que ele existe fora da cabeça de quem o vai dizer.
export async function emitirCodigo(userId) {
  const codigo = gerarCodigo();
  // Guardado com bcrypt, como uma palavra-passe. Se a base de dados um dia
  // sair de casa, os códigos que lá estiverem não servem para entrar em
  // conta nenhuma.
  const hash = await bcrypt.hash(codigo, 10);
  const row = await one(
    `UPDATE users
        SET recuperacao_hash = $2,
            recuperacao_expira = NOW() + ($3 || ' minutes')::interval,
            recuperacao_tentativas = 0
      WHERE id = $1
      RETURNING id, name, phone`,
    [userId, hash, String(VALIDADE_MINUTOS)]
  );
  if (!row) return null;
  return { codigo, minutos: VALIDADE_MINUTOS, pessoa: row };
}

// Usa o código e define a palavra-passe nova.
//
// Devolve sempre a mesma mensagem quando falha, seja qual for a razão: número
// que não existe, código errado, código expirado. Dizer "esse número não tem
// conta" a quem tenta à sorte é confirmar-lhe quais os números que existem.
export async function usarCodigo({ phone, codigo, password }) {
  const erro = { ok: false, error: 'Número ou código errado.' };
  if (!phone || !codigo || !password) return erro;
  if (String(password).length < 6) {
    return { ok: false, error: 'A palavra-passe tem de ter pelo menos 6 caracteres.' };
  }

  const u = await one(
    `SELECT id, recuperacao_hash, recuperacao_tentativas,
            (recuperacao_expira IS NOT NULL AND recuperacao_expira > NOW()) AS valido
       FROM users WHERE phone = $1`,
    [
      String(phone)
        .replace(/[\s()-]/g, '')
        .trim(),
    ]
  );
  if (!u || !u.recuperacao_hash || !u.valido) return erro;

  // Cinco tentativas e o código morre. Sem isto, seis dígitos são um milhão
  // de hipóteses que um programa esgota numa tarde.
  if (u.recuperacao_tentativas >= MAX_TENTATIVAS) {
    await limpar(u.id);
    return { ok: false, error: 'Demasiadas tentativas. Peça um código novo.' };
  }

  const bate = await bcrypt.compare(String(codigo).trim(), u.recuperacao_hash);
  if (!bate) {
    await query(
      'UPDATE users SET recuperacao_tentativas = recuperacao_tentativas + 1 WHERE id = $1',
      [u.id]
    );
    return erro;
  }

  const hash = await bcrypt.hash(String(password), 10);
  await query(
    `UPDATE users
        SET password_hash = $2,
            recuperacao_hash = NULL,
            recuperacao_expira = NULL,
            recuperacao_tentativas = 0
      WHERE id = $1`,
    [u.id, hash]
  );
  return { ok: true, userId: u.id };
}

function limpar(id) {
  return query(
    `UPDATE users SET recuperacao_hash = NULL, recuperacao_expira = NULL,
                      recuperacao_tentativas = 0 WHERE id = $1`,
    [id]
  );
}
