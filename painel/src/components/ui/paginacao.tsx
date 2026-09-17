import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Botao } from './botao';
import { t } from '@/i18n';

export function Paginacao({ pagina, haMais, aoMudar }: { pagina: number; haMais: boolean; aoMudar: (p: number) => void }) {
  if (pagina === 0 && !haMais) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 border-t border-borda px-6 py-3">
      <span className="text-[13px] text-secundario">{t('comum.pagina', { n: pagina + 1 })}</span>
      <div className="flex gap-2">
        <Botao variante="secundario" tamanho="sm" disabled={pagina === 0} onClick={() => aoMudar(pagina - 1)}>
          <ChevronLeft /> {t('comum.anterior')}
        </Botao>
        <Botao variante="secundario" tamanho="sm" disabled={!haMais} onClick={() => aoMudar(pagina + 1)}>
          {t('comum.seguinte')} <ChevronRight />
        </Botao>
      </div>
    </nav>
  );
}
