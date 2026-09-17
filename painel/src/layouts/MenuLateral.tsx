import { NavLink } from 'react-router';
import logo from '@/assets/logo-marca.png';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { Dica } from '@/components/ui/menu';
import { GRUPOS } from './navegacao';
import { contagemDe, useServico } from './servico';

export function Marca({ compacta }: { compacta?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', compacta && 'justify-center')}>
      <img src={logo} alt="" className="h-10 w-auto shrink-0" width={51} height={40} />
      {compacta ? (
        <span className="sr-only">{t('marca.nome')}</span>
      ) : (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold tracking-tight text-texto">{t('marca.nome')}</span>
          <span className="block truncate text-xs text-secundario">{t('marca.sub')}</span>
        </span>
      )}
    </div>
  );
}

// O MENU. Recolhido, fica só com os ícones — e cada ícone diz o nome ao passar
// o rato, porque um ícone sozinho é uma adivinha.
export function MenuLateral({ recolhido, aoNavegar }: { recolhido?: boolean; aoNavegar?: () => void }) {
  const { notificacoes } = useServico();
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-[72px] shrink-0 items-center border-b border-borda', recolhido ? 'justify-center px-2' : 'px-5')}>
        <Marca compacta={recolhido} />
      </div>
      <nav aria-label={t('nav.principal')} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {GRUPOS.map((g, gi) => (
          <div key={g.rotulo} className={cn(gi > 0 && 'mt-4 border-t border-borda pt-4')}>
            {recolhido ? null : (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-secundario">{t(g.rotulo)}</p>
            )}
            <ul className="space-y-0.5">
              {g.itens.map((item) => {
                const n = contagemDe(notificacoes, item.contam);
                const Icone = item.icone;
                const ligacao = (
                  <NavLink
                    to={item.para}
                    onClick={aoNavegar}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-10 items-center gap-3 rounded-[10px] text-sm font-medium transition-colors duration-150 pointer-coarse:h-11',
                        recolhido ? 'justify-center px-0' : 'px-3',
                        isActive
                          ? 'bg-teal-claro text-teal-escuro'
                          : 'text-secundario hover:bg-fundo hover:text-texto'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-teal" aria-hidden />
                        ) : null}
                        <Icone className={cn('size-[18px] shrink-0', isActive ? 'text-teal' : 'text-secundario group-hover:text-texto')} aria-hidden />
                        {recolhido ? (
                          <span className="sr-only">{t(item.rotulo)}</span>
                        ) : (
                          <span className="min-w-0 flex-1 truncate">{t(item.rotulo)}</span>
                        )}
                        {n > 0 ? (
                          recolhido ? (
                            <span
                              className={cn('absolute right-2 top-2 size-2 rounded-full ring-2 ring-white', item.urgente ? 'bg-perigo' : 'bg-coral')}
                              aria-label={`${n}`}
                            />
                          ) : (
                            <span
                              className={cn(
                                'numeros min-w-5 rounded-full px-1.5 text-center text-xs font-semibold',
                                item.urgente ? 'bg-perigo text-white' : 'bg-coral text-texto'
                              )}
                            >
                              {n}
                            </span>
                          )
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
                return <li key={item.para}>{recolhido ? <Dica texto={t(item.rotulo)} lado="right">{ligacao}</Dica> : ligacao}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
