import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Segmento<T extends string> {
  valor: T;
  rotulo: ReactNode;
  contagem?: number | null;
}

// Separadores de filtro. Setas esquerda/direita mudam de separador, como o
// padrão de acessibilidade de "tabs" pede — quem usa o teclado não tem de
// passar por cada um com o Tab.
export function Segmentos<T extends string>({
  valor,
  aoMudar,
  opcoes,
  rotulo,
  className,
}: {
  valor: T;
  aoMudar: (v: T) => void;
  opcoes: Segmento<T>[];
  rotulo: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const teclado = (e: KeyboardEvent, i: number) => {
    const n = opcoes.length;
    const alvo = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : null;
    if (alvo == null) return;
    e.preventDefault();
    aoMudar(opcoes[alvo].valor);
    refs.current[alvo]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className={cn('flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none]', className)}
    >
      {opcoes.map((o, i) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => aoMudar(o.valor)}
            onKeyDown={(e) => teclado(e, i)}
            className={cn(
              'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-150 pointer-coarse:h-11',
              ativo ? 'bg-teal text-white shadow-subtil' : 'text-texto hover:bg-white hover:shadow-subtil'
            )}
          >
            {o.rotulo}
            {o.contagem != null ? (
              <span
                className={cn(
                  'numeros min-w-5 rounded-full px-1.5 text-center text-xs font-semibold',
                  ativo ? 'bg-white/20 text-white' : 'bg-borda/70 text-secundario'
                )}
              >
                {o.contagem}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
