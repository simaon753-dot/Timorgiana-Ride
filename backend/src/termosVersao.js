import { one } from './db.js';

// A VERSÃO DOS TERMOS DO MOTORISTA EM VIGOR (15/09/26).
//
// A mesma de mobile/src/termos/versao.js. O servidor não consegue ler a app —
// no Render só existe a pasta backend/ — por isso a versão fica aqui também,
// e o verificar-tipos da app confirma que as duas batem: se divergissem,
// nenhum motorista conseguiria ficar disponível.
//
// PORQUÊ NO SERVIDOR: até aqui, aceitar os termos novos era só um aviso no
// ecrã. Sem aceitação a cláusula da assinatura não obriga ninguém, e a
// cobrança começa a 1 de Maio de 2027. Ficar disponível passa a exigi-la.
export const VERSAO_TERMOS_MOTORISTA = '2026-09-14b';

// Lida da base e não da sessão: quem aceita os termos a meio tem de poder
// ficar disponível logo a seguir, sem sair da app e voltar a entrar.
export async function aceitouTermosMotorista(userId) {
  const r = await one('SELECT driver_terms_version FROM users WHERE id = $1', [userId]);
  return r?.driver_terms_version === VERSAO_TERMOS_MOTORISTA;
}
