import { Bug, ChartColumn, Flag, MapPin, Route, Settings, ShieldCheck, Siren, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { Chave } from '@/i18n';
import type { ItemNotificacao } from '@/types/api';

export interface ItemNav {
  para: string;
  rotulo: Chave;
  icone: LucideIcon;
  // Que notificações contam para o número ao lado do item.
  contam?: ItemNotificacao['chave'][];
  urgente?: boolean;
}

// O MENU DA FASE 1: só módulos com dados reais no servidor. Motoristas,
// Passageiros, Veículos e Relatórios entram quando existirem (Fases 2 e 3) —
// um item de menu que abre uma página vazia é pior do que não haver item.
export const GRUPOS: { rotulo: Chave; itens: ItemNav[] }[] = [
  {
    rotulo: 'nav.grupoOperacao',
    itens: [
      { para: '/aprovacoes', rotulo: 'nav.aprovacoes', icone: ShieldCheck, contam: ['aprovacoes'] },
      { para: '/emergencias', rotulo: 'nav.emergencias', icone: Siren, contam: ['sos'], urgente: true },
      { para: '/ocorrencias', rotulo: 'nav.ocorrencias', icone: Flag, contam: ['ocorrenciasGraves', 'ocorrencias'] },
      { para: '/contas', rotulo: 'nav.contas', icone: Users },
      { para: '/viagens', rotulo: 'nav.viagens', icone: Route, contam: ['semResposta'] },
      { para: '/paragens', rotulo: 'nav.paragens', icone: MapPin, contam: ['contribuicoesMapa'] },
      { para: '/dados', rotulo: 'nav.dados', icone: ChartColumn },
    ],
  },
  {
    rotulo: 'nav.grupoGestao',
    itens: [
      { para: '/pagamentos', rotulo: 'nav.pagamentos', icone: Wallet, contam: ['pagamentos', 'pagamentosAtrasados'] },
      { para: '/erros', rotulo: 'nav.erros', icone: Bug, contam: ['errosApp'] },
      { para: '/definicoes', rotulo: 'nav.definicoes', icone: Settings },
    ],
  },
];

// Para onde leva cada notificação.
export const DESTINO_NOTIFICACAO: Record<ItemNotificacao['chave'], string> = {
  sos: '/emergencias',
  ocorrenciasGraves: '/ocorrencias',
  ocorrencias: '/ocorrencias',
  pagamentosAtrasados: '/pagamentos',
  pagamentos: '/pagamentos',
  docsCaducados: '/dados',
  aprovacoes: '/aprovacoes',
  semResposta: '/viagens',
  docsACaducar: '/dados',
  canceladas: '/viagens',
  suspensas: '/aprovacoes?estado=suspended',
  espaco: '/definicoes',
  errosApp: '/erros',
  contribuicoesMapa: '/paragens?vista=contribuicoes',
};
