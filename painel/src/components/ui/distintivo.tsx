import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Estados em pastilha. A cor nunca vai sozinha: há sempre a palavra, para quem
// não distingue cores e para quem imprime a página.
const variantes = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      cor: {
        neutro: 'bg-fundo text-secundario ring-1 ring-inset ring-borda',
        teal: 'bg-teal-claro text-teal-escuro',
        coral: 'bg-coral-claro text-coral-texto',
        perigo: 'bg-perigo-claro text-perigo',
        sucesso: 'bg-sucesso-claro text-sucesso',
        aviso: 'bg-aviso-claro text-aviso',
        azul: 'bg-azul-claro text-azul',
      },
    },
    defaultVariants: { cor: 'neutro' },
  }
);

const pontos: Record<string, string> = {
  neutro: 'bg-secundario',
  teal: 'bg-teal',
  coral: 'bg-coral',
  perigo: 'bg-perigo',
  sucesso: 'bg-sucesso',
  aviso: 'bg-aviso',
  azul: 'bg-azul',
};

export interface PropsDistintivo extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof variantes> {
  ponto?: boolean;
}

export function Distintivo({ className, cor, ponto, children, ...props }: PropsDistintivo) {
  return (
    <span className={cn(variantes({ cor }), className)} {...props}>
      {ponto ? <span className={cn('size-1.5 rounded-full', pontos[cor ?? 'neutro'])} aria-hidden /> : null}
      {children}
    </span>
  );
}
