import type { ReactNode } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { Botao } from './botao';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

// O ESTADO VAZIO diz porquê está vazio e o que se pode fazer — "Nada por
// tratar" é uma boa notícia, e deve ler-se como tal.
export function EstadoVazio({
  ilustracao,
  titulo,
  texto,
  acao,
  className,
  compacto,
}: {
  ilustracao?: ReactNode;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compacto ? 'py-10' : 'min-h-80 py-14',
        className
      )}
    >
      {ilustracao ? <div className="mb-5">{ilustracao}</div> : null}
      <h3 className="text-lg font-semibold tracking-tight text-texto">{titulo}</h3>
      {texto ? <p className="mt-1.5 max-w-sm text-sm text-secundario">{texto}</p> : null}
      {acao ? <div className="mt-6">{acao}</div> : null}
    </div>
  );
}

export function EstadoErro({ mensagem, aoTentar, className }: { mensagem: string; aoTentar?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-perigo-claro text-perigo">
        <CircleAlert className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-texto">{t('comum.erroTitulo')}</h3>
      <p className="mt-1 max-w-sm text-sm text-secundario">{mensagem}</p>
      {aoTentar ? (
        <Botao variante="secundario" className="mt-5" onClick={aoTentar}>
          <RefreshCw /> {t('comum.tentarOutraVez')}
        </Botao>
      ) : null}
    </div>
  );
}

// Uma faixa de aviso dentro da página (e não uma notificação que desaparece):
// para o que continua verdade enquanto a pessoa lá está.
export function Faixa({
  cor = 'teal',
  icone,
  titulo,
  children,
  className,
  acao,
}: {
  cor?: 'teal' | 'coral' | 'perigo' | 'aviso' | 'azul';
  icone?: ReactNode;
  titulo?: ReactNode;
  children?: ReactNode;
  className?: string;
  acao?: ReactNode;
}) {
  const cores = {
    teal: 'border-teal/20 bg-teal-suave text-teal-escuro',
    coral: 'border-coral/30 bg-coral-claro text-coral-texto',
    perigo: 'border-perigo/25 bg-perigo-claro text-perigo',
    aviso: 'border-aviso/25 bg-aviso-claro text-aviso',
    azul: 'border-azul/20 bg-azul-claro text-azul',
  };
  return (
    <div className={cn('flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm', cores[cor], className)}>
      {icone ? <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icone}</span> : null}
      <div className="min-w-0 flex-1">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        {children ? <div className={cn(titulo ? 'mt-0.5' : '', 'text-texto/80')}>{children}</div> : null}
      </div>
      {acao}
    </div>
  );
}
