import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { numero } from '@/lib/formato';

const cores = {
  coral: 'bg-coral-claro text-coral-texto',
  teal: 'bg-teal-claro text-teal-escuro',
  perigo: 'bg-perigo-claro text-perigo',
  azul: 'bg-azul-claro text-azul',
  aviso: 'bg-aviso-claro text-aviso',
  neutro: 'bg-fundo text-secundario',
};

// UM NÚMERO, UMA PALAVRA. Só números que o servidor devolve: se o valor não
// existe, o cartão diz "—" e não inventa um zero.
export function CartaoNumero({
  icone,
  valor,
  rotulo,
  cor = 'teal',
  nota,
  aoClicar,
  ativo,
  formatar = true,
}: {
  icone: ReactNode;
  valor: number | string | null | undefined;
  rotulo: string;
  cor?: keyof typeof cores;
  nota?: ReactNode;
  aoClicar?: () => void;
  ativo?: boolean;
  formatar?: boolean;
}) {
  const conteudo = (
    <>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', cores[cor])} aria-hidden>
        {icone}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="numeros block text-[26px] font-bold leading-tight tracking-tight text-texto">
          {valor == null ? '—' : typeof valor === 'number' && formatar ? numero(valor) : valor}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-secundario">{rotulo}</span>
        {nota ? <span className="mt-1 block truncate text-xs text-secundario">{nota}</span> : null}
      </span>
      {aoClicar ? (
        <ChevronRight
          className="size-4 shrink-0 text-secundario/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-teal"
          aria-hidden
        />
      ) : null}
    </>
  );
  const base = cn(
    'group flex w-full items-center gap-4 rounded-cartao border bg-white p-5 shadow-cartao transition-[border-color,box-shadow] duration-150',
    ativo ? 'border-teal ring-1 ring-teal' : 'border-borda'
  );
  return aoClicar ? (
    <button type="button" onClick={aoClicar} aria-pressed={ativo} className={cn(base, 'cursor-pointer hover:border-borda-forte hover:shadow-subtil')}>
      {conteudo}
    </button>
  ) : (
    <div className={base}>{conteudo}</div>
  );
}
