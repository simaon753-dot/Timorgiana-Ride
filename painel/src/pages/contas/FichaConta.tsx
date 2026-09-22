import { Link } from 'react-router';
import { KeyRound, Siren, Star } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { data, dataHora, dolares, haQuanto } from '@/lib/formato';
import type { RespostaContaDetalhe } from '@/types/api';
import { Gaveta } from '@/components/ui/janela';
import { Botao, variantesBotao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Avatar } from '@/components/ui/avatar';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro } from '@/components/ui/estados';
import { Dado, EstadoDaViagem, IconeVeiculo, PapelDaConta, Telefone } from '@/components/comuns';
import { useCodigoAcesso } from './CodigoAcesso';

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-borda py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-secundario">{titulo}</h3>
      {children}
    </section>
  );
}

// A FICHA DE UMA CONTA: tudo sobre uma pessoa num sítio só — o que se
// pergunta primeiro numa queixa ou numa disputa (aceitou os termos? quando?
// quantas viagens? quem a avaliou?).
export function FichaConta({ id, aoFechar }: { id: number | null; aoFechar: () => void }) {
  const { dados, erro, aCarregar, recarregar } = useDados<RespostaContaDetalhe | null>(
    () => (id ? api.conta(id) : Promise.resolve(null)),
    [id]
  );
  const codigo = useCodigoAcesso();
  const c = dados?.conta;
  const motorista = !!c?.driverStatus;
  const media = dados?.avaliacoes.length
    ? dados.avaliacoes.reduce((s, a) => s + a.estrelas, 0) / dados.avaliacoes.length
    : null;

  return (
    <>
      <Gaveta
        aberta={!!id}
        aoMudar={(a) => !a && aoFechar()}
        titulo={c ? (
          <span className="flex items-center gap-3">
            <Avatar nome={c.name} tamanho="lg" />
            <span className="min-w-0">
              <span className="block truncate">{c.name}</span>
              <span className="mt-1 block">
                <PapelDaConta u={{ isAdmin: !!c.isAdmin, driverStatus: c.driverStatus }} />
              </span>
            </span>
          </span>
        ) : (
          '…'
        )}
        rodape={
          c ? (
            <>
              {motorista ? (
                <Link to={`/aprovacoes?estado=${c.driverStatus}`} onClick={aoFechar} className={variantesBotao({ variante: 'secundario' })}>
                  {t('ficha.verCandidatura')}
                </Link>
              ) : null}
              <Botao onClick={() => codigo.pedir(c.id, c.name)}>
                <KeyRound /> {t('contas.gerarCodigo')}
              </Botao>
            </>
          ) : undefined
        }
      >
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar || !c || !dados ? (
          <div className="space-y-4" role="status" aria-label="A carregar">
            <Esqueleto className="h-4 w-1/2" />
            <Esqueleto className="h-4 w-2/3" />
            <Esqueleto className="h-32 w-full" />
          </div>
        ) : (
          <div>
            <Bloco titulo={t('ficha.informacao')}>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Dado rotulo={t('comum.telefone')}>
                  <Telefone numero={c.phone} />
                </Dado>
                <Dado rotulo={t('comum.email')}>
                  {c.email ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="break-all">{c.email}</span>
                      <Distintivo cor={c.emailConfirmado ? 'sucesso' : 'neutro'}>
                        {c.emailConfirmado ? t('cand.emailConfirmado') : t('cand.emailPorConfirmar')}
                      </Distintivo>
                    </span>
                  ) : (
                    '—'
                  )}
                </Dado>
                <Dado rotulo={t('ficha.desde')}>{data(c.desde)}</Dado>
                {/* O NOME ANTERIOR só aparece quando existe (22/09/2026).
                    Corrigir uma letra é legítimo e até há pouco era
                    impossível; num motorista aprovado, o nome é o que o
                    passageiro confere com a carta de condução, e a diferença
                    entre as duas coisas tem de se poder ver depois. */}
                {c.nomeAnterior ? (
                  <Dado rotulo={t('ficha.nomeAnterior')}>
                    <span title={c.nomeAlteradoEm ? dataHora(c.nomeAlteradoEm) : undefined}>
                      {c.nomeAnterior}
                      {c.nomeAlteradoEm ? ` · ${data(c.nomeAlteradoEm)}` : ''}
                    </span>
                  </Dado>
                ) : null}
                <Dado rotulo={t('comum.ultimaVez')}>
                  {c.online ? (
                    <Distintivo cor="sucesso" ponto>
                      {t('comum.online')}
                    </Distintivo>
                  ) : c.ultimaVez ? (
                    <span title={dataHora(c.ultimaVez)}>{haQuanto(c.ultimaVez)}</span>
                  ) : (
                    t('comum.nunca')
                  )}
                </Dado>
                <Dado rotulo={t('ficha.termosPassageiro')}>
                  {c.termos.passageiro ? t('cand.termosAceites', { v: c.termos.passageiro.versao, data: data(c.termos.passageiro.quando) }) : t('ficha.naoAceitou')}
                </Dado>
                {motorista ? (
                  <Dado rotulo={t('ficha.termosMotorista')}>
                    {c.termos.motorista ? t('cand.termosAceites', { v: c.termos.motorista.versao, data: data(c.termos.motorista.quando) }) : t('ficha.naoAceitou')}
                  </Dado>
                ) : null}
                {motorista ? (
                  <Dado rotulo={t('cand.cidadania')}>
                    {c.cidadaoTL
                      ? c.cidadaoTL.declarou
                        ? t('cand.cidadaniaDeclarou', { data: data(c.cidadaoTL.quando) })
                        : 'Declarou não ser cidadão'
                      : t('cand.cidadaniaNaoPerguntado')}
                  </Dado>
                ) : null}
              </dl>
            </Bloco>

            {motorista ? (
              <Bloco titulo={t('ficha.estadoConta')}>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Dado rotulo={t('comum.tipo')}>
                    <span className="inline-flex items-center gap-2">
                      <IconeVeiculo tipo={c.vehicle?.type} className="text-secundario" />
                      {tl('veiculo', c.vehicle?.type)} · {[c.vehicle?.model, c.vehicle?.color, c.vehicle?.plate].filter(Boolean).join(' · ')}
                    </span>
                  </Dado>
                  {c.decisao ? (
                    <Dado rotulo={t('ficha.decisao')}>
                      {data(c.decisao.quando)}
                      {c.decisao.motivo ? ` — ${c.decisao.motivo}` : ''}
                    </Dado>
                  ) : null}
                </dl>
              </Bloco>
            ) : null}

            {motorista ? (
              <Bloco titulo={t('ficha.taxaAcesso')}>
                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-teal-suave px-4 py-3">
                  <div>
                    <p className="numeros text-3xl font-bold text-teal-escuro">{c.dias}</p>
                    <p className="text-sm text-texto">{t('ficha.diasSaldo')}</p>
                  </div>
                  <Dado rotulo={t('ficha.referencia')}>
                    <span className="numeros font-semibold">{c.referencia}</span>
                  </Dado>
                </div>
                <p className="mt-2 text-xs text-secundario">{t('ficha.diasNota')}</p>
                <p className="mt-3 text-xs font-medium text-secundario">{t('ficha.pacotes')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.pacotes.map((p) => (
                    <Distintivo key={p.dias}>{t('ficha.pacote', { dias: p.dias, v: dolares(p.usd) })}</Distintivo>
                  ))}
                </div>
              </Bloco>
            ) : null}

            {motorista && dados.documentos.length ? (
              <Bloco titulo={t('ficha.documentos')}>
                <ul className="divide-y divide-borda rounded-xl border border-borda">
                  {dados.documentos.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span>{tl('documento', d.tipo)}</span>
                      <span className="flex items-center gap-2">
                        {d.porRever ? <Distintivo cor="aviso">{t('cand.porRever')}</Distintivo> : null}
                        <span className={d.caducado ? 'numeros font-semibold text-perigo' : 'numeros text-secundario'}>
                          {d.validade ? data(d.validade) : '—'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Bloco>
            ) : null}

            <Bloco titulo={t('ficha.historico')}>
              {dados.viagens.length ? (
                <ul className="divide-y divide-borda rounded-xl border border-borda">
                  {dados.viagens.map((v) => (
                    <li key={v.id}>
                      <Link
                        to={`/viagens?viagem=${v.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-teal-suave"
                      >
                        <span className="min-w-0">
                          <span className="numeros font-semibold">#{v.id}</span>{' '}
                          <span className="text-secundario">{v.papel === 'motorista' ? t('ficha.comoMotorista') : t('ficha.comoPassageiro')}</span>
                          <span className="block truncate text-xs text-secundario">
                            {v.origem || '—'} → {v.destino || '—'} · {data(v.quando)}
                          </span>
                        </span>
                        <EstadoDaViagem estado={v.estado} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secundario">{t('ficha.semViagens')}</p>
              )}
            </Bloco>

            <Bloco titulo={t('ficha.avaliacoes')}>
              {media != null ? (
                <>
                  <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
                    <Star className="size-4 fill-aviso text-aviso" aria-hidden />
                    {t('ficha.media', { m: media.toFixed(1), n: dados.avaliacoes.length })}
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {dados.avaliacoes.map((a, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-secundario">
                          {a.de} · {data(a.quando)}
                        </span>
                        <span className="numeros">{a.estrelas} ★</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-secundario">{t('ficha.semAvaliacoes')}</p>
              )}
            </Bloco>

            {dados.emergencias.length ? (
              <Bloco titulo={t('ficha.emergencias')}>
                <ul className="space-y-2">
                  {dados.emergencias.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Siren className="size-4 text-perigo" aria-hidden /> {tl('emergencia', s.tipo)} · {dataHora(s.quando)}
                      </span>
                      <Distintivo cor={s.resolvido ? 'sucesso' : 'perigo'}>{s.resolvido ? t('ficha.resolvido') : t('ficha.porResolver')}</Distintivo>
                    </li>
                  ))}
                </ul>
              </Bloco>
            ) : null}

            {motorista && dados.turnos.length ? (
              <Bloco titulo={t('ficha.turnos')}>
                <p className="text-sm">{t('ficha.turnosN', { n: dados.turnos.length })}</p>
              </Bloco>
            ) : null}
          </div>
        )}
      </Gaveta>
      {codigo.janelas}
    </>
  );
}
