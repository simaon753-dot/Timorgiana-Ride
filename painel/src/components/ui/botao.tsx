import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Um botão, seis aspetos. O coral não é um deles de propósito: é cor de
// destaque e de alerta, não de ação — e com texto branco nem se lê (2,8:1).
const variantes = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-botao font-semibold ' +
    'transition-[background-color,border-color,color,box-shadow] duration-150 select-none ' +
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variante: {
        primario: 'bg-teal text-white shadow-subtil hover:bg-teal-escuro active:bg-teal-escuro',
        secundario:
          'border border-borda bg-white text-texto shadow-subtil hover:border-borda-forte hover:bg-fundo active:bg-borda/60',
        suave: 'bg-teal-claro text-teal-escuro hover:bg-teal-claro/70',
        fantasma: 'text-secundario hover:bg-fundo hover:text-texto',
        perigo: 'bg-perigo text-white shadow-subtil hover:bg-perigo/90',
        perigoContorno: 'border border-perigo/40 bg-white text-perigo hover:border-perigo hover:bg-perigo-claro',
      },
      tamanho: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm pointer-coarse:h-11',
        lg: 'h-11 px-5 text-[15px]',
        icone: 'size-10 pointer-coarse:size-11',
        iconeSm: 'size-8',
      },
    },
    defaultVariants: { variante: 'primario', tamanho: 'md' },
  }
);

export interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variantes> {
  aCarregar?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, PropsBotao>(function Botao(
  { className, variante, tamanho, aCarregar, disabled, children, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(variantes({ variante, tamanho }), className)}
      disabled={disabled || aCarregar}
      aria-busy={aCarregar || undefined}
      {...props}
    >
      {aCarregar ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export { variantes as variantesBotao };
