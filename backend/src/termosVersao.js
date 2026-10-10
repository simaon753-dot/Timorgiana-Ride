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
// cobrança começa quando for anunciada. Ficar disponível passa a exigi-la.
// 28/09/2026: sem taxa de acesso até novo aviso oficial (ver assinatura.js).
// Alterada em 05/10/2026: os 30 dias do Carro e do Carro Pickup passam de
// $30 para $25 (decisão do Simão). Muda o preço, portanto muda o sentido, e
// os motoristas voltam a aceitar — durante o período gratuito, sem custo.
// E de novo no MESMO dia (daí o 'b'): entra a cláusula «Desconto para quem
// ganha pouco» — 15% do rendimento registado, até ao preço do pacote de 30
// dias, perdido com mais de 3 cancelamentos ou mais de 20% (decisão do Simão).
// E a 10/10/2026: a política de cancelamentos (backend/src/cancelamentos.js)
// — o motorista espera 5 minutos depois de «Cheguei» antes de dar o
// passageiro como faltoso.
export const VERSAO_TERMOS_MOTORISTA = '2026-10-10';

// Lida da base e não da sessão: quem aceita os termos a meio tem de poder
// ficar disponível logo a seguir, sem sair da app e voltar a entrar.
export async function aceitouTermosMotorista(userId) {
  const r = await one('SELECT driver_terms_version FROM users WHERE id = $1', [userId]);
  return r?.driver_terms_version === VERSAO_TERMOS_MOTORISTA;
}
