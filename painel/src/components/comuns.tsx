import { Bike, Car, Truck } from 'lucide-react';
import { t, tl } from '@/i18n';
import { Distintivo } from '@/components/ui/distintivo';
import type { EstadoMotorista, EstadoViagem, TipoVeiculo, UtilizadorLinha } from '@/types/api';
import { cn } from '@/lib/utils';

// Peças pequenas que vários módulos partilham, para o mesmo estado ter sempre
// a mesma cor e o mesmo veículo sempre o mesmo ícone.

const ICONES_VEICULO = { motorbike: Bike, car: Car, carry: Truck };

export function IconeVeiculo({ tipo, className }: { tipo: TipoVeiculo | null | undefined; className?: string }) {
  const Icone = ICONES_VEICULO[tipo ?? 'car'] ?? Car;
  return <Icone className={cn('size-4 shrink-0', className)} aria-hidden />;
}

export function Veiculo({ tipo, detalhe }: { tipo: TipoVeiculo | null | undefined; detalhe?: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fundo text-secundario">
        <IconeVeiculo tipo={tipo} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-medium text-texto">{tl('veiculo', tipo)}</span>
        {detalhe ? <span className="numeros block truncate text-xs text-secundario">{detalhe}</span> : null}
      </span>
    </span>
  );
}

const COR_MOTORISTA = { pending: 'coral', approved: 'sucesso', rejected: 'perigo', suspended: 'aviso' } as const;

export function EstadoDoMotorista({ estado }: { estado: EstadoMotorista | null }) {
  if (!estado) return <Distintivo>{t('comum.desconhecido')}</Distintivo>;
  return (
    <Distintivo cor={COR_MOTORISTA[estado]} ponto>
      {tl('estadoMotorista', estado)}
    </Distintivo>
  );
}

const COR_VIAGEM = {
  requested: 'azul',
  accepted: 'teal',
  arriving: 'teal',
  in_progress: 'teal',
  completed: 'sucesso',
  cancelled: 'neutro',
} as const;

export function EstadoDaViagem({ estado, semMotorista }: { estado: EstadoViagem; semMotorista?: boolean }) {
  if (estado === 'cancelled' && semMotorista) {
    return (
      <Distintivo cor="aviso" ponto>
        {t('estadoViagem.semMotorista')}
      </Distintivo>
    );
  }
  return (
    <Distintivo cor={COR_VIAGEM[estado] ?? 'neutro'} ponto>
      {tl('estadoViagem', estado)}
    </Distintivo>
  );
}

// Um par "rótulo: valor" nas fichas de detalhe.
export function Dado({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium text-secundario">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm text-texto">{children}</dd>
    </div>
  );
}

export function Telefone({ numero }: { numero: string | null | undefined }) {
  if (!numero) return <>—</>;
  return (
    <a href={`tel:+670${numero.replace(/^\+?670/, '')}`} className="numeros text-teal-escuro hover:underline">
      {numero}
    </a>
  );
}

// O papel de uma conta: administrador, estado de motorista, ou passageiro.
export function PapelDaConta({ u }: { u: Pick<UtilizadorLinha, 'isAdmin' | 'driverStatus'> }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {u.isAdmin ? <Distintivo cor="teal">{t('contas.papelAdministrador')}</Distintivo> : null}
      {u.driverStatus ? (
        <EstadoDoMotorista estado={u.driverStatus} />
      ) : u.isAdmin ? null : (
        <Distintivo>{t('contas.papelPassageiro')}</Distintivo>
      )}
    </span>
  );
}
