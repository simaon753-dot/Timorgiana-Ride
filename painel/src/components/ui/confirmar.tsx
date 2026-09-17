import { useEffect, useState, type ReactNode } from 'react';
import { Janela, JanelaConteudo, JanelaCabecalho, JanelaTitulo, JanelaDescricao, JanelaCorpo, JanelaRodape } from './janela';
import { Botao } from './botao';
import { AreaTexto, Ajuda, Campo, Rotulo } from './campo';
import { t } from '@/i18n';

// UMA JANELA DE CONFIRMAÇÃO para tudo o que não se desfaz com um clique.
//
// `pedirMotivo`: recusar e suspender exigem motivo do lado do servidor, e
// ainda bem — quem é recusado sem explicação não sabe o que corrigir. A
// janela não deixa confirmar sem ele, em vez de esperar que o servidor diga
// que falta.
//
// `palavra`: para o que apaga de vez. Um clique chega por engano de mil
// maneiras; uma palavra escrita à mão só chega se alguém a escrever.
export function DialogoConfirmacao({
  aberto,
  aoMudar,
  titulo,
  texto,
  rotuloConfirmar,
  perigo,
  pedirMotivo,
  rotuloMotivo,
  sugestoes,
  palavra,
  aoConfirmar,
  children,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  texto?: ReactNode;
  rotuloConfirmar: string;
  perigo?: boolean;
  pedirMotivo?: boolean;
  rotuloMotivo?: string;
  sugestoes?: string[];
  palavra?: string;
  aoConfirmar: (motivo: string) => Promise<void> | void;
  children?: ReactNode;
}) {
  const [motivo, setMotivo] = useState('');
  const [escrito, setEscrito] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (aberto) {
      setMotivo('');
      setEscrito('');
      setErro(null);
      setTocado(false);
    }
  }, [aberto]);

  const faltaMotivo = !!pedirMotivo && motivo.trim().length < 3;
  const faltaPalavra = !!palavra && escrito.trim() !== palavra;

  const confirmar = async () => {
    setTocado(true);
    if (faltaMotivo || faltaPalavra) return;
    setAEnviar(true);
    setErro(null);
    try {
      await aoConfirmar(motivo.trim());
      aoMudar(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setAEnviar(false);
    }
  };

  return (
    <Janela open={aberto} onOpenChange={(v) => !aEnviar && aoMudar(v)}>
      <JanelaConteudo largura="sm">
        <JanelaCabecalho>
          <JanelaTitulo>{titulo}</JanelaTitulo>
          {texto ? <JanelaDescricao>{texto}</JanelaDescricao> : <JanelaDescricao className="sr-only">{titulo}</JanelaDescricao>}
        </JanelaCabecalho>
        {pedirMotivo || palavra || children || erro ? (
          <JanelaCorpo className="space-y-4">
            {children}
            {pedirMotivo ? (
              <div>
                <Rotulo htmlFor="motivo-confirmacao">{rotuloMotivo || t('comum.motivo')}</Rotulo>
                {sugestoes?.length ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {sugestoes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMotivo(s)}
                        className="cursor-pointer rounded-full border border-borda bg-white px-2.5 py-1 text-xs font-medium text-texto transition-colors hover:border-teal hover:bg-teal-suave"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
                <AreaTexto
                  id="motivo-confirmacao"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  aria-invalid={tocado && faltaMotivo}
                  maxLength={200}
                  autoFocus
                />
                <Ajuda erro={tocado && faltaMotivo}>{t('comum.motivoObrigatorio')}</Ajuda>
              </div>
            ) : null}
            {palavra ? (
              <div>
                <Rotulo htmlFor="palavra-confirmacao">
                  Para confirmar, escreva <span className="font-bold text-perigo">{palavra}</span>
                </Rotulo>
                <Campo
                  id="palavra-confirmacao"
                  value={escrito}
                  onChange={(e) => setEscrito(e.target.value)}
                  aria-invalid={tocado && faltaPalavra}
                  autoComplete="off"
                />
              </div>
            ) : null}
            {erro ? (
              <p role="alert" className="rounded-lg bg-perigo-claro px-3 py-2 text-sm text-perigo">
                {erro}
              </p>
            ) : null}
          </JanelaCorpo>
        ) : null}
        <JanelaRodape>
          <Botao variante="secundario" onClick={() => aoMudar(false)} disabled={aEnviar}>
            {t('comum.cancelar')}
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} onClick={confirmar} aCarregar={aEnviar}>
            {rotuloConfirmar}
          </Botao>
        </JanelaRodape>
      </JanelaConteudo>
    </Janela>
  );
}
