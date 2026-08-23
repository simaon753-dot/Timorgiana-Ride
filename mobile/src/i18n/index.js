import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import pt from './pt.js';
import tet from './tet.js';
import en from './en.js';

const dictionaries = { pt, tet, en };
// Cada língua no seu próprio nome — quem procura inglês procura "English",
// não "Inglês". Com três, os nomes completos deixam de caber no cabeçalho,
// por isso há também uma forma curta para os sítios apertados.
export const LANGUAGES = [
  { code: 'pt', label: 'Português', curto: 'PT' },
  { code: 'tet', label: 'Tetun', curto: 'TET' },
  { code: 'en', label: 'English', curto: 'EN' },
];

const STORAGE_KEY = 'tgr.lang';
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('pt');

  // Carrega a língua escolhida anteriormente
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && dictionaries[saved]) setLangState(saved);
    });
  }, []);

  const setLang = useCallback((code) => {
    if (!dictionaries[code]) return;
    setLangState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  // t('homeHello', { name: 'Ana' }) -> "Olá, Ana!"
  const t = useCallback(
    (key, vars) => {
      let str = dictionaries[lang][key] ?? dictionaries.pt[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n tem de ser usado dentro de <I18nProvider>');
  return ctx;
}
