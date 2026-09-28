import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/admin';
import {
  gravarSessao,
  lerSessao,
  limparImagens,
  quandoPerderSessao,
  segundosSemToque,
  type MotivoSaida,
} from '@/services/cliente';
import type { UtilizadorPublico } from '@/types/api';

type Estado = 'a-verificar' | 'fora' | 'dentro';

interface Sessao {
  estado: Estado;
  utilizador: UtilizadorPublico | null;
  // Devolve o segundo passo quando o servidor pede o código por email.
  entrar: (telefone: string, palavraPasse: string) => Promise<{ desafio: number; para: string } | null>;
  confirmarCodigo: (desafio: number, codigo: string) => Promise<void>;
  sair: () => void;
  // Porque é que a última sessão acabou, para o ecrã de entrada o dizer.
  motivoSaida: MotivoSaida;
}

// O mesmo prazo do servidor (auth.js, PAINEL_INATIVO_MIN). Aqui fecha-se o
// ecrã à hora certa, para os dados não ficarem à vista até ao próximo pedido;
// quem decide, se o relógio deste computador mentir, é o servidor.
const INATIVO_MS = 30 * 60 * 1000;

const Contexto = createContext<Sessao | null>(null);

export function FornecedorSessao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(lerSessao() ? 'a-verificar' : 'fora');
  const [utilizador, setUtilizador] = useState<UtilizadorPublico | null>(null);
  const [motivoSaida, setMotivoSaida] = useState<MotivoSaida>(null);

  // Limpa o ecrã. Quando a sessão já morreu no servidor, é só isto.
  const largar = useCallback((motivo: MotivoSaida) => {
    gravarSessao(null);
    limparImagens();
    setUtilizador(null);
    setMotivoSaida(motivo);
    setEstado('fora');
  }, []);

  // «Sair» e o fecho por inactividade: fecha também no SERVIDOR, para uma
  // cópia do token deixar de valer.
  const sair = useCallback(
    (motivo: MotivoSaida = null) => {
      if (lerSessao()) api.sair().catch(() => {});
      largar(motivo);
    },
    [largar]
  );

  useEffect(() => {
    quandoPerderSessao(largar);
  }, [largar]);

  // O RELÓGIO DA INACTIVIDADE: de 30 em 30 segundos vê há quanto tempo
  // ninguém mexe. Também ao voltar a este separador — um portátil a dormir
  // não corre temporizadores, e acordava com os dados à vista.
  useEffect(() => {
    if (estado !== 'dentro') return;
    const ver = () => {
      if (segundosSemToque() * 1000 >= INATIVO_MS) sair('inativo');
    };
    const id = window.setInterval(ver, 30_000);
    document.addEventListener('visibilitychange', ver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', ver);
    };
  }, [estado, sair]);

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
      .catch(() => largar('expirou'));
  }, [estado, largar]);

  const entrar = useCallback(async (telefone: string, palavraPasse: string) => {
    const r = await api.entrar(telefone.trim(), palavraPasse);
    if (r.passo === 'codigo') return { desafio: r.desafio, para: r.para };
    if (!r.user?.isAdmin) throw new Error('Esta conta não é de administrador.');
    gravarSessao(r.token);
    setUtilizador(r.user);
    setMotivoSaida(null);
    setEstado('dentro');
    return null;
  }, []);

  const confirmarCodigo = useCallback(async (desafio: number, codigo: string) => {
    const r = await api.confirmarCodigo(desafio, codigo.trim());
    if (!r.user?.isAdmin) throw new Error('Esta conta não é de administrador.');
    gravarSessao(r.token);
    setUtilizador(r.user);
    setMotivoSaida(null);
    setEstado('dentro');
  }, []);

  const valor = useMemo(
    () => ({ estado, utilizador, entrar, confirmarCodigo, sair: () => sair(null), motivoSaida }),
    [estado, utilizador, entrar, confirmarCodigo, sair, motivoSaida]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useSessao fora do FornecedorSessao');
  return c;
}
