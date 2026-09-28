import { useEffect, useState } from 'react';
import { MapPin, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { t } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { dataHora } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { DestinoCarry } from '@/types/api';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Campo } from '@/components/ui/campo';
import { Interruptor } from '@/components/ui/interruptor';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro } from '@/components/ui/estados';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar } from '@/components/ui/aviso';

// A TABELA DE DESTINOS DO PICKUP (28/09/2026). Ver backend/src/destinosCarry.js.
//
// Entre Díli e um destino da tabela, o preço é o da tabela e não o da
// fórmula — como na rua. Cada destino é um ponto e um raio; os números
// editam-se aqui e valem no pedido seguinte, sem publicar nada.
//
// Guarda-se a tabela INTEIRA de uma vez, e não linha a linha: o servidor
// valida o conjunto (nomes, limites), e uma tabela meio gravada seria a pior
// das duas.

type Linha = Omit<DestinoCarry, 'lat' | 'lng' | 'raioKm' | 'precoUsd'> & {
  lat: string;
  lng: string;
  raioKm: string;
  precoUsd: string;
};

const paraLinha = (d: DestinoCarry): Linha => ({
  ...d,
  lat: String(d.lat),
  lng: String(d.lng),
  raioKm: String(d.raioKm),
  precoUsd: String(d.precoUsd),
});

export function SeccaoDestinosCarry() {
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.destinosCarry(), []);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarRepor, setConfirmarRepor] = useState(false);

  useEffect(() => {
    if (dados) setLinhas(dados.destinos.map(paraLinha));
  }, [dados]);

  const mudar = (i: number, campo: keyof Linha, valor: string | boolean) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  const L = dados?.limites;
  const fora = (v: string, l?: { min: number; max: number }) => {
    const n = Number(v);
    return v.trim() === '' || !Number.isFinite(n) || (!!l && (n < l.min || n > l.max));
  };
  const invalida = (l: Linha) =>
    l.nome.trim().length < 2 || fora(l.lat, L?.lat) || fora(l.lng, L?.lng) || fora(l.raioKm, L?.raioKm) || fora(l.precoUsd, L?.precoUsd);
  const haInvalidas = linhas.some(invalida);
  const mudou = !!dados && JSON.stringify(linhas) !== JSON.stringify(dados.destinos.map(paraLinha));
  const ligados = linhas.filter((l) => l.ativo).length;

  const paraGravar = () =>
    linhas.map((l) => ({
      id: l.id,
      nome: l.nome.trim(),
      lat: Number(l.lat),
      lng: Number(l.lng),
      raioKm: Number(l.raioKm),
      precoUsd: Number(l.precoUsd),
      ativo: l.ativo,
      regra: l.regra,
    }));

  return (
    <Cartao id="destinos" className="scroll-mt-24">
      <CartaoCabecalho>
        <div>
          <CartaoTitulo>{t('dest.titulo')}</CartaoTitulo>
          <CartaoDescricao className="max-w-3xl">{t('dest.nota')}</CartaoDescricao>
        </div>
      </CartaoCabecalho>
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar || !dados ? (
        <CartaoConteudo className="space-y-3">
          <Esqueleto className="h-6 w-64" />
          <Esqueleto className="h-60 w-full" />
        </CartaoConteudo>
      ) : (
        <CartaoConteudo className="space-y-4">
          <p className="text-xs text-secundario">
            {t('dest.resumo', { n: ligados, total: linhas.length })} {t('dest.regra')}
          </p>

          <div className="relative overflow-x-auto rounded-xl border border-borda">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-fundo text-left text-xs text-secundario">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('dest.ligado')}</th>
                  <th className="px-3 py-2 font-medium">{t('dest.nome')}</th>
                  <th className="px-3 py-2 font-medium">{t('dest.preco')}</th>
                  <th className="px-3 py-2 font-medium">{t('dest.raio')}</th>
                  <th className="px-3 py-2 font-medium">{t('dest.lat')}</th>
                  <th className="px-3 py-2 font-medium">{t('dest.lng')}</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">{t('dest.accoes')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const mal = invalida(l);
                  return (
                    <tr key={i} className={cn('border-t border-borda', !l.ativo && 'bg-fundo/60 text-secundario', mal && 'bg-perigo-claro/40')}>
                      <td className="px-3 py-2">
                        <Interruptor
                          checked={l.ativo}
                          onCheckedChange={(v: boolean) => mudar(i, 'ativo', v)}
                          aria-label={t('dest.ligarNome', { nome: l.nome || '—' })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Campo
                          id={`dest-nome-${i}`}
                          value={l.nome}
                          maxLength={40}
                          onChange={(e) => mudar(i, 'nome', e.target.value)}
                          aria-invalid={l.nome.trim().length < 2}
                          className="min-w-[140px]"
                        />
                        {l.regra === 'dentro' ? <p className="mt-1 text-[11px] text-secundario">{t('dest.regraDentro')}</p> : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-secundario">US$</span>
                          <Campo
                            id={`dest-preco-${i}`}
                            type="number"
                            inputMode="decimal"
                            step="1"
                            value={l.precoUsd}
                            onChange={(e) => mudar(i, 'precoUsd', e.target.value)}
                            aria-invalid={fora(l.precoUsd, L?.precoUsd)}
                            className="numeros w-[104px] pl-10"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Campo
                          id={`dest-raio-${i}`}
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={l.raioKm}
                          onChange={(e) => mudar(i, 'raioKm', e.target.value)}
                          aria-invalid={fora(l.raioKm, L?.raioKm)}
                          className="numeros w-[80px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Campo
                          id={`dest-lat-${i}`}
                          inputMode="decimal"
                          value={l.lat}
                          onChange={(e) => mudar(i, 'lat', e.target.value)}
                          aria-invalid={fora(l.lat, L?.lat)}
                          className="numeros w-[104px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Campo
                          id={`dest-lng-${i}`}
                          inputMode="decimal"
                          value={l.lng}
                          onChange={(e) => mudar(i, 'lng', e.target.value)}
                          aria-invalid={fora(l.lng, L?.lng)}
                          className="numeros w-[112px]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=13/${l.lat}/${l.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-9 items-center justify-center rounded-botao text-teal-escuro hover:bg-fundo"
                          title={t('dest.verMapa')}
                          aria-label={t('dest.verMapa')}
                        >
                          <MapPin className="size-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-botao text-perigo hover:bg-perigo-claro"
                          title={t('dest.apagar')}
                          aria-label={t('dest.apagar')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Botao
                variante="secundario"
                onClick={() =>
                  setLinhas((ls) => [
                    ...ls,
                    { id: '', nome: '', lat: '', lng: '', raioKm: '6', precoUsd: '', ativo: false, regra: 'desde_dili' },
                  ])
                }
                disabled={linhas.length >= (L?.maximo ?? 60)}
              >
                <Plus /> {t('dest.acrescentar')}
              </Botao>
              <p className="text-xs text-secundario">
                {dados.atualizado
                  ? t('def.alterado', { nome: dados.atualizado.porNome ?? '—', data: dataHora(dados.atualizado.em) })
                  : t('dest.dePartida')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={() => setConfirmarRepor(true)} disabled={!dados.personalizados}>
                <RotateCcw /> {t('dest.repor')}
              </Botao>
              <Botao disabled={!mudou} onClick={() => (haInvalidas ? avisar.erro(t('dest.invalida')) : setConfirmarGuardar(true))}>
                <Save /> {t('dest.guardar')}
              </Botao>
            </div>
          </div>
        </CartaoConteudo>
      )}

      <DialogoConfirmacao
        aberto={confirmarGuardar}
        aoMudar={setConfirmarGuardar}
        titulo={t('dest.guardarTitulo')}
        texto={t('dest.guardarTexto')}
        rotuloConfirmar={t('dest.guardar')}
        aoConfirmar={async () => {
          await api.gravarDestinosCarry(paraGravar());
          avisar.sucesso(t('dest.guardado'));
          recarregar();
        }}
      />
      <DialogoConfirmacao
        aberto={confirmarRepor}
        aoMudar={setConfirmarRepor}
        titulo={t('dest.reporTitulo')}
        texto={t('dest.reporTexto')}
        rotuloConfirmar={t('dest.repor')}
        perigo
        aoConfirmar={async () => {
          await api.gravarDestinosCarry(null);
          avisar.sucesso(t('dest.guardado'));
          recarregar();
        }}
      />
    </Cartao>
  );
}
