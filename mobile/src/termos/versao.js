// Versão dos termos. Muda SEMPRE que o texto mudar de sentido — quem
// aceitou a versão 1 não aceitou a versão 2, e sem este número não há
// forma de saber quem aceitou o quê.
export const VERSAO_TERMOS = '2026-08-3';
// Alterada em 03/09/2026: a cláusula do seguro deixou de pedir "seguro
// adequado à atividade" — que era vago — e passa a citar a obrigação legal
// concreta (Instrução Pública n.º 07/2010) e a dizer o que acontece a quem
// não a cumpre. Mudou o SENTIDO da obrigação, por isso muda a versão, e os
// motoristas voltam a ter de aceitar.
export const VERSAO_TERMOS_MOTORISTA = '2026-09-03';

// A privacidade tem versão PRÓPRIA, e não a dos termos.
//
// São dois consentimentos distintos e mudam em alturas distintas: corrigir
// uma cláusula de responsabilidade nos termos não devia invalidar o que
// alguém aceitou sobre o tratamento dos seus dados, nem o contrário. Um
// número só para os dois não permite saber quem aceitou o quê.
export const VERSAO_PRIVACIDADE = '2026-08-30';
