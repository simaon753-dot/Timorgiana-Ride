import { useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import logo from '@/assets/logo-hakat.png';
import { t } from '@/i18n';
import { useSessao } from '@/lib/sessao';
import { Botao } from '@/components/ui/botao';
import { Campo, Rotulo } from '@/components/ui/campo';
import { IlustracaoPaisagem } from '@/components/ilustracoes';

export function Entrar() {
  const { entrar, confirmarCodigo, motivoSaida } = useSessao();
  const [telefone, setTelefone] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);
  // O SEGUNDO PASSO (28/09/2026): depois da palavra-passe certa, o servidor
  // manda um código por email e só dá a sessão com ele.
  const [passo, setPasso] = useState<{ desafio: number; para: string } | null>(null);
  const [codigo, setCodigo] = useState('');

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    if (!telefone.trim() || !palavraPasse) return setErro(t('entrar.faltam'));
    setErro(null);
    setAEntrar(true);
    try {
      const segundo = await entrar(telefone, palavraPasse);
      if (segundo) {
        setPasso(segundo);
        setCodigo('');
        // A palavra-passe não fica na memória do ecrã mais do que precisa.
        setPalavraPasse('');
        setAEntrar(false);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não entrou.');
      setAEntrar(false);
    }
  };

  const submeterCodigo = async (e: FormEvent) => {
    e.preventDefault();
    if (!passo) return;
    if (!/^\d{6}$/.test(codigo.trim())) return setErro(t('entrar.codigoFormato'));
    setErro(null);
    setAEntrar(true);
    try {
      await confirmarCodigo(passo.desafio, codigo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não entrou.');
      setAEntrar(false);
    }
  };

  const recomecar = () => {
    setPasso(null);
    setCodigo('');
    setErro(null);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-fundo px-4 py-10">
      <IlustracaoPaisagem className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-70" />
      <div className="relative w-full max-w-[400px] rounded-2xl border border-borda bg-white p-7 shadow-cartao sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="HAKAT" className="mb-5 h-9 w-auto" width={206} height={36} />
          <h1 className="text-xl font-bold tracking-tight text-texto">{t('entrar.titulo')}</h1>
          <p className="mt-1 text-sm text-secundario">{t('entrar.sub')}</p>
        </div>
        {passo ? (
          <form onSubmit={submeterCodigo} noValidate className="space-y-4">
            {erro ? (
              <p role="alert" className="rounded-lg border border-perigo/25 bg-perigo-claro px-3 py-2 text-sm text-perigo">
                {erro}
              </p>
            ) : null}
            <p className="rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-secundario" role="status">
              {t('entrar.codigoEnviado', { para: passo.para })}
            </p>
            <div>
              <Rotulo htmlFor="codigo">{t('entrar.codigo')}</Rotulo>
              <Campo
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="numeros text-center text-lg tracking-[0.4em]"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <Botao type="submit" tamanho="lg" className="w-full" disabled={aEntrar}>
              {aEntrar ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {t('entrar.confirmar')}
            </Botao>
            <button
              type="button"
              onClick={recomecar}
              className="w-full cursor-pointer text-center text-sm font-medium text-teal-escuro hover:underline"
            >
              {t('entrar.outroCodigo')}
            </button>
          </form>
        ) : (
          <form onSubmit={submeter} noValidate className="space-y-4">
            {erro ? (
              <p role="alert" className="rounded-lg border border-perigo/25 bg-perigo-claro px-3 py-2 text-sm text-perigo">
                {erro}
              </p>
            ) : motivoSaida ? (
              // PORQUE É QUE SE ESTÁ AQUI (28/09/2026). Sem isto, o painel
              // fechado ao fim de 30 minutos parecia uma avaria.
              <p role="status" className="rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-secundario">
                {motivoSaida === 'inativo' ? t('entrar.saiuInativo') : t('entrar.saiuExpirou')}
              </p>
            ) : null}
            <div>
              <Rotulo htmlFor="telefone">{t('entrar.telefone')}</Rotulo>
              <Campo
                id="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="username"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Rotulo htmlFor="palavra-passe">{t('entrar.palavraPasse')}</Rotulo>
              <Campo
                id="palavra-passe"
                type="password"
                autoComplete="current-password"
                value={palavraPasse}
                onChange={(e) => setPalavraPasse(e.target.value)}
              />
            </div>
            <Botao type="submit" tamanho="lg" className="w-full" disabled={aEntrar}>
              {aEntrar ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {t('entrar.botao')}
            </Botao>
          </form>
        )}
        <p className="mt-5 text-center text-xs leading-relaxed text-secundario">{t('entrar.esqueceu')}</p>
      </div>
    </div>
  );
}
