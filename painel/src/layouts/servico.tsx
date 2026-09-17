import { createContext, useContext, type ReactNode } from 'react';
import { useDados } from '@/hooks/useDados';
import { api } from '@/services/admin';
import type { RespostaNotificacoes } from '@/types/api';

// O ESTADO DO SERVIÇO partilhado pelo menu e pelo sino: um pedido de minuto a
// minuto, e não um por cada sítio que mostra um número.
interface EstadoServico {
  notificacoes: RespostaNotificacoes | null;
  recarregarNotificacoes: () => void;
  versao: string | null;
}

const Contexto = createContext<EstadoServico>({ notificacoes: null, recarregarNotificacoes: () => {}, versao: null });

export function FornecedorServico({ children }: { children: ReactNode }) {
  const notif = useDados(() => api.notificacoes(), [], { aCada: 60_000 });
  const saude = useDados(() => api.saude().catch(() => null), []);
  return (
    <Contexto.Provider
      value={{
        notificacoes: notif.dados,
        recarregarNotificacoes: notif.recarregar,
        versao: saude.dados?.versao ?? null,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useServico() {
  return useContext(Contexto);
}

export function contagemDe(n: RespostaNotificacoes | null, chaves?: string[]) {
  if (!n || !chaves?.length) return 0;
  return n.itens.filter((i) => chaves.includes(i.chave)).reduce((s, i) => s + i.n, 0);
}
