import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import * as Device from 'expo-device';
import { getApiUrl } from '../serverUrl.js';
import { navegacao } from '../navigation/navegacao.js';

// OS ERROS DA APP VÃO PARA O NOSSO SERVIDOR (10/10/2026, decisão do Simão:
// em vez do Sentry). O painel mostra-os em «Erros da app» — ver
// backend/src/erros.js.
//
// Duas portas de entrada:
//   · a Barreira (design/Barreira.js), quando um ecrã rebenta ao desenhar e
//     aparece o ecrã verde;
//   · o `ErrorUtils` global (`instalarRelatorioDeErros`), para os erros fora
//     do desenho — num toque, num relógio — que num APK fecham a app.
//
// Como a Barreira, NÃO depende do tema, das traduções nem do contexto: se o
// que falhou foi um deles, o relatório tem de sair na mesma.
//
// Sem dados pessoais: a mensagem, a pilha, o ecrã, a versão e o modelo. A
// sessão vai no cabeçalho, para o servidor saber de que conta veio.

let sessao = null;
export function definirSessao(token) {
  sessao = token || null;
}

// No máximo 10 por sessão da app, e cada falha uma vez só: um erro dentro de
// um ciclo não pode transformar-se em mil pedidos e gastar os dados da pessoa.
const MAX_POR_SESSAO = 10;
const enviados = new Set();

function versao() {
  const rt = Updates.runtimeVersion || '';
  const id = Updates.updateId ? Updates.updateId.slice(0, 8) : 'apk';
  return `${rt} ${id}`.trim();
}

function ecraAtual() {
  try {
    return navegacao.current?.getCurrentRoute?.()?.name || null;
  } catch {
    return null;
  }
}

// Devolve uma promessa que NUNCA falha e acaba em, no máximo, `prazoMs`.
export function relatarErro(erro, { pilha, fatal = false, prazoMs = 4000 } = {}) {
  try {
    const nome = String(erro?.name || 'Erro');
    const mensagem = String(erro?.message || erro || '').slice(0, 600);
    const chave = `${nome}|${mensagem}`;
    if (enviados.has(chave) || enviados.size >= MAX_POR_SESSAO) return Promise.resolve();
    enviados.add(chave);

    const corpo = {
      nome,
      mensagem,
      pilha: String(pilha || erro?.stack || '').slice(0, 4000),
      ecra: ecraAtual(),
      versao: versao(),
      plataforma: `${Platform.OS} ${Platform.Version}`,
      modelo: Device.modelName || null,
      fatal: !!fatal,
    };
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), prazoMs);
    return fetch(`${getApiUrl()}/erros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessao ? { Authorization: `Bearer ${sessao}` } : {}),
      },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(relogio));
  } catch {
    return Promise.resolve();
  }
}

// O apanhador global. Num erro FATAL, o de antes (o do React Native) fecha a
// app logo — por isso espera-se pelo envio, no máximo 1,5 s, e só depois se
// lhe passa o erro. Os não fatais seguem logo.
export function instalarRelatorioDeErros() {
  const EU = globalThis.ErrorUtils;
  if (!EU?.setGlobalHandler || EU.__hakat) return;
  const anterior = EU.getGlobalHandler?.();
  EU.__hakat = true;
  EU.setGlobalHandler((erro, fatal) => {
    const envio = relatarErro(erro, { fatal, prazoMs: 1500 });
    if (fatal) envio.then(() => anterior?.(erro, fatal));
    else anterior?.(erro, fatal);
  });
}
