import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// 16 px no telemóvel, e não menos: abaixo disso o Safari dá zoom sozinho ao
// tocar num campo e a página fica torta até se sair dele.
const baseCampo =
  'w-full rounded-campo border border-borda bg-white px-3 text-[16px] text-texto shadow-subtil sm:text-sm ' +
  'placeholder:text-secundario/80 transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-borda-forte focus:border-teal focus:outline-none focus:ring-3 focus:ring-teal/15 ' +
  'disabled:cursor-not-allowed disabled:bg-fundo disabled:opacity-70 ' +
  'aria-invalid:border-perigo aria-invalid:ring-perigo/15';

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Campo(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(baseCampo, 'h-10 pointer-coarse:h-11', className)} {...props} />;
});

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AreaTexto({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseCampo, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
  }
);

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Selecao(
  { className, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(baseCampo, 'h-10 cursor-pointer appearance-none pr-9 pointer-coarse:h-11', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-secundario" aria-hidden />
    </div>
  );
});

export function Rotulo({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-[13px] font-semibold text-texto', className)} {...props} />;
}

export function Ajuda({ className, erro, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { erro?: boolean }) {
  return <p className={cn('mt-1.5 text-xs', erro ? 'text-perigo' : 'text-secundario', className)} {...props} />;
}

export const CampoPesquisa = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function CampoPesquisa({ className, ...props }, ref) {
    return (
      <div className={cn('relative', className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secundario" aria-hidden />
        <input ref={ref} type="search" className={cn(baseCampo, 'h-10 pl-9 pointer-coarse:h-11')} {...props} />
      </div>
    );
  }
);
