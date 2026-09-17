import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronRight, CircleCheck, CircleX, Clock, Eye, Filter, RefreshCw, TriangleAlert, Users } from 'lucide-react';
import { t, type Chave } from '@/i18n';
import { useSessao } from '@/lib/sessao';
import { useDados } from '@/hooks/useDados';
import { api } from '@/services/admin';
import { data, haQuanto, horaEmDili } from '@/lib/formato';
import { cn, primeiroNome } from '@/lib/utils';
import type { EstadoMotorista, Motorista, TipoVeiculo } from '@/types/api';
import { Cartao } from '@/components/ui/cartao';
import { CartaoNumero } from '@/components/ui/cartao-numero';
import { Botao } from '@/components/ui/botao';
import { Avatar } from '@/components/ui/avatar';
import { Segmentos } from '@/components/ui/segmentos';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { EsqueletoCartoes, EsqueletoTabela } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio } from '@/components/ui/estados';
import { Balao, BalaoAbrir, BalaoConteudo } from '@/components/ui/menu';
import { Rotulo, Selecao } from '@/components/ui/campo';
import { Interruptor } from '@/components/ui/interruptor';
import { IlustracaoPaisagem, IlustracaoPrancheta } from '@/components/ilustracoes';
import { EstadoDoMotorista, Veiculo } from '@/components/comuns';
import { FiltroPeriodo, dentroDoPeriodo, type Periodo } from '@/components/filtro-periodo';
import { useServico } from '@/layouts/servico';
import { resumoVerificacao } from './verificar';
import { Candidatura } from './Candidatura';

type Separador = EstadoMotorista | 'todos';

const VAZIO: Record<Separador, [Chave, Chave]> = {
  pending: ['aprov.vazioEsperaTitulo', 'aprov.vazioEsperaTexto'],
  approved: ['aprov.vazioAprovadosTitulo', 'aprov.vazioAprovadosTexto'],
  rejected: ['aprov.vazioRecusadosTitulo', 'aprov.vazioRecusadosTexto'],
  suspended: ['aprov.vazioSuspensosTitulo', 'aprov.vazioSuspensosTexto'],
  todos: ['aprov.vazioTodosTitulo', 'aprov.vazioTodosTexto'],
};

function Cumprimento() {
  const { utilizador } = useSessao();
  const h = horaEmDili();
  const chave: Chave = h >= 5 && h < 12 ? 'aprov.bomDia' : h >= 12 && h < 19 ? 'aprov.boaTarde' : 'aprov.boaNoite';
  return (
    <section className="relative mb-6 overflow-hidden rounded-cartao border border-borda bg-gradient-to-r from-white via-white to-teal-suave shadow-cartao">
      <div className="relative z-10 flex min-h-[110px] flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-[28px]">
            {t(chave, { nome: primeiroNome(utilizador?.name) || 'administrador' })}
          </h1>
          <p className="mt-1 text-sm text-secundario">{t('aprov.resumo')}</p>
        </div>
        <p className="hidden max-w-56 text-right text-sm font-medium leading-snug text-teal-escuro lg:block lg:mr-44">
          {t('aprov.frase')}
        </p>
      </div>
      <IlustracaoPaisagem className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-72 opacity-90 md:block" />
    </section>
  );
}

interface Filtros {
  veiculo: TipoVeiculo | 'todos';
  documentos: 'todos' | 'problemas' | 'completos';
  soOnline: boolean;
}
const FILTROS_INICIAIS: Filtros = { veiculo: 'todos', documentos: 'todos', soOnline: false };

export function Aprovacoes() {
  const [params, setParams] = useSearchParams();
  const estadoInicial = (params.get('estado') as Separador) || 'pending';
  const [separador, setSeparador] = useState<Separador>(
    ['pending', 'approved', 'rejected', 'suspended', 'todos'].includes(estadoInicial) ? estadoInicial : 'pending'
  );
  // "Todo o período" por omissão, e não "Hoje": um candidato que se registou
  // ontem e continua à espera não pode desaparecer da lista por causa da data.
  const [periodo, setPeriodo] = useState<Periodo>({ tipo: 'todo' });
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [aberto, setAberto] = useState<Motorista | null>(null);
  const { recarregarNotificacoes } = useServico();

  const { dados, erro, aCarregar, aAtualizar, recarregar } = useDados(() => api.motoristas(separador), [separador]);

  const mudarSeparador = (s: Separador) => {
    setSeparador(s);
    const p = new URLSearchParams(params);
    if (s === 'pending') p.delete('estado');
    else p.set('estado', s);
    setParams(p, { replace: true });
  };

  const c = dados?.contagens;
  const linhas = useMemo(() => {
    return (dados?.drivers ?? [])
      .map((d) => ({ d, v: resumoVerificacao(d) }))
      .filter(({ d, v }) => {
        if (!dentroDoPeriodo(d.createdAt, periodo)) return false;
        if (filtros.veiculo !== 'todos' && (d.vehicle?.type ?? 'car') !== filtros.veiculo) return false;
        if (filtros.documentos === 'problemas' && !v.problemas) return false;
        if (filtros.documentos === 'completos' && v.problemas) return false;
        if (filtros.soOnline && !d.online) return false;
        return true;
      });
  }, [dados, periodo, filtros]);

  const nFiltros =
    (filtros.veiculo !== 'todos' ? 1 : 0) + (filtros.documentos !== 'todos' ? 1 : 0) + (filtros.soOnline ? 1 : 0);
  const filtrado = nFiltros > 0 || periodo.tipo !== 'todo';

  const limpar = () => {
    setFiltros(FILTROS_INICIAIS);
    setPeriodo({ tipo: 'todo' });
  };

  const depoisDeDecidir = () => {
    setAberto(null);
    recarregar();
    recarregarNotificacoes();
  };

  const opcoes = [
    { valor: 'pending' as const, rotulo: t('aprov.tabEspera'), contagem: c?.pending ?? null },
    { valor: 'approved' as const, rotulo: t('aprov.tabAprovados'), contagem: c?.approved ?? null },
    { valor: 'rejected' as const, rotulo: t('aprov.tabRecusados'), contagem: c?.rejected ?? null },
    // Os suspensos só aparecem quando os há: um separador sempre a zero é ruído.
    ...((c?.suspended ?? 0) > 0 || separador === 'suspended'
      ? [{ valor: 'suspended' as const, rotulo: t('aprov.tabSuspensos'), contagem: c?.suspended ?? null }]
      : []),
    { valor: 'todos' as const, rotulo: t('aprov.tabTodos'), contagem: c?.todos ?? null },
  ];

  return (
    <>
      <Cumprimento />

      {aCarregar && !dados ? (
        <EsqueletoCartoes />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoNumero
            icone={<Clock />}
            cor="coral"
            valor={c?.pending ?? null}
            rotulo={t('aprov.cartaoEspera')}
            aoClicar={() => mudarSeparador('pending')}
            ativo={separador === 'pending'}
          />
          <CartaoNumero
            icone={<CircleCheck />}
            cor="teal"
            valor={c?.approved ?? null}
            rotulo={t('aprov.cartaoAprovados')}
            aoClicar={() => mudarSeparador('approved')}
            ativo={separador === 'approved'}
          />
          <CartaoNumero
            icone={<CircleX />}
            cor="perigo"
            valor={c?.rejected ?? null}
            rotulo={t('aprov.cartaoRecusados')}
            aoClicar={() => mudarSeparador('rejected')}
            ativo={separador === 'rejected'}
          />
          <CartaoNumero
            icone={<Users />}
            cor="azul"
            valor={c?.todos ?? null}
            rotulo={t('aprov.cartaoTotal')}
            nota={c?.suspended ? t('aprov.cartaoSuspensos', { n: c.suspended }) : undefined}
            aoClicar={() => mudarSeparador('todos')}
            ativo={separador === 'todos'}
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmentos rotulo={t('aprov.filtros')} valor={separador} aoMudar={mudarSeparador} opcoes={opcoes} className="rounded-2xl bg-borda/40 p-1" />
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo valor={periodo} aoMudar={setPeriodo} rotulo={t('aprov.periodoRotulo')} />
          <PainelFiltros filtros={filtros} aoMudar={setFiltros} n={nFiltros} />
          <Botao variante="secundario" tamanho="icone" onClick={recarregar} aria-label={t('comum.atualizar')}>
            <RefreshCw className={cn(aAtualizar && 'animate-spin')} />
          </Botao>
        </div>
      </div>

      <Cartao className="mt-4 overflow-hidden">
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar && !dados ? (
          <EsqueletoTabela />
        ) : !linhas.length ? (
          filtrado && (dados?.drivers.length ?? 0) > 0 ? (
            <EstadoVazio
              ilustracao={<IlustracaoPrancheta />}
              titulo={t('aprov.vazioFiltrosTitulo')}
              texto={t('aprov.vazioFiltrosTexto')}
              acao={
                <Botao variante="secundario" onClick={limpar}>
                  {t('comum.limpar')}
                </Botao>
              }
            />
          ) : (
            <EstadoVazio
              ilustracao={<IlustracaoPrancheta />}
              titulo={t(VAZIO[separador][0])}
              texto={t(VAZIO[separador][1])}
              acao={
                <Botao onClick={recarregar} aCarregar={aAtualizar}>
                  {aAtualizar ? null : <RefreshCw />} {t('comum.atualizar')}
                </Botao>
              }
            />
          )
        ) : (
          <>
            {/* Computador e tablet: tabela. */}
            <div className="hidden md:block">
              <Tabela>
                <TCabeca>
                  <tr>
                    <TTitulo>{t('aprov.colSolicitante')}</TTitulo>
                    <TTitulo>{t('aprov.colTipo')}</TTitulo>
                    <TTitulo>{t('aprov.colData')}</TTitulo>
                    <TTitulo>{t('aprov.colEstado')}</TTitulo>
                    <TTitulo>{t('aprov.colDocumentos')}</TTitulo>
                    <TTitulo className="text-right">{t('aprov.colAcoes')}</TTitulo>
                  </tr>
                </TCabeca>
                <TCorpo>
                  {linhas.map(({ d, v }) => (
                    <TLinha key={d.id} clicavel onClick={() => setAberto(d)}>
                      <TCelula>
                        <div className="flex items-center gap-3">
                          <span className="relative">
                            <Avatar nome={d.name} />
                            {d.online ? (
                              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-sucesso ring-2 ring-white" title={t('comum.online')} />
                            ) : null}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate font-semibold text-texto">{d.name}</p>
                            <p className="numeros mt-0.5 text-xs text-secundario">{d.phone}</p>
                          </div>
                        </div>
                      </TCelula>
                      <TCelula>
                        <Veiculo tipo={d.vehicle?.type} detalhe={d.vehicle?.plate} />
                      </TCelula>
                      <TCelula className="whitespace-nowrap">
                        <p className="numeros text-texto">{data(d.createdAt)}</p>
                        <p className="text-xs text-secundario">{haQuanto(d.createdAt)}</p>
                      </TCelula>
                      <TCelula>
                        <EstadoDoMotorista estado={d.driverStatus} />
                      </TCelula>
                      <TCelula className="whitespace-nowrap">
                        <p className="numeros text-texto">{t('aprov.docsDe', { n: v.presentes })}</p>
                        {v.problemas ? (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-aviso">
                            <TriangleAlert className="size-3.5" aria-hidden /> {t('aprov.problemas', { n: v.problemas })}
                          </p>
                        ) : (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-sucesso">
                            <CircleCheck className="size-3.5" aria-hidden /> {t('aprov.semProblemas')}
                          </p>
                        )}
                      </TCelula>
                      <TCelula className="text-right">
                        <Botao
                          variante="secundario"
                          tamanho="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAberto(d);
                          }}
                          aria-label={t('aprov.verCandidatura', { nome: d.name })}
                        >
                          <Eye /> {t('comum.ver')}
                        </Botao>
                      </TCelula>
                    </TLinha>
                  ))}
                </TCorpo>
              </Tabela>
            </div>

            {/* Telemóvel: uma lista de cartões — uma tabela de seis colunas não cabe. */}
            <ul className="divide-y divide-borda md:hidden">
              {linhas.map(({ d, v }) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setAberto(d)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-teal-suave"
                    aria-label={t('aprov.verCandidatura', { nome: d.name })}
                  >
                    <Avatar nome={d.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">{d.name}</p>
                        <EstadoDoMotorista estado={d.driverStatus} />
                      </div>
                      <p className="mt-1 text-xs text-secundario">
                        {t(`veiculo.${d.vehicle?.type ?? 'car'}` as Chave)} · {data(d.createdAt)} · {t('aprov.docsDe', { n: v.presentes })}
                      </p>
                      {v.problemas ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-aviso">
                          <TriangleAlert className="size-3.5" aria-hidden /> {t('aprov.problemas', { n: v.problemas })}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-secundario" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-borda px-6 py-3 text-[13px] text-secundario">
              {t('aprov.nResultados', { n: linhas.length })}
            </div>
          </>
        )}
      </Cartao>

      <Candidatura motorista={aberto} aoFechar={() => setAberto(null)} aoDecidir={depoisDeDecidir} aoMudarDocumento={recarregar} />
    </>
  );
}

function PainelFiltros({ filtros, aoMudar, n }: { filtros: Filtros; aoMudar: (f: Filtros) => void; n: number }) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  return (
    <Balao
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) setRascunho(filtros);
      }}
    >
      <BalaoAbrir asChild>
        <Botao variante="secundario">
          <Filter /> {t('comum.filtrar')}
          {n ? <span className="numeros ml-0.5 rounded-full bg-teal px-1.5 text-xs text-white">{n}</span> : null}
        </Botao>
      </BalaoAbrir>
      <BalaoConteudo className="w-72">
        <p className="mb-3 text-sm font-semibold">{t('aprov.filtroTitulo')}</p>
        <div className="space-y-3">
          <div>
            <Rotulo htmlFor="filtro-veiculo">{t('aprov.filtroVeiculo')}</Rotulo>
            <Selecao
              id="filtro-veiculo"
              value={rascunho.veiculo}
              onChange={(e) => setRascunho({ ...rascunho, veiculo: e.target.value as Filtros['veiculo'] })}
            >
              <option value="todos">{t('comum.todos')}</option>
              <option value="motorbike">{t('veiculo.motorbike')}</option>
              <option value="car">{t('veiculo.car')}</option>
              <option value="carry">{t('veiculo.carry')}</option>
            </Selecao>
          </div>
          <div>
            <Rotulo htmlFor="filtro-docs">{t('aprov.filtroDocumentos')}</Rotulo>
            <Selecao
              id="filtro-docs"
              value={rascunho.documentos}
              onChange={(e) => setRascunho({ ...rascunho, documentos: e.target.value as Filtros['documentos'] })}
            >
              <option value="todos">{t('aprov.filtroDocsTodos')}</option>
              <option value="problemas">{t('aprov.filtroDocsProblemas')}</option>
              <option value="completos">{t('aprov.filtroDocsCompletos')}</option>
            </Selecao>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm">
            {t('aprov.filtroOnline')}
            <Interruptor checked={rascunho.soOnline} onCheckedChange={(v) => setRascunho({ ...rascunho, soOnline: v })} />
          </label>
        </div>
        <div className="mt-4 flex justify-between gap-2 border-t border-borda pt-3">
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={() => {
              aoMudar(FILTROS_INICIAIS);
              setAberto(false);
            }}
          >
            {t('comum.limpar')}
          </Botao>
          <Botao
            tamanho="sm"
            onClick={() => {
              aoMudar(rascunho);
              setAberto(false);
            }}
          >
            {t('aprov.filtroAplicar')}
          </Botao>
        </div>
      </BalaoConteudo>
    </Balao>
  );
}
