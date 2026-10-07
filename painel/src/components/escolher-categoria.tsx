// A categoria exata do Giara, por baixo dos botões do tipo (07/10/2026).
//
// Tocar em «Igreja» já escolhe «Igreja Católica»; aqui afina-se para
// «Capela» ou «Catedral». A pesquisa procura primeiro nos grupos do botão e,
// por baixo, em todos os outros: quem tocou em «Loja» à procura de uma
// farmácia encontra-a na Saúde sem ter de adivinhar o botão certo.
import { useState } from 'react';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { CampoPesquisa } from '@/components/ui/campo';
import { GRUPOS, gruposDoTipo, nomeCategoria, procurarCategorias, type GrupoCategorias } from '@/lib/categoriasGiara';

export function EscolherCategoria({ tipo, categoria, aoEscolher }: { tipo: string; categoria: string; aoEscolher: (codigo: string) => void }) {
  const [pesquisa, setPesquisa] = useState('');
  const doTipo = gruposDoTipo(tipo);
  const aProcurar = pesquisa.trim() !== '';
  const encontrados = procurarCategorias(doTipo, pesquisa);
  // Os outros grupos só entram quando se escreve alguma coisa — sem pesquisa
  // eram 500 categorias por baixo das 20 que interessam.
  const noutros = aProcurar && doTipo.length < GRUPOS.length ? procurarCategorias(GRUPOS.filter((g) => !doTipo.includes(g)), pesquisa) : [];
  const nada = encontrados.length === 0 && noutros.length === 0;

  const grupo = (g: GrupoCategorias) => (
    <div key={g.numero} className="mb-2 last:mb-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-secundario">{g.nome}</p>
      <div className="flex flex-wrap gap-1">
        {g.categorias.map(([codigo, nome]) => {
          const escolhida = codigo === categoria;
          return (
            <button
              key={codigo}
              type="button"
              aria-pressed={escolhida}
              onClick={() => aoEscolher(codigo)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[12px] transition-colors duration-150',
                escolhida ? 'border-teal bg-teal font-semibold text-white' : 'border-borda bg-white text-texto hover:bg-fundo'
              )}
            >
              {nome}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mt-2 rounded-lg border border-borda bg-fundo/50 p-2">
      {/* A escolha fica sempre à vista — a de outro grupo sai da lista quando
          se apaga a pesquisa. */}
      {categoria ? (
        <p className="mb-1.5 text-[13px] text-texto" aria-live="polite">
          {t('parag.categoriaEscolhida')} <strong className="font-semibold text-teal-escuro">{nomeCategoria(categoria)}</strong>
        </p>
      ) : null}
      <CampoPesquisa
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
        placeholder={t('parag.categoriaPesquisa')}
        aria-label={t('parag.categoriaPesquisa')}
      />
      <div className="mt-2 max-h-56 overflow-y-auto pr-1">
        {encontrados.map(grupo)}
        {noutros.length ? (
          <>
            <p className="mb-1.5 mt-3 border-t border-borda pt-2 text-[12px] font-semibold text-texto">{t('parag.categoriaNoutros')}</p>
            {noutros.map(grupo)}
          </>
        ) : null}
        {nada ? <p className="py-2 text-sm text-secundario">{t('parag.categoriaNenhuma')}</p> : null}
      </div>
    </div>
  );
}
