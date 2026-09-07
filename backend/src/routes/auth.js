import { Router } from 'express';
import {
  createUser,
  findUserByPhone,
  verifyPassword,
  toPublicUser,
  normalizePhone,
  findUserById,
} from '../users.js';
import { emailBemFormado } from '../email.js';
import { emitirConfirmacao, confirmarComCodigo } from '../confirmacaoEmail.js';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { savePushToken } from '../drivers.js';
import { usarCodigo } from '../recuperacao.js';
import { porEndereco, segundosDeEspera, registarFalha, limparFalhas } from '../limitador.js';

export const authRouter = Router();

const ROLES = ['passenger', 'driver'];

// Camada por endereço, à entrada de tudo o que não exige já um token. A
// protecção a sério é por conta, dentro do `/login`; esta apanha o que aquela
// não vê — tentativas espalhadas por muitas contas, e registos em série.
//
// Generosa de propósito: atrás do Render muita gente partilha o mesmo endereço
// aparente. Ver o cabeçalho de `limitador.js`.
authRouter.post('/login', porEndereco({ max: 40, minutos: 15 }));
authRouter.post('/register', porEndereco({ max: 10, minutos: 60 }));
authRouter.post('/recuperar', porEndereco({ max: 20, minutos: 60 }));

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role, vehicle, termsVersion, privacyVersion } =
      req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    if (!phone || normalizePhone(phone).length < 7) {
      return res.status(400).json({ error: 'Número de telemóvel inválido.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }
    // O EMAIL PASSA A SER OBRIGATÓRIO.
    //
    // Não para entrar — entra-se com o telemóvel e a senha, que é o que a
    // pessoa sabe de cor. É para o dia em que a senha se perde: sem um
    // endereço, a única recuperação é telefonar ao administrador.
    //
    // Só se verifica o FORMATO. Um endereço errado mas bem escrito
    // (`simao@gmial.com`) é válido e não se apanha aqui nem em lado nenhum —
    // é para isso que existe o código de confirmação, que simplesmente não
    // chega.
    if (!emailBemFormado(email)) {
      return res
        .status(400)
        .json({ error: 'Escreve um email válido — serve para recuperares a conta.' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: 'Tipo de conta inválido.' });
    }
    if (role === 'driver' && (!vehicle || !vehicle.plate || !vehicle.plate.trim())) {
      return res.status(400).json({ error: 'Motoristas têm de indicar a matrícula do veículo.' });
    }
    // Exigido no servidor e não só na app: a caixa marcada no telemóvel é
    // uma cortesia da interface; o que fica como prova é isto.
    if (!termsVersion) {
      return res.status(400).json({ error: 'É preciso aceitar os termos de utilização.' });
    }

    if (await findUserByPhone(phone)) {
      return res.status(409).json({ error: 'Já existe uma conta com este número de telemóvel.' });
    }

    const created = await createUser({
      name,
      phone,
      email,
      password,
      role,
      vehicle,
      termsVersion,
      privacyVersion,
    });
    // O CÓDIGO PARTE, MAS NINGUÉM ESPERA POR ELE.
    //
    // Sem `await`: quem se está a inscrever entra já. Se o serviço de correio
    // estiver lento ou em baixo, o registo conclui-se na mesma e a pessoa vê
    // a faixa a pedir confirmação — que é o que a leva a tentar outra vez.
    //
    // Um serviço de fora no caminho de quem se inscreve são utilizadores
    // perdidos à porta, pela funcionalidade que só serve num dia mau.
    emitirConfirmacao(created.id).catch((e) =>
      console.error('[auth] confirmação de email:', e.message)
    );

    return res.status(201).json({ user: toPublicUser(created), token: signToken(created) });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Erro ao criar a conta.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ error: 'Telemóvel e palavra-passe são obrigatórios.' });
    }

    const row = await findUserByPhone(phone);

    // A ESPERA VERIFICA-SE ANTES DE COMPARAR A SENHA.
    //
    // Se fosse depois, cada tentativa continuaria a fazer o trabalho de
    // comparar — o `bcrypt` é lento de propósito, e mil tentativas por segundo
    // punham o servidor de joelhos mesmo com todas a serem recusadas.
    if (row) {
      const faltam = await segundosDeEspera(row.id);
      if (faltam > 0) {
        const minutos = Math.ceil(faltam / 60);
        return res.status(429).json({
          error:
            faltam < 60
              ? `Demasiadas tentativas. Espera ${faltam} segundos.`
              : `Demasiadas tentativas. Espera ${minutos} minuto${minutos > 1 ? 's' : ''}.`,
          segundos: faltam,
        });
      }
    }

    if (!row || !(await verifyPassword(row, password))) {
      // Conta a falha, mas responde SEMPRE a mesma coisa. Dizer "esta conta
      // existe mas a senha está errada" seria confirmar a um estranho quais
      // dos números que ele tem é que estão registados.
      if (row) await registarFalha(row.id);
      return res.status(401).json({ error: 'Telemóvel ou palavra-passe incorretos.' });
    }

    await limparFalhas(row.id);
    return res.json({ user: toPublicUser(row), token: signToken(row) });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Erro ao iniciar sessão.' });
  }
});

// POST /api/auth/push-token — guardar o destino das notificações
// POST /api/auth/recuperar — definir palavra-passe nova com o código
//
// Sem autenticação, por definição: quem chega aqui é precisamente quem não
// consegue entrar. O que a protege é o código — seis dígitos, trinta minutos,
// cinco tentativas e uso único — e o facto de ele ter sido dito por alguém que
// falou com a pessoa.
authRouter.post('/recuperar', async (req, res) => {
  const { phone, codigo, password } = req.body || {};
  const r = await usarCodigo({ phone, codigo, password });
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
});

authRouter.post('/push-token', requireAuth, async (req, res) => {
  try {
    await savePushToken(req.user.id, req.body?.token || null);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/push-token]', err.message);
    res.status(500).json({ error: 'Erro ao guardar.' });
  }
});

// GET /api/auth/me — valida o token e devolve o utilizador atual
authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

// POST /api/auth/email/confirmar  — { codigo }
authRouter.post('/email/confirmar', requireAuth, async (req, res) => {
  try {
    const r = await confirmarComCodigo(req.user.id, req.body?.codigo);
    if (!r.ok) {
      return res.status(400).json({ error: 'Código inválido ou expirado. Peça outro.' });
    }
    const u = await findUserById(req.user.id);
    return res.json({ ok: true, user: toPublicUser(u) });
  } catch (e) {
    console.error('[auth/email/confirmar]', e);
    return res.status(500).json({ error: 'Não foi possível confirmar.' });
  }
});

// POST /api/auth/email/reenviar
authRouter.post('/email/reenviar', requireAuth, async (req, res) => {
  try {
    const r = await emitirConfirmacao(req.user.id);
    // Não se diz se o envio correu bem nem se o email existe. Só que se
    // tentou: quem tem o endereço certo recebe, quem o tem errado não — e é
    // isso que lhe diz que o escreveu mal.
    return res.json({ ok: true, minutos: r?.minutos ?? null });
  } catch (e) {
    console.error('[auth/email/reenviar]', e);
    return res.status(500).json({ error: 'Não foi possível enviar.' });
  }
});

// POST /api/auth/email  — { email }  corrigir o endereço
//
// TEM DE EXISTIR, e não é um extra: um endereço bem formado mas errado só se
// descobre quando o código não chega, e nessa altura a pessoa precisa de o
// poder trocar. Sem isto, um engano de uma letra tornava a conta
// irrecuperável para sempre.
authRouter.post('/email', requireAuth, async (req, res) => {
  try {
    const novo = String(req.body?.email || '').trim();
    if (!emailBemFormado(novo)) {
      return res.status(400).json({ error: 'Escreve um email válido.' });
    }
    // Muda o endereço e volta a pôr por confirmar: o que estava confirmado
    // era o antigo, e confirmar um não confirma o outro.
    await query(
      `UPDATE users SET email = $2, email_confirmado = FALSE, email_codigo_hash = NULL,
              email_codigo_expira = NULL, email_codigo_tentativas = 0
        WHERE id = $1`,
      [req.user.id, novo]
    );
    await emitirConfirmacao(req.user.id);
    const u = await findUserById(req.user.id);
    return res.json({ ok: true, user: toPublicUser(u) });
  } catch (e) {
    console.error('[auth/email]', e);
    return res.status(500).json({ error: 'Não foi possível guardar.' });
  }
});
