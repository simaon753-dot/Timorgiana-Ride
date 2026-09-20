import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api, caminhos } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora, dolares, hora } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EventoViagem, RespostaViagemDetalhe } from '@/types/api';
import { Gaveta } from '@/components/ui/janela';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro } from '@/components/ui/estados';
import { ImagemProtegida, Lupa } from '@/components/ui/imagem-protegida';
import { Distintivo } from '@/components/ui/distintivo';
import { Dado, EstadoDaViagem, IconeVeiculo, Telefone } from '@/components/comuns';
import type { PontoMapa } from '@/components/mapa/MapaViagem';

const MapaViagem = lazy(() => import('@/components/mapa/MapaViagem'));

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-borda py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-secundario">{titulo}</h3>
      {children}
    </section>
  );
}

// A hora de um passo: o primeiro evento com esse nome.
const quando = (eventos: EventoViagem[], que: string) => eventos.find((e) => e.que === que)?.quando ?? null;

export function DetalheViagem({ id, aoFechar }: { id: number | null; aoFechar: () => void }) {
  const { dados, erro, aCarregar, recarregar } = useDados<RespostaViagemDetalhe | null>(
    () => (id ? api.viagem(id) : Promise.resolve(null)),
    [id]
  );
  const [lupa, setLupa] = useState<string | null>(null);

  const v = dados?.viagem;
  const eventos = dados?.eventos ?? [];

  const pontos = useMemo<PontoMapa[]>(() => {
    if (!v) return [];
    const lista: PontoMapa[] = [];
    if (v.origem.lat != null && v.origem.lng != null) lista.push({ lat: v.origem.lat, lng: v.origem.lng, tipo: 'origem', nome: v.origem.nome });
    for (const p of v.paragens) if (p.lat != null && p.lng != null) lista.push({ lat: p.lat, lng: p.lng, tipo: 'paragem', nome: p.nome });
    if (v.destino.lat != null && v.destino.lng != null) lista.push({ lat: v.destino.lat, lng: v.destino.lng, tipo: 'destino', nome: v.destino.nome });
    return lista;
  }, [v]);

  const semMotorista = v?.estado === 'cancelled' && !v.motorista;

  return (
    <Gaveta
      aberta={!!id}
      aoMudar={(a) => !a && aoFechar()}
      titulo={id ? t('det.titulo', { n: id }) : ''}
      descricao={
        v ? (
          <span className="flex flex-wrap items-center gap-2">
            <EstadoDaViagem estado={v.estado} semMotorista={semMotorista} />
            <span className="inline-flex items-center gap-1.5">
              <IconeVeiculo tipo={v.veiculo} /> {tl('veiculo', v.veiculo)}
            </span>
            <span>· {dataHora(v.pedida)}</span>
          </span>
        ) : undefined
      }
    >
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar || !v ? (
        <div className="space-y-4" role="status" aria-label="A carregar">
          <Esqueleto className="h-64 w-full rounded-xl" />
          <Esqueleto className="h-4 w-2/3" />
          <Esqueleto className="h-4 w-1/2" />
          <Esqueleto className="h-24 w-full" />
        </div>
      ) : (
        <div>
          <Bloco titulo={t('det.percurso')}>
            {pontos.length ? (
              <Suspense fallback={<Esqueleto className="h-64 w-full rounded-xl" />}>
                <MapaViagem pontos={pontos} />
              </Suspense>
            ) : null}
            <p className="mt-2 text-xs text-secundario">{t('det.mapaNota')}</p>
            <ol className="mt-4 space-y-3">
              <li className="flex gap-3">
                <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-white bg-teal ring-1 ring-teal" aria-hidden />
                <Dado rotulo={t('det.origem')}>{v.origem.nome || '—'}</Dado>
              </li>
              {v.paragens.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-white bg-secundario ring-1 ring-secundario" aria-hidden />
                  <Dado rotulo={t('det.paragem')}>{p.nome || '—'}</Dado>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-white bg-coral ring-1 ring-coral" aria-hidden />
                <Dado rotulo={t('det.destino')}>{v.destino.nome || '—'}</Dado>
              </li>
            </ol>
            <dl className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-fundo px-4 py-3">
              <Dado rotulo={t('det.preco')}>
                <span className="numeros font-semibold">{dolares(v.preco)}</span>
              </Dado>
              <Dado rotulo={t('det.distancia')}>
                <span className="numeros">{v.km != null ? `${v.km} km` : '—'}</span>
              </Dado>
              <Dado rotulo={t('det.duracao')}>
                <span className="numeros">{v.min != null ? `${v.min} min` : '—'}</span>
              </Dado>
            </dl>
          </Bloco>

          <Bloco titulo={t('det.pessoas')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dado rotulo={t('det.passageiro')}>
                <Link to={`/contas?conta=${v.passageiro.id}`} className="font-semibold text-texto hover:underline">
                  {v.passageiro.nome}
                </Link>
                <span className="block">
                  <Telefone numero={v.passageiro.telefone} />
                </span>
              </Dado>
              <Dado rotulo={t('det.motorista')}>
                {v.motorista ? (
                  <>
                    <Link to={`/contas?conta=${v.motorista.id}`} className="font-semibold text-texto hover:underline">
                      {v.motorista.nome}
                    </Link>
                    <span className="block">
                      <Telefone numero={v.motorista.telefone} />
                    </span>
                    <span className="mt-1 block text-xs text-secundario">
                      {[v.motorista.veiculo.modelo, v.motorista.veiculo.cor, v.motorista.veiculo.matricula].filter(Boolean).join(' · ')}
                    </span>
                  </>
                ) : (
                  <span className="text-secundario">{t('det.semMotorista')}</span>
                )}
              </Dado>
            </dl>
          </Bloco>

          <Bloco titulo={t('det.horas')}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Dado rotulo={t('det.solicitada')}>
                <span className="numeros">{hora(v.pedida)}</span>
              </Dado>
              <Dado rotulo={t('det.aceite')}>
                <span className="numeros">{hora(quando(eventos, 'aceite'))}</span>
              </Dado>
              <Dado rotulo={t('det.iniciada')}>
                <span className="numeros">{hora(v.comecou ?? quando(eventos, 'comecou'))}</span>
              </Dado>
              <Dado rotulo={v.estado === 'cancelled' ? t('det.cancelada') : t('det.concluida')}>
                <span className="numeros">{hora(quando(eventos, v.estado === 'cancelled' ? 'cancelada' : 'terminou'))}</span>
              </Dado>
            </dl>
            {v.codigoRecolha ? (
              <p className="mt-3 text-sm">
                {t('det.codigoRecolha')}: <span className="numeros font-bold tracking-widest">{v.codigoRecolha}</span>
              </p>
            ) : null}
          </Bloco>

          {v.cancelamento || semMotorista ? (
            <Bloco titulo={t('det.cancelamento')}>
              <p className="text-sm">
                {v.cancelamento
                  ? t('det.canceladaPor', { quem: v.cancelamento.quem, nome: v.cancelamento.por ?? '—' })
                  : tl('cancelamento', 'sem_motorista')}
              </p>
              {v.cancelamento?.motivo ? <p className="mt-1 text-sm text-secundario">{tl('cancelamento', v.cancelamento.motivo)}</p> : null}
            </Bloco>
          ) : null}

          {v.carga ? (
            <Bloco titulo={t('det.carga')}>
              <p className="text-sm font-medium">
                {v.carga.tipos.map((x) => tl('carga', x)).join(', ')}
                {v.carga.volume ? ` · ${tl('volume', v.carga.volume)}` : ''}
              </p>
              {v.carga.ajuda && v.carga.ajuda !== 'nenhuma' ? <p className="text-sm text-secundario">{tl('ajuda', v.carga.ajuda)}</p> : null}
              {v.carga.notas ? <p className="mt-1 text-sm text-secundario">«{v.carga.notas}»</p> : null}
              {v.carga.declaradoEm ? (
                <p className="mt-1 text-xs text-secundario">{t('det.cargaDeclarada', { data: dataHora(v.carga.declaradoEm) })}</p>
              ) : null}
              {v.carga.fotos ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Array.from({ length: v.carga.fotos }).map((_, i) => (
                    <ImagemProtegida
                      key={i}
                      caminho={caminhos.fotoCarga(v.id, i)}
                      alt={`Carga ${i + 1}`}
                      className="aspect-[4/3]"
                      aoAbrir={setLupa}
                    />
                  ))}
                </div>
              ) : null}
            </Bloco>
          ) : null}

          {v.jastip ? (
            <Bloco titulo={t('det.encomenda')}>
              <p className="text-xs text-secundario">{t('det.encomendaLista')}</p>
              {/* Artigo a artigo quando os há; as encomendas de antes de
                  21/09/2026 só têm o texto que a pessoa escreveu. */}
              {v.jastip.itens?.length ? (
                <ul className="mt-1 space-y-1">
                  {v.jastip.itens.map((i, n) => (
                    <li key={n} className="flex gap-2 text-sm">
                      <span className="numeros font-semibold text-teal-escuro">{i.quantos}×</span>
                      <span>
                        {i.nome}
                        {i.detalhe ? <span className="text-secundario"> · {i.detalhe}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 whitespace-pre-line text-sm">«{v.jastip.lista}»</p>
              )}
              {v.jastip.loja ? (
                <p className="mt-2 text-sm">
                  <span className="text-xs text-secundario">{t('det.encomendaLoja')}: </span>
                  {v.jastip.loja}
                </p>
              ) : null}
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Dado rotulo={t('det.encomendaTeto')}>
                  <span className="numeros">{dolares(v.jastip.teto)}</span>
                </Dado>
                <Dado rotulo={t('det.encomendaTaxa')}>
                  <span className="numeros">{dolares(v.jastip.taxa)}</span>
                </Dado>
                <Dado rotulo={t('det.encomendaCompras')}>
                  <span className="numeros">{v.jastip.compras == null ? '—' : dolares(v.jastip.compras)}</span>
                </Dado>
                <Dado rotulo={t('det.encomendaTotal')}>
                  <span className="numeros font-semibold">{v.jastip.total == null ? '—' : dolares(v.jastip.total)}</span>
                </Dado>
              </dl>
              <p className="mt-2 text-xs text-secundario">
                {v.jastip.compradoEm ? t('det.encomendaComprada', { data: dataHora(v.jastip.compradoEm) }) : t('det.encomendaPorComprar')}
              </p>
              {/* O TALÃO é a prova de quanto saiu do bolso do motorista, e por
                  isso mostra-se aqui e não entre as fotografias da carga: numa
                  encomenda não há carga nenhuma. */}
              {v.jastip.fotos ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Array.from({ length: v.jastip.fotos }).map((_, i) => (
                    <ImagemProtegida
                      key={i}
                      caminho={caminhos.fotoCarga(v.id, i)}
                      alt={`${t('det.encomendaTalao')} ${i + 1}`}
                      className="aspect-[4/3]"
                      aoAbrir={setLupa}
                    />
                  ))}
                </div>
              ) : null}
            </Bloco>
          ) : null}

          <Bloco titulo={t('det.cronologia')}>
            <ol className="relative space-y-4 border-l border-borda pl-5">
              {eventos.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[26px] top-1 size-3 rounded-full border-2 border-white ring-1',
                      e.que === 'cancelada' || e.que === 'sos' ? 'bg-perigo ring-perigo' : e.que === 'terminou' ? 'bg-sucesso ring-sucesso' : 'bg-teal ring-teal'
                    )}
                    aria-hidden
                  />
                  <p className="text-sm font-medium">{tl('evento', e.que)}</p>
                  <p className="text-xs text-secundario">
                    <span className="numeros">{dataHora(e.quando)}</span>
                    {e.quem ? ` · ${e.quem}` : ''}
                    {e.preco != null ? ` · ${dolares(e.preco)}` : ''}
                  </p>
                </li>
              ))}
            </ol>
            {v.nMensagens ? <p className="mt-4 text-xs text-secundario">{t('det.mensagens', { n: v.nMensagens })}</p> : null}
          </Bloco>

          <Bloco titulo={t('det.avaliacoes')}>
            {v.avaliacoes.length ? (
              <ul className="space-y-2">
                {v.avaliacoes.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {a.de} → {a.para}
                    </span>
                    <Distintivo cor="aviso" aria-label={t('det.estrelas', { n: a.estrelas })}>
                      <Star className="size-3 fill-current" aria-hidden /> {a.estrelas}
                    </Distintivo>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secundario">{t('det.semAvaliacoes')}</p>
            )}
          </Bloco>
        </div>
      )}
      <Lupa url={lupa} titulo={t('det.carga')} aoFechar={() => setLupa(null)} />
    </Gaveta>
  );
}
