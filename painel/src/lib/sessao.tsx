import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/admin';
import { gravarSessao, lerSessao, limparImagens, quandoPerderSessao } from '@/services/cliente';
import type { UtilizadorPublico } from '@/types/api';

type Estado = 'a-verificar' | 'fora' | 'dentro';

interface Sessao {
  estado: Estado;
  utilizador: UtilizadorPublico | null;
  entrar: (telefone: string, palavraPasse: string) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<Sessao | null>(null);

export function FornecedorSessao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(lerSessao() ? 'a-verificar' : 'fora');
  const [utilizador, setUtilizador] = useState<UtilizadorPublico | null>(null);

  const sair = useCallback(() => {
    gravarSessao(null);
    limparImagens();
    setUtilizador(null);
    setEstado('fora');
  }, []);

  useEffect(() => {
    quandoPerderSessao(sair);
  }, [sair]);

  // Ao abrir: se já houver sessão guardada, confirma-a com o servidor. Um
  // token guardado não prova nada — pode ter expirado, ou a conta pode ter
  // deixado de ser de administrador.
  useEffect(() => {
    if (estado !== 'a-verificar') return;
    api
      .eu()
      .then(({ user }) => {
        if (!user?.isAdmin) throw new Error('sem permissão');
        setUtilizador(user);
        setEstado('dentro');
      })
      .catch(sair);
  }, [estado, sair]);

  const entrar = useCallback(async (telefone: string, palavraPasse: string) => {
    const r = await api.entrar(telefone.trim(), palavraPasse);
    if (!r.user?.isAdmin) throw new Error('Esta conta não é de administrador.');
    gravarSessao(r.token);
    setUtilizador(r.user);
    setEstado('dentro');
  }, []);

  const valor = useMemo(() => ({ estado, utilizador, entrar, sair }), [estado, utilizador, entrar, sair]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useSessao fora do FornecedorSessao');
  return c;
}
