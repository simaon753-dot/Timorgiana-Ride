import * as S from '@radix-ui/react-switch';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export function Interruptor({ className, ...props }: ComponentPropsWithoutRef<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150',
        'bg-borda-forte data-[state=checked]:bg-teal disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-subtil transition-transform duration-150 data-[state=checked]:translate-x-5" />
    </S.Root>
  );
}
