import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, CircleX, Clock, Database, Download, Inbox, Star, Trash2, UserX } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api, caminhos } from '@/services/admin';
import { descarregarProtegido } from '@/services/cliente';
import { useDados } from '@/hooks/useDados';
import { data, diaCurto, duracao, hojeEmDili, numero, percentagem } from '@/lib/formato';
import type { PontoDiario } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/cartao';
import { CartaoNumero } from '@/components/ui/cartao-numero';
import { Botao } from '@/components/ui/botao';
import { Campo, Rotulo, Selecao } from '@/components/ui/campo';
import { Segmentos } from '@/components/ui/segmentos';
import { Esqueleto, EsqueletoCartoes } from '@/components/ui/esqueleto';
import { EstadoErro } from '@/components/ui/estados';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { GraficoAtivos, GraficoMotivos, GraficoViagens, type PontoViagens } from './Graficos';

type Agregacao = 'dia' | 'semana' | 'mes';

// Segunda-feira da semana de um dia (AAAA-MM-DD).
function inicioDaSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function agregar(serie: PontoDiario[], modo: Agregacao): PontoViagens[] {
  const chave = (dia: string) => (modo === 'dia' ? dia : modo === 'semana' ? inicioDaSemana(dia) : dia.slice(0, 7));
  const grupos = new Map<string, PontoViagens>();
  for (const p of serie) {
    const k = chave(p.dia);
    const g = grupos.get(k) ?? { rotulo: k, concluidas: 0, canceladas: 0, semMotorista: 0 };
    g.concluidas += p.concluidas;
    g.canceladas += p.canceladas;
    g.semMotorista += p.semMotorista;
    grupos.set(k, g);
  }
  return [...grupos.values()];
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function Dados() {
  const [dias, setDias] = useState(30);
  const [agregacao, setAgregacao] = useState<Agregacao>('dia');
  const { dados: e, erro, aCarregar, recarregar } = useDados(() => api.estatisticas(dias), [dias]);

  const serie = useMemo(() => agregar(e?.porDia ?? [], agregacao), [e, agregacao]);
  const formatarRotulo = (l: string) =>
    agregacao === 'mes' ? `${MESES[Number(l.slice(5, 7)) - 1]} ${l.slice(0, 4)}` : agregacao === 'semana' ? t('dados.semanaDe', { d: diaCurto(l) }) : diaCurto(l);
  const motivos = (e?.cancelamentos ?? []).map((c) => ({ rotulo: tl('cancelamento', c.motivo), n: c.n }));

  return (
    <>
      <CabecalhoPagina
        titulo={t('dados.titulo')}
        descricao={t('dados.descricao')}
        acoes={
          <Selecao aria-label={t('dados.periodo')} value={dias} onChange={(ev) => setDias(Number(ev.target.value))} className="w-48">
            <option value={7}>{t('dados.dias7')}</option>
            <option value={30}>{t('dados.dias30')}</option>
            <option value={90}>{t('dados.dias90')}</option>
          </Selecao>
        }
      />

      {erro && !e ? (
        <Cartao>
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        </Cartao>
      ) : aCarregar || !e ? (
        <>
          <EsqueletoCartoes />
          <Esqueleto className="mt-6 h-80 w-full rounded-cartao" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CartaoNumero icone={<Inbox />} cor="teal" valor={e.pedidos} rotulo={t('dados.pedidos')} />
            <CartaoNumero
              icone={<CircleCheck />}
              cor="teal"
              valor={e.aceites}
              rotulo={t('dados.aceitacao')}
              nota={t('dados.aceitacaoNota', { p: percentagem(e.aceites, e.pedidos) })}
            />
            <CartaoNumero
              icone={<CircleX />}
              cor="perigo"
              valor={e.canceladas}
              rotulo={t('dados.canceladas')}
              nota={t('dados.canceladasNota', { p: percentagem(e.canceladas, e.aceites) })}
            />
            <CartaoNumero icone={<UserX />} cor="aviso" valor={e.semResposta} rotulo={t('dados.semResposta')} nota={t('dados.semRespostaNota')} />
            <CartaoNumero
              icone={<Clock />}
              cor="azul"
              valor={duracao(e.segundosAteAceitar)}
              formatar={false}
              rotulo={t('dados.tempoAceitar')}
              nota={t('dados.tempoNota')}
            />
            <CartaoNumero
              icone={<Star />}
              cor="coral"
              valor={e.satisfacao ? `${e.satisfacao.media.toFixed(1)} / 5` : null}
              formatar={false}
              rotulo={t('dados.satisfacao')}
              nota={e.satisfacao ? t('dados.satisfacaoNota', { n: numero(e.satisfacao.n) }) : undefined}
            />
          </div>

          <Cartao className="mt-6">
            <CartaoCabecalho>
              <div>
                <CartaoTitulo>{t('dados.graficoViagens')}</CartaoTitulo>
                <CartaoDescricao>{t('dados.graficoViagensNota')}</CartaoDescricao>
              </div>
              <Segmentos
                rotulo={t('dados.agregacao')}
                valor={agregacao}
                aoMudar={setAgregacao}
                className="rounded-2xl bg-borda/40 p-1"
                opcoes={[
                  { valor: 'dia', rotulo: t('dados.porDia') },
                  { valor: 'semana', rotulo: t('dados.porSemana') },
                  { valor: 'mes', rotulo: t('dados.porMes') },
                ]}
              />
            </CartaoCabecalho>
            <CartaoConteudo>
              {e.porDia ? (
                <GraficoViagens
                  dados={serie}
                  formatarRotulo={formatarRotulo}
                  nomes={{ concluidas: t('dados.serieConcluidas'), canceladas: t('dados.serieCanceladas'), semMotorista: t('dados.serieSemMotorista') }}
                />
              ) : (
                <p className="py-10 text-center text-sm text-secundario">{t('dados.semSerie')}</p>
              )}
            </CartaoConteudo>
          </Cartao>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Cartao>
              <CartaoCabecalho>
                <div>
                  <CartaoTitulo>{t('dados.graficoAtivos')}</CartaoTitulo>
                  <CartaoDescricao>{t('dados.graficoAtivosNota')}</CartaoDescricao>
                </div>
              </CartaoCabecalho>
              <CartaoConteudo>
                {e.porDia ? (
                  <GraficoAtivos dados={e.porDia} nomes={{ motoristas: t('dados.serieMotoristas'), passageiros: t('dados.seriePassageiros') }} />
                ) : (
                  <p className="py-10 text-center text-sm text-secundario">{t('dados.semSerie')}</p>
                )}
              </CartaoConteudo>
            </Cartao>
            <Cartao>
              <CartaoCabecalho>
                <div>
                  <CartaoTitulo>{t('dados.graficoMotivos')}</CartaoTitulo>
                  <CartaoDescricao>{t('dados.graficoMotivosNota')}</CartaoDescricao>
                </div>
              </CartaoCabecalho>
              <CartaoConteudo>
                {motivos.length ? <GraficoMotivos dados={motivos} /> : <p className="py-10 text-center text-sm text-secundario">{t('dados.semCancelamentos')}</p>}
              </CartaoConteudo>
            </Cartao>
          </div>

          <Cartao className="mt-6 overflow-hidden">
            <CartaoCabecalho>
              <div>
                <CartaoTitulo>{t('dados.docsCaducar')}</CartaoTitulo>
                <CartaoDescricao>{t('dados.docsCaducarNota')}</CartaoDescricao>
              </div>
            </CartaoCabecalho>
            {e.documentosACaducar.length ? (
              <Tabela>
                <TCabeca>
                  <tr>
                    <TTitulo>{t('dados.colMotorista')}</TTitulo>
                    <TTitulo>{t('comum.telefone')}</TTitulo>
                    <TTitulo>{t('dados.colDocumento')}</TTitulo>
                    <TTitulo>{t('dados.colAte')}</TTitulo>
                  </tr>
                </TCabeca>
                <TCorpo>
                  {e.documentosACaducar.map((d, i) => (
                    <TLinha key={i}>
                      <TCelula>
                        <Link to={`/contas?conta=${d.userId}`} className="font-semibold hover:underline">
                          {d.nome}
                        </Link>
                      </TCelula>
                      <TCelula className="numeros">{d.telefone}</TCelula>
                      <TCelula>{tl('documento', d.tipo)}</TCelula>
                      <TCelula className={d.ate < hojeEmDili() ? 'numeros font-semibold text-perigo' : 'numeros'}>{data(d.ate)}</TCelula>
                    </TLinha>
                  ))}
                </TCorpo>
              </Tabela>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-secundario">{t('dados.semDocsCaducar')}</p>
            )}
          </Cartao>
        </>
      )}

      <Retencao />
    </>
  );
}

function Retencao() {
  const { dados: r, erro, aCarregar, recarregar } = useDados(() => api.retencao(), []);
  const [ate, setAte] = useState(() => {
    // Hoje menos seis meses: é o prazo dos eventos, e a data que quase sempre se quer.
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [transferido, setTransferido] = useState<string | null>(null);
  const [aTransferir, setATransferir] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const transferir = async () => {
    setATransferir(true);
    try {
      await descarregarProtegido(caminhos.exportarViagens(ate), `timorgianaride-viagens-ate-${ate}.json`);
      setTransferido(ate);
      avisar.sucesso(t('ret.transferido'));
    } catch (e) {
      avisar.erro(mensagemDe(e));
    } finally {
      setATransferir(false);
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">{t('ret.titulo')}</h2>
        <p className="mt-1 max-w-3xl text-sm text-secundario">{t('ret.descricao')}</p>
      </div>
      {erro && !r ? (
        <Cartao>
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        </Cartao>
      ) : aCarregar || !r ? (
        <EsqueletoCartoes n={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CartaoNumero icone={<Database />} cor="neutro" valor={r.eventos.linhas} rotulo={t('ret.eventos')} nota={t('ret.eventosNota', { d: data(r.eventos.maisAntigo), m: r.eventos.meses })} />
          <CartaoNumero icone={<Database />} cor="neutro" valor={r.acessos.linhas} rotulo={t('ret.acessos')} nota={t('ret.eventosNota', { d: data(r.acessos.maisAntigo), m: r.acessos.meses })} />
          <CartaoNumero icone={<Database />} cor="neutro" valor={r.viagens.linhas} rotulo={t('ret.viagens')} nota={t('ret.viagensNota')} />
        </div>
      )}

      <Cartao className="mt-4">
        <CartaoCabecalho>
          <div>
            <CartaoTitulo>{t('ret.transferirTitulo')}</CartaoTitulo>
            <CartaoDescricao>{t('ret.transferirTexto')}</CartaoDescricao>
          </div>
        </CartaoCabecalho>
        <CartaoConteudo>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Rotulo htmlFor="ate-dia">{t('ret.ateDia')}</Rotulo>
              <Campo id="ate-dia" type="date" value={ate} max={hojeEmDili()} onChange={(ev) => setAte(ev.target.value)} className="w-48" />
            </div>
            <Botao onClick={transferir} aCarregar={aTransferir} disabled={!ate}>
              {aTransferir ? null : <Download />} {aTransferir ? t('ret.aTransferir') : t('ret.transferir')}
            </Botao>
            {/* Data diferente, transferência diferente: transferir janeiro e depois
                escrever dezembro apagaria meses que nunca saíram daqui. */}
            <Botao variante="perigo" disabled={transferido !== ate} onClick={() => setConfirmar(true)}>
              <Trash2 /> {t('ret.apagar')}
            </Botao>
          </div>
          <p className="mt-3 max-w-3xl text-xs text-secundario">{t('ret.apagarNota')}</p>
        </CartaoConteudo>
      </Cartao>

      <DialogoConfirmacao
        aberto={confirmar}
        aoMudar={setConfirmar}
        titulo={t('ret.apagarTitulo')}
        texto={t('ret.apagarTexto', { d: data(ate) })}
        rotuloConfirmar={t('ret.apagar')}
        perigo
        palavra="APAGAR"
        aoConfirmar={async () => {
          const res = await api.apagarViagens(ate);
          setTransferido(null);
          avisar.sucesso(
            t('ret.apagadas', { n: res.viagens }),
            res.retidasPorSocorro ? t('ret.retidas', { n: res.retidasPorSocorro }) : undefined
          );
          recarregar();
        }}
      />
    </section>
  );
}

