import { useState } from 'react';
import { Link } from 'react-router';
import { Flag, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora, dolares, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoOcorrencia, Ocorrencia } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao, variantesBotao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio } from '@/components/ui/estados';
import { Segmentos } from '@/components/ui/segmentos';
import { AreaTexto, Rotulo, Selecao } from '@/components/ui/campo';
import {
  Janela,
  JanelaConteudo,
  JanelaCabecalho,
  JanelaTitulo,
  JanelaDescricao,
  JanelaCorpo,
  JanelaRodape,
} from '@/components/ui/janela';
import { avisar } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { Dado, Telefone } from '@/components/comuns';
import { useServico } from '@/layouts/servico';

// AS OCORRÊNCIAS — o que foi reportado na app a partir de uma viagem
// (27/09/2026). Ver `backend/src/ocorrencias.js`.
//
// Cada cartão traz a viagem inteira como estava no dia da queixa: quem
// viajava, quem conduzia, a matrícula, o percurso e o preço. Quem trata não
// tem de ir procurar nada para perceber de que se fala.
const COR_DO_ESTADO: Record<EstadoOcorrencia, 'coral' | 'aviso' | 'sucesso' | 'neutro'> = {
  aberta: 'coral',
  em_analise: 'aviso',
  resolvida: 'sucesso',
  arquivada: 'neutro',
};
const ESTADOS: EstadoOcorrencia[] = ['aberta', 'em_analise', 'resolvida', 'arquivada'];

export function Ocorrencias() {
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas');
  const { dados, erro, aCarregar, aAtualizar, recarregar } = useDados(() => api.ocorrencias(filtro), [filtro], {
    aCada: 60_000,
  });
  const [aTratar, setATratar] = useState<Ocorrencia | null>(null);
  const lista = dados?.ocorrencias ?? [];

  return (
    <>
      <CabecalhoPagina
        titulo={t('ocor.titulo')}
        descricao={t('ocor.descricao')}
        acoes={
          <Botao variante="secundario" onClick={recarregar}>
            <RefreshCw className={cn(aAtualizar && 'animate-spin')} /> {t('comum.atualizar')}
          </Botao>
        }
      />

      <Segmentos
        className="mb-6"
        rotulo={t('ocor.filtro')}
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          { valor: 'abertas', rotulo: t('ocor.abertas') },
          { valor: 'todas', rotulo: t('ocor.todas') },
        ]}
      />

      {erro && !dados ? (
        <Cartao>
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        </Cartao>
      ) : aCarregar ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Cartao key={i} className="space-y-3 p-6">
              <Esqueleto className="h-5 w-48" />
              <Esqueleto className="h-4 w-full" />
              <Esqueleto className="h-4 w-2/3" />
            </Cartao>
          ))}
        </div>
      ) : !lista.length ? (
        <Cartao>
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <ShieldCheck />
              </IlustracaoIcone>
            }
            titulo={t('ocor.vazioTitulo')}
            texto={t('ocor.vazioTexto')}
          />
        </Cartao>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {lista.map((o) => (
            <li key={o.id}>
              <CartaoOcorrencia o={o} aoTratar={() => setATratar(o)} />
            </li>
          ))}
        </ul>
      )}

      <JanelaTratar ocorrencia={aTratar} aoFechar={() => setATratar(null)} aoGuardar={recarregar} />
    </>
  );
}

function CartaoOcorrencia({ o, aoTratar }: { o: Ocorrencia; aoTratar: () => void }) {
  const v = o.viagem;
  const veiculo = v.motorista ? [v.motorista.modelo, v.motorista.cor, v.motorista.matricula].filter(Boolean).join(' · ') : '';
  return (
    <Cartao className={cn('overflow-hidden', o.grave && 'border-perigo/30')}>
      <div
        className={cn(
          'flex items-start gap-4 border-b px-6 py-4',
          o.grave ? 'border-perigo/15 bg-perigo-claro/60' : 'border-borda bg-fundo/50'
        )}
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            o.grave ? 'bg-perigo text-white' : 'bg-coral-claro text-coral-texto'
          )}
        >
          <Flag className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-texto">{tl('ocorrencia', o.categoria)}</p>
          <p className="mt-0.5 text-sm text-secundario">
            {haQuanto(o.criadaEm)} · {dataHora(o.criadaEm)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Distintivo cor={COR_DO_ESTADO[o.estado]} ponto>
            {tl('ocorrenciaEstado', o.estado)}
          </Distintivo>
          {o.grave ? <Distintivo cor="perigo">{t('ocor.grave')}</Distintivo> : null}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
        <Dado rotulo={t('ocor.reportadaPor')}>
          <span className="font-semibold">{o.autor ?? '—'}</span>{' '}
          <span className="text-secundario">
            ({o.papelAutor === 'driver' ? t('ocor.papelMotorista') : t('ocor.papelPassageiro')})
          </span>
          <div>
            <Telefone numero={o.autorTelefone} />
          </div>
        </Dado>
        <Dado rotulo={t('ocor.quando')}>{dataHora(v.pedidaEm)}</Dado>
        <Dado rotulo={t('ocor.passageiro')}>
          <span className="font-semibold">{v.passageiro?.nome ?? '—'}</span>
          <div>
            <Telefone numero={v.passageiro?.telefone} />
          </div>
        </Dado>
        <Dado rotulo={t('ocor.motorista')}>
          <span className="font-semibold">{v.motorista?.nome ?? '—'}</span>
          <div>
            <Telefone numero={v.motorista?.telefone} />
          </div>
        </Dado>
        {veiculo ? <Dado rotulo={t('ocor.veiculo')}>{veiculo}</Dado> : null}
        <Dado rotulo={t('ocor.preco')}>
          <span className="numeros">{dolares(v.precoUsd)}</span>
          {v.km != null ? <span className="text-secundario"> · {v.km} km</span> : null}
        </Dado>
        <Dado rotulo={t('ocor.percurso')} className="sm:col-span-2">
          {v.origem?.rotulo ?? '—'} → {v.destino?.rotulo ?? '—'}
        </Dado>
        <Dado rotulo={t('ocor.oQueEscreveu')} className="sm:col-span-2">
          {o.descricao ? (
            <span className="whitespace-pre-wrap">{o.descricao}</span>
          ) : (
            <span className="text-secundario">{t('ocor.semDescricao')}</span>
          )}
        </Dado>
        {o.resposta ? (
          <Dado rotulo={t('ocor.resposta')} className="sm:col-span-2">
            <span className="whitespace-pre-wrap">{o.resposta}</span>
          </Dado>
        ) : null}
        {o.notaInterna ? (
          <Dado rotulo={t('ocor.notaInterna')} className="sm:col-span-2">
            <span className="whitespace-pre-wrap">{o.notaInterna}</span>
          </Dado>
        ) : null}
      </dl>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borda bg-fundo/50 px-6 py-3">
        {o.tratadaPor && o.tratadaEm ? (
          <span className="mr-auto text-xs text-secundario">
            {t('ocor.tratadaPor', { quem: o.tratadaPor, quando: dataHora(o.tratadaEm) })}
          </span>
        ) : null}
        {o.rideId ? (
          <Link to={`/viagens?viagem=${o.rideId}`} className={variantesBotao({ variante: 'secundario' })}>
            <Route /> {t('ocor.verViagem', { n: o.rideId })}
          </Link>
        ) : null}
        <Botao onClick={aoTratar}>{t('ocor.tratar')}</Botao>
      </div>
    </Cartao>
  );
}

function JanelaTratar({
  ocorrencia,
  aoFechar,
  aoGuardar,
}: {
  ocorrencia: Ocorrencia | null;
  aoFechar: () => void;
  aoGuardar: () => void;
}) {
  const { recarregarNotificacoes } = useServico();
  const [estado, setEstado] = useState<EstadoOcorrencia>('em_analise');
  const [resposta, setResposta] = useState('');
  const [nota, setNota] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);

  // Cada vez que abre para uma ocorrência, começa do que ela já tem.
  if (ocorrencia && aberta !== ocorrencia.id) {
    setAberta(ocorrencia.id);
    setEstado(ocorrencia.estado === 'aberta' ? 'em_analise' : ocorrencia.estado);
    setResposta(ocorrencia.resposta ?? '');
    setNota(ocorrencia.notaInterna ?? '');
  }
  if (!ocorrencia && aberta !== null) setAberta(null);

  async function guardar() {
    if (!ocorrencia) return;
    setAGuardar(true);
    try {
      await api.tratarOcorrencia(ocorrencia.id, { estado, resposta, notaInterna: nota });
      avisar.sucesso(t('ocor.guardado'));
      aoFechar();
      aoGuardar();
      recarregarNotificacoes();
    } catch (e) {
      avisar.erro(e instanceof Error ? e.message : String(e));
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <Janela open={!!ocorrencia} onOpenChange={(v) => !v && aoFechar()}>
      <JanelaConteudo largura="md">
        <JanelaCabecalho>
          <JanelaTitulo>{t('ocor.tratarTitulo')}</JanelaTitulo>
          <JanelaDescricao>{t('ocor.tratarTexto')}</JanelaDescricao>
        </JanelaCabecalho>
        <JanelaCorpo className="space-y-4">
          <div>
            <Rotulo htmlFor="ocor-estado">{t('ocor.estado')}</Rotulo>
            <Selecao id="ocor-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoOcorrencia)}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {tl('ocorrenciaEstado', s)}
                </option>
              ))}
            </Selecao>
          </div>
          <div>
            <Rotulo htmlFor="ocor-resposta">{t('ocor.respostaCampo')}</Rotulo>
            <AreaTexto
              id="ocor-resposta"
              rows={3}
              maxLength={1000}
              value={resposta}
              placeholder={t('ocor.respostaDica')}
              onChange={(e) => setResposta(e.target.value)}
            />
          </div>
          <div>
            <Rotulo htmlFor="ocor-nota">{t('ocor.notaCampo')}</Rotulo>
            <AreaTexto
              id="ocor-nota"
              rows={3}
              maxLength={1000}
              value={nota}
              placeholder={t('ocor.notaDica')}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
        </JanelaCorpo>
        <JanelaRodape>
          <Botao variante="secundario" onClick={aoFechar}>
            {t('comum.cancelar')}
          </Botao>
          <Botao onClick={guardar} disabled={aGuardar}>
            {t('ocor.guardar')}
          </Botao>
        </JanelaRodape>
      </JanelaConteudo>
    </Janela>
  );
}
