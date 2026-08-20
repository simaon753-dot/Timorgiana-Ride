import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from '../api/client.js';
import { loadSavedServer } from '../serverUrl.js';

const TOKEN_KEY = 'tgr.token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [restoring, setRestoring] = useState(true); // a recuperar sessão guardada

  // Ao abrir a app: tenta recuperar a sessão guardada e validá-la
  useEffect(() => {
    (async () => {
      // O endereço do servidor tem de ser carregado ANTES de qualquer
      // pedido — caso contrário validaríamos a sessão contra o servidor
      // errado (o de compilação em vez do que o utilizador configurou).
      await loadSavedServer();
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          const { user } = await api.me(saved);
          setToken(saved);
          setUser(user);
        }
      } catch {
        // Token inválido/expirado ou sem rede — começa sem sessão
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const persist = useCallback(async ({ user, token }) => {
    setUser(user);
    setToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
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

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, restoring, login, register, logout, refreshUser, ApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
