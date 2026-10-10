import { useState } from 'react';
import { Bug, CircleCheck, RefreshCw } from 'lucide-react';
import { t } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { ErroApp } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Segmentos } from '@/components/ui/segmentos';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio } from '@/components/ui/estados';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { useServico } from '@/layouts/servico';

// OS ERROS DA APP (10/10/2026). O que aparecia no ecrã verde dos telemóveis
// chega aqui sozinho (backend/src/erros.js), agrupado pela mesma falha: o
// número de vezes, quantas pessoas, o ecrã e a versão da app. «Resolvido»
// tira-a da lista; se voltar a aparecer, volta como nova.
//
// Para quem corrige, a pilha diz onde foi; para o Simão, o ecrã e a
// mensagem chegam para perceber se é grave.
export function ErrosApp() {
  const [vista, setVista] = useState<'abertos' | 'resolvidos'>('abertos');
  const { dados, erro, aCarregar, aAtualizar, recarregar } = useDados(() => api.errosApp(vista === 'resolvidos'), [vista]);
  const { recarregarNotificacoes } = useServico();
  const erros = dados?.erros ?? [];

  const resolver = async (e: ErroApp) => {
    try {
      await api.resolverErroApp(e.assinatura);
      avisar.sucesso(t('erros.resolvido'));
      recarregar();
      recarregarNotificacoes();
    } catch (x) {
      avisar.erro(mensagemDe(x));
    }
  };

  return (
    <>
      <CabecalhoPagina
        titulo={t('erros.titulo')}
        descricao={t('erros.descricao')}
        acoes={
          <Botao variante="secundario" onClick={recarregar}>
            <RefreshCw className={cn(aAtualizar && 'animate-spin')} /> {t('comum.atualizar')}
          </Botao>
        }
      />
      <Segmentos
        rotulo={t('erros.vistas')}
        valor={vista}
        aoMudar={(v) => setVista(v as 'abertos' | 'resolvidos')}
        className="mb-4 rounded-2xl bg-borda/40 p-1"
        opcoes={[
          { valor: 'abertos', rotulo: t('erros.abertos') },
          { valor: 'resolvidos', rotulo: t('erros.resolvidos') },
        ]}
      />
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar ? (
        <div className="space-y-3">
          <Esqueleto className="h-28 w-full rounded-xl" />
          <Esqueleto className="h-28 w-full rounded-xl" />
        </div>
      ) : !erros.length ? (
        <Cartao>
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <Bug />
              </IlustracaoIcone>
            }
            titulo={t(vista === 'abertos' ? 'erros.vazioTitulo' : 'erros.vazioResolvidos')}
            texto={t('erros.vazioTexto')}
          />
        </Cartao>
      ) : (
        <div className="space-y-3">
          {erros.map((e) => (
            <Cartao key={e.assinatura} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-texto">{e.nome || 'Erro'}</span>
                    {e.fatal ? <Distintivo cor="perigo">{t('erros.ecraVerde')}</Distintivo> : null}
                    <Distintivo>{t('erros.vezes', { n: String(e.vezes) })}</Distintivo>
                    {e.pessoas ? <Distintivo>{t('erros.pessoas', { n: String(e.pessoas) })}</Distintivo> : null}
                  </div>
                  <p className="mt-1 break-words text-[14px] text-texto">{e.mensagem}</p>
                  <p className="mt-1 text-xs text-secundario">
                    {[e.ecra && t('erros.noEcra', { ecra: e.ecra }), e.versao && `v${e.versao}`, e.modelo].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-xs text-secundario" title={dataHora(e.ultima)}>
                    {t('erros.ultima', { quando: haQuanto(e.ultima) })} · {t('erros.primeira', { quando: dataHora(e.primeira) })}
                  </p>
                  {e.pilha ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-teal-escuro">{t('erros.pilha')}</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-fundo p-2 text-[11px] leading-snug text-secundario">{e.pilha}</pre>
                    </details>
                  ) : null}
                </div>
                {vista === 'abertos' ? (
                  <Botao tamanho="sm" variante="secundario" onClick={() => resolver(e)}>
                    <CircleCheck /> {t('erros.marcarResolvido')}
                  </Botao>
                ) : null}
              </div>
            </Cartao>
          ))}
        </div>
      )}
    </>
  );
}
