import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-cartao border border-borda bg-white shadow-cartao', className)} {...props} />;
}

export function CartaoCabecalho({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-borda px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

export function CartaoTitulo({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[17px] font-semibold tracking-tight text-texto', className)} {...props} />;
}

export function CartaoDescricao({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-[13px] text-secundario', className)} {...props} />;
}

export function CartaoConteudo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />;
}
