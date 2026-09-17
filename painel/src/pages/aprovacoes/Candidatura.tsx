import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, CircleX, ExternalLink, FileWarning, Info, TriangleAlert } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api, caminhos } from '@/services/admin';
import { data, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { Motorista, RespostaContaDetalhe } from '@/types/api';
import { Janela, JanelaConteudo, JanelaCabecalho, JanelaTitulo, JanelaDescricao, JanelaCorpo, JanelaRodape } from '@/components/ui/janela';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Avatar } from '@/components/ui/avatar';
import { Esqueleto } from '@/components/ui/esqueleto';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { ImagemProtegida, Lupa } from '@/components/ui/imagem-protegida';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { Dado, EstadoDoMotorista, IconeVeiculo, Telefone } from '@/components/comuns';
import { TIPOS_DOCUMENTO, documentoSuspeito, porTipo, resumoVerificacao, type NivelVerificacao } from './verificar';

type Acao = null | 'aprovarMesmoAssim' | 'recusar' | 'suspender';

const ICONE_NIVEL: Record<NivelVerificacao, typeof CircleCheck> = { ok: CircleCheck, no: CircleX, duvida: TriangleAlert };
const COR_NIVEL: Record<NivelVerificacao, string> = { ok: 'text-sucesso', no: 'text-perigo', duvida: 'text-aviso' };

function Seccao({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <section className="rounded-xl border border-borda p-5">
      <h3 className="text-[15px] font-semibold text-texto">{titulo}</h3>
      {nota ? <p className="mt-0.5 text-xs text-secundario">{nota}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Candidatura({
  motorista,
  aoFechar,
  aoDecidir,
  aoMudarDocumento,
}: {
  motorista: Motorista | null;
  aoFechar: () => void;
  aoDecidir: () => void;
  aoMudarDocumento: () => void;
}) {
  const [acao, setAcao] = useState<Acao>(null);
  const [aAprovar, setAAprovar] = useState(false);
  const [lupa, setLupa] = useState<{ url: string; titulo: string } | null>(null);
  const [conta, setConta] = useState<RespostaContaDetalhe | null>(null);
  const [revistos, setRevistos] = useState<number[]>([]);

  // A declaração de cidadania e os termos vêm da ficha completa da conta.
  // Pede-se ao abrir: quem aprova tem de ler "declarou ser cidadão" com a
  // fotografia do bilhete de identidade no mesmo ecrã.
  useEffect(() => {
    setConta(null);
    setRevistos([]);
    if (!motorista) return;
    let vivo = true;
    api.conta(motorista.id).then((r) => vivo && setConta(r)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [motorista]);

  if (!motorista) return null;
  const d = motorista;
  const v = resumoVerificacao(d);
  const docs = porTipo(d.documents);
  const nome = d.name;

  const decidir = async (decision: 'approved' | 'rejected' | 'suspended', motivo?: string) => {
    await api.decidir(d.id, decision, motivo);
    if (decision === 'approved') {
      avisar.sucesso(d.driverStatus === 'suspended' ? t('cand.reativado') : t('cand.aprovado'), t('cand.aprovadoDesc', { nome }));
    } else if (decision === 'rejected') {
      avisar.sucesso(t('cand.recusado'));
    } else {
      avisar.sucesso(t('cand.suspenso'), t('cand.suspensoDesc', { nome }));
    }
    aoDecidir();
  };

  const aprovar = async () => {
    if (v.impede && d.driverStatus === 'pending') return setAcao('aprovarMesmoAssim');
    setAAprovar(true);
    try {
      await decidir('approved');
    } catch (e) {
      avisar.erro(mensagemDe(e));
    } finally {
      setAAprovar(false);
    }
  };

  const confirmarDocumento = async (id: number) => {
    try {
      await api.documentoRevisto(id);
      setRevistos((r) => [...r, id]);
      avisar.sucesso(t('cand.documentoConfirmado'));
      aoMudarDocumento();
    } catch (e) {
      avisar.erro(mensagemDe(e));
    }
  };

  const veiculo = d.vehicle;
  const sugestoes = [t('cand.sugDocsIlegiveis'), t('cand.sugDocsFalta'), t('cand.sugCartaCaducada'), t('cand.sugVeiculo')];

  return (
    <>
      <Janela open={!!motorista} onOpenChange={(o) => !o && aoFechar()}>
        <JanelaConteudo largura="xl">
          <JanelaCabecalho>
            <p className="text-xs font-semibold uppercase tracking-wider text-secundario">{t('cand.titulo')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Avatar nome={nome} tamanho="lg" />
              <div className="min-w-0">
                <JanelaTitulo className="text-xl">{nome}</JanelaTitulo>
                <JanelaDescricao className="mt-0.5 flex flex-wrap items-center gap-2">
                  <EstadoDoMotorista estado={d.driverStatus} />
                  {d.online ? (
                    <Distintivo cor="sucesso" ponto>
                      {t('comum.online')}
                    </Distintivo>
                  ) : (
                    <span className="text-xs text-secundario">
                      {t('comum.ultimaVez')}: {d.ultimaVez ? haQuanto(d.ultimaVez) : t('comum.nunca')}
                    </span>
                  )}
                </JanelaDescricao>
              </div>
            </div>
          </JanelaCabecalho>

          <JanelaCorpo className="space-y-5 bg-fundo/40">
            {d.driverStatusMotivo && d.driverStatus !== 'approved' ? (
              <div className="flex gap-3 rounded-xl border border-aviso/25 bg-aviso-claro px-4 py-3 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-aviso" aria-hidden />
                <p>
                  <span className="font-semibold text-aviso">{t('cand.decisaoAnterior')}: </span>
                  <span className="text-texto">{d.driverStatusMotivo}</span>
                </p>
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <Seccao titulo={t('cand.dadosPessoais')}>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <Dado rotulo={t('comum.nome')}>{nome}</Dado>
                  <Dado rotulo={t('comum.telefone')}>
                    <Telefone numero={d.phone} />
                  </Dado>
                  <Dado rotulo={t('comum.email')} className="sm:col-span-2">
                    {d.email ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <a href={`mailto:${d.email}`} className="break-all text-teal-escuro hover:underline">
                          {d.email}
                        </a>
                        <Distintivo cor={d.emailConfirmado ? 'sucesso' : 'neutro'}>
                          {d.emailConfirmado ? t('cand.emailConfirmado') : t('cand.emailPorConfirmar')}
                        </Distintivo>
                      </span>
                    ) : (
                      '—'
                    )}
                  </Dado>
                  <Dado rotulo={t('cand.registo')}>{data(d.createdAt)}</Dado>
                  <Dado rotulo={t('cand.viagens')}>
                    <span className="numeros">{d.viagens}</span>
                  </Dado>
                  <Dado rotulo={t('cand.cidadania')} className="sm:col-span-2">
                    {conta ? (
                      conta.conta.cidadaoTL ? (
                        conta.conta.cidadaoTL.declarou ? (
                          t('cand.cidadaniaDeclarou', { data: data(conta.conta.cidadaoTL.quando) })
                        ) : (
                          <span className="text-perigo">Declarou não ser cidadão</span>
                        )
                      ) : (
                        <span className="text-secundario">{t('cand.cidadaniaNaoPerguntado')}</span>
                      )
                    ) : (
                      <Esqueleto className="h-4 w-48" />
                    )}
                  </Dado>
                  <Dado rotulo={t('cand.termos')} className="sm:col-span-2">
                    {conta ? (
                      conta.conta.termos.motorista ? (
                        t('cand.termosAceites', {
                          v: conta.conta.termos.motorista.versao,
                          data: data(conta.conta.termos.motorista.quando),
                        })
                      ) : (
                        <span className="text-secundario">{t('cand.termosNao')}</span>
                      )
                    ) : (
                      <Esqueleto className="h-4 w-40" />
                    )}
                  </Dado>
                </dl>
              </Seccao>

              <Seccao titulo={t('cand.dadosVeiculo')}>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <Dado rotulo={t('comum.tipo')}>
                    <span className="inline-flex items-center gap-2">
                      <IconeVeiculo tipo={veiculo?.type} className="text-secundario" />
                      {tl('veiculo', veiculo?.type)}
                    </span>
                  </Dado>
                  <Dado rotulo={t('cand.marcaModelo')}>{veiculo?.model || '—'}</Dado>
                  <Dado rotulo={t('cand.matricula')}>
                    <span className="numeros rounded-md border border-borda bg-white px-2 py-0.5 font-semibold tracking-wide">
                      {veiculo?.plate || '—'}
                    </span>
                  </Dado>
                  <Dado rotulo={t('cand.cor')}>
                    {veiculo?.color ? veiculo.color : <span className="font-medium text-perigo">{t('cand.semCor')}</span>}
                  </Dado>
                  {veiculo?.seats ? <Dado rotulo={t('cand.lugares')}>{veiculo.seats}</Dado> : null}
                  {veiculo?.carroceria ? <Dado rotulo={t('cand.carroceria')}>{tl('carroceria', veiculo.carroceria)}</Dado> : null}
                  {veiculo?.capacidade ? <Dado rotulo={t('cand.capacidade')}>{tl('capacidade', veiculo.capacidade)}</Dado> : null}
                  {veiculo?.ano ? <Dado rotulo={t('cand.ano')}>{veiculo.ano}</Dado> : null}
                </dl>
              </Seccao>
            </div>

            <Seccao titulo={t('cand.documentos')}>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {TIPOS_DOCUMENTO.map((k) => {
                  const doc = docs[k];
                  const nomeDoc = tl('documento', k);
                  if (!doc) {
                    return (
                      <li key={k}>
                        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-perigo/40 bg-perigo-claro text-xs font-semibold text-perigo">
                          <FileWarning className="size-5" aria-hidden />
                          {t('cand.emFalta')}
                        </div>
                        <p className="mt-2 text-[13px] font-semibold">{nomeDoc}</p>
                      </li>
                    );
                  }
                  const suspeito = documentoSuspeito(doc);
                  const porRever = doc.porRever && !revistos.includes(doc.id);
                  return (
                    <li key={k}>
                      <ImagemProtegida
                        caminho={caminhos.documento(doc.id)}
                        alt={nomeDoc}
                        className={cn('aspect-[4/3]', suspeito && 'ring-2 ring-perigo/50', porRever && 'ring-2 ring-aviso/60')}
                        aoAbrir={(url) => setLupa({ url, titulo: `${nomeDoc} · ${nome}` })}
                      />
                      <p className="mt-2 text-[13px] font-semibold leading-tight">{nomeDoc}</p>
                      <p className={cn('numeros mt-0.5 text-xs', suspeito ? 'font-semibold text-perigo' : 'text-secundario')}>
                        {doc.expiresOn ? t('cand.validade', { data: data(doc.expiresOn) }) : ['licence', 'vehicle', 'inspection'].includes(k) ? t('cand.semValidade') : ' '}
                      </p>
                      {porRever ? (
                        <div className="mt-1.5">
                          <Distintivo cor="aviso">{t('cand.porRever')}</Distintivo>
                          <Botao variante="suave" tamanho="sm" className="mt-1.5 w-full" onClick={() => confirmarDocumento(doc.id)}>
                            {t('cand.confirmarDocumento')}
                          </Botao>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Seccao>

            <Seccao titulo={t('cand.verificacao')} nota={t('cand.verificacaoNota')}>
              <ul className="space-y-2">
                {v.linhas.map((l, i) => {
                  const Icone = ICONE_NIVEL[l.nivel];
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Icone className={cn('mt-0.5 size-4 shrink-0', COR_NIVEL[l.nivel])} aria-hidden />
                      <span>{l.texto}</span>
                    </li>
                  );
                })}
              </ul>
            </Seccao>
          </JanelaCorpo>

          <JanelaRodape className="justify-between">
            <Link
              to={`/contas?conta=${d.id}`}
              onClick={aoFechar}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-escuro hover:underline"
            >
              {t('cand.verConta')} <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <div className="flex flex-wrap gap-2">
              {d.driverStatus === 'pending' ? (
                <>
                  <Botao variante="perigoContorno" onClick={() => setAcao('recusar')}>
                    {t('cand.recusar')}
                  </Botao>
                  <Botao onClick={aprovar} aCarregar={aAprovar}>
                    {v.impede ? t('cand.aprovarMesmoAssim') : t('cand.aprovar')}
                  </Botao>
                </>
              ) : d.driverStatus === 'approved' ? (
                <Botao variante="perigoContorno" onClick={() => setAcao('suspender')}>
                  {t('cand.suspender')}
                </Botao>
              ) : d.driverStatus === 'rejected' ? (
                <Botao onClick={aprovar} aCarregar={aAprovar}>
                  {t('cand.aprovarAfinal')}
                </Botao>
              ) : d.driverStatus === 'suspended' ? (
                <Botao onClick={aprovar} aCarregar={aAprovar}>
                  {t('cand.reativar')}
                </Botao>
              ) : null}
            </div>
          </JanelaRodape>
          <Lupa url={lupa?.url ?? null} titulo={lupa?.titulo ?? ''} aoFechar={() => setLupa(null)} />

          <DialogoConfirmacao
            aberto={acao === 'aprovarMesmoAssim'}
            aoMudar={(v) => !v && setAcao(null)}
            titulo={t('cand.confirmarAprovarTitulo')}
            texto={t('cand.confirmarAprovarTexto')}
            rotuloConfirmar={t('cand.aprovarMesmoAssim')}
            aoConfirmar={() => decidir('approved')}
          >
            <ul className="space-y-1.5 rounded-lg bg-perigo-claro px-3 py-2.5">
              {v.linhas
                .filter((l) => l.nivel === 'no')
                .map((l, i) => (
                  <li key={i} className="flex gap-2 text-sm text-perigo">
                    <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden /> {l.texto}
                  </li>
                ))}
            </ul>
          </DialogoConfirmacao>

          <DialogoConfirmacao
            aberto={acao === 'recusar'}
            aoMudar={(v) => !v && setAcao(null)}
            titulo={t('cand.recusarTitulo')}
            texto={t('cand.recusarTexto')}
            rotuloConfirmar={t('cand.recusar')}
            perigo
            pedirMotivo
            rotuloMotivo={t('cand.motivoRecusa')}
            sugestoes={sugestoes}
            aoConfirmar={(motivo) => decidir('rejected', motivo)}
          />

          <DialogoConfirmacao
            aberto={acao === 'suspender'}
            aoMudar={(v) => !v && setAcao(null)}
            titulo={t('cand.suspenderTitulo')}
            texto={t('cand.suspenderTexto')}
            rotuloConfirmar={t('cand.suspender')}
            perigo
            pedirMotivo
            rotuloMotivo={t('cand.motivoSuspensao')}
            sugestoes={[t('cand.sugCartaCaducada'), t('cand.sugQueixa')]}
            aoConfirmar={(motivo) => decidir('suspended', motivo)}
          />
        </JanelaConteudo>
      </Janela>

    </>
  );
}
