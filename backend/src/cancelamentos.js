// A POLÍTICA DE CANCELAMENTOS (10/10/2026, aprovada pelo Simão).
//
// O pagamento é em dinheiro: não há multa que se possa cobrar. As
// consequências são de acesso, e só para o hábito, nunca para o caso isolado.
//
// PASSAGEIRO
//   · cancela de graça antes de haver motorista, e até 2 minutos depois de o
//     motorista aceitar (enganou-se, mudou de ideias — acontece);
//   · depois disso é um CANCELAMENTO TARDIO: o motorista já vinha a caminho;
//   · 3 tardios em 7 dias → aviso; 5 → os pedidos ficam suspensos 24 horas.
//
// MOTORISTA
//   · «passageiro não apareceu» só depois de tocar em «Cheguei» e esperar
//     5 minutos no local — antes disso, é cancelar depois de aceitar, que a
//     Tabela de Infrações (art. 9.º) já trata;
//   · cancelado assim, com a espera cumprida, não conta contra ele.
//
// Os números estão aqui e em mais lado nenhum: os Termos e a app dizem-nos
// por extenso, e mudam-se os três juntos.
export const PRAZO_GRATIS_MIN = 2;
export const ESPERA_MOTORISTA_MIN = 5;
export const JANELA_DIAS = 7;
export const AVISO_TARDIOS = 3;
export const SUSPENDER_TARDIOS = 5;
export const SUSPENSAO_HORAS = 24;

const MIN = 60 * 1000;

// Um cancelamento do passageiro é tardio se o motorista já tinha aceitado há
// mais de PRAZO_GRATIS_MIN. Sem hora de aceitação (viagens antigas) não é.
export function eTardio(aceiteEm, agora = new Date()) {
  if (!aceiteEm) return false;
  return agora.getTime() - new Date(aceiteEm).getTime() > PRAZO_GRATIS_MIN * MIN;
}

// Quantos minutos faltam ao motorista para poder dar o passageiro como
// faltoso. `null` quando ainda não tocou em «Cheguei» (não há espera a contar);
// 0 quando já pode.
export function minutosDeEsperaEmFalta(chegouEm, agora = new Date()) {
  if (!chegouEm) return null;
  const falta = ESPERA_MOTORISTA_MIN * MIN - (agora.getTime() - new Date(chegouEm).getTime());
  return falta <= 0 ? 0 : Math.ceil(falta / MIN);
}

// O que acontece ao passageiro com `tardios` cancelamentos tardios na janela
// (já contando o de agora).
export function consequencia(tardios) {
  if (tardios >= SUSPENDER_TARDIOS) return 'suspenso';
  if (tardios >= AVISO_TARDIOS) return 'demasiados';
  return null;
}

// A hora em Díli (UTC+9, sem hora de verão), para a mensagem da suspensão.
export function horaDeDili(data) {
  const d = new Date(new Date(data).getTime() + 9 * 60 * MIN);
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())}, ${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}`;
}
