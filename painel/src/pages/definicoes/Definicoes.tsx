import { useEffect, useRef, useState } from 'react';
import { Bike, Car, CreditCard, HardHat, ImageUp, Lock, QrCode, RotateCcw, Save, ToggleRight, Trash2, Truck, User } from 'lucide-react';
import { t, tl, type Chave } from '@/i18n';
import { api } from '@/services/admin';
import { useDados } from '@/hooks/useDados';
import { useSessao } from '@/lib/sessao';
import { dataHora, dolares } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { FormaPagamento, Servico } from '@/types/api';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/cartao';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Ajuda, AreaTexto, Campo, Rotulo } from '@/components/ui/campo';
import { Interruptor } from '@/components/ui/interruptor';
import { Esqueleto } from '@/components/ui/esqueleto';
import { EstadoErro } from '@/components/ui/estados';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { avisar, mensagemDe } from '@/components/ui/aviso';
import { Avatar } from '@/components/ui/avatar';
import { Dado } from '@/components/comuns';

const SECCOES = [
  { id: 'conta', rotulo: 'def.conta' as Chave, icone: User },
  { id: 'servicos', rotulo: 'def.servicos' as Chave, icone: ToggleRight },
  { id: 'carry', rotulo: 'def.carry' as Chave, icone: Truck },
  { id: 'formas', rotulo: 'def.formas' as Chave, icone: CreditCard },
];

export function Definicoes() {
  return (
    <>
      <CabecalhoPagina titulo={t('def.titulo')} descricao={t('def.descricao')} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('def.seccoes')} className="min-w-0 lg:sticky lg:top-[96px] lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {SECCOES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex h-10 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium text-secundario transition-colors hover:bg-white hover:text-texto"
                >
                  <s.icone className="size-4" aria-hidden /> {t(s.rotulo)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          <SeccaoConta />
          <SeccaoServicos />
          <SeccaoCarry />
          <SeccaoFormas />
        </div>
      </div>
    </>
  );
}

function SeccaoConta() {
  const { utilizador } = useSessao();
  return (
    <Cartao id="conta" className="scroll-mt-24">
      <CartaoCabecalho>
        <div>
          <CartaoTitulo>{t('def.conta')}</CartaoTitulo>
          <CartaoDescricao>{t('def.contaNota')}</CartaoDescricao>
        </div>
      </CartaoCabecalho>
      <CartaoConteudo>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar nome={utilizador?.name} tamanho="lg" />
          <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            <Dado rotulo={t('comum.nome')}>{utilizador?.name}</Dado>
            <Dado rotulo={t('comum.telefone')}>
              <span className="numeros">{utilizador?.phone}</span>
            </Dado>
            <Dado rotulo={t('comum.email')}>{utilizador?.email ?? '—'}</Dado>
          </dl>
        </div>
        <div className="mt-6 grid gap-4 border-t border-borda pt-5 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">{t('def.idioma')}</p>
            <p className="mt-1 text-sm">{t('def.idiomaPt')}</p>
            <p className="mt-0.5 text-xs text-secundario">{t('def.idiomaNota')}</p>
          </div>
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="size-3.5" aria-hidden /> {t('def.palavraPasse')}
            </p>
            <p className="mt-1 text-xs text-secundario">{t('def.palavraPasseNota')}</p>
          </div>
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}

const ICONE_SERVICO: Record<string, typeof Bike> = { motorbike: Bike, car: Car, carry: Truck };

// OS SERVIÇOS, num sítio só (20/09/2026).
//
// Antes só o Pickup se ligava e desligava, por um caminho feito à medida dele.
// Agora é o mesmo mecanismo para todos — e é aqui que um serviço novo aparece
// quando for construído.
//
// Um serviço EM CONSTRUÇÃO mostra-se mas não se liga: o interruptor está
// bloqueado, e o servidor recusa-o também. Duas fechaduras para a mesma porta,
// porque esconder o botão não impede ninguém de chamar a rota à mão.
function SeccaoServicos() {
  const { dados, erro, aCarregar, recarregar, setDados } = useDados(() => api.servicos(), []);
  const [aMudar, setAMudar] = useState<Servico | null>(null);

  return (
    <Cartao id="servicos" className="scroll-mt-24">
      <CartaoCabecalho>
        <div>
          <CartaoTitulo>{t('def.servicos')}</CartaoTitulo>
          <CartaoDescricao className="max-w-3xl">{t('def.servicosNota')}</CartaoDescricao>
        </div>
      </CartaoCabecalho>
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar || !dados ? (
        <CartaoConteudo className="space-y-3">
          <Esqueleto className="h-14 w-full" />
          <Esqueleto className="h-14 w-full" />
        </CartaoConteudo>
      ) : (
        <ul className="divide-y divide-borda">
          {dados.servicos.map((s) => {
            const Icone = ICONE_SERVICO[s.id] ?? HardHat;
            const nome = tl('servico', s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      s.emConstrucao ? 'bg-fundo text-secundario' : s.ativo ? 'bg-teal-claro text-teal-escuro' : 'bg-fundo text-secundario'
                    )}
                  >
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {nome}
                      {s.emConstrucao ? <Distintivo cor="aviso">{t('def.emConstrucao')}</Distintivo> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-secundario">
                      {t(`def.familia.${s.familia}` as Chave)}
                      {s.atualizado ? ` · ${t('def.servicoAlterado', { data: dataHora(s.atualizado.em) })}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium', s.ativo ? 'text-teal-escuro' : 'text-secundario')}>
                    {s.emConstrucao ? t('def.emConstrucaoNota') : s.ativo ? t('def.servicoLigado') : t('def.servicoDesligado')}
                  </span>
                  <Interruptor
                    checked={s.ativo}
                    disabled={s.emConstrucao}
                    onCheckedChange={() => setAMudar(s)}
                    aria-label={nome}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogoConfirmacao
        aberto={!!aMudar}
        aoMudar={(v) => !v && setAMudar(null)}
        titulo={
          aMudar
            ? aMudar.ativo
              ? t('def.desligarTitulo', { nome: tl('servico', aMudar.id) })
              : t('def.ligarTitulo', { nome: tl('servico', aMudar.id) })
            : ''
        }
        texto={aMudar?.ativo ? t('def.desligarTexto') : t('def.ligarTexto')}
        rotuloConfirmar={t('comum.confirmar')}
        perigo={aMudar?.ativo}
        aoConfirmar={async () => {
          if (!aMudar) return;
          const r = await api.ligarServico(aMudar.id, !aMudar.ativo);
          setDados(r);
          const nome = tl('servico', aMudar.id);
          avisar.sucesso(
            aMudar.ativo ? t('def.servicoDesligadoAviso', { nome }) : t('def.servicoLigadoAviso', { nome })
          );
        }}
      />
    </Cartao>
  );
}

const GRUPOS_CARRY: { rotulo: Chave; chaves: string[]; dinheiro: boolean }[] = [
  { rotulo: 'def.grupoTarifa', chaves: ['base', 'porKm', 'porMinuto', 'minimo', 'minimoPessoas', 'porParagem'], dinheiro: true },
  { rotulo: 'def.grupoVolume', chaves: ['volume.pequeno', 'volume.medio', 'volume.grande'], dinheiro: false },
  { rotulo: 'def.grupoAjuda', chaves: ['ajuda.carregar', 'ajuda.descarregar', 'ajuda.ambas'], dinheiro: true },
];

function SeccaoCarry() {
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.carry(), []);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarRepor, setConfirmarRepor] = useState(false);

  useEffect(() => {
    if (!dados) return;
    setValores(Object.fromEntries(Object.entries(dados.tarifa).map(([k, v]) => [k, v == null ? '' : String(v)])));
  }, [dados]);

  const limites = Object.fromEntries((dados?.campos ?? []).map((c) => [c.chave, c]));
  const invalidos = Object.entries(valores).filter(([k, v]) => {
    const n = Number(v);
    const l = limites[k];
    return v === '' || !Number.isFinite(n) || (l && (n < l.min || n > l.max));
  });
  const mudou = dados ? Object.entries(valores).some(([k, v]) => Number(v) !== Number(dados.tarifa[k])) : false;

  return (
    <Cartao id="carry" className="scroll-mt-24">
      <CartaoCabecalho>
        <div>
          <CartaoTitulo>{t('def.carry')}</CartaoTitulo>
          <CartaoDescricao>{t('def.carryNota')}</CartaoDescricao>
        </div>
      </CartaoCabecalho>
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar || !dados ? (
        <CartaoConteudo className="space-y-3">
          <Esqueleto className="h-6 w-64" />
          <Esqueleto className="h-40 w-full" />
        </CartaoConteudo>
      ) : (
        <CartaoConteudo className="space-y-6">
          <p className="text-xs text-secundario">{t('def.carryOndeLigar')}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-fundo px-4 py-3">
              <p className="text-xs text-secundario">{t('def.pedidos7d')}</p>
              <p className="numeros mt-1 text-sm">
                <span className="text-lg font-bold">{dados.pedidos7d.total}</span> · {dados.pedidos7d.concluidas} {t('dados.serieConcluidas').toLowerCase()} ·{' '}
                {dados.pedidos7d.sem_resposta} {t('dados.serieSemMotorista').toLowerCase()}
              </p>
            </div>
            <div className="rounded-xl bg-fundo px-4 py-3 sm:col-span-2">
              <p className="text-xs text-secundario">{t('def.motoristasCarry')}</p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {dados.motoristas.length
                  ? dados.motoristas.map((m) => (
                      <Distintivo key={m.capacidade}>
                        {tl('capacidade', m.capacidade)}: {m.n} · {t('def.nOnline', { n: m.online })}
                      </Distintivo>
                    ))
                  : '—'}
              </p>
            </div>
          </div>

          {GRUPOS_CARRY.map((g) => (
            <fieldset key={g.rotulo}>
              <legend className="mb-3 text-sm font-semibold">{t(g.rotulo)}</legend>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {g.chaves.map((k) => {
                  const l = limites[k];
                  const invalido = invalidos.some(([ik]) => ik === k);
                  return (
                    <div key={k}>
                      <Rotulo htmlFor={`carry-${k}`}>{t(`def.campo.${k}` as Chave)}</Rotulo>
                      <div className="relative">
                        {g.dinheiro ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secundario">US$</span> : null}
                        <Campo
                          id={`carry-${k}`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={l?.min}
                          max={l?.max}
                          value={valores[k] ?? ''}
                          onChange={(e) => setValores({ ...valores, [k]: e.target.value })}
                          aria-invalid={invalido}
                          className={cn('numeros', g.dinheiro && 'pl-11')}
                        />
                      </div>
                      <Ajuda erro={invalido}>
                        {invalido && l ? t('def.limites', { min: l.min, max: l.max }) : t('def.padrao', { v: dados.padrao[k] ?? '—' })}
                      </Ajuda>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-5">
            <p className="text-xs text-secundario">
              {dados.atualizado ? t('def.alterado', { nome: dados.atualizadoPorNome ?? '—', data: dataHora(dados.atualizado.em) }) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={() => setConfirmarRepor(true)}>
                <RotateCcw /> {t('def.reporPrecos')}
              </Botao>
              <Botao
                disabled={!mudou}
                onClick={() => (invalidos.length ? avisar.erro(t('def.valorInvalido')) : setConfirmarGuardar(true))}
              >
                <Save /> {t('def.guardarPrecos')}
              </Botao>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">{t('def.exemplos')}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {dados.exemplos.map((x, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-borda px-4 py-2.5 text-sm">
                  <span className="text-secundario">
                    {t('def.exemplo', { km: x.km, min: x.min })}
                    {x.pessoas ? ` · ${t('def.exemploPessoas', { n: x.pessoas })}` : ''}
                    {x.volume ? ` · ${tl('volume', x.volume)}` : ''}
                    {x.ajuda && x.ajuda !== 'nenhuma' ? ` · ${tl('ajuda', x.ajuda)}` : ''}
                    {x.paragens ? ` · ${t('def.exemploParagens', { n: x.paragens })}` : ''}
                  </span>
                  <span className="numeros font-semibold">{dolares(x.preco)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CartaoConteudo>
      )}

      <DialogoConfirmacao
        aberto={confirmarGuardar}
        aoMudar={setConfirmarGuardar}
        titulo={t('def.guardarPrecosTitulo')}
        texto={t('def.guardarPrecosTexto')}
        rotuloConfirmar={t('def.guardarPrecos')}
        aoConfirmar={async () => {
          await api.gravarTarifaCarry(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, Number(v)])));
          avisar.sucesso(t('def.precosGuardados'));
          recarregar();
        }}
      />
      <DialogoConfirmacao
        aberto={confirmarRepor}
        aoMudar={setConfirmarRepor}
        titulo={t('def.reporTitulo')}
        texto={t('def.reporTexto')}
        rotuloConfirmar={t('def.reporPrecos')}
        perigo
        aoConfirmar={async () => {
          await api.gravarTarifaCarry({});
          avisar.sucesso(t('def.precosGuardados'));
          recarregar();
        }}
      />
    </Cartao>
  );
}

const MIMES_QR = ['image/jpeg', 'image/png', 'image/webp'];

function SeccaoFormas() {
  const { dados, erro, aCarregar, recarregar } = useDados(() => api.pagamentos(), []);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [aCarregarQr, setACarregarQr] = useState(false);
  const [retirarQr, setRetirarQr] = useState(false);
  const ficheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dados) setFormas(dados.formas);
  }, [dados]);

  const mudar = (id: string, parte: Partial<FormaPagamento>) => setFormas((fs) => fs.map((f) => (f.id === id ? { ...f, ...parte } : f)));

  const guardar = async () => {
    setAGuardar(true);
    try {
      const r = await api.gravarFormas(formas);
      setFormas(r.formas);
      avisar.sucesso(t('def.formasGuardadas'));
    } catch (e) {
      avisar.erro(mensagemDe(e));
    } finally {
      setAGuardar(false);
    }
  };

  const carregarQr = async (f: File) => {
    if (!MIMES_QR.includes(f.type)) return avisar.erro(t('def.qrFormato'));
    if (f.size > 2 * 1024 * 1024) return avisar.erro(t('def.qrGrande'));
    setACarregarQr(true);
    try {
      // Sem reduzir nem comprimir: um QR que perde nitidez deixa de se ler.
      const base64 = await new Promise<string>((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '');
        leitor.onerror = () => falha(new Error('Não foi possível ler a imagem.'));
        leitor.readAsDataURL(f);
      });
      await api.gravarQr(f.type, base64);
      mudar('tuqr', { temQr: true });
      avisar.sucesso(t('def.qrGuardado'));
    } catch (e) {
      avisar.erro(mensagemDe(e));
    } finally {
      setACarregarQr(false);
      if (ficheiro.current) ficheiro.current.value = '';
    }
  };

  return (
    <Cartao id="formas" className="scroll-mt-24">
      <CartaoCabecalho>
        <div>
          <CartaoTitulo>{t('def.formas')}</CartaoTitulo>
          <CartaoDescricao>{t('def.formasNota')}</CartaoDescricao>
        </div>
      </CartaoCabecalho>
      {erro && !dados ? (
        <EstadoErro mensagem={erro} aoTentar={recarregar} />
      ) : aCarregar || !dados ? (
        <CartaoConteudo className="space-y-3">
          <Esqueleto className="h-16 w-full" />
          <Esqueleto className="h-16 w-full" />
        </CartaoConteudo>
      ) : (
        <>
          <ul className="divide-y divide-borda">
            {formas.map((f) => (
              <li key={f.id} className="px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-fundo text-secundario">
                      {f.id === 'tuqr' ? <QrCode className="size-4" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{tl('forma', f.id)}</p>
                      {!f.comPedido ? <p className="text-xs text-secundario">{t('def.semPedido')}</p> : null}
                    </div>
                  </div>
                  <Interruptor checked={f.ativo} onCheckedChange={(v) => mudar(f.id, { ativo: v })} aria-label={tl('forma', f.id)} />
                </div>
                {f.ativo ? (
                  <div className="mt-3 sm:pl-[46px]">
                    <Rotulo htmlFor={`forma-${f.id}`}>{t('def.instrucoes')}</Rotulo>
                    <AreaTexto
                      id={`forma-${f.id}`}
                      value={f.instrucoes}
                      maxLength={300}
                      placeholder={t('def.instrucoesExemplo')}
                      onChange={(e) => mudar(f.id, { instrucoes: e.target.value })}
                      aria-invalid={f.ativo && !f.instrucoes.trim()}
                      className="min-h-20"
                    />
                    <Ajuda>{f.instrucoes.length}/300</Ajuda>
                  </div>
                ) : null}
                {f.id === 'tuqr' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-fundo px-4 py-3 sm:ml-[46px]">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {t('def.qr')}
                        <Distintivo cor={f.temQr ? 'sucesso' : 'neutro'}>{f.temQr ? t('def.qrCarregada') : t('def.qrEmFalta')}</Distintivo>
                      </p>
                      <p className="mt-0.5 text-xs text-secundario">{t('def.qrNota')}</p>
                    </div>
                    <input
                      ref={ficheiro}
                      type="file"
                      accept={MIMES_QR.join(',')}
                      className="sr-only"
                      id="ficheiro-qr"
                      onChange={(e) => e.target.files?.[0] && carregarQr(e.target.files[0])}
                    />
                    <Botao variante="secundario" tamanho="sm" aCarregar={aCarregarQr} onClick={() => ficheiro.current?.click()}>
                      <ImageUp /> {f.temQr ? t('def.qrTrocar') : t('def.qrCarregar')}
                    </Botao>
                    {f.temQr ? (
                      <Botao variante="perigoContorno" tamanho="sm" onClick={() => setRetirarQr(true)}>
                        <Trash2 /> {t('def.qrRetirar')}
                      </Botao>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex justify-end border-t border-borda px-6 py-4">
            <Botao onClick={guardar} aCarregar={aGuardar}>
              <Save /> {t('def.guardarFormas')}
            </Botao>
          </div>
        </>
      )}
      <DialogoConfirmacao
        aberto={retirarQr}
        aoMudar={setRetirarQr}
        titulo={t('def.qrRetirarTitulo')}
        texto={t('def.qrRetirarTexto')}
        rotuloConfirmar={t('def.qrRetirar')}
        perigo
        aoConfirmar={async () => {
          await api.apagarQr();
          mudar('tuqr', { temQr: false });
          avisar.sucesso(t('def.qrRetirado'));
        }}
      />
    </Cartao>
  );
}
