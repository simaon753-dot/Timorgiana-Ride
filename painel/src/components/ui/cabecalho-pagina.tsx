import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  migalhas,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  migalhas?: { rotulo: string; para?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {migalhas?.length ? (
          <nav aria-label="Localização" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-secundario">
              {migalhas.map((m, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
                  {m.para ? (
                    <Link to={m.para} className="hover:text-texto hover:underline">
                      {m.rotulo}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-texto">
                      {m.rotulo}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-[28px]">{titulo}</h1>
        {descricao ? <p className="mt-1 max-w-2xl text-sm text-secundario">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  );
}
