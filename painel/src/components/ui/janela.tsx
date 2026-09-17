import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Janela modal (Radix: prende o foco lá dentro, fecha com Esc, devolve o foco
// ao botão que a abriu) e gaveta lateral, com a mesma base.

export const Janela = D.Root;
export const JanelaAbrir = D.Trigger;
export const JanelaFecharPrimitivo = D.Close;

const larguras = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function JanelaConteudo({
  className,
  children,
  largura = 'md',
  semFechar,
  ...props
}: ComponentPropsWithoutRef<typeof D.Content> & { largura?: keyof typeof larguras; semFechar?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-texto/40 backdrop-blur-[1px] data-[state=open]:animate-entrar" />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-2xl border border-borda bg-white shadow-flutuante focus:outline-none data-[state=open]:animate-subir',
          larguras[largura],
          className
        )}
        {...props}
      >
        {children}
        {semFechar ? null : (
          <D.Close
            className="absolute right-3 top-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-botao text-secundario transition-colors hover:bg-fundo hover:text-texto"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function JanelaCabecalho({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 border-b border-borda px-6 py-5 pr-14', className)} {...props} />;
}

export function JanelaTitulo({ className, ...props }: ComponentPropsWithoutRef<typeof D.Title>) {
  return <D.Title className={cn('text-lg font-semibold tracking-tight text-texto', className)} {...props} />;
}

export function JanelaDescricao({ className, ...props }: ComponentPropsWithoutRef<typeof D.Description>) {
  return <D.Description className={cn('mt-1 text-sm text-secundario', className)} {...props} />;
}

export function JanelaCorpo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', className)} {...props} />;
}

export function JanelaRodape({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-borda bg-fundo/60 px-6 py-4 rounded-b-2xl', className)}
      {...props}
    />
  );
}

// A GAVETA: o detalhe de uma viagem ou de uma conta abre de lado, e a lista
// continua à vista por trás — quem está a percorrer vinte linhas não perde o
// sítio onde ia.
export function Gaveta({
  aberta,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  lado = 'direita',
  largura = 'max-w-2xl',
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  lado?: 'direita' | 'esquerda';
  largura?: string;
}) {
  return (
    <D.Root open={aberta} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-texto/30 data-[state=open]:animate-entrar" />
        <D.Content
          className={cn(
            'fixed inset-y-0 z-50 flex w-full flex-col bg-white shadow-flutuante focus:outline-none',
            lado === 'direita' ? 'right-0 border-l border-borda' : 'left-0 border-r border-borda',
            largura
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-borda px-6 py-5">
            <div className="min-w-0">
              <D.Title className="text-lg font-semibold tracking-tight text-texto">{titulo}</D.Title>
              {descricao ? <D.Description className="mt-1 text-sm text-secundario">{descricao}</D.Description> : <D.Description className="sr-only">Detalhe</D.Description>}
            </div>
            <D.Close
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-botao text-secundario transition-colors hover:bg-fundo hover:text-texto"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {rodape ? <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-borda bg-fundo/60 px-6 py-4">{rodape}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
