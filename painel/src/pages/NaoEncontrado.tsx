import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { t } from '@/i18n';
import { Cartao } from '@/components/ui/cartao';
import { EstadoVazio } from '@/components/ui/estados';
import { IlustracaoIcone } from '@/components/ilustracoes';
import { variantesBotao } from '@/components/ui/botao';

export function NaoEncontrado() {
  return (
    <Cartao>
      <EstadoVazio
        ilustracao={<IlustracaoIcone><Compass /></IlustracaoIcone>}
        titulo={t('naoEncontrado.titulo')}
        texto={t('naoEncontrado.texto')}
        acao={<Link to="/aprovacoes" className={variantesBotao({})}>{t('naoEncontrado.voltar')}</Link>}
      />
    </Cartao>
  );
}
