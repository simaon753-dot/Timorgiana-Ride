import { t } from '@/i18n';
import { useServico } from './servico';

export function Rodape() {
  const { versao } = useServico();
  return (
    <footer className="border-t border-borda bg-white/60">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-4 text-[13px] text-secundario sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>{t('rodape.direitos', { ano: new Date().getFullYear() })}</p>
        <nav aria-label="Informação legal" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="/termos" target="_blank" rel="noreferrer" className="hover:text-texto hover:underline">
            {t('rodape.termos')}
          </a>
          <a href="/privacidade" target="_blank" rel="noreferrer" className="hover:text-texto hover:underline">
            {t('rodape.privacidade')}
          </a>
          {versao ? <span className="numeros">{t('rodape.versao', { v: versao })}</span> : null}
        </nav>
      </div>
    </footer>
  );
}
