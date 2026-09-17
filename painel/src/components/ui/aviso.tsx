import { Toaster, toast } from 'sonner';

// As mensagens que aparecem e desaparecem sozinhas ("Aprovação realizada com
// sucesso."). Os erros ficam mais tempo: quem falhou precisa de ler porquê.
export function Avisos() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: '!rounded-xl !border !border-borda !bg-white !text-texto !shadow-flutuante !font-sans',
          description: '!text-secundario',
          success: '[&_[data-icon]]:!text-sucesso',
          error: '[&_[data-icon]]:!text-perigo',
        },
      }}
    />
  );
}

export const avisar = {
  sucesso: (texto: string, descricao?: string) => toast.success(texto, { description: descricao, duration: 4000 }),
  erro: (texto: string, descricao?: string) => toast.error(texto, { description: descricao, duration: 8000 }),
  info: (texto: string, descricao?: string) => toast(texto, { description: descricao, duration: 4000 }),
};

export function mensagemDe(e: unknown) {
  return e instanceof Error ? e.message : 'Não foi possível concluir.';
}
