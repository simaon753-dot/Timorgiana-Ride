import { Router } from 'express';
import { CARROCERIAS, CAPACIDADES } from '../config.js';
import {
  createUser,
  findUserByPhone,
  verifyPassword,
  toPublicUser,
  normalizePhone,
  findUserById,
  limparNome,
} from '../users.js';
import { emailBemFormado } from '../email.js';
import { emitirConfirmacao, confirmarComCodigo } from '../confirmacaoEmail.js';
import { query } from '../db.js';
import { abrirSessao, requireAuth } from '../auth.js';
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
    const { name, phone, email, password, role, vehicle, termsVersion, privacyVersion, cidadaoTL } =
      req.body || {};

    // A MESMA REGRA DA CORREÇÃO (22/09/2026). Antes só se via se estava
    // vazio: um nome de dez mil letras entrava tal e qual e ia partir todos
    // os ecrãs que o mostram.
    const nomeLimpo = limparNome(name);
    if (nomeLimpo.error) {
      return res.status(400).json({ error: nomeLimpo.error });
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

    // ── CONDUZIR É PARA CIDADÃOS DE TIMOR-LESTE ────────────────────────
    //
    // Decisão do Simão a 08/09/2026, sem excepção.
    //
    // O QUE ISTO PODE E NÃO PODE FAZER. A app não verifica nacionalidade
    // nenhuma — ninguém consegue, a partir de um telemóvel. O que faz é três
    // coisas que juntas valem alguma coisa: exige a declaração antes de haver
    // conta, guarda-a com a hora, e obriga a um número de Timor-Leste.
    //
    // A PROVA é o documento de identificação, que já é obrigatório e passa
    // pelas mãos de quem aprova. Isto não substitui esse olhar; põe a
    // exigência à frente da pessoa no momento em que ela ainda pode desistir,
    // em vez de a deixar entregar cinco documentos para ser recusada no fim.
    if (role === 'driver') {
      if (cidadaoTL !== true) {
        return res.status(400).json({
          error: 'Conduzir na TimorgianaRide está reservado a cidadãos de Timor-Leste.',
        });
      }
      // Um número timorense chega aqui com oito dígitos e sem indicativo — o
      // `normalizePhone` tira o +670 quando ele vem. Qualquer outro país
      // chega com um + à frente, e é essa a diferença que se verifica.
      //
      // Não se exige que comece por 7. Seria mais apertado e arriscava
      // recusar um prefixo de operadora que eu não conheça — e recusar um
      // motorista de boa fé é pior do que aceitar um número estranho que o
      // documento vai desmentir.
      if (!/^\d{8}$/.test(normalizePhone(phone))) {
        return res.status(400).json({
          error: 'Para conduzir é preciso um número de telemóvel de Timor-Leste.',
        });
      }
    }
    // Exigido no servidor e não só na app: a caixa marcada no telemóvel é
    // uma cortesia da interface; o que fica como prova é isto.
    if (!termsVersion) {
      return res.status(400).json({ error: 'É preciso aceitar os termos de utilização.' });
    }

    // O Carry diz a carroçaria e a capacidade no registo: é a capacidade que
    // decide que pedidos de bens lhe chegam.
    if (
      role === 'driver' &&
      vehicle?.type === 'carry' &&
      (!CARROCERIAS.includes(vehicle.carroceria) || !CAPACIDADES.includes(vehicle.capacidade))
    ) {
      return res.status(400).json({ error: 'Indica a carroçaria e a capacidade do Pickup.' });
    }

    if (await findUserByPhone(phone)) {
      return res.status(409).json({ error: 'Já existe uma conta com este número de telemóvel.' });
    }

    const created = await createUser({
      name: nomeLimpo.nome,
      phone,
      email,
      password,
      role,
      vehicle,
      termsVersion,
      privacyVersion,
      cidadaoTL,
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

    return res
      .status(201)
      .json({ user: toPublicUser(created), token: await abrirSessao(created) });
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
              : // Frases inteiras e não um "s" colado: o plural por sufixo não se
                // traduz (15/09/26), e o tétum nem sequer o tem.
                minutos === 1
                ? 'Demasiadas tentativas. Espera 1 minuto.'
                : `Demasiadas tentativas. Espera ${minutos} minutos.`,
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

    // ENTRAR AQUI FECHA A SESSÃO DE LÁ (23/09/2026).
    //
    // A ordem importa: primeiro o aviso, depois o corte. Um socket desligado
    // não recebe nada, e o aparelho antigo ficaria simplesmente sem rede —
    // a pessoa veria a app a falhar sem perceber porquê, até ao pedido
    // seguinte dar 401.
    //
    // Desligar em vez de só marcar: o token velho já não passa no
    // `verifyToken`, mas um canal ABERTO não é verificado outra vez. Ficaria
    // um motorista expulso a receber pedidos até se desligar sozinho.
    //
    // O aparelho novo ainda não está ligado — só liga depois de receber este
    // token —, por isso não há risco de ele se cortar a si próprio.
    // De onde vem quem entra. Só o painel se anuncia; tudo o resto é a app,
    // que é o caso a proteger. Se alguém mentir a dizer que é o painel, o
    // que ganha é uma sessão de painel — continua a haver uma só de cada.
    const superficie = req.body?.origem === 'painel' ? 'painel' : 'app';

    // ENTRAR AQUI FECHA A SESSÃO DE LÁ (23/09/2026).
    //
    // A ordem importa: primeiro o aviso, depois o corte. Um socket desligado
    // não recebe nada, e o aparelho antigo ficaria simplesmente sem rede —
    // a pessoa veria a app a falhar sem perceber porquê, até ao pedido
    // seguinte dar 401.
    //
    // Desligar em vez de só marcar: o token velho já não passa no
    // `verifyToken`, mas um canal ABERTO não é verificado outra vez. Ficaria
    // um motorista expulso a receber pedidos até se desligar sozinho.
    //
    // O aparelho novo ainda não está ligado — só liga depois de receber este
    // token —, por isso não há risco de ele se cortar a si próprio.
    const io = req.app.get('io');
    if (io && superficie === 'app') {
      io.to(`user:${row.id}`).emit('sessao:terminada');
      io.in(`user:${row.id}`).disconnectSockets(true);
    }

    return res.json({ user: toPublicUser(row), token: await abrirSessao(row, superficie) });
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

// POST /api/auth/termos — { termsVersion, privacyVersion }
//
// FALTAVA, e a falta era maior do que parecia.
//
// Havia rota para o motorista aceitar os termos DELE e mais nenhuma. Ou seja:
// os termos de passageiro e a política de privacidade só se podiam aceitar no
// momento do registo, e nunca mais.
//
// Isso deixava duas coisas partidas ao mesmo tempo. As contas antigas — as
// criadas antes de estes campos existirem — ficavam com "Não aceitou" para
// sempre, sem caminho nenhum para deixarem de o ter. E, pior, no dia em que os
// termos mudassem, NENHUM passageiro já registado teria como aceitar a versão
// nova: a app pedia, e não havia onde gravar.
//
// Aceita os dois em separado porque são dois consentimentos distintos e mudam
// em alturas distintas. Enviar um não mexe no outro.
authRouter.post('/termos', requireAuth, async (req, res) => {
  try {
    const termos = String(req.body?.termsVersion || '').trim() || null;
    const privacidade = String(req.body?.privacyVersion || '').trim() || null;
    if (!termos && !privacidade) {
      return res.status(400).json({ error: 'Nada para aceitar.' });
    }

    // COALESCE nos dois sentidos: o campo que não veio fica como estava, e o
    // que veio traz a sua própria hora. Escrever NOW() nos dois apagaria a
    // data verdadeira de um consentimento que ninguém acabou de dar.
    await query(
      `UPDATE users
          SET terms_version   = COALESCE($2, terms_version),
              terms_accepted_at = CASE WHEN $2 IS NULL THEN terms_accepted_at ELSE NOW() END,
              privacy_version = COALESCE($3, privacy_version),
              privacy_accepted_at = CASE WHEN $3 IS NULL THEN privacy_accepted_at ELSE NOW() END
        WHERE id = $1`,
      [req.user.id, termos, privacidade]
    );
    const u = await findUserById(req.user.id);
    return res.json({ ok: true, user: toPublicUser(u) });
  } catch (e) {
    console.error('[auth/termos]', e);
    return res.status(500).json({ error: 'Não foi possível guardar.' });
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

// POST /api/auth/nome  — { nome }  corrigir o nome
//
// TEM DE EXISTIR, pela mesma razão que a do email: o nome escrevia-se uma vez
// no registo e ficava para sempre. Não havia no servidor inteiro uma
// instrução que o mudasse — nem pela app, nem pelo painel. Quem trocava uma
// letra ficava com ela à frente de todos os passageiros que o chamassem.
//
// NÃO SE PEDE A SENHA. Ao contrário do email, o nome não recupera conta
// nenhuma: quem lhe mexe já está dentro da sessão e não ganha nada com isso.
// Pedir a senha aqui era atrito sem defesa do outro lado.
//
// O QUE FICA REGISTADO. O nome anterior e a data. Num motorista aprovado o
// nome é o que o passageiro confere com a carta de condução, e a diferença
// entre corrigir uma letra e passar a ser outra pessoa tem de continuar
// visível depois de acontecer.
authRouter.post('/nome', requireAuth, async (req, res) => {
  try {
    const r = limparNome(req.body?.nome);
    if (r.error) return res.status(400).json({ error: r.error });

    // Igual ao que já lá está: não é erro, mas também não se escreve na base
    // nem se gasta o campo do nome anterior com uma alteração que não houve.
    if (r.nome === req.user.name) {
      return res.json({ ok: true, user: toPublicUser(req.user) });
    }

    await query(
      `UPDATE users SET name = $2, nome_anterior = name, nome_alterado_em = NOW() WHERE id = $1`,
      [req.user.id, r.nome]
    );
    const u = await findUserById(req.user.id);
    return res.json({ ok: true, user: toPublicUser(u) });
  } catch (e) {
    console.error('[auth/nome]', e);
    return res.status(500).json({ error: 'Não foi possível guardar.' });
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
