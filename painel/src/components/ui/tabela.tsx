import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// A tabela rola de lado DENTRO do cartão, e nunca a página inteira.
export function Tabela({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  );
}

export function TCabeca({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-borda bg-fundo/60', className)} {...props} />;
}

export function TCorpo({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-borda', className)} {...props} />;
}

export function TLinha({ className, clicavel, ...props }: HTMLAttributes<HTMLTableRowElement> & { clicavel?: boolean }) {
  return (
    <tr
      className={cn('transition-colors duration-150', clicavel && 'cursor-pointer hover:bg-teal-suave', className)}
      {...props}
    />
  );
}

export function TTitulo({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secundario first:pl-6 last:pr-6', className)}
      {...props}
    />
  );
}

export function TCelula({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle first:pl-6 last:pr-6', className)} {...props} />;
}
