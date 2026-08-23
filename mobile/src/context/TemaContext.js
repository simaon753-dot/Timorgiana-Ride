import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aplicarPaleta, paletaEmUso } from '../theme.js';

// Escolher entre a paleta clara e a escura.
//
// Mudar de paleta não basta trocar as cores: as folhas de estilo de cada
// ecrã foram criadas uma vez, no arranque, com os valores de então. Por
// isso `aplicarPaleta` manda cada ficheiro reconstruir a sua, e depois
// muda-se a chave da raiz da navegação para tudo voltar a desenhar.
const CHAVE = 'tgr.tema';
const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const [tema, setTemaEstado] = useState(paletaEmUso());
  // Sobe de cada vez que a paleta muda. Serve de `key` à árvore de ecrãs.
  const [geracao, setGeracao] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (v === 'claro' || v === 'escuro') {
          aplicarPaleta(v);
          setTemaEstado(v);
          setGeracao((g) => g + 1);
        }
      })
      .finally(() => setCarregado(true));
  }, []);

  const setTema = useCallback((novo) => {
    if (novo !== 'claro' && novo !== 'escuro') return;
    aplicarPaleta(novo);
    setTemaEstado(novo);
    setGeracao((g) => g + 1);
    AsyncStorage.setItem(CHAVE, novo).catch(() => {});
  }, []);

  return (
    <TemaContext.Provider value={{ tema, setTema, geracao, carregado, escuro: tema === 'escuro' }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const c = useContext(TemaContext);
  if (!c) throw new Error('useTema tem de estar dentro de TemaProvider');
  return c;
}
