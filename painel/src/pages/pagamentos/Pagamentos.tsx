import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays, Check, Clock, Eye, Gift, Hourglass, RefreshCw, Wallet, X } from 'lucide-react';
import { t, tl, type Chave } from '@/i18n';
import { api, caminhos } from '@/services/admin';
import { imagemProtegida } from '@/services/cliente';
import { useDados } from '@/hooks/useDados';
import { data, dataHora, dolares } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { PedidoPagamento, TipoVeiculo } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/cartao';
import { CartaoNumero } from '@/components/ui/cartao-numero';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { EsqueletoCartoes, EsqueletoTabela } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio, Faixa } from '@/components/ui/estados';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { Lupa } from '@/components/ui/imagem-protegida';
import { avisar } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { IconeVeiculo } from '@/components/comuns';
import { useServico } from '@/layouts/servico';

const COR_ESTADO = { pendente: 'coral', confirmado: 'sucesso', recusado: 'perigo', cancelado: 'neutro' } as const;

export function Pagamentos() {
  const resumo = useDados(() => api.resumoPagamentos(), []);
  const lista = useDados(() => api.pagamentos(), [], { aCada: 60_000 });
  const { recarregarNotificacoes } = useServico();
  const [confirmar, setConfirmar] = useState<PedidoPagamento | null>(null);
  const [recusar, setRecusar] = useState<PedidoPagamento | null>(null);
  const [lupa, setLupa] = useState<{ url: string; titulo: string } | null>(null);

  const r = resumo.dados;
  const pendentes = lista.dados?.pendentes ?? [];
  const prazo = lista.dados?.prazoHoras ?? 24;
  const atrasados = pendentes.filter((p) => p.horas >= prazo).length;

  const recarregarTudo = () => {
    resumo.recarregar();
    lista.recarregar();
    recarregarNotificacoes();
  };

  const abrirComprovativo = async (p: PedidoPagamento) => {
    const url = await imagemProtegida(caminhos.comprovativo(p.id));
    if (url) setLupa({ url, titulo: `${p.referencia ?? ''} · ${p.nome} · ${dolares(p.valorUsd)}` });
    else avisar.erro(t('pag.semComprovativo'));
  };

  return (
    <>
      <CabecalhoPagina
        titulo={t('pag.titulo')}
        descricao={t('pag.descricao')}
        acoes={
          <Botao variante="secundario" onClick={recarregarTudo}>
            <RefreshCw className={cn((lista.aAtualizar || resumo.aAtualizar) && 'animate-spin')} /> {t('comum.atualizar')}
          </Botao>
        }
      />

      {r?.emPeriodoGratuito ? (
        <Faixa cor="teal" icone={<Gift />} className="mb-6" titulo={t('pag.gratuitoTitulo', { d: data(r.gratuitoAte) })}>
          {t('pag.gratuitoTexto', { c: data(r.comprasAbrem) })}
        </Faixa>
      ) : null}

      {resumo.aCarregar ? (
        <EsqueletoCartoes />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoNumero
            icone={<Wallet />}
            cor="teal"
            valor={r ? dolares(r.total) : null}
            formatar={false}
            rotulo={t('pag.receitaTotal')}
            nota={r ? (r.devolvido ? t('pag.devolvido', { v: dolares(r.devolvido) }) : t('pag.carregamentosN', { n: r.carregamentos })) : undefined}
          />
          <CartaoNumero icone={<CalendarDays />} cor="azul" valor={r ? dolares(r.mes) : null} formatar={false} rotulo={t('pag.receitaMes')} />
          <CartaoNumero icone={<Clock />} cor="neutro" valor={r ? dolares(r.hoje) : null} formatar={false} rotulo={t('pag.receitaHoje')} />
          <CartaoNumero
            icone={<Hourglass />}
            cor="coral"
            valor={lista.dados ? pendentes.length : null}
            rotulo={t('pag.porConfirmar')}
            nota={atrasados ? t('pag.atrasados', { n: atrasados, h: prazo }) : undefined}
          />
        </div>
      )}

      <Cartao className="mt-6 overflow-hidden">
        <CartaoCabecalho>
          <div>
            <CartaoTitulo>{t('pag.pendentesTitulo')}</CartaoTitulo>
            <CartaoDescricao className="max-w-3xl">{t('pag.pendentesNota', { h: prazo })}</CartaoDescricao>
          </div>
        </CartaoCabecalho>
        {lista.erro && !lista.dados ? (
          <EstadoErro mensagem={lista.erro} aoTentar={lista.recarregar} />
        ) : lista.aCarregar ? (
          <EsqueletoTabela colunas={6} linhas={3} />
        ) : !pendentes.length ? (
          <EstadoVazio
            compacto
            ilustracao={
              <IlustracaoIcone>
                <Check />
              </IlustracaoIcone>
            }
            titulo={t('pag.vazioTitulo')}
            texto={t('pag.vazioTexto')}
          />
        ) : (
          <Tabela>
            <TCabeca>
              <tr>
                <TTitulo>{t('pag.colMotorista')}</TTitulo>
                <TTitulo>{t('pag.colPacote')}</TTitulo>
                <TTitulo className="hidden md:table-cell">{t('pag.colForma')}</TTitulo>
                <TTitulo>{t('pag.colReferencia')}</TTitulo>
                <TTitulo>{t('pag.colEspera')}</TTitulo>
                <TTitulo className="text-right">{t('comum.acoes')}</TTitulo>
              </tr>
            </TCabeca>
            <TCorpo>
              {pendentes.map((p) => (
                <TLinha key={p.id}>
                  <TCelula>
                    <Link to={`/contas?conta=${p.userId}`} className="font-semibold hover:underline">
                      {p.nome}
                    </Link>
                    <p className="numeros text-xs text-secundario">{p.telefone}</p>
                  </TCelula>
                  <TCelula className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <IconeVeiculo tipo={p.tipo as TipoVeiculo} className="text-secundario" />
                      {t('pag.pacote', { dias: p.dias })}
                    </span>
                    <p className="numeros font-semibold">{dolares(p.valorUsd)}</p>
                  </TCelula>
                  <TCelula className="hidden md:table-cell">{tl('forma', p.metodo)}</TCelula>
                  <TCelula className="numeros font-semibold tracking-wide">{p.referencia ?? '—'}</TCelula>
                  <TCelula className="whitespace-nowrap">
                    <Distintivo cor={p.horas >= prazo ? 'perigo' : 'aviso'}>{t('pag.haHoras', { h: p.horas })}</Distintivo>
                  </TCelula>
                  <TCelula className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      {p.temComprovativo ? (
                        <Botao variante="secundario" tamanho="sm" onClick={() => abrirComprovativo(p)}>
                          <Eye /> {t('pag.verComprovativo')}
                        </Botao>
                      ) : null}
                      <Botao variante="perigoContorno" tamanho="sm" onClick={() => setRecusar(p)}>
                        <X /> {t('pag.recusar')}
                      </Botao>
                      <Botao tamanho="sm" onClick={() => setConfirmar(p)}>
                        <Check /> {t('pag.confirmar')}
                      </Botao>
                    </div>
                  </TCelula>
                </TLinha>
              ))}
            </TCorpo>
          </Tabela>
        )}
      </Cartao>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Cartao className="overflow-hidden">
          <CartaoCabecalho>
            <CartaoTitulo>{t('pag.decididosTitulo')}</CartaoTitulo>
          </CartaoCabecalho>
          {lista.aCarregar ? (
            <EsqueletoTabela colunas={3} linhas={3} />
          ) : lista.dados?.decididos.length ? (
            <ul className="divide-y divide-borda">
              {lista.dados.decididos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.nome} · {t('pag.pacote', { dias: p.dias })} · <span className="numeros">{dolares(p.valorUsd)}</span>
                    </p>
                    <p className="truncate text-xs text-secundario">
                      {p.decididoEm ? dataHora(p.decididoEm) : '—'}
                      {p.decididoPor ? ` · ${p.decididoPor}` : ''}
                      {p.motivo ? ` · ${p.motivo}` : ''}
                    </p>
                  </div>
                  <Distintivo cor={COR_ESTADO[p.estado]}>{t(`pag.estado.${p.estado}` as Chave)}</Distintivo>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-center text-sm text-secundario">{t('pag.semDecididos')}</p>
          )}
        </Cartao>

        <Cartao className="overflow-hidden">
          <CartaoCabecalho>
            <div>
              <CartaoTitulo>{t('pag.carregamentosTitulo')}</CartaoTitulo>
              <CartaoDescricao>{t('pag.carregamentosNota')}</CartaoDescricao>
            </div>
          </CartaoCabecalho>
          {resumo.aCarregar ? (
            <EsqueletoTabela colunas={3} linhas={3} />
          ) : r?.ultimos.length ? (
            <ul className="divide-y divide-borda">
              {r.ultimos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.nome ?? '—'} · {t('pag.pacote', { dias: c.dias })}
                    </p>
                    <p className="truncate text-xs text-secundario">
                      {dataHora(c.quando)} · {tl('forma', c.metodo)}
                      {c.por ? ` · ${c.por}` : ''}
                    </p>
                  </div>
                  <span className="numeros font-semibold">{dolares(c.valorUsd)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-center text-sm text-secundario">{t('pag.semCarregamentos')}</p>
          )}
        </Cartao>
      </div>

      {r ? (
        <Cartao className="mt-6">
          <CartaoCabecalho>
            <div>
              <CartaoTitulo>{t('pag.pacotesTitulo')}</CartaoTitulo>
              <CartaoDescricao>{t('pag.pacotesNota')}</CartaoDescricao>
            </div>
          </CartaoCabecalho>
          <CartaoConteudo className="grid gap-4 md:grid-cols-3">
            {(['motorbike', 'car', 'carry'] as TipoVeiculo[]).map((tipo) => (
              <div key={tipo} className="rounded-xl border border-borda p-4">
                <p className="mb-3 inline-flex items-center gap-2 font-semibold">
                  <IconeVeiculo tipo={tipo} className="text-teal" /> {tl('veiculo', tipo)}
                </p>
                <ul className="space-y-2">
                  {(r.pacotes[tipo] ?? []).map((p) => (
                    <li key={p.dias} className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{t('pag.pacote', { dias: p.dias })}</span>
                      <span className="text-right">
                        <span className="numeros font-semibold">{dolares(p.usd)}</span>
                        <span className="numeros block text-xs text-secundario">{t('pag.porDia', { v: dolares(p.usd / p.dias) })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CartaoConteudo>
        </Cartao>
      ) : null}

      <Lupa url={lupa?.url ?? null} titulo={lupa?.titulo ?? ''} aoFechar={() => setLupa(null)} />

      <DialogoConfirmacao
        aberto={!!confirmar}
        aoMudar={(v) => !v && setConfirmar(null)}
        titulo={t('pag.confirmarTitulo')}
        texto={
          confirmar
            ? t('pag.confirmarTexto', { ref: confirmar.referencia ?? '—', v: dolares(confirmar.valorUsd), dias: confirmar.dias, nome: confirmar.nome })
            : undefined
        }
        rotuloConfirmar={t('pag.confirmar')}
        aoConfirmar={async () => {
          if (!confirmar) return;
          await api.confirmarPagamento(confirmar.id);
          avisar.sucesso(t('pag.confirmado'), t('pag.confirmadoDesc', { dias: confirmar.dias, nome: confirmar.nome }));
          recarregarTudo();
        }}
      />

      <DialogoConfirmacao
        aberto={!!recusar}
        aoMudar={(v) => !v && setRecusar(null)}
        titulo={t('pag.recusarTitulo')}
        texto={t('pag.recusarTexto')}
        rotuloConfirmar={t('pag.recusar')}
        perigo
        pedirMotivo
        rotuloMotivo={t('pag.motivoRecusa')}
        sugestoes={[t('pag.motivoNaoEncontrado'), t('pag.motivoValor'), t('pag.motivoReferencia'), t('pag.motivoIlegivel')]}
        aoConfirmar={async (motivo) => {
          if (!recusar) return;
          await api.recusarPagamento(recusar.id, motivo);
          avisar.sucesso(t('pag.recusado'));
          recarregarTudo();
        }}
      />
      <span className="sr-only" aria-live="polite">
        {pendentes.length ? `${pendentes.length} ${t('pag.porConfirmar')}` : ''}
      </span>
    </>
  );
}
