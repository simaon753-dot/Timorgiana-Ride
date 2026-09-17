import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { t, type Chave } from '@/i18n';
import { hojeEmDili } from '@/lib/formato';
import { Balao, BalaoAbrir, BalaoConteudo } from '@/components/ui/menu';
import { Botao } from '@/components/ui/botao';
import { Campo, Rotulo } from '@/components/ui/campo';
import { cn } from '@/lib/utils';

export type Periodo =
  | { tipo: 'todo' | 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' }
  | { tipo: 'personalizado'; de: string; ate: string };

const OPCOES: Periodo['tipo'][] = ['todo', 'hoje', 'ontem', '7dias', '30dias', 'mes', 'personalizado'];

function somarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// O intervalo [de, ate] em dias de Díli, inclusive. `null` = sem limite.
export function intervaloDe(p: Periodo): [string, string] | null {
  const hoje = hojeEmDili();
  switch (p.tipo) {
    case 'todo':
      return null;
    case 'hoje':
      return [hoje, hoje];
    case 'ontem':
      return [somarDias(hoje, -1), somarDias(hoje, -1)];
    case '7dias':
      return [somarDias(hoje, -6), hoje];
    case '30dias':
      return [somarDias(hoje, -29), hoje];
    case 'mes':
      return [`${hoje.slice(0, 8)}01`, hoje];
    case 'personalizado':
      return [p.de || '0000-01-01', p.ate || '9999-12-31'];
  }
}

export function diaDeDili(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dili' }).format(new Date(iso));
}

export function dentroDoPeriodo(iso: string | null | undefined, p: Periodo) {
  const i = intervaloDe(p);
  if (!i) return true;
  if (!iso) return false;
  const dia = diaDeDili(iso);
  return dia >= i[0] && dia <= i[1];
}

export function FiltroPeriodo({ valor, aoMudar, rotulo }: { valor: Periodo; aoMudar: (p: Periodo) => void; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(valor.tipo === 'personalizado' ? valor.de : '');
  const [ate, setAte] = useState(valor.tipo === 'personalizado' ? valor.ate : hojeEmDili());

  const nome = (tipo: Periodo['tipo']) => t(`periodo.${tipo}` as Chave);
  const texto =
    valor.tipo === 'personalizado' ? `${valor.de || '…'} → ${valor.ate || '…'}` : nome(valor.tipo);

  return (
    <Balao open={aberto} onOpenChange={setAberto}>
      <BalaoAbrir asChild>
        <Botao variante="secundario" aria-label={rotulo ? `${rotulo}: ${texto}` : texto}>
          <Calendar /> <span className="max-w-40 truncate">{texto}</span> <ChevronDown className="text-secundario" />
        </Botao>
      </BalaoAbrir>
      <BalaoConteudo className="w-64 p-1.5">
        <ul role="listbox" aria-label={rotulo}>
          {OPCOES.filter((o) => o !== 'personalizado').map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={valor.tipo === o}
                onClick={() => {
                  aoMudar({ tipo: o } as Periodo);
                  setAberto(false);
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-fundo',
                  valor.tipo === o && 'bg-teal-suave font-semibold text-teal-escuro'
                )}
              >
                {nome(o)}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-borda px-2.5 pb-1.5 pt-3">
          <p className="mb-2 text-xs font-semibold text-secundario">{t('periodo.personalizado')}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Rotulo htmlFor="periodo-de" className="text-xs">{t('periodo.de')}</Rotulo>
              <Campo id="periodo-de" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} className="px-2 text-sm" />
            </div>
            <div>
              <Rotulo htmlFor="periodo-ate" className="text-xs">{t('periodo.ate')}</Rotulo>
              <Campo id="periodo-ate" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} className="px-2 text-sm" />
            </div>
          </div>
          <Botao
            tamanho="sm"
            className="mt-2 w-full"
            disabled={!de && !ate}
            onClick={() => {
              aoMudar({ tipo: 'personalizado', de, ate });
              setAberto(false);
            }}
          >
            {t('comum.confirmar')}
          </Botao>
        </div>
      </BalaoConteudo>
    </Balao>
  );
}
