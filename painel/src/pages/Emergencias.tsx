import { useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, MapPin, Phone, RefreshCw, Route, ShieldCheck, Siren } from 'lucide-react';
import { t, tl } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora, haQuanto } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { AlertaSos } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao } from '@/components/ui/cartao';
import { Botao, variantesBotao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro, EstadoVazio, Faixa } from '@/components/ui/estados';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar } from '@/components/ui/aviso';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { Dado, Telefone } from '@/components/comuns';
import { useServico } from '@/layouts/servico';

// UM PEDIDO DE AJUDA NÃO ESPERA PELO SINO.
//
// Esta página volta a perguntar ao servidor de 20 em 20 segundos enquanto está
// aberta: o sino atualiza de minuto a minuto, e um minuto é muito tempo para
// alguém que carregou no botão de emergência.
export function Emergencias() {
  const { dados, erro, aCarregar, aAtualizar, recarregar } = useDados(() => api.sos(), [], { aCada: 20_000 });
  const [aResolver, setAResolver] = useState<AlertaSos | null>(null);
  const { recarregarNotificacoes } = useServico();
  const alertas = dados?.alertas ?? [];

  return (
    <>
      <CabecalhoPagina
        titulo={t('sos.titulo')}
        descricao={t('sos.descricao')}
        acoes={
          <Botao variante="secundario" onClick={recarregar}>
            <RefreshCw className={cn(aAtualizar && 'animate-spin')} /> {t('comum.atualizar')}
          </Botao>
        }
      />

      <Faixa cor="azul" icone={<Phone />} className="mb-6">
        {t('sos.ligarPolicia')}
      </Faixa>

      {erro && !dados ? (
        <Cartao>
          <EstadoErro mensagem={erro} aoTentar={recarregar} />
        </Cartao>
      ) : aCarregar ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Cartao key={i} className="space-y-3 p-6">
              <Esqueleto className="h-5 w-48" />
              <Esqueleto className="h-4 w-full" />
              <Esqueleto className="h-4 w-2/3" />
            </Cartao>
          ))}
        </div>
      ) : !alertas.length ? (
        <Cartao>
          <EstadoVazio
            ilustracao={
              <IlustracaoIcone>
                <ShieldCheck />
              </IlustracaoIcone>
            }
            titulo={t('sos.vazioTitulo')}
            texto={t('sos.vazioTexto')}
          />
        </Cartao>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2" aria-live="polite">
          {alertas.map((a) => (
            <li key={a.id}>
              <Cartao className="overflow-hidden border-perigo/30">
                <div className="flex items-start gap-4 border-b border-perigo/15 bg-perigo-claro/60 px-6 py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-perigo text-white">
                    <Siren className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-texto">{tl('emergencia', a.tipo)}</p>
                    <p className="mt-0.5 text-sm text-secundario">
                      <span className="font-medium text-perigo">{haQuanto(a.quando)}</span> · {dataHora(a.quando)}
                    </p>
                  </div>
                  <Distintivo cor="perigo" ponto>
                    {t('sos.abertas')}
                  </Distintivo>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
                  <Dado rotulo={a.papel === 'driver' ? t('sos.papelMotorista') : t('sos.papelPassageiro')}>
                    <span className="font-semibold">{a.quem}</span>
                  </Dado>
                  <Dado rotulo={t('comum.telefone')}>
                    <Telefone numero={a.telefone} />
                  </Dado>
                  {a.destino ? <Dado rotulo={t('sos.destino')}>{a.destino}</Dado> : null}
                  {a.estadoViagem ? <Dado rotulo={t('sos.estadoViagem')}>{tl('estadoViagem', a.estadoViagem)}</Dado> : null}
                  <Dado rotulo={t('sos.posicao')}>
                    {a.lat != null && a.lng != null ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-teal-escuro hover:underline"
                      >
                        <MapPin className="size-3.5" aria-hidden />
                        <span className="numeros">
                          {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-secundario">{t('sos.semPosicao')}</span>
                    )}
                  </Dado>
                  {a.nota ? (
                    <Dado rotulo={t('sos.nota')} className="sm:col-span-2">
                      {a.nota}
                    </Dado>
                  ) : null}
                </dl>
                <div className="flex flex-wrap justify-end gap-2 border-t border-borda bg-fundo/50 px-6 py-3">
                  {a.rideId ? (
                    <Link to={`/viagens?viagem=${a.rideId}`} className={variantesBotao({ variante: 'secundario' })}>
                      <Route /> {t('sos.abrirViagem')}
                    </Link>
                  ) : null}
                  <Botao onClick={() => setAResolver(a)}>
                    <CircleCheck /> {t('sos.resolver')}
                  </Botao>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>
      )}

      <DialogoConfirmacao
        aberto={!!aResolver}
        aoMudar={(v) => !v && setAResolver(null)}
        titulo={t('sos.resolverTitulo')}
        texto={t('sos.resolverTexto')}
        rotuloConfirmar={t('sos.resolver')}
        aoConfirmar={async () => {
          if (!aResolver) return;
          await api.resolverSos(aResolver.id);
          avisar.sucesso(t('sos.resolvido'));
          recarregar();
          recarregarNotificacoes();
        }}
      />
    </>
  );
}
