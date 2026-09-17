import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Eye, History, KeyRound, RefreshCw, Users } from 'lucide-react';
import { t, type Chave } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { data, dataHora, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Avatar } from '@/components/ui/avatar';
import { Distintivo } from '@/components/ui/distintivo';
import { CampoPesquisa, Selecao } from '@/components/ui/campo';
import { Segmentos } from '@/components/ui/segmentos';
import { Paginacao } from '@/components/ui/paginacao';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { EsqueletoTabela } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio } from '@/components/ui/estados';
import { Dica } from '@/components/ui/menu';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { IconeVeiculo, PapelDaConta } from '@/components/comuns';
import { FichaConta } from './FichaConta';
import { useCodigoAcesso } from './CodigoAcesso';

type Vista = 'contas' | 'registo';
type Papel = 'todos' | 'motoristas' | 'passageiros' | 'admins' | 'suspensas';

export function Contas() {
  const [params, setParams] = useSearchParams();
  const vista: Vista = params.get('vista') === 'registo' ? 'registo' : 'contas';
  const contaAberta = Number(params.get('conta')) || null;

  const mudar = (chave: string, valor: string | null) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    setParams(p, { replace: chave !== 'conta' || !valor });
  };

  return (
    <>
      <CabecalhoPagina titulo={t('contas.titulo')} descricao={t('contas.descricao')} />
      <Segmentos
        rotulo={t('contas.vistas')}
        valor={vista}
        aoMudar={(v) => mudar('vista', v === 'contas' ? null : v)}
        className="mb-6 w-fit rounded-2xl bg-borda/40 p-1"
        opcoes={[
          { valor: 'contas', rotulo: <><Users className="size-4" aria-hidden /> {t('contas.vistaContas')}</> },
          { valor: 'registo', rotulo: <><History className="size-4" aria-hidden /> {t('contas.vistaRegisto')}</> },
        ]}
      />
      {vista === 'contas' ? <ListaContas aoAbrir={(id) => mudar('conta', String(id))} /> : <RegistoAcessos />}
      <FichaConta id={contaAberta} aoFechar={() => mudar('conta', null)} />
    </>
  );
}

function ListaContas({ aoAbrir }: { aoAbrir: (id: number) => void }) {
  const [papel, setPapel] = useState<Papel>('todos');
  const [texto, setTexto] = useState('');
  const [procura, setProcura] = useState('');
  const [pagina, setPagina] = useState(0);
  const codigo = useCodigoAcesso();

  // Espera que se acabe de escrever antes de perguntar ao servidor.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setProcura(texto.trim());
      setPagina(0);
    }, 350);
    return () => window.clearTimeout(id);
  }, [texto]);

  const { dados, erro, aCarregar, aAtualizar, recarregar } = useDados(
    () => api.utilizadores({ q: procura, papel, pagina }),
    [procura, papel, pagina]
  );
  const lista = dados?.utilizadores ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentos
          rotulo={t('contas.papeis')}
          valor={papel}
          aoMudar={(p) => {
            setPapel(p);
            setPagina(0);
          }}
          className="rounded-2xl bg-borda/40 p-1"
          opcoes={(['todos', 'motoristas', 'passageiros', 'admins', 'suspensas'] as Papel[]).map((p) => ({
            valor: p,
            rotulo: t(`contas.papel${p === 'todos' ? 'Todas' : p[0].toUpperCase() + p.slice(1)}` as Chave),
          }))}
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CampoPesquisa
            className="flex-1 sm:w-72"
            placeholder={t('contas.procurar')}
            aria-label={t('contas.procurar')}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Botao variante="secundario" tamanho="icone" onClick={recarregar} aria-label={t('comum.atualizar')}>
            <RefreshCw className={cn(aAtualizar && 'animate-spin')} />
          </Botao>
        </div>
      </div>

      <Cartao className="mt-4 overflow-hidden">
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar ? (
          <EsqueletoTabela colunas={6} />
        ) : !lista.length ? (
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <Users />
              </IlustracaoIcone>
            }
            titulo={t('contas.vazioTitulo')}
            texto={t('contas.vazioTexto')}
          />
        ) : (
          <>
            <Tabela>
              <TCabeca>
                <tr>
                  <TTitulo>{t('contas.colConta')}</TTitulo>
                  <TTitulo className="hidden md:table-cell">{t('comum.email')}</TTitulo>
                  <TTitulo>{t('contas.colPapel')}</TTitulo>
                  <TTitulo className="hidden text-right lg:table-cell">{t('contas.colViagens')}</TTitulo>
                  <TTitulo className="hidden lg:table-cell">{t('contas.colUltima')}</TTitulo>
                  <TTitulo className="text-right">{t('comum.acoes')}</TTitulo>
                </tr>
              </TCabeca>
              <TCorpo>
                {lista.map((u) => (
                  <TLinha key={u.id} clicavel onClick={() => aoAbrir(u.id)}>
                    <TCelula>
                      <div className="flex items-center gap-3">
                        <span className="relative">
                          <Avatar nome={u.nome} />
                          {u.online ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-sucesso ring-2 ring-white" /> : null}
                        </span>
                        <div className="min-w-0 leading-tight">
                          <p className="max-w-56 truncate font-semibold">{u.nome}</p>
                          <p className="numeros mt-0.5 flex items-center gap-1.5 text-xs text-secundario">
                            {u.telefone}
                            {u.veiculo ? (
                              <>
                                · <IconeVeiculo tipo={u.veiculo.tipo} className="size-3" /> {u.veiculo.matricula}
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </TCelula>
                    <TCelula className="hidden max-w-56 truncate text-secundario md:table-cell">{u.email || '—'}</TCelula>
                    <TCelula>
                      <PapelDaConta u={u} />
                    </TCelula>
                    <TCelula className="numeros hidden text-right lg:table-cell">
                      {u.driverStatus ? u.viagensMotorista : u.viagensPassageiro}
                    </TCelula>
                    <TCelula className="hidden whitespace-nowrap text-secundario lg:table-cell" title={u.ultimaVez ? dataHora(u.ultimaVez) : undefined}>
                      {u.ultimaVez ? haQuanto(u.ultimaVez) : t('comum.nunca')}
                    </TCelula>
                    <TCelula className="text-right">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Dica texto={t('contas.gerarCodigo')}>
                          <Botao variante="fantasma" tamanho="iconeSm" aria-label={`${t('contas.gerarCodigo')}: ${u.nome}`} onClick={() => codigo.pedir(u.id, u.nome)}>
                            <KeyRound />
                          </Botao>
                        </Dica>
                        <Botao variante="secundario" tamanho="sm" onClick={() => aoAbrir(u.id)} aria-label={t('contas.verConta', { nome: u.nome })}>
                          <Eye /> {t('comum.ver')}
                        </Botao>
                      </div>
                    </TCelula>
                  </TLinha>
                ))}
              </TCorpo>
            </Tabela>
            <Paginacao pagina={pagina} haMais={!!dados?.haMais} aoMudar={setPagina} />
          </>
        )}
      </Cartao>
      {codigo.janelas}
    </>
  );
}

function RegistoAcessos() {
  const [dias, setDias] = useState<1 | 7 | 30>(7);
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.registo(dias), [dias]);
  const acessos = dados?.acessos ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-secundario">{t('registo.descricao')}</p>
        <Selecao aria-label={t('registo.periodo')} value={dias} onChange={(e) => setDias(Number(e.target.value) as 1 | 7 | 30)} className="w-48">
          <option value={1}>{t('registo.dias1')}</option>
          <option value={7}>{t('registo.dias7')}</option>
          <option value={30}>{t('registo.dias30')}</option>
        </Selecao>
      </div>
      <Cartao className="mt-4 overflow-hidden">
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar ? (
          <EsqueletoTabela colunas={5} />
        ) : !acessos.length ? (
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <History />
              </IlustracaoIcone>
            }
            titulo={t('registo.vazioTitulo')}
            texto={t('registo.vazioTexto')}
          />
        ) : (
          <Tabela>
            <TCabeca>
              <tr>
                <TTitulo>{t('registo.colPessoa')}</TTitulo>
                <TTitulo>{t('registo.colAcao')}</TTitulo>
                <TTitulo className="text-right">{t('registo.colVezes')}</TTitulo>
                <TTitulo>{t('registo.colPor')}</TTitulo>
                <TTitulo>{t('registo.colUltima')}</TTitulo>
              </tr>
            </TCabeca>
            <TCorpo>
              {acessos.map((a) => (
                <TLinha key={a.id}>
                  <TCelula className="font-medium">
                    {a.alvoNome ?? (a.alvoApagado ? <Distintivo>{t('registo.contaApagada')}</Distintivo> : t('registo.semAlvo'))}
                  </TCelula>
                  <TCelula>{a.que}</TCelula>
                  <TCelula className="numeros text-right">{a.vezes}</TCelula>
                  <TCelula className="text-secundario">{a.admins.join(', ')}</TCelula>
                  <TCelula className="whitespace-nowrap" title={a.quandos.map((q) => dataHora(q)).join('\n')}>
                    <p className="numeros">{data(a.quando)}</p>
                    <p className="text-xs text-secundario">{haQuanto(a.quando)}</p>
                  </TCelula>
                </TLinha>
              ))}
            </TCorpo>
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
