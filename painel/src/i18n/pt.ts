import { comum } from './pt/comum';
import { layout } from './pt/layout';
import { aprovacoes } from './pt/aprovacoes';
import { emergencias } from './pt/emergencias';
import { viagens } from './pt/viagens';
import { contas } from './pt/contas';
import { paragens } from './pt/paragens';
import { dados } from './pt/dados';
import { pagamentos } from './pt/pagamentos';
import { definicoes } from './pt/definicoes';

export const pt = { ...comum, ...layout, ...aprovacoes, ...emergencias, ...viagens, ...contas, ...paragens, ...dados, ...pagamentos, ...definicoes } as const;
