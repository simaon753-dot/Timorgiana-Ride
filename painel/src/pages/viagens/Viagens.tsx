import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronRight, CircleX, Clock, Info, Navigation, RefreshCw, Route, UserX } from 'lucide-react';
import { t } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora, dolares, haQuanto, hora, data } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { TipoVeiculo, ViagemLinha } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { CartaoNumero } from '@/components/ui/cartao-numero';
import { Botao } from '@/components/ui/botao';
import { CampoPesquisa, Selecao } from '@/components/ui/campo';
import { Segmentos } from '@/components/ui/segmentos';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { EsqueletoCartoes, EsqueletoTabela } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio, Faixa } from '@/components/ui/estados';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { EstadoDaViagem, IconeVeiculo } from '@/components/comuns';
import { DetalheViagem } from './DetalheViagem';

type FiltroEstado = 'todos' | 'curso' | 'concluidas' | 'canceladas' | 'semMotorista';

const semMotorista = (v: ViagemLinha) => v.estado === 'cancelled' && !v.motorista;

function bateEstado(v: ViagemLinha, f: FiltroEstado) {
  switch (f) {
    case 'todos':
      return true;
    case 'curso':
      return ['requested', 'accepted', 'arriving', 'in_progress'].includes(v.estado);
    case 'concluidas':
      return v.estado === 'completed';
    case 'canceladas':
      return v.estado === 'cancelled' && !!v.motorista;
    case 'semMotorista':
      return semMotorista(v);
  }
}

export function Viagens() {
  const [params, setParams] = useSearchParams();
  const [veiculo, setVeiculo] = useState<TipoVeiculo | 'todos'>('todos');
  const [horas, setHoras] = useState(48);
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [procura, setProcura] = useState('');
  const aberta = Number(params.get('viagem')) || null;

  const resumo = useDados(() => api.resumo(), [], { aCada: 60_000 });
  const lista = useDados(() => api.viagens(horas, veiculo), [horas, veiculo], { aCada: 60_000 });

  const abrir = (id: number | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('viagem', String(id));
    else p.delete('viagem');
    setParams(p, { replace: !id });
  };

  const linhas = useMemo(() => {
    const q = procura.trim().toLowerCase().replace(/^#/, '');
    return (lista.dados?.viagens ?? []).filter((v) => {
      if (!bateEstado(v, estado)) return false;
      if (!q) return true;
      return [String(v.id), v.passageiro, v.motorista, v.origem, v.destino, ...v.paragens]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q));
    });
  }, [lista.dados, estado, procura]);

  const r = resumo.dados?.resumo;

  return (
    <>
      <CabecalhoPagina
        titulo={t('viag.titulo')}
        descricao={t('viag.descricao')}
        acoes={
          <Botao
            variante="secundario"
            onClick={() => {
              resumo.recarregar();
              lista.recarregar();
            }}
          >
            <RefreshCw className={cn((lista.aAtualizar || resumo.aAtualizar) && 'animate-spin')} /> {t('comum.atualizar')}
          </Botao>
        }
      />

      {resumo.aCarregar ? (
        <EsqueletoCartoes />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoNumero icone={<Route />} cor="teal" valor={r?.viagens24h} rotulo={t('viag.cartao24h')} />
          <CartaoNumero
            icone={<Navigation />}
            cor="azul"
            valor={r?.veiculosServico}
            rotulo={t('viag.cartaoAndamento')}
            nota={r ? `${r.esperando} ${t('viag.cartaoEspera').toLowerCase()}` : undefined}
            aoClicar={() => setEstado('curso')}
            ativo={estado === 'curso'}
          />
          <CartaoNumero
            icone={<CircleX />}
            cor="perigo"
            valor={r?.canceladas24h}
            rotulo={t('viag.cartaoCanceladas')}
            aoClicar={() => setEstado('canceladas')}
            ativo={estado === 'canceladas'}
          />
          <CartaoNumero
            icone={<UserX />}
            cor="aviso"
            valor={r?.semMotorista24h}
            rotulo={t('viag.cartaoSemMotorista')}
            aoClicar={() => setEstado('semMotorista')}
            ativo={estado === 'semMotorista'}
          />
        </div>
      )}

      {r ? (
        <Faixa cor="teal" icone={<Info />} className="mt-4" titulo={t('viag.tarifas', { v: dolares(r.tarifas24h) })}>
          {t('viag.tarifasNota')}
        </Faixa>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmentos
          rotulo={t('viag.filtroVeiculo')}
          valor={veiculo}
          aoMudar={setVeiculo}
          className="rounded-2xl bg-borda/40 p-1"
          opcoes={[
            { valor: 'todos', rotulo: t('comum.todas') },
            { valor: 'motorbike', rotulo: t('veiculo.motorbike') },
            { valor: 'car', rotulo: t('veiculo.car') },
            { valor: 'carry', rotulo: t('veiculo.carry') },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <CampoPesquisa
            className="min-w-52 flex-1 lg:w-64 lg:flex-none"
            placeholder={t('viag.procurar')}
            aria-label={t('viag.procurar')}
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
          <Selecao aria-label={t('comum.estado')} value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)} className="w-44">
            <option value="todos">{t('viag.estadoTodos')}</option>
            <option value="curso">{t('viag.estadoCurso')}</option>
            <option value="concluidas">{t('viag.estadoConcluidas')}</option>
            <option value="canceladas">{t('viag.estadoCanceladas')}</option>
            <option value="semMotorista">{t('viag.estadoSemMotorista')}</option>
          </Selecao>
          <Selecao aria-label="Período" value={horas} onChange={(e) => setHoras(Number(e.target.value))} className="w-44">
            <option value={24}>{t('viag.horas24')}</option>
            <option value={48}>{t('viag.horas48')}</option>
            <option value={168}>{t('viag.horas168')}</option>
          </Selecao>
        </div>
      </div>

      <Cartao className="mt-4 overflow-hidden">
        {lista.erro && !lista.dados ? (
          <EstadoErro mensagem={lista.erro} aoTentar={lista.recarregar} />
        ) : lista.aCarregar ? (
          <EsqueletoTabela colunas={7} />
        ) : !linhas.length ? (
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <Route />
              </IlustracaoIcone>
            }
            titulo={(lista.dados?.viagens.length ?? 0) > 0 ? t('viag.vazioFiltrosTitulo') : t('viag.vazioTitulo')}
            texto={(lista.dados?.viagens.length ?? 0) > 0 ? undefined : t('viag.vazioTexto')}
            acao={
              (lista.dados?.viagens.length ?? 0) > 0 ? (
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setEstado('todos');
                    setProcura('');
                  }}
                >
                  {t('comum.limpar')}
                </Botao>
              ) : (
                <Botao onClick={lista.recarregar}>
                  <RefreshCw /> {t('comum.atualizar')}
                </Botao>
              )
            }
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Tabela>
                <TCabeca>
                  <tr>
                    <TTitulo>{t('viag.colId')}</TTitulo>
                    <TTitulo>{t('viag.colPassageiro')}</TTitulo>
                    <TTitulo>{t('viag.colMotorista')}</TTitulo>
                    <TTitulo>{t('viag.colPercurso')}</TTitulo>
                    <TTitulo>{t('viag.colQuando')}</TTitulo>
                    <TTitulo className="text-right">{t('viag.colPreco')}</TTitulo>
                    <TTitulo>{t('viag.colEstado')}</TTitulo>
                  </tr>
                </TCabeca>
                <TCorpo>
                  {linhas.map((v) => (
                    <TLinha
                      key={v.id}
                      clicavel
                      onClick={() => abrir(v.id)}
                      onKeyDown={(e) => e.key === 'Enter' && abrir(v.id)}
                      tabIndex={0}
                      aria-label={t('viag.verViagem', { n: v.id })}
                    >
                      <TCelula className="whitespace-nowrap">
                        <span className="numeros inline-flex items-center gap-2 font-semibold text-texto">
                          <IconeVeiculo tipo={v.veiculo} className="text-secundario" />#{v.id}
                        </span>
                      </TCelula>
                      <TCelula className="max-w-44 truncate">{v.passageiro}</TCelula>
                      <TCelula className="max-w-44 truncate">
                        {v.motorista ?? <span className="text-secundario">—</span>}
                      </TCelula>
                      <TCelula className="max-w-80">
                        <p className="truncate text-texto">{v.origem || '—'}</p>
                        <p className="truncate text-xs text-secundario">
                          → {v.paragens.length ? `${v.paragens.join(' → ')} → ` : ''}
                          {v.destino || '—'}
                        </p>
                      </TCelula>
                      <TCelula className="whitespace-nowrap">
                        <p className="numeros">{hora(v.quando)}</p>
                        <p className="text-xs text-secundario">{data(v.quando)}</p>
                      </TCelula>
                      <TCelula className="numeros whitespace-nowrap text-right font-medium">{dolares(v.preco)}</TCelula>
                      <TCelula>
                        <EstadoDaViagem estado={v.estado} semMotorista={semMotorista(v)} />
                      </TCelula>
                    </TLinha>
                  ))}
                </TCorpo>
              </Tabela>
            </div>
            <ul className="divide-y divide-borda lg:hidden">
              {linhas.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => abrir(v.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-teal-suave sm:px-6"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fundo text-secundario">
                      <IconeVeiculo tipo={v.veiculo} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="numeros font-semibold">#{v.id}</p>
                        <EstadoDaViagem estado={v.estado} semMotorista={semMotorista(v)} />
                      </div>
                      <p className="mt-1 truncate text-sm">
                        {v.origem || '—'} → {v.destino || '—'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-secundario">
                        <Clock className="size-3" aria-hidden /> {haQuanto(v.quando)} · {dolares(v.preco)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-secundario" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-between gap-2 border-t border-borda px-6 py-3 text-[13px] text-secundario">
              <span>{t('viag.nViagens', { n: linhas.length })}</span>
              <span title={dataHora(new Date())}>{t('viag.limite')}</span>
            </div>
          </>
        )}
      </Cartao>

      <DetalheViagem id={aberta} aoFechar={() => abrir(null)} />
    </>
  );
}
