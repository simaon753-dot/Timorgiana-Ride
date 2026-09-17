import { useCallback, useEffect, useRef, useState } from 'react';

// Carregar dados com os três estados que cada ecrã tem de mostrar:
// a carregar, com erro, e com dados.
//
// `aCada` volta a pedir sozinho de x em x milissegundos — só enquanto o
// separador do browser está à vista. Um painel esquecido aberto num separador
// de fundo não deve andar a gastar a rede de Díli a perguntar por nada.
export function useDados<T>(
  carregar: () => Promise<T>,
  deps: unknown[] = [],
  opcoes: { aCada?: number; ativo?: boolean } = {}
) {
  const { aCada, ativo = true } = opcoes;
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(ativo);
  const [aAtualizar, setAAtualizar] = useState(false);
  const pedidoAtual = useRef(0);
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const executar = useCallback(async (silencioso = false) => {
    const n = ++pedidoAtual.current;
    if (silencioso) setAAtualizar(true);
    else setACarregar(true);
    try {
      const r = await carregarRef.current();
      // Só a resposta do pedido mais recente conta: se o filtro mudou a meio,
      // a resposta antiga chega depois e não pode apagar a nova.
      if (n !== pedidoAtual.current) return;
      setDados(r);
      setErro(null);
    } catch (e) {
      if (n !== pedidoAtual.current) return;
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      if (n === pedidoAtual.current) {
        setACarregar(false);
        setAAtualizar(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!ativo) return;
    executar(dados != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, ...deps]);

  useEffect(() => {
    if (!aCada || !ativo) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') executar(true);
    }, aCada);
    return () => window.clearInterval(id);
  }, [aCada, ativo, executar]);

  return {
    dados,
    erro,
    aCarregar: aCarregar && dados == null,
    aAtualizar: aAtualizar || (aCarregar && dados != null),
    recarregar: () => executar(true),
    setDados,
  };
}
