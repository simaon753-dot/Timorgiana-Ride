import express from 'express';
import jwt from 'jsonwebtoken';
import { query, one } from './db.js';
import { config } from './config.js';
import { porEndereco } from './limitador.js';

// OS ERROS DA APP CHEGAM AQUI (10/10/2026, decisão do Simão: no nosso
// servidor e não no Sentry — sem conta, sem custo, e os dados ficam connosco).
//
// A app já apanhava os erros (design/Barreira.js mostra-os no ecrã verde),
// mas só se sabia deles quando alguém mandava uma fotografia. Agora a app
// envia-os também para aqui, e o painel mostra-os em «Erros da app», agrupados
// pela mesma falha.
//
// O QUE NÃO APANHA: a app a fechar-se por uma falha nativa (Java/Kotlin), que
// acontece fora do JavaScript. Para essa era preciso o Sentry, com APK novo.
//
// SEM DADOS PESSOAIS DE PROPÓSITO: só a mensagem, a pilha (nomes de funções e
// componentes), o ecrã, a versão e o modelo do telemóvel. A conta vai pelo id,
// para se poder perguntar à pessoa o que estava a fazer.
export const errosRouter = express.Router();

// Tectos: um erro que se repete em ciclo não enche a base.
const MAX = {
  nome: 120,
  mensagem: 600,
  pilha: 4000,
  ecra: 80,
  versao: 80,
  plataforma: 20,
  modelo: 80,
};
const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

// Quem é, se a app mandou a sessão. Sem sessão também se aceita: um erro no
// ecrã de entrada acontece antes de haver conta, e é dos que mais importa ver.
function quemE(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return Number(jwt.verify(h.slice(7), config.jwtSecret).sub) || null;
  } catch {
    return null;
  }
}

// POST /api/erros — 20 por endereço a cada 15 minutos chegam para uma pessoa;
// a app ainda manda no máximo 10 por sessão e não repete o mesmo erro.
errosRouter.post('/', porEndereco({ max: 20, minutos: 15 }), async (req, res) => {
  const b = req.body || {};
  if (!b.mensagem && !b.nome) return res.status(400).json({ error: 'Erro vazio.' });
  try {
    await query(
      `INSERT INTO erros_app (user_id, nome, mensagem, pilha, ecra, versao, plataforma, modelo, fatal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        quemE(req),
        corta(b.nome, MAX.nome),
        corta(b.mensagem, MAX.mensagem) || '',
        corta(b.pilha, MAX.pilha),
        corta(b.ecra, MAX.ecra),
        corta(b.versao, MAX.versao),
        corta(b.plataforma, MAX.plataforma),
        corta(b.modelo, MAX.modelo),
        !!b.fatal,
      ]
    );
  } catch (e) {
    // Um relatório de erro que falha não pode virar outro erro na app.
    console.error('[erros] não guardou:', e.message);
  }
  res.status(204).end();
});

// A mesma falha agrupada: o tipo e a mensagem, sem os números que mudam de
// vez para vez (ids, coordenadas), que fariam de cada repetição um grupo.
const ASSINATURA = `md5(COALESCE(nome,'') || '|' || regexp_replace(mensagem, '[0-9]+', '#', 'g'))`;

export async function errosAgrupados({ resolvidos = false } = {}) {
  return query(
    `SELECT ${ASSINATURA} AS assinatura,
            MAX(nome) AS nome,
            (ARRAY_AGG(mensagem ORDER BY quando DESC))[1] AS mensagem,
            (ARRAY_AGG(pilha ORDER BY quando DESC))[1] AS pilha,
            (ARRAY_AGG(ecra ORDER BY quando DESC))[1] AS ecra,
            (ARRAY_AGG(versao ORDER BY quando DESC))[1] AS versao,
            (ARRAY_AGG(modelo ORDER BY quando DESC))[1] AS modelo,
            COUNT(*)::int AS vezes,
            COUNT(DISTINCT user_id)::int AS pessoas,
            BOOL_OR(fatal) AS fatal,
            MIN(quando) AS primeira,
            MAX(quando) AS ultima
       FROM erros_app
      WHERE resolvido_em IS ${resolvidos ? 'NOT ' : ''}NULL
        AND quando > NOW() - INTERVAL '90 days'
      GROUP BY 1
      ORDER BY MAX(quando) DESC
      LIMIT 200`
  );
}

export async function resolverErro(assinatura) {
  const r = await one(
    `WITH f AS (
       UPDATE erros_app SET resolvido_em = NOW()
        WHERE resolvido_em IS NULL AND ${ASSINATURA} = $1
        RETURNING 1)
     SELECT COUNT(*)::int AS n FROM f`,
    [String(assinatura)]
  );
  return r?.n || 0;
}

// Para o sino: quantas falhas DIFERENTES, por resolver, apareceram em 7 dias.
export const SQL_ERROS_NO_SINO = `(SELECT COUNT(DISTINCT ${ASSINATURA}) FROM erros_app
   WHERE resolvido_em IS NULL AND quando > NOW() - INTERVAL '7 days')::int`;
