import { useState } from 'react';
import { t } from '@/i18n';
import { api } from '@/services/admin';
import { DialogoConfirmacao } from '@/components/ui/confirmar';
import { Janela, JanelaConteudo, JanelaCorpo, JanelaTitulo, JanelaDescricao, JanelaRodape } from '@/components/ui/janela';
import { Botao } from '@/components/ui/botao';

// O CÓDIGO DE ACESSO aparece numa janela, e NÃO numa mensagem que desaparece.
//
// Quem o emite vai lê-lo ao telefone, dígito a dígito, a alguém que o escreve
// do outro lado. Uma mensagem que se apaga ao fim de quatro segundos obrigaria
// a gerar outro código a meio da chamada.
export function useCodigoAcesso() {
  const [pedido, setPedido] = useState<{ id: number; nome: string } | null>(null);
  const [codigo, setCodigo] = useState<{ codigo: string; minutos: number; nome: string } | null>(null);

  const janelas = (
    <>
      <DialogoConfirmacao
        aberto={!!pedido}
        aoMudar={(v) => !v && setPedido(null)}
        titulo={t('contas.gerarCodigoTitulo')}
        texto={t('contas.gerarCodigoTexto')}
        rotuloConfirmar={t('contas.gerarCodigo')}
        aoConfirmar={async () => {
          if (!pedido) return;
          const r = await api.codigoRecuperacao(pedido.id);
          setCodigo({ ...r, nome: r.nome || pedido.nome });
        }}
      />
      <Janela open={!!codigo} onOpenChange={(v) => !v && setCodigo(null)}>
        <JanelaConteudo largura="sm">
          <JanelaCorpo className="px-8 py-8 text-center">
            <JanelaDescricao className="mt-0 text-sm">{t('contas.codigoPara')}</JanelaDescricao>
            <JanelaTitulo className="mt-1">{codigo?.nome}</JanelaTitulo>
            <p className="numeros my-6 select-all text-5xl font-bold tracking-[0.25em] text-teal-escuro" aria-live="polite">
              {codigo?.codigo}
            </p>
            <p className="text-sm font-medium text-texto">{t('contas.codigoValido', { n: codigo?.minutos ?? 30 })}</p>
            <p className="mx-auto mt-4 max-w-sm text-left text-sm leading-relaxed text-secundario">{t('contas.codigoExplica')}</p>
          </JanelaCorpo>
          <JanelaRodape className="justify-center">
            <Botao onClick={() => setCodigo(null)}>{t('comum.fechar')}</Botao>
          </JanelaRodape>
        </JanelaConteudo>
      </Janela>
    </>
  );

  return { pedir: (id: number, nome: string) => setPedido({ id, nome }), janelas };
}
