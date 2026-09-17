import * as M from '@radix-ui/react-dropdown-menu';
import * as P from '@radix-ui/react-popover';
import * as T from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Menu = M.Root;
export const MenuAbrir = M.Trigger;

export function MenuConteudo({ className, align = 'end', sideOffset = 8, ...props }: ComponentPropsWithoutRef<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 rounded-xl border border-borda bg-white p-1.5 shadow-flutuante data-[state=open]:animate-subir',
          className
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, perigo, ...props }: ComponentPropsWithoutRef<typeof M.Item> & { perigo?: boolean }) {
  return (
    <M.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors',
        '[&_svg]:size-4 [&_svg]:text-secundario data-[highlighted]:bg-fundo data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        perigo ? 'text-perigo [&_svg]:text-perigo data-[highlighted]:bg-perigo-claro' : 'text-texto',
        className
      )}
      {...props}
    />
  );
}

export function MenuSeparador() {
  return <M.Separator className="-mx-1.5 my-1.5 h-px bg-borda" />;
}

export function MenuRotulo({ className, ...props }: ComponentPropsWithoutRef<typeof M.Label>) {
  return <M.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-secundario', className)} {...props} />;
}

export const Balao = P.Root;
export const BalaoAbrir = P.Trigger;
export function BalaoConteudo({ className, align = 'end', sideOffset = 8, ...props }: ComponentPropsWithoutRef<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-80 rounded-xl border border-borda bg-white p-4 shadow-flutuante focus:outline-none data-[state=open]:animate-subir',
          className
        )}
        {...props}
      />
    </P.Portal>
  );
}

export const FornecedorDicas = T.Provider;

export function Dica({ texto, children, lado = 'top' }: { texto: ReactNode; children: ReactNode; lado?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={lado}
          sideOffset={6}
          className="z-[60] max-w-64 rounded-lg bg-texto px-2.5 py-1.5 text-xs font-medium text-white shadow-flutuante data-[state=delayed-open]:animate-entrar"
        >
          {texto}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
