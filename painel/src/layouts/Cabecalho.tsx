import { Bell, ChevronDown, CircleAlert, Info, LogOut, Menu as IconeMenu, PanelLeft, Search, Settings, ShieldCheck, TriangleAlert, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { t } from '@/i18n';
import { eMac } from '@/hooks/useAtalho';
import { useSessao } from '@/lib/sessao';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Balao, BalaoAbrir, BalaoConteudo, Menu, MenuAbrir, MenuConteudo, MenuItem, MenuSeparador, Dica } from '@/components/ui/menu';
import { DESTINO_NOTIFICACAO } from './navegacao';
import { useServico } from './servico';
import type { ItemNotificacao } from '@/types/api';

export function Cabecalho({
  aoAlternarMenu,
  aoAbrirGaveta,
  aoPesquisar,
  recolhido,
}: {
  aoAlternarMenu: () => void;
  aoAbrirGaveta: () => void;
  aoPesquisar: () => void;
  recolhido: boolean;
}) {
  const { utilizador, sair } = useSessao();
  const navegar = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-borda bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
      {/* Telemóvel: abre a gaveta. Computador: recolhe/expande o menu. */}
      <button
        type="button"
        onClick={aoAbrirGaveta}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-botao text-secundario transition-colors hover:bg-fundo hover:text-texto md:hidden"
        aria-label={t('nav.abrirMenu')}
      >
        <IconeMenu className="size-5" />
      </button>
      <Dica texto={recolhido ? t('nav.expandir') : t('nav.recolher')} lado="bottom">
        <button
          type="button"
          onClick={aoAlternarMenu}
          className="hidden size-10 cursor-pointer items-center justify-center rounded-botao text-secundario transition-colors hover:bg-fundo hover:text-texto md:inline-flex"
          aria-label={recolhido ? t('nav.expandir') : t('nav.recolher')}
          aria-expanded={!recolhido}
        >
          <PanelLeft className="size-5" />
        </button>
      </Dica>

      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          onClick={aoPesquisar}
          className="group flex h-10 w-full max-w-[560px] cursor-pointer items-center gap-2.5 rounded-botao border border-borda bg-fundo px-3 text-left text-sm text-secundario transition-colors hover:border-borda-forte hover:bg-white"
          aria-keyshortcuts={eMac ? 'Meta+K' : 'Control+K'}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            <span className="hidden sm:inline">{t('cabecalho.pesquisar')}</span>
            <span className="sm:hidden">{t('cabecalho.pesquisarCurto')}</span>
          </span>
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-borda bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-secundario sm:inline-flex">
            {eMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
      </div>

      <Notificacoes />

      <Menu>
        <MenuAbrir asChild>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2.5 rounded-botao p-1 pr-2 text-left transition-colors hover:bg-fundo"
            aria-label={t('cabecalho.menuConta')}
          >
            <Avatar nome={utilizador?.name} />
            <span className="hidden min-w-0 leading-tight lg:block">
              <span className="block max-w-44 truncate text-sm font-semibold text-texto">{utilizador?.name}</span>
              <span className="block text-xs text-secundario">{t('cabecalho.cargo')}</span>
            </span>
            <ChevronDown className="hidden size-4 text-secundario lg:block" aria-hidden />
          </button>
        </MenuAbrir>
        <MenuConteudo className="w-60">
          <div className="px-2.5 py-2 lg:hidden">
            <p className="truncate text-sm font-semibold">{utilizador?.name}</p>
            <p className="text-xs text-secundario">{t('cabecalho.cargo')}</p>
          </div>
          <MenuSeparador />
          <MenuItem onSelect={() => utilizador && navegar(`/contas?conta=${utilizador.id}`)}>
            <User /> {t('cabecalho.meuPerfil')}
          </MenuItem>
          <MenuItem onSelect={() => navegar('/definicoes')}>
            <Settings /> {t('cabecalho.definicoes')}
          </MenuItem>
          <MenuItem onSelect={() => navegar('/contas?vista=registo')}>
            <ShieldCheck /> {t('cabecalho.seguranca')}
          </MenuItem>
          <MenuSeparador />
          <MenuItem perigo onSelect={sair}>
            <LogOut /> {t('cabecalho.sair')}
          </MenuItem>
        </MenuConteudo>
      </Menu>
    </header>
  );
}

const ICONE_NIVEL = { mau: CircleAlert, aviso: TriangleAlert, neutro: Info };
const COR_NIVEL = {
  mau: 'bg-perigo-claro text-perigo',
  aviso: 'bg-aviso-claro text-aviso',
  neutro: 'bg-fundo text-secundario',
};

function Notificacoes() {
  const { notificacoes } = useServico();
  const navegar = useNavigate();
  const n = notificacoes?.porTratar ?? 0;
  const itens = notificacoes?.itens ?? [];
  const urgente = itens.some((i) => i.nivel === 'mau');

  return (
    <Balao>
      <BalaoAbrir asChild>
        <button
          type="button"
          className="relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-botao text-secundario transition-colors hover:bg-fundo hover:text-texto"
          aria-label={n ? t('cabecalho.notificacoesN', { n }) : t('cabecalho.notificacoes')}
        >
          <Bell className="size-5" />
          {n > 0 ? (
            <span
              className={cn(
                'numeros absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-white',
                urgente ? 'bg-perigo text-white' : 'bg-coral text-texto'
              )}
            >
              {n > 99 ? '99+' : n}
            </span>
          ) : null}
        </button>
      </BalaoAbrir>
      <BalaoConteudo className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-borda px-4 py-3">
          <p className="text-sm font-semibold">{t('cabecalho.notificacoes')}</p>
        </div>
        {itens.length ? (
          <ul className="max-h-96 divide-y divide-borda overflow-y-auto">
            {itens.map((i: ItemNotificacao) => {
              const Icone = ICONE_NIVEL[i.nivel];
              return (
                <li key={i.chave}>
                  <button
                    type="button"
                    onClick={() => navegar(DESTINO_NOTIFICACAO[i.chave])}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-fundo"
                  >
                    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', COR_NIVEL[i.nivel])}>
                      <Icone className="size-4" aria-hidden />
                    </span>
                    <span className="text-sm text-texto">{t(`notif.${i.chave}`, { n: i.n })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-secundario">{t('cabecalho.semNotificacoes')}</p>
        )}
      </BalaoConteudo>
    </Balao>
  );
}
