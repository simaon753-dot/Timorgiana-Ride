import * as pt from './pt.js';
import * as tet from './tet.js';
import * as en from './en.js';

export { VERSAO_TERMOS, VERSAO_TERMOS_MOTORISTA } from './versao.js';

const dicionarios = { pt, tet, en };

export function textoTermos(lang, quem) {
  const d = dicionarios[lang] || dicionarios.pt;
  return quem === 'driver' ? d.termosMotorista : d.termosPassageiro;
}
