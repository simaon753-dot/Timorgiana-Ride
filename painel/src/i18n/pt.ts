import { comum } from './pt/comum';
import { layout } from './pt/layout';
import { aprovacoes } from './pt/aprovacoes';
import { emergencias } from './pt/emergencias';
import { ocorrencias } from './pt/ocorrencias';
import { viagens } from './pt/viagens';
import { contas } from './pt/contas';
import { paragens } from './pt/paragens';
import { dados } from './pt/dados';
import { pagamentos } from './pt/pagamentos';
import { definicoes } from './pt/definicoes';
import { erros } from './pt/erros';

export const pt = { ...comum, ...layout, ...aprovacoes, ...emergencias, ...ocorrencias, ...viagens, ...contas, ...paragens, ...dados, ...pagamentos, ...definicoes, ...erros } as const;
