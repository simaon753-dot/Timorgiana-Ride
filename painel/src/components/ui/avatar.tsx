import { cn, iniciais } from '@/lib/utils';

const tamanhos = { sm: 'size-8 text-xs', md: 'size-9 text-[13px]', lg: 'size-12 text-base' };

export function Avatar({ nome, tamanho = 'md', className }: { nome: string | null | undefined; tamanho?: keyof typeof tamanhos; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-teal-claro font-semibold text-teal-escuro',
        tamanhos[tamanho],
        className
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
