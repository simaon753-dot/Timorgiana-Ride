import { useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import logo from '@/assets/logo-marca.png';
import { t } from '@/i18n';
import { useSessao } from '@/lib/sessao';
import { Botao } from '@/components/ui/botao';
import { Campo, Rotulo } from '@/components/ui/campo';
import { IlustracaoPaisagem } from '@/components/ilustracoes';

export function Entrar() {
  const { entrar } = useSessao();
  const [telefone, setTelefone] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    if (!telefone.trim() || !palavraPasse) return setErro(t('entrar.faltam'));
    setErro(null);
    setAEntrar(true);
    try {
      await entrar(telefone, palavraPasse);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não entrou.');
      setAEntrar(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-fundo px-4 py-10">
      <IlustracaoPaisagem className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-70" />
      <div className="relative w-full max-w-[400px] rounded-2xl border border-borda bg-white p-7 shadow-cartao sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="TimorgianaRide" className="mb-4 h-14 w-auto" width={71} height={56} />
          <h1 className="text-xl font-bold tracking-tight text-texto">{t('entrar.titulo')}</h1>
          <p className="mt-1 text-sm text-secundario">{t('entrar.sub')}</p>
        </div>
        <form onSubmit={submeter} noValidate className="space-y-4">
          {erro ? (
            <p role="alert" className="rounded-lg border border-perigo/25 bg-perigo-claro px-3 py-2 text-sm text-perigo">
              {erro}
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
        <p className="mt-5 text-center text-xs leading-relaxed text-secundario">{t('entrar.esqueceu')}</p>
      </div>
    </div>
  );
}
