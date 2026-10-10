import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { lerToken, guardarToken, apagarToken } from '../lib/cofreSessao.js';
import { api, ApiError, definirAoPerderSessao, definirAoAvisarSessao } from '../api/client.js';
import { loadSavedServer } from '../serverUrl.js';
import { definirSessao } from '../lib/relatarErro.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // O relatório de erros leva a sessão, para o painel saber de que conta veio.
  useEffect(() => definirSessao(token), [token]);
  const [restoring, setRestoring] = useState(true); // a recuperar sessão guardada
  // PORQUE É QUE A SESSÃO ACABOU (23/09/2026). Fica posto quando o servidor
  // recusa o token e é lido pelo ecrã de entrada, que é para onde a pessoa
  // cai. Sem ele, quem foi expulso por a conta ter sido aberta noutro
  // telemóvel via a app a voltar ao princípio sem explicação nenhuma — e
  // uma app que faz isso parece avariada, não parece segura.
  const [motivoSaida, setMotivoSaida] = useState(null);
  // A CONTA FOI ABERTA NOUTRO TELEMÓVEL E ESTA SESSÃO AINDA TRABALHA.
  //
  // Decisão do Simão a 23/09/2026: quem está a transportar um passageiro não
  // pode ser deitado fora. O servidor deixa esta sessão terminar a viagem e
  // avisa; a app mostra a faixa até isso acontecer. Sem estado nenhum aqui,
  // o aviso morria com o ecrã em que aparecesse.
  const [avisoSessao, setAvisoSessao] = useState(false);
  // SEM LIGAÇÃO AO ABRIR A APP (04/10/2026): a sessão guardada não se pôde
  // confirmar, mas também não foi recusada. Ver `restaurar`.
  const [semLigacao, setSemLigacao] = useState(false);

  // Ao abrir a app: tenta recuperar a sessão guardada e validá-la.
  //
  // SÓ SE APAGA A SESSÃO QUE O SERVIDOR RECUSOU (04/10/2026). Antes, qualquer
  // falha a apagava — e a falha mais comum não é uma sessão inválida: é abrir
  // a app sem rede, ou no minuto em que o servidor reinicia depois de uma
  // publicação. O motorista via o ecrã de entrada e tinha de voltar a
  // escrever a palavra-passe por causa da rede de Díli. Agora um 401 apaga
  // (o próprio cliente da API já o trata); o resto mostra «Tentar outra vez»
  // com a sessão guardada.
  const restaurar = useCallback(async () => {
    setSemLigacao(false);
    setRestoring(true);
    try {
      const saved = await lerToken();
      if (saved) {
        const { user } = await api.me(saved);
        setToken(saved);
        setUser(user);
      }
    } catch (e) {
      if (e?.status === 401) await apagarToken();
      else setSemLigacao(true);
    } finally {
      setRestoring(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // O endereço do servidor tem de ser carregado ANTES de qualquer
      // pedido — caso contrário validaríamos a sessão contra o servidor
      // errado (o de compilação em vez do que o utilizador configurou).
      await loadSavedServer();
      await restaurar();
    })();
  }, [restaurar]);

  const persist = useCallback(async ({ user, token }) => {
    setUser(user);
    setToken(token);
    // Entrar limpa o aviso: já não faz sentido depois de a pessoa ter
    // resolvido o que ele pedia.
    setMotivoSaida(null);
    setAvisoSessao(false);
    await guardarToken(token);
  }, []);

  const login = useCallback(
    async ({ phone, password }) => {
      const data = await api.login({ phone, password });
      await persist(data);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.register(payload);
      await persist(data);
      return data.user;
    },
    [persist]
  );

  // Volta a ler o utilizador do servidor. Usado enquanto o motorista
  // espera aprovação: é assim que a app sabe que já foi decidido.
  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const { user } = await api.me(token);
      setUser(user);
      return user;
    } catch {
      return null;
    }
  }, [token]);

  // A SESSÃO QUE MORRE NO MEIO DO CAMINHO (21/09/2026).
  //
  // Um token dura 30 dias, mas pode acabar antes: uma senha mudada noutro
  // telemóvel, uma conta suspensa, um segredo do servidor trocado. Até aqui
  // o resultado era uma app que dizia «erro» em todos os ecrãs sem nunca
  // dizer porquê, e sem caminho de saída a não ser descobrir o botão de sair.
  //
  // Agora o cliente da API avisa, e a app faz o que é óbvio: apaga a sessão.
  // Como o navegador escolhe a área pública quando não há `user`, a pessoa
  // aterra no ecrã de entrada — que é exactamente o que lhe falta fazer.
  useEffect(() => {
    definirAoPerderSessao((motivo) => {
      setUser(null);
      setToken(null);
      setMotivoSaida(motivo || null);
      // Já não há sessão: o aviso deixa de fazer sentido e o seu lugar passa
      // a ser o ecrã de entrada, onde a mensagem é outra.
      setAvisoSessao(false);
      apagarToken().catch(() => {});
    });
    definirAoAvisarSessao(() => setAvisoSessao(true));
    return () => {
      definirAoPerderSessao(null);
      definirAoAvisarSessao(null);
    };
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setMotivoSaida(null);
    setAvisoSessao(false);
    setSemLigacao(false);
    await apagarToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        restoring,
        semLigacao,
        restaurar,
        login,
        register,
        logout,
        refreshUser,
        motivoSaida,
        limparMotivoSaida: () => setMotivoSaida(null),
        avisoSessao,
        ApiError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
