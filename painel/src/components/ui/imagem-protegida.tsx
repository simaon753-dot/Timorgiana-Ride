import { useEffect, useRef, useState } from 'react';
import { ImageOff, RotateCw } from 'lucide-react';
import { imagemProtegida } from '@/services/cliente';
import { cn } from '@/lib/utils';
import { Janela, JanelaConteudo, JanelaTitulo, JanelaDescricao } from './janela';
import { Botao } from './botao';

// SÓ SE BUSCA O QUE ESTÁ À VISTA.
//
// Os documentos são fotografias de telemóvel, de um a dois megabytes cada.
// Buscá-los todos ao abrir a página seriam dezenas de megabytes numa ligação
// de Díli — para encher miniaturas que talvez nem se vejam.
export function ImagemProtegida({
  caminho,
  alt,
  className,
  aoAbrir,
}: {
  caminho: string;
  alt: string;
  className?: string;
  aoAbrir?: (url: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let vivo = true;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        imagemProtegida(caminho).then((u) => {
          if (!vivo) return;
          if (u) setUrl(u);
          else setFalhou(true);
        });
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => {
      vivo = false;
      obs.disconnect();
    };
  }, [caminho]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden rounded-xl border border-borda bg-teal-suave', className)}>
      {url ? (
        <button
          type="button"
          onClick={() => aoAbrir?.(url)}
          className={cn('block size-full', aoAbrir ? 'cursor-zoom-in' : 'cursor-default')}
          aria-label={aoAbrir ? `Ampliar: ${alt}` : alt}
        >
          <img src={url} alt={alt} className="size-full object-cover transition-transform duration-200 hover:scale-[1.02]" />
        </button>
      ) : falhou ? (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-xs text-secundario">
          <ImageOff className="size-5" aria-hidden />
          Indisponível
        </div>
      ) : (
        <div className="size-full animate-brilho bg-[linear-gradient(90deg,#e9f1ef_0px,#f4f8f7_120px,#e9f1ef_240px)] bg-[length:800px_100%]" aria-hidden />
      )}
    </div>
  );
}

// A LUPA, com botão de rodar: um cartão fotografado ao alto aparece deitado,
// e sem rodar quem revê inclina a cabeça para ler uma data.
export function Lupa({ url, titulo, aoFechar }: { url: string | null; titulo: string; aoFechar: () => void }) {
  const [rodado, setRodado] = useState(0);
  useEffect(() => setRodado(0), [url]);
  return (
    <Janela open={!!url} onOpenChange={(v) => !v && aoFechar()}>
      <JanelaConteudo largura="xl" className="overflow-hidden bg-texto">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 pr-14">
          <div className="min-w-0">
            <JanelaTitulo className="truncate text-base text-white">{titulo}</JanelaTitulo>
            <JanelaDescricao className="sr-only">Pré-visualização ampliada</JanelaDescricao>
          </div>
          <Botao variante="secundario" tamanho="sm" onClick={() => setRodado((r) => (r + 90) % 360)}>
            <RotateCw /> Rodar
          </Botao>
        </div>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden p-4">
          {url ? (
            <img
              src={url}
              alt={titulo}
              className="max-h-[75vh] max-w-full object-contain transition-transform duration-200"
              style={{ transform: `rotate(${rodado}deg) scale(${rodado % 180 ? 0.72 : 1})` }}
            />
          ) : null}
        </div>
      </JanelaConteudo>
    </Janela>
  );
}
