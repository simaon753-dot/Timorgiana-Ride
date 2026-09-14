// Os nomes das formas de pagamento da assinatura.
//
// Bancos e marcas são nomes próprios e não se traduzem; o escritório e o
// agente são descrições e passam pelo dicionário. Num sítio só: o ecrã do
// motorista, o separador dos pagamentos e a ficha do motorista mostram as
// mesmas formas, e três cópias desta lista divergiam.
const NOMES = {
  tuqr: 'QR TUQR',
  mandiri: 'Bank Mandiri',
  bnu: 'BNU',
  bnctl: 'BNCTL',
  bri: 'BRI',
  telemor: 'Telemor',
};
const CHAVES = {
  escritorio: 'assinNoEscritorio',
  agente: 'assinComAgente',
};

export function nomeDaForma(id, t) {
  if (NOMES[id]) return NOMES[id];
  return CHAVES[id] ? t(CHAVES[id]) : id || '';
}
