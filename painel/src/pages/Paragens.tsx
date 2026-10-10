import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, ExternalLink, Eye, EyeOff, Info, MapPin, MapPinned, MoreHorizontal, Plus, RotateCcw, Tag, Trash2, Users, X } from 'lucide-react';
import { t, tl, type Chave } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { data, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoLugar, GrupoContribuicao, LugarProposto, MoradaDoPonto, MunicipioArvore, Parada } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Ajuda, Campo, CampoPesquisa, Rotulo, Selecao } from '@/components/ui/campo';
import { Segmentos } from '@/components/ui/segmentos';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { Esqueleto, EsqueletoTabela } from '@/components/ui/esqueleto';
import { Interruptor } from '@/components/ui/interruptor';
import { EstadoErro, EstadoVazio, Faixa } from '@/components/ui/estados';
import { Janela, JanelaConteudo, JanelaCabecalho, JanelaTitulo, JanelaDescricao, JanelaCorpo, JanelaRodape } from '@/components/ui/janela';
import { Menu, MenuAbrir, MenuConteudo, MenuItem, MenuSeparador } from '@/components/ui/menu';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { useServico } from '@/layouts/servico';
import { EscolherCategoria } from '@/components/escolher-categoria';
import { CATEGORIA_DO_TIPO, nomeCategoria, tipoDaCategoria } from '@/lib/categoriasGiara';
import type { QualPino } from '@/components/mapa/MapaParagem';
import HOTEIS from '@/lib/hoteisDili.json';

// O MapLibre pesa mais do que o resto do painel junto: só se descarrega quando
// se abre a janela de baptizar, como o mapa da viagem.
const MapaEscolher = lazy(() => import('@/components/mapa/MapaEscolher'));
const MapaParagem = lazy(() => import('@/components/mapa/MapaParagem'));

type Vista = 'lugares' | 'paradas' | 'contribuicoes';

export function Paragens() {
  const [params, setParams] = useSearchParams();
  const v = params.get('vista');
  const vista: Vista = v === 'paradas' || v === 'contribuicoes' ? v : 'lugares';
  const [procura, setProcura] = useState('');

  return (
    <>
      <CabecalhoPagina titulo={t('parag.titulo')} descricao={t('parag.descricao')} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmentos
          rotulo={t('parag.vistas')}
          valor={vista}
          aoMudar={(v) => {
            const p = new URLSearchParams(params);
            if (v === 'lugares') p.delete('vista');
            else p.set('vista', v);
            p.delete('estado');
            setParams(p, { replace: true });
          }}
          className="rounded-2xl bg-borda/40 p-1"
          opcoes={[
            { valor: 'lugares', rotulo: <><MapPin className="size-4" aria-hidden /> {t('parag.vistaLugares')}</> },
            { valor: 'paradas', rotulo: <><MapPinned className="size-4" aria-hidden /> {t('parag.vistaParadas')}</> },
            { valor: 'contribuicoes', rotulo: <><Users className="size-4" aria-hidden /> {t('parag.vistaContribuicoes')}</> },
          ]}
        />
        <CampoPesquisa
          className="w-full sm:w-80"
          placeholder={t('parag.procurar')}
          aria-label={t('parag.procurar')}
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
        />
      </div>
      {vista === 'lugares' ? (
        <Lugares procura={procura} estadoInicial={params.get('estado') as EstadoLugar | null} />
      ) : vista === 'paradas' ? (
        <Paradas procura={procura} />
      ) : (
        <Contribuicoes procura={procura} />
      )}
    </>
  );
}

function Lugares({ procura, estadoInicial }: { procura: string; estadoInicial: EstadoLugar | null }) {
  const [estado, setEstado] = useState<EstadoLugar | 'todos'>(estadoInicial ?? 'novo');
  // O recusado que se está a pedir para eliminar — ver a confirmação no fim.
  const [eliminar, setEliminar] = useState<LugarProposto | null>(null);
  const [baptizar, setBaptizar] = useState(false);
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.lugares(estado), [estado]);
  const q = procura.trim().toLowerCase();
  const lugares = useMemo(
    () => (dados?.lugares ?? []).filter((l) => !q || `${l.nome} ${l.morada ?? ''} ${l.quem ?? ''}`.toLowerCase().includes(q)),
    [dados, q]
  );

  const mudarEstado = async (l: LugarProposto, novo: EstadoLugar) => {
    try {
      await api.estadoLugar(l.id, novo);
      avisar.sucesso(t('parag.estadoMudado'), `${l.nome}: ${tl('estadoLugar', novo)}`);
      recarregar();
    } catch (e) {
      avisar.erro(mensagemDe(e));
    }
  };

  const mudarMostrar = async (l: LugarProposto, mostrarSempre: boolean) => {
    try {
      await api.mostrarLugar(l.id, mostrarSempre);
      avisar.sucesso(t('parag.mostrarMudado'), l.nome);
      recarregar();
    } catch (e) {
      avisar.erro(mensagemDe(e));
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar.sucesso(t('comum.copiado'));
    } catch {
      avisar.erro('Não foi possível copiar.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentos
          rotulo={t('parag.filtroEstado')}
          valor={estado}
          aoMudar={setEstado}
          className="rounded-2xl bg-borda/40 p-1"
          opcoes={(['novo', 'aceite', 'recusado', 'todos'] as const).map((e) => ({ valor: e, rotulo: t(`estadoLugar.${e}` as Chave) }))}
        />
        <Botao onClick={() => setBaptizar(true)}>
          <Tag /> {t('parag.baptizar')}
        </Botao>
      </div>
      <Faixa cor="teal" icone={<Info />} className="mt-4">
        {t('parag.lugaresNota')}
      </Faixa>
      <Cartao className="mt-4 overflow-hidden">
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar ? (
          <EsqueletoTabela colunas={5} />
        ) : !lugares.length ? (
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <MapPin />
              </IlustracaoIcone>
            }
            titulo={t(estado === 'novo' ? 'parag.vazioLugaresTitulo' : (`parag.vazioLugaresTitulo.${estado}` as Chave))}
            texto={t('parag.vazioLugaresTexto')}
          />
        ) : (
          <Tabela>
            <TCabeca>
              <tr>
                <TTitulo>{t('parag.colLugar')}</TTitulo>
                <TTitulo className="hidden md:table-cell">{t('parag.colMorada')}</TTitulo>
                <TTitulo className="hidden lg:table-cell">{t('parag.colProposto')}</TTitulo>
                <TTitulo>{t('comum.estado')}</TTitulo>
                <TTitulo className="text-right">{t('comum.acoes')}</TTitulo>
              </tr>
            </TCabeca>
            <TCorpo>
              {lugares.map((l) => (
                <TLinha key={l.id}>
                  <TCelula>
                    <p className="font-semibold">{l.nome}</p>
                    <p className="text-xs text-secundario">
                      {nomeCategoria(l.categoria) ?? l.etiqueta ?? (l.tipo === 'outro' && l.tipoOutro ? `${t('tipoLugar.outro')}: ${l.tipoOutro}` : l.tipo) ?? '—'}
                    </p>
                    {l.mostrarSempre ? (
                      <Distintivo cor="teal" className="mt-1">
                        {t('parag.sempreNoMapa')}
                      </Distintivo>
                    ) : null}
                  </TCelula>
                  <TCelula className="hidden max-w-80 md:table-cell">
                    <p className="truncate">{l.morada || '—'}</p>
                    <p className="numeros text-xs text-secundario">
                      {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
                    </p>
                  </TCelula>
                  <TCelula className="hidden lg:table-cell">
                    <p>{l.quem ?? '—'}</p>
                    <p className="text-xs text-secundario" title={data(l.quando)}>
                      {haQuanto(l.quando)}
                    </p>
                  </TCelula>
                  <TCelula>
                    <Distintivo cor={l.estado === 'aceite' ? 'sucesso' : l.estado === 'recusado' ? 'neutro' : 'coral'} ponto>
                      {tl('estadoLugar', l.estado)}
                    </Distintivo>
                  </TCelula>
                  <TCelula className="text-right">
                    <Menu>
                      <MenuAbrir asChild>
                        <Botao variante="secundario" tamanho="iconeSm" aria-label={`${t('comum.acoes')}: ${l.nome}`}>
                          <MoreHorizontal />
                        </Botao>
                      </MenuAbrir>
                      <MenuConteudo className="w-64">
                        <MenuItem onSelect={() => window.open(l.editar, '_blank', 'noopener')}>
                          <ExternalLink /> {t('parag.abrirOsm')}
                        </MenuItem>
                        <MenuItem onSelect={() => copiar(l.etiquetas)}>
                          <Copy /> {t('parag.copiarEtiquetas')}
                        </MenuItem>
                        <MenuSeparador />
                        {l.estado !== 'aceite' ? (
                          <MenuItem onSelect={() => mudarEstado(l, 'aceite')}>
                            <Check /> {t('parag.aceitar')}
                          </MenuItem>
                        ) : null}
                        {l.estado !== 'recusado' ? (
                          <MenuItem perigo onSelect={() => mudarEstado(l, 'recusado')}>
                            <X /> {t('parag.recusar')}
                          </MenuItem>
                        ) : null}
                        {l.estado !== 'novo' ? (
                          <MenuItem onSelect={() => mudarEstado(l, 'novo')}>
                            <RotateCcw /> {t('parag.reabrir')}
                          </MenuItem>
                        ) : null}
                        {l.estado === 'aceite' ? (
                          <MenuItem onSelect={() => mudarMostrar(l, !l.mostrarSempre)}>
                            {l.mostrarSempre ? <EyeOff /> : <Eye />}{' '}
                            {t(l.mostrarSempre ? 'parag.deixarGoogle' : 'parag.mostrarSempre')}
                          </MenuItem>
                        ) : null}
                        {/* SÓ OS RECUSADOS se eliminam (30/09/2026). Um aceite está no mapa
                            de toda a gente; um por rever ainda não foi decidido. */}
                        {l.estado === 'recusado' ? (
                          <>
                            <MenuSeparador />
                            <MenuItem perigo onSelect={() => setEliminar(l)}>
                              <Trash2 /> {t('parag.eliminarLugar')}
                            </MenuItem>
                          </>
                        ) : null}
                      </MenuConteudo>
                    </Menu>
                  </TCelula>
                </TLinha>
              ))}
            </TCorpo>
          </Tabela>
        )}
      </Cartao>

      <BaptizarLugar
        aberta={baptizar}
        aoMudar={setBaptizar}
        aoGuardar={() => {
          // O sítio baptizado entra aceite: mostra-se já onde ele está.
          if (estado === 'aceite' || estado === 'todos') recarregar();
          else setEstado('aceite');
        }}
      />

      <DialogoConfirmacao
        aberto={!!eliminar}
        aoMudar={(v) => !v && setEliminar(null)}
        titulo={t('parag.eliminarLugarTitulo')}
        texto={t('parag.eliminarLugarTexto', { nome: eliminar?.nome ?? '' })}
        rotuloConfirmar={t('parag.eliminarLugar')}
        perigo
        aoConfirmar={async () => {
          if (!eliminar) return;
          await api.eliminarLugar(eliminar.id);
          avisar.sucesso(t('parag.lugarEliminado'), eliminar.nome);
          recarregar();
        }}
      />
    </>
  );
}

// "-8.51956, 125.60763" → [-8.51956, 125.60763]. Aceita vírgula ou espaço:
// quem cola coordenadas cola-as como as encontrou.
function lerCoordenadas(texto: string): [number, number] | null {
  const n = String(texto || '').trim().split(/[,\s]+/).map(Number).filter(Number.isFinite);
  return n.length === 2 ? [n[0], n[1]] : null;
}
// A mesma caixa que o servidor usa: um engano a colar coordenadas criava uma
// paragem no meio do oceano.
const dentroDeTL = ([la, ln]: [number, number]) => la > -9.6 && la < -8.1 && ln > 124 && ln < 127.4;

const coordenada = z
  .string()
  .refine((v) => lerCoordenadas(v) != null, { message: t('parag.erroCoord') })
  .refine((v) => {
    const c = lerCoordenadas(v);
    return !c || dentroDeTL(c);
  }, { message: t('parag.erroForaTL') });

const esquema = z.object({
  nome: z.string().trim().min(2, t('parag.erroNome')),
  sitio: coordenada,
  parada: coordenada,
  raio: z.coerce.number().int().min(10, t('parag.erroRaio')).max(2000, t('parag.erroRaio')),
});
type Formulario = z.input<typeof esquema>;

function Paradas({ procura }: { procura: string }) {
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.paradas(), []);
  const [nova, setNova] = useState(false);
  const [apagar, setApagar] = useState<Parada | null>(null);
  const [inicial, setInicial] = useState<InicialParada | null>(null);
  const q = procura.trim().toLowerCase();
  const paradas = (dados?.paradas ?? []).filter((p) => !q || p.nome.toLowerCase().includes(q));

  return (
    <>
      <div className="flex justify-end">
        <Botao onClick={() => { setInicial(null); setNova(true); }}>
          <Plus /> {t('parag.nova')}
        </Botao>
      </div>
      {dados ? (
        <HoteisPorMarcar
          paradas={dados.paradas}
          procura={procura}
          aoMarcar={(h) => {
            setInicial(h);
            setNova(true);
          }}
        />
      ) : null}
      <Cartao className="mt-4 overflow-hidden">
        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        ) : aCarregar ? (
          <EsqueletoTabela colunas={5} />
        ) : !paradas.length ? (
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <MapPinned />
              </IlustracaoIcone>
            }
            titulo={t('parag.vazioParadasTitulo')}
            texto={t('parag.vazioParadasTexto')}
            acao={
              <Botao onClick={() => setNova(true)}>
                <Plus /> {t('parag.nova')}
              </Botao>
            }
          />
        ) : (
          <Tabela>
            <TCabeca>
              <tr>
                <TTitulo>{t('parag.colNome')}</TTitulo>
                <TTitulo className="hidden md:table-cell">{t('parag.colSitio')}</TTitulo>
                <TTitulo className="hidden md:table-cell">{t('parag.colParada')}</TTitulo>
                <TTitulo className="text-right">{t('parag.colRaio')}</TTitulo>
                <TTitulo className="hidden lg:table-cell">{t('parag.colCriada')}</TTitulo>
                <TTitulo className="text-right">{t('comum.acoes')}</TTitulo>
              </tr>
            </TCabeca>
            <TCorpo>
              {paradas.map((p) => (
                <TLinha key={p.id}>
                  <TCelula className="font-semibold">{p.nome}</TCelula>
                  <TCelula className="numeros hidden text-secundario md:table-cell">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </TCelula>
                  <TCelula className="numeros hidden md:table-cell">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.parada_lat}&mlon=${p.parada_lng}#map=18/${p.parada_lat}/${p.parada_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-escuro hover:underline"
                    >
                      {p.parada_lat.toFixed(5)}, {p.parada_lng.toFixed(5)}
                    </a>
                  </TCelula>
                  <TCelula className="numeros text-right">{p.raio_m} m</TCelula>
                  <TCelula className="hidden text-secundario lg:table-cell">
                    {data(p.created_at)}
                    {p.criada_por ? <span className="block text-xs">{p.criada_por}</span> : null}
                  </TCelula>
                  <TCelula className="text-right">
                    <Botao variante="perigoContorno" tamanho="sm" onClick={() => setApagar(p)}>
                      <Trash2 /> {t('parag.apagar')}
                    </Botao>
                  </TCelula>
                </TLinha>
              ))}
            </TCorpo>
          </Tabela>
        )}
      </Cartao>

      <NovaParada aberta={nova} aoMudar={setNova} aoGuardar={recarregar} inicial={inicial} />

      <DialogoConfirmacao
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo={t('parag.apagarTitulo')}
        texto={t('parag.apagarTexto', { nome: apagar?.nome ?? '' })}
        rotuloConfirmar={t('parag.apagar')}
        perigo
        aoConfirmar={async () => {
          if (!apagar) return;
          await api.apagarParada(apagar.id);
          avisar.sucesso(t('parag.apagada'));
          recarregar();
        }}
      />
    </>
  );
}

// «AJUDE A MELHORAR O MAPA» (10/10/2026): o que passageiros e motoristas
// responderam depois das viagens, agrupado — a mesma resposta no mesmo sítio
// conta uma vez, com quantas PESSOAS a deram (a confiança). Sem nomes, de
// propósito. Aceitar um bairro, uma aldeia ou o nome de um sítio põe-no no
// HAKAT Maps; o suco, o posto e o município passam a ser o que se pergunta só
// para confirmar; um problema aceite fica como tratado.
function Contribuicoes({ procura }: { procura: string }) {
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.contribuicoesMapa(), []);
  const { recarregarNotificacoes } = useServico();
  const [aDecidir, setADecidir] = useState<string | null>(null);
  const q = procura.trim().toLowerCase();
  const grupos = (dados?.grupos ?? []).filter((g) => !q || g.resposta.toLowerCase().includes(q));
  const chave = (g: GrupoContribuicao) => g.ids.join(',');
  const decidir = async (g: GrupoContribuicao, aceitar: boolean) => {
    setADecidir(chave(g));
    try {
      await api.decidirContribuicao(g.ids, aceitar);
      avisar.sucesso(t(aceitar ? 'contrib.aceite' : 'contrib.recusada'), g.resposta);
      recarregar();
      recarregarNotificacoes();
    } catch (e) {
      avisar.erro(mensagemDe(e));
    } finally {
      setADecidir(null);
    }
  };
  const resposta = (g: GrupoContribuicao) =>
    g.tipo === 'problema' ? g.resposta.split(',').map((c) => t(('contrib.prob_' + c) as Chave)).join(', ') : g.resposta;

  return (
    <Cartao className="overflow-hidden">
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar ? (
        <EsqueletoTabela colunas={5} />
      ) : !grupos.length ? (
        <EstadoVazio
          ilustracao={
            <IlustracaoIcone>
              <Users />
            </IlustracaoIcone>
          }
          titulo={t('contrib.vazioTitulo')}
          texto={t('contrib.vazioTexto')}
        />
      ) : (
        <Tabela>
          <TCabeca>
            <tr>
              <TTitulo>{t('contrib.colPergunta')}</TTitulo>
              <TTitulo>{t('contrib.colResposta')}</TTitulo>
              <TTitulo className="text-right">{t('contrib.colConfianca')}</TTitulo>
              <TTitulo className="hidden md:table-cell">{t('contrib.colOnde')}</TTitulo>
              <TTitulo className="text-right">{t('comum.acoes')}</TTitulo>
            </tr>
          </TCabeca>
          <TCorpo>
            {grupos.map((g) => (
              <TLinha key={chave(g)}>
                <TCelula className="text-secundario">{t(('contrib.tipo_' + g.tipo) as Chave)}</TCelula>
                <TCelula>
                  <span className="font-semibold">{resposta(g)}</span>
                  {g.categoria ? <span className="block text-xs text-secundario">{nomeCategoria(g.categoria)}</span> : null}
                  {g.confirmaram ? <span className="block text-xs text-teal-escuro">{t('contrib.confirmaram')}</span> : null}
                  {g.notas.length ? <span className="block text-xs text-secundario">«{g.notas.join('» · «')}»</span> : null}
                </TCelula>
                <TCelula className="text-right">
                  <Distintivo cor={g.pessoas >= 3 ? 'sucesso' : g.pessoas === 2 ? 'teal' : 'neutro'}>
                    {t('contrib.pessoas', { n: String(g.pessoas) })}
                  </Distintivo>
                </TCelula>
                <TCelula className="numeros hidden md:table-cell">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lng}#map=18/${g.lat}/${g.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-escuro hover:underline"
                  >
                    {g.lat.toFixed(5)}, {g.lng.toFixed(5)}
                  </a>
                  <span className="block text-xs text-secundario">{haQuanto(g.ultima)}</span>
                </TCelula>
                <TCelula className="text-right">
                  <div className="flex justify-end gap-2">
                    <Botao tamanho="sm" aCarregar={aDecidir === chave(g)} onClick={() => decidir(g, true)}>
                      <Check /> {t(g.tipo === 'problema' ? 'contrib.tratado' : 'contrib.aceitar')}
                    </Botao>
                    <Botao tamanho="sm" variante="secundario" onClick={() => decidir(g, false)}>
                      <X /> {t('contrib.recusar')}
                    </Botao>
                  </div>
                </TCelula>
              </TLinha>
            ))}
          </TCorpo>
        </Tabela>
      )}
    </Cartao>
  );
}

export type InicialParada = { nome: string; lat: number; lng: number; paradaLat: number; paradaLng: number; raio: number; origem?: string };

// A NOVA PARAGEM COM O MAPA (10/10/2026). Antes eram só coordenadas escritas
// à mão; agora há dois pinos que se arrastam (o sítio e onde o carro pára) e
// o círculo do raio. As coordenadas continuam em baixo, para colar do Google.
// `inicial` vem da lista «Hotéis por marcar» já com a proposta.
function NovaParada({ aberta, aoMudar, aoGuardar, inicial }: { aberta: boolean; aoMudar: (v: boolean) => void; aoGuardar: () => void; inicial?: InicialParada | null }) {
  const vazio = { nome: '', sitio: '', parada: '', raio: 150 };
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: vazio });
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [modo, setModo] = useState<QualPino>('parada');

  // Cada vez que abre com um hotel, o formulário começa com a proposta dele.
  useEffect(() => {
    if (!aberta) return;
    setModo(inicial ? 'parada' : 'sitio');
    reset(
      inicial
        ? { nome: inicial.nome, sitio: `${inicial.lat}, ${inicial.lng}`, parada: `${inicial.paradaLat}, ${inicial.paradaLng}`, raio: inicial.raio }
        : vazio
    );
  }, [aberta, inicial]); // eslint-disable-line react-hooks/exhaustive-deps

  const sitio = lerCoordenadas(watch('sitio'));
  const parada = lerCoordenadas(watch('parada'));
  const raio = Number(watch('raio')) || 0;

  const guardar = handleSubmit(async (f) => {
    setErroServidor(null);
    const s = lerCoordenadas(f.sitio)!;
    const pr = lerCoordenadas(f.parada)!;
    try {
      await api.criarParada({ nome: f.nome.trim(), lat: s[0], lng: s[1], paradaLat: pr[0], paradaLng: pr[1], raioM: Number(f.raio) });
      avisar.sucesso(t('parag.guardada'), f.nome);
      reset(vazio);
      aoMudar(false);
      aoGuardar();
    } catch (e) {
      setErroServidor(mensagemDe(e));
    }
  });

  return (
    <Janela open={aberta} onOpenChange={(v) => { if (!v) { reset(vazio); setErroServidor(null); } aoMudar(v); }}>
      <JanelaConteudo largura="tela">
        <form onSubmit={guardar} noValidate className="flex min-h-0 flex-1 flex-col">
          <JanelaCabecalho>
            <JanelaTitulo>{t('parag.nova')}</JanelaTitulo>
            <JanelaDescricao>{t('parag.novaDescricao')}</JanelaDescricao>
          </JanelaCabecalho>
          {/* Como no «Baptizar»: em ecrã largo o mapa à esquerda e alto; no
              telemóvel uma coluna só, a rolar. */}
          <JanelaCorpo className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
            {erroServidor ? (
              <p role="alert" className="rounded-lg bg-perigo-claro px-3 py-2 text-sm text-perigo md:col-span-2">
                {erroServidor}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 md:min-h-0">
              <Segmentos
                rotulo={t('parag.cliqueMarca')}
                valor={modo}
                aoMudar={(v) => setModo(v as QualPino)}
                className="self-start rounded-2xl bg-borda/40 p-1"
                opcoes={[
                  { valor: 'sitio', rotulo: <><span className="size-3 rounded-full bg-teal" aria-hidden /> {t('parag.pinoSitio')}</> },
                  { valor: 'parada', rotulo: <><span className="size-3 rounded-full bg-coral" aria-hidden /> {t('parag.pinoParada')}</> },
                ]}
              />
              {aberta ? (
                <Suspense fallback={<Esqueleto className="min-h-80 w-full flex-1 rounded-xl" />}>
                  <MapaParagem
                    className="min-h-80 flex-1"
                    sitio={sitio}
                    parada={parada}
                    raio={raio}
                    modo={modo}
                    aoMudar={(qual, lat, lng) => setValue(qual, `${lat}, ${lng}`, { shouldValidate: true })}
                  />
                </Suspense>
              ) : null}
              <Ajuda>{t('parag.ajudaMapaParagem')}</Ajuda>
              {inicial?.origem === 'centro' ? (
                <p className="rounded-lg bg-aviso-claro px-3 py-2 text-[13px] text-texto">{t('parag.hotelPorAfinar')}</p>
              ) : null}
            </div>
            <div className="space-y-4 md:min-h-0 md:overflow-y-auto md:pr-1">
              <div>
                <Rotulo htmlFor="p-nome">{t('parag.nome')}</Rotulo>
                <Campo id="p-nome" placeholder={t('parag.nomeExemplo')} aria-invalid={!!errors.nome} {...register('nome')} />
                {errors.nome ? <Ajuda erro>{errors.nome.message}</Ajuda> : null}
              </div>
              <div>
                <Rotulo htmlFor="p-sitio">{t('parag.sitio')}</Rotulo>
                <Campo id="p-sitio" inputMode="decimal" placeholder={t('parag.coordExemplo')} aria-invalid={!!errors.sitio} {...register('sitio')} />
                <Ajuda erro={!!errors.sitio}>{errors.sitio?.message ?? t('parag.coordAjuda')}</Ajuda>
              </div>
              <div>
                <Rotulo htmlFor="p-parada">{t('parag.parada')}</Rotulo>
                <Campo id="p-parada" inputMode="decimal" placeholder="-8.52210, 125.61050" aria-invalid={!!errors.parada} {...register('parada')} />
                {errors.parada ? <Ajuda erro>{errors.parada.message}</Ajuda> : null}
              </div>
              <div>
                <Rotulo htmlFor="p-raio">{t('parag.raio')}</Rotulo>
                <Campo id="p-raio" type="number" min={10} max={2000} className="w-40" aria-invalid={!!errors.raio} {...register('raio')} />
                <Ajuda erro={!!errors.raio}>{errors.raio?.message ?? t('parag.raioAjuda')}</Ajuda>
              </div>
            </div>
          </JanelaCorpo>
          <JanelaRodape>
            <Botao variante="secundario" onClick={() => aoMudar(false)}>
              {t('comum.cancelar')}
            </Botao>
            <Botao type="submit" aCarregar={isSubmitting}>
              {t('parag.guardar')}
            </Botao>
          </JanelaRodape>
        </form>
      </JanelaConteudo>
    </Janela>
  );
}

// OS HOTÉIS POR MARCAR (10/10/2026). Os hotéis de Díli no OpenStreetMap
// (backend/scripts/gerar-hoteis-dili.mjs → lib/hoteisDili.json), menos os que
// já têm uma paragem cujo círculo os cobre. «Marcar» abre a nova paragem com
// a proposta: falta só pôr o pino coral no lobby ou no portão, e guardar.
function HoteisPorMarcar({ paradas, procura, aoMarcar }: { paradas: Parada[]; procura: string; aoMarcar: (h: InicialParada) => void }) {
  const [aberto, setAberto] = useState(false);
  const q = procura.trim().toLowerCase();
  const metros = (a: number, b: number, c: number, d: number) => {
    const k = Math.cos((a * Math.PI) / 180);
    return Math.hypot((d - b) * k, c - a) * 111320;
  };
  const porMarcar = HOTEIS.hoteis.filter((h) => !paradas.some((p) => metros(h.lat, h.lng, p.lat, p.lng) <= Math.max(p.raio_m, 40)));
  const lista = porMarcar.filter((h) => !q || h.nome.toLowerCase().includes(q));
  if (!porMarcar.length) return null;
  return (
    <Cartao className="mt-4 p-4">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span>
          <span className="block font-semibold text-texto">{t('parag.hoteisTitulo', { n: String(porMarcar.length) })}</span>
          <span className="block text-[13px] text-secundario">{t('parag.hoteisTexto')}</span>
        </span>
        <Distintivo>{aberto ? t('parag.esconder') : t('parag.mostrar')}</Distintivo>
      </button>
      {aberto ? (
        <ul className="mt-3 max-h-96 divide-y divide-borda overflow-y-auto">
          {lista.map((h) => (
            <li key={`${h.nome}-${h.lat}`} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium text-texto">{h.nome}</span>
                <span className="block text-xs text-secundario">{t(('parag.origem_' + h.origem) as Chave)}</span>
              </span>
              <Botao tamanho="sm" variante="secundario" onClick={() => aoMarcar(h)}>
                <MapPinned /> {t('parag.marcar')}
              </Botao>
            </li>
          ))}
        </ul>
      ) : null}
    </Cartao>
  );
}

// ── BAPTIZAR UM SÍTIO (30/09/2026, pedido do Simão) ───────────────────────
//
// O administrador dá ele próprio o nome, e fica aceite logo. Até aqui só se
// reviam os nomes dos passageiros — e o «Judicial Training Center» do Google,
// que é o Centro de Formação Jurídica, não tinha como ser corrigido.
//
// O FORMULÁRIO É O DA APP (NomearLugar.js), campo a campo, a pedido dele: o
// nome, o tipo, e onde fica — endereço, município, posto, suco, aldeia e
// bairro. O município e o posto preenchem-se pelas coordenadas, os sucos vêm
// do posto, e as aldeias que alguém já escreveu no suco aparecem para tocar.
// É a morada que o OpenStreetMap pede para aceitar um sítio.
const TIPOS_LUGAR = ['casa', 'edificio', 'loja', 'restaurante', 'escola', 'hotel', 'igreja', 'mercado', 'escritorio', 'bairro', 'poi', 'outro'] as const;

const esquemaBaptizar = z.object({
  nome: z.string().trim().min(2, t('parag.erroNome')).max(120, t('parag.erroNomeLongo')),
  sitio: coordenada,
  mostrarSempre: z.boolean(),
  tipo: z.string(),
  tipoOutro: z.string(),
  categoria: z.string(),
  endereco: z.string(),
  municipio: z.string(),
  posto: z.string(),
  suco: z.string(),
  aldeia: z.string(),
  bairro: z.string(),
});
type FormBaptizar = z.input<typeof esquemaBaptizar>;
const VAZIO: FormBaptizar = { nome: '', sitio: '', mostrarSempre: false, tipo: '', tipoOutro: '', categoria: '', endereco: '', municipio: '', posto: '', suco: '', aldeia: '', bairro: '' };

// A árvore não muda enquanto o painel está aberto: pede-se uma vez.
let arvoreGuardada: MunicipioArvore[] | null = null;

function BaptizarLugar({ aberta, aoMudar, aoGuardar }: { aberta: boolean; aoMudar: (v: boolean) => void; aoGuardar: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormBaptizar>({ resolver: zodResolver(esquemaBaptizar), defaultValues: VAZIO });
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [arvore, setArvore] = useState<MunicipioArvore[] | null>(arvoreGuardada);
  const [morada, setMorada] = useState<MoradaDoPonto | null>(null);
  const [aDescobrir, setADescobrir] = useState(false);
  // Os baptizados desde que a janela abriu. A janela FICA ABERTA depois de
  // baptizar (30/09/2026, pedido do Simão): quem está a dar nome a uma rua
  // inteira de sítios não quer reabri-la a cada um. Esta lista é o que lhe
  // diz que o anterior ficou guardado.
  const [baptizados, setBaptizados] = useState<string[]>([]);

  // O pino segue o campo: só um ponto que se percebe e que é de Timor-Leste.
  const lido = lerCoordenadas(watch('sitio'));
  const ponto = lido && dentroDeTL(lido) ? lido : null;
  const [mostrarSempre, tipo, categoria, municipioId, postoId, sucoId, aldeia] = watch(['mostrarSempre', 'tipo', 'categoria', 'municipio', 'posto', 'suco', 'aldeia']);

  // A árvore, ao abrir.
  useEffect(() => {
    if (!aberta || arvore) return;
    api
      .arvoreLugares()
      .then((r) => {
        arvoreGuardada = r.municipios;
        setArvore(r.municipios);
      })
      .catch(() => {});
  }, [aberta, arvore]);

  // ONDE FICA, perguntado quando o pino pára meio segundo. Cada ponto novo
  // volta a preencher o município e o posto; a aldeia só se estiver vazia —
  // o que se escreveu à mão não se apaga.
  useEffect(() => {
    if (!aberta || !ponto) return;
    let vivo = true;
    const relogio = setTimeout(() => {
      setADescobrir(true);
      api
        .moradaDoPonto(ponto[0], ponto[1])
        .then((r) => {
          if (!vivo) return;
          setMorada(r);
          setValue('municipio', r.municipio?.id ?? '');
          setValue('posto', r.posto?.id ?? '');
          if (!r.sucos.some((x) => x.id === sucoId)) setValue('suco', '');
          if (!aldeia.trim() && r.sugestaoAldeia) setValue('aldeia', r.sugestaoAldeia);
        })
        .catch(() => {})
        .finally(() => vivo && setADescobrir(false));
    }, 500);
    return () => {
      vivo = false;
      clearTimeout(relogio);
    };
  }, [aberta, ponto?.[0], ponto?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // As opções de cada lista, sempre a partir do que está escolhido acima. Sem
  // a árvore (ainda a chegar), o que as coordenadas disseram basta.
  const municipios = arvore ?? (morada?.municipio ? [{ ...morada.municipio, postos: [] }] : []);
  const postos =
    arvore?.find((m) => m.id === municipioId)?.postos ??
    (morada?.posto && morada.municipio?.id === municipioId ? [{ ...morada.posto, sucos: morada.sucos }] : []);
  const sucos = postos.find((x) => x.id === postoId)?.sucos ?? [];
  const nomeSuco = sucos.find((x) => x.id === sucoId)?.nome;
  const aldeiasSugeridas = (morada?.aldeias ?? [])
    .filter((a) => (nomeSuco ? a.suco === nomeSuco : true) && a.aldeia !== aldeia)
    .map((a) => a.aldeia)
    .filter((a, i, todas) => todas.indexOf(a) === i)
    .slice(0, 6);

  // Limpar os campos para o sítio seguinte. O mapa fica onde está — o próximo
  // sítio costuma ser ali ao lado —, só o pino sai.
  const limpar = () => {
    reset(VAZIO);
    setMorada(null);
    setErroServidor(null);
  };
  const fechar = () => {
    limpar();
    setBaptizados([]);
    aoMudar(false);
  };

  const guardar = handleSubmit(async (f) => {
    setErroServidor(null);
    const [lat, lng] = lerCoordenadas(f.sitio)!;
    const texto = (v: string) => v.trim() || null;
    try {
      await api.baptizarLugar({
        nome: f.nome.trim(),
        lat,
        lng,
        mostrarSempre: f.mostrarSempre,
        tipo: f.tipo || null,
        tipoOutro: f.tipo === 'outro' ? texto(f.tipoOutro) : null,
        categoria: f.tipo ? f.categoria || null : null,
        endereco: texto(f.endereco),
        municipio: municipios.find((m) => m.id === f.municipio)?.nome ?? null,
        posto: postos.find((x) => x.id === f.posto)?.nome ?? null,
        suco: sucos.find((x) => x.id === f.suco)?.nome ?? null,
        aldeia: texto(f.aldeia),
        bairro: texto(f.bairro),
      });
      // Sem aviso a flutuar: ficava por cima do botão «Baptizar» durante uns
      // segundos, a apanhar o clique do sítio seguinte. A confirmação é a
      // linha do rodapé, que o leitor de ecrã também anuncia.
      setBaptizados((b) => [f.nome.trim(), ...b]);
      limpar();
      aoGuardar();
    } catch (e) {
      setErroServidor(mensagemDe(e));
    }
  });

  const opcional = <span className="font-normal text-secundario"> · {t('parag.opcional')}</span>;

  return (
    <Janela open={aberta} onOpenChange={(v) => (v ? aoMudar(true) : fechar())}>
      <JanelaConteudo largura="tela">
        <form onSubmit={guardar} noValidate className="flex min-h-0 flex-1 flex-col">
          <JanelaCabecalho>
            <JanelaTitulo>{t('parag.baptizar')}</JanelaTitulo>
            <JanelaDescricao>{t('parag.baptizarDescricao')}</JanelaDescricao>
          </JanelaCabecalho>
          {/* NO ECRÃ INTEIRO (30/09/2026): em ecrã largo, cada coluna ocupa a
              altura toda e rola sozinha se não couber — o mapa estica até ao
              fundo, e os campos ficam compactos para caberem sem rolar. No
              telemóvel, uma coluna só, a rolar como antes. O `min-h-0` das
              colunas é SÓ do ecrã largo: no telemóvel encolhia-as à altura
              da janela e o nome e as coordenadas ficavam tapados (07/10/2026). */}
          <JanelaCorpo className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
            {erroServidor ? (
              <p role="alert" className="rounded-lg bg-perigo-claro px-3 py-2 text-sm text-perigo md:col-span-2">
                {erroServidor}
              </p>
            ) : null}

            {/* À esquerda: onde é. O MAPA É O MAIOR da janela (30/09/2026,
                pedido do Simão): três quintos da largura e a altura toda; por
                baixo dele só as coordenadas. */}
            <div className="flex flex-col gap-3 md:min-h-0">
              <div className="flex flex-1 flex-col md:min-h-0">
                {aberta ? (
                  <Suspense fallback={<Esqueleto className="min-h-80 w-full flex-1 rounded-xl" />}>
                    <MapaEscolher className="min-h-80 flex-1" ponto={ponto} aoEscolher={(lat, lng) => setValue('sitio', `${lat}, ${lng}`, { shouldValidate: true })} />
                  </Suspense>
                ) : null}
                <Ajuda>{t('parag.baptizarAjudaMapa')}</Ajuda>
              </div>
              <div>
                <Rotulo htmlFor="b-sitio">{t('parag.sitio')}</Rotulo>
                <Campo id="b-sitio" inputMode="decimal" placeholder={t('parag.coordExemplo')} aria-invalid={!!errors.sitio} {...register('sitio')} />
                {errors.sitio ? <Ajuda erro>{errors.sitio.message}</Ajuda> : null}
              </div>
            </div>

            {/* À direita: o que é, como na app. */}
            <div className="space-y-3 md:min-h-0 md:overflow-y-auto md:pr-1">
              <div>
                <Rotulo htmlFor="b-nome">{t('parag.nome')}</Rotulo>
                <Campo id="b-nome" placeholder={t('parag.baptizarNomeExemplo')} aria-invalid={!!errors.nome} {...register('nome')} />
                {errors.nome ? <Ajuda erro>{errors.nome.message}</Ajuda> : null}
              </div>

              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold text-texto">{t('parag.tipoPergunta')}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS_LUGAR.map((x) => {
                    const escolhido = tipo === x;
                    return (
                      <button
                        key={x}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() => {
                          setValue('tipo', escolhido ? '' : x);
                          // Um toque já escolhe a categoria mais comum do botão.
                          setValue('categoria', escolhido ? '' : CATEGORIA_DO_TIPO[x] ?? '');
                          if (x !== 'outro' || escolhido) setValue('tipoOutro', '');
                        }}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[13px] transition-colors duration-150',
                          escolhido ? 'border-teal bg-teal-claro font-semibold text-teal-escuro' : 'border-borda bg-white text-texto hover:bg-fundo'
                        )}
                      >
                        {t(`tipoLugar.${x}` as Chave)}
                      </button>
                    );
                  })}
                </div>
                {/* AS SUBCATEGORIAS DO GIARA (07/10/2026, pedido do Simão): o nome
                    vai para o Giara Maps, e lá a categoria é a exata. A chave
                    reinicia a pesquisa ao trocar de botão. */}
                {tipo ? <EscolherCategoria key={tipo} tipo={tipo} categoria={categoria} aoEscolher={(c) => {
                      setValue('categoria', c);
                      const novo = tipoDaCategoria(c, tipo);
                      if (novo !== tipo) {
                        setValue('tipo', novo);
                        // Em «Outro», o «Que tipo?» fica já escrito com a categoria.
                        setValue('tipoOutro', novo === 'outro' ? nomeCategoria(c) ?? '' : '');
                      }
                    }} /> : null}
                {/* «OUTRO» PEDE O TIPO ESCRITO (30/09/2026, pedido do Simão): sozinho
                    não diz a quem revê que etiqueta pôr no OpenStreetMap. */}
                {tipo === 'outro' ? (
                  <div className="mt-2">
                    <Rotulo htmlFor="b-tipo-outro">{t('parag.tipoOutro')}</Rotulo>
                    <Campo id="b-tipo-outro" maxLength={60} autoFocus placeholder={t('parag.tipoOutroDica')} {...register('tipoOutro')} />
                  </div>
                ) : null}
              </fieldset>

              <div className="border-t border-borda pt-3">
                <h3 className="text-base font-bold text-texto">{t('parag.ondeFica')}</h3>
                <p className="mt-1 text-sm text-secundario">{aDescobrir ? t('parag.aDescobrir') : t('parag.ondeFicaExplica')}</p>
              </div>
              <div>
                <Rotulo htmlFor="b-endereco">
                  {t('parag.endereco')}
                  {opcional}
                </Rotulo>
                <Campo id="b-endereco" placeholder={t('parag.enderecoDica')} {...register('endereco')} />
              </div>
              <div className="grid items-end gap-3 sm:grid-cols-3">
                <div>
                  <Rotulo htmlFor="b-municipio">{t('parag.municipio')}</Rotulo>
                  <Selecao
                    id="b-municipio"
                    value={municipioId}
                    onChange={(e) => {
                      // Trocar de município invalida o que está por baixo: o
                      // posto de Díli debaixo de Baucau seria uma morada que não
                      // existe.
                      setValue('municipio', e.target.value);
                      setValue('posto', '');
                      setValue('suco', '');
                    }}
                  >
                    <option value="">{t('parag.escolher')}</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </Selecao>
                </div>
                <div>
                  <Rotulo htmlFor="b-posto">{t('parag.posto')}</Rotulo>
                  <Selecao
                    id="b-posto"
                    value={postoId}
                    disabled={!municipioId}
                    onChange={(e) => {
                      setValue('posto', e.target.value);
                      setValue('suco', '');
                    }}
                  >
                    <option value="">{t('parag.escolher')}</option>
                    {postos.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                  </Selecao>
                </div>
                <div>
                  <Rotulo htmlFor="b-suco">{t('parag.suco')}</Rotulo>
                  <Selecao id="b-suco" value={sucoId} disabled={!postoId} onChange={(e) => setValue('suco', e.target.value)}>
                    <option value="">{t('parag.escolher')}</option>
                    {sucos.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                  </Selecao>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Rotulo htmlFor="b-aldeia">
                    {t('parag.aldeia')}
                    {opcional}
                  </Rotulo>
                  <Campo id="b-aldeia" placeholder={t('parag.aldeiaDica')} {...register('aldeia')} />
                  {aldeiasSugeridas.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-secundario">{t('parag.aldeiasConhecidas')}</span>
                      {aldeiasSugeridas.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setValue('aldeia', a)}
                          className="rounded-full border border-borda bg-white px-2.5 py-0.5 text-xs text-texto hover:bg-fundo"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <Rotulo htmlFor="b-bairro">
                    {t('parag.bairro')}
                    {opcional}
                  </Rotulo>
                  <Campo id="b-bairro" placeholder={t('parag.bairroDica')} {...register('bairro')} />
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-borda pt-3">
                <Interruptor id="b-mostrar" checked={mostrarSempre} onCheckedChange={(v) => setValue('mostrarSempre', v)} className="mt-0.5" />
                <div>
                  <Rotulo htmlFor="b-mostrar">{t('parag.mostrarSempreRotulo')}</Rotulo>
                  <Ajuda>{t('parag.mostrarSempreAjuda')}</Ajuda>
                </div>
              </div>
            </div>
          </JanelaCorpo>
          <JanelaRodape>
            {baptizados.length ? (
              <p className="mr-auto min-w-0 truncate text-sm text-secundario" aria-live="polite">
                <Check className="mr-1 inline size-4 text-sucesso" aria-hidden />
                {t('parag.baptizadosAgora', { n: baptizados.length })} {baptizados.join(' · ')}
              </p>
            ) : null}
            <Botao variante="secundario" onClick={fechar}>
              {baptizados.length ? t('comum.fechar') : t('comum.cancelar')}
            </Botao>
            <Botao type="submit" aCarregar={isSubmitting}>
              <Tag /> {t('parag.baptizarGuardar')}
            </Botao>
          </JanelaRodape>
        </form>
      </JanelaConteudo>
    </Janela>
  );
}
