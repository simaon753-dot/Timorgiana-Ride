import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, ExternalLink, Info, MapPin, MapPinned, MoreHorizontal, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { t, tl, type Chave } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { data, haQuanto } from '@/lib/formato';
import type { EstadoLugar, LugarProposto, Parada } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Ajuda, Campo, CampoPesquisa, Rotulo } from '@/components/ui/campo';
import { Segmentos } from '@/components/ui/segmentos';
import { Tabela, TCabeca, TCorpo, TCelula, TLinha, TTitulo } from '@/components/ui/tabela';
import { EsqueletoTabela } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio, Faixa } from '@/components/ui/estados';
import { Janela, JanelaConteudo, JanelaCabecalho, JanelaTitulo, JanelaDescricao, JanelaCorpo, JanelaRodape } from '@/components/ui/janela';
import { Menu, MenuAbrir, MenuConteudo, MenuItem, MenuSeparador } from '@/components/ui/menu';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';

type Vista = 'lugares' | 'paradas';

export function Paragens() {
  const [params, setParams] = useSearchParams();
  const vista: Vista = params.get('vista') === 'paradas' ? 'paradas' : 'lugares';
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
      {vista === 'lugares' ? <Lugares procura={procura} estadoInicial={params.get('estado') as EstadoLugar | null} /> : <Paradas procura={procura} />}
    </>
  );
}

function Lugares({ procura, estadoInicial }: { procura: string; estadoInicial: EstadoLugar | null }) {
  const [estado, setEstado] = useState<EstadoLugar | 'todos'>(estadoInicial ?? 'novo');
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
            titulo={t('parag.vazioLugaresTitulo')}
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
                    <p className="text-xs text-secundario">{l.etiqueta ?? l.tipo ?? '—'}</p>
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
                      </MenuConteudo>
                    </Menu>
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
  const q = procura.trim().toLowerCase();
  const paradas = (dados?.paradas ?? []).filter((p) => !q || p.nome.toLowerCase().includes(q));

  return (
    <>
      <div className="flex justify-end">
        <Botao onClick={() => setNova(true)}>
          <Plus /> {t('parag.nova')}
        </Botao>
      </div>
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

      <NovaParada aberta={nova} aoMudar={setNova} aoGuardar={recarregar} />

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

function NovaParada({ aberta, aoMudar, aoGuardar }: { aberta: boolean; aoMudar: (v: boolean) => void; aoGuardar: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { nome: '', sitio: '', parada: '', raio: 150 } });
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const guardar = handleSubmit(async (f) => {
    setErroServidor(null);
    const sitio = lerCoordenadas(f.sitio)!;
    const parada = lerCoordenadas(f.parada)!;
    try {
      await api.criarParada({ nome: f.nome.trim(), lat: sitio[0], lng: sitio[1], paradaLat: parada[0], paradaLng: parada[1], raioM: Number(f.raio) });
      avisar.sucesso(t('parag.guardada'), f.nome);
      reset();
      aoMudar(false);
      aoGuardar();
    } catch (e) {
      setErroServidor(mensagemDe(e));
    }
  });

  return (
    <Janela open={aberta} onOpenChange={(v) => { if (!v) { reset(); setErroServidor(null); } aoMudar(v); }}>
      <JanelaConteudo largura="md">
        <form onSubmit={guardar} noValidate className="flex min-h-0 flex-1 flex-col">
          <JanelaCabecalho>
            <JanelaTitulo>{t('parag.nova')}</JanelaTitulo>
            <JanelaDescricao>{t('parag.novaDescricao')}</JanelaDescricao>
          </JanelaCabecalho>
          <JanelaCorpo className="space-y-4">
            {erroServidor ? (
              <p role="alert" className="rounded-lg bg-perigo-claro px-3 py-2 text-sm text-perigo">
                {erroServidor}
              </p>
            ) : null}
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
