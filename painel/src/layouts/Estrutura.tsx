import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import * as D from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { useAtalho } from '@/hooks/useAtalho';
import { useMedia } from '@/hooks/useMedia';
import { t } from '@/i18n';
import { Cabecalho } from './Cabecalho';
import { MenuLateral } from './MenuLateral';
import { PesquisaGlobal } from './PesquisaGlobal';
import { Rodape } from './Rodape';
import { FornecedorServico } from './servico';

const CHAVE_RECOLHIDO = 'painel.menuRecolhido';

// A ESTRUTURA: menu lateral · cabeçalho · conteúdo · rodapé.
//
//   Computador (≥ 1024 px): menu completo, fixo; recolhe-se com o botão.
//   Tablet (768–1023 px):   menu compacto, só ícones.
//   Telemóvel (< 768 px):   o menu é uma gaveta que abre por cima.
export function Estrutura() {
  const eTablet = useMedia('(min-width: 768px) and (max-width: 1023px)');
  const eTelemovel = useMedia('(max-width: 767px)');
  const [recolhidoEscolha, setRecolhidoEscolha] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_RECOLHIDO) === '1';
    } catch {
      return false;
    }
  });
  const [gaveta, setGaveta] = useState(false);
  const [pesquisa, setPesquisa] = useState(false);
  const local = useLocation();

  const recolhido = eTablet ? !recolhidoEscolha : recolhidoEscolha;

  const alternar = () => {
    setRecolhidoEscolha((v) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, v ? '0' : '1');
      } catch {
        // Sem armazenamento: vale só para esta visita.
      }
      return !v;
    });
  };

  useAtalho('k', useCallback(() => setPesquisa((v) => !v), []));
  useEffect(() => setGaveta(false), [local.pathname]);
  useEffect(() => {
    if (!eTelemovel) setGaveta(false);
  }, [eTelemovel]);

  return (
    <FornecedorServico>
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-lg bg-teal px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 hidden border-r border-borda bg-white transition-[width] duration-200 ease-out md:block',
            recolhido ? 'w-[76px]' : 'w-[260px]'
          )}
        >
          <MenuLateral recolhido={recolhido} />
        </aside>

        <D.Root open={gaveta} onOpenChange={setGaveta}>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-50 bg-texto/40 data-[state=open]:animate-entrar md:hidden" />
            <D.Content className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-borda bg-white shadow-flutuante focus:outline-none data-[state=open]:animate-deslizar md:hidden">
              <D.Title className="sr-only">{t('nav.principal')}</D.Title>
              <D.Description className="sr-only">{t('marca.sub')}</D.Description>
              <MenuLateral aoNavegar={() => setGaveta(false)} />
            </D.Content>
          </D.Portal>
        </D.Root>

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out',
            recolhido ? 'md:pl-[76px]' : 'md:pl-[260px]'
          )}
        >
          <Cabecalho
            recolhido={recolhido}
            aoAlternarMenu={alternar}
            aoAbrirGaveta={() => setGaveta(true)}
            aoPesquisar={() => setPesquisa(true)}
          />
          <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
            <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-8 sm:py-8">
              <Outlet />
            </div>
          </main>
          <Rodape />
        </div>
      </div>
      <PesquisaGlobal aberta={pesquisa} aoMudar={setPesquisa} />
    </FornecedorServico>
  );
}
