import { cn } from '@/lib/utils';

// Um brilho que passa, e não um relógio a rodar: diz "vem aí conteúdo com
// esta forma", e a página não salta quando ele chega.
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-brilho rounded-md bg-[linear-gradient(90deg,#eef1f0_0px,#f6f8f7_120px,#eef1f0_240px)] bg-[length:800px_100%]',
        className
      )}
    />
  );
}

export function EsqueletoTabela({ linhas = 5, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="divide-y divide-borda" role="status" aria-label="A carregar">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Esqueleto className="size-9 rounded-full" />
          {Array.from({ length: colunas - 1 }).map((__, j) => (
            <Esqueleto key={j} className={cn('h-3.5', j === 0 ? 'w-40' : 'hidden w-24 sm:block')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EsqueletoCartoes({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="A carregar">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-cartao border border-borda bg-white p-5">
          <Esqueleto className="size-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-6 w-14" />
            <Esqueleto className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
