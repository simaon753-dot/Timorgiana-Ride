import { useEffect } from 'react';

// ⌘K no Mac, Ctrl+K no Windows — o mesmo atalho dos produtos que as pessoas
// já conhecem para "procurar em tudo".
export function useAtalho(tecla: string, fn: () => void) {
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === tecla) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', ouvir);
    return () => window.removeEventListener('keydown', ouvir);
  }, [tecla, fn]);
}

export const eMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
