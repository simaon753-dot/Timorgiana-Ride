import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext.js';

// Estou a pedir uma viagem ou a conduzir?
//
// A mesma conta faz as duas coisas, mas nunca ao mesmo tempo: quem vai ao
// volante não está à espera de boleia. Por isso é um modo, e não dois
// ecrãs lado a lado — cada um fica focado no que a pessoa está a fazer.
//
// Guardado no telemóvel: um motorista que fecha a app a trabalhar deve
// reabri-la a trabalhar, não a pedir viagens.
const CHAVE = 'tgr.modo';
const ModoContext = createContext(null);

export function ModoProvider({ children }) {
  const { user } = useAuth();
  const podeConduzir = !!user?.podeConduzir;
  const [modo, setModoEstado] = useState('passageiro');
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (v === 'motorista' || v === 'passageiro') setModoEstado(v);
      })
      .finally(() => setCarregado(true));
  }, []);

  // Quem deixou de poder conduzir — conta suspensa, documentos caducados —
  // não pode ficar preso num modo que já não lhe serve.
  useEffect(() => {
    if (!podeConduzir && modo === 'motorista') setModoEstado('passageiro');
  }, [podeConduzir, modo]);

  const setModo = useCallback(
    (novo) => {
      if (novo === 'motorista' && !podeConduzir) return;
      setModoEstado(novo);
      AsyncStorage.setItem(CHAVE, novo).catch(() => {});
    },
    [podeConduzir]
  );

  const efetivo = podeConduzir ? modo : 'passageiro';

  return (
    <ModoContext.Provider
      value={{ modo: efetivo, setModo, podeConduzir, carregado, aConduzir: efetivo === 'motorista' }}
    >
      {children}
    </ModoContext.Provider>
  );
}

export function useModo() {
  const c = useContext(ModoContext);
  if (!c) throw new Error('useModo tem de estar dentro de ModoProvider');
  return c;
}
