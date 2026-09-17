import { useEffect, useState } from 'react';

export function useMedia(consulta: string) {
  const [bate, setBate] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(consulta).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const ouvir = () => setBate(m.matches);
    ouvir();
    m.addEventListener('change', ouvir);
    return () => m.removeEventListener('change', ouvir);
  }, [consulta]);
  return bate;
}
