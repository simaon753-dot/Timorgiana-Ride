// DATAS COMO TEXTO 'AAAA-MM-DD', para os Ganhos (04/10/2026).
//
// O servidor conta os dias na hora de Díli e manda-os assim, sem fuso. As
// contas daqui fazem-se em UTC de propósito: um `Date` local mudava o dia num
// telemóvel com o fuso de Lisboa ou de Jacarta, e o «hoje» do ecrã deixava de
// ser o «hoje» das viagens.

// Hoje em Díli (UTC+9, sem hora de verão), pelo relógio do telemóvel.
export function hojeEmDili(agora = Date.now()) {
  return new Date(agora + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

const emData = (iso) => new Date(`${iso}T00:00:00Z`);

export function somarDias(iso, n) {
  const d = emData(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 0 = domingo … 6 = sábado.
export function diaDaSemana(iso) {
  return emData(iso).getUTCDay();
}

// A segunda-feira da semana do dia: as semanas do gráfico começam à segunda.
export function segundaDaSemana(iso) {
  return somarDias(iso, -((diaDaSemana(iso) + 6) % 7));
}

export function diasEntre(de, ate) {
  return Math.round((emData(ate) - emData(de)) / 86400000) + 1;
}

// '2026-10-04' → '04/10'
export function diaMes(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

// Os filtros do ecrã. «Personalizado» traz o seu próprio intervalo.
export function periodoDoFiltro(filtro, hoje, personalizado) {
  switch (filtro) {
    case 'hoje':
      return { de: hoje, ate: hoje };
    case '30':
      return { de: somarDias(hoje, -29), ate: hoje };
    case 'mes':
      return { de: `${hoje.slice(0, 8)}01`, ate: hoje };
    case 'personalizado':
      return personalizado || { de: somarDias(hoje, -6), ate: hoje };
    case '7':
    default:
      return { de: somarDias(hoje, -6), ate: hoje };
  }
}

// Minutos → «6h 20m». Nulo (antes de as horas se registarem) → «—».
export function horasMinutos(min) {
  if (min == null) return '—';
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

// Os dias agrupados para o gráfico: por dia, por semana (a começar à segunda)
// ou por mês. Recebe a lista do servidor (do mais recente para o mais antigo)
// e devolve do mais antigo para o mais recente, como se lê um gráfico.
export function agrupar(porDia, modo) {
  const ordem = [...porDia].reverse();
  if (modo === 'dia') {
    return ordem.map((d) => ({
      chave: d.dia,
      de: d.dia,
      ate: d.dia,
      valor: d.valor,
      viagens: d.viagens,
      dias: d.conta ? 1 : 0,
    }));
  }
  const grupos = new Map();
  for (const d of ordem) {
    const chave = modo === 'semana' ? segundaDaSemana(d.dia) : d.dia.slice(0, 7);
    const g = grupos.get(chave) || { chave, de: d.dia, ate: d.dia, valor: 0, viagens: 0, dias: 0 };
    g.ate = d.dia;
    g.valor += d.valor;
    g.viagens += d.viagens;
    g.dias += d.conta ? 1 : 0;
    grupos.set(chave, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, valor: Math.round(g.valor * 100) / 100 }));
}

// «1 viagem», e não «1 viagens». Uma chave para o um e outra para o resto.
export function contagem(t, n, um, varios) {
  return n === 1 ? t(um) : t(varios, { n });
}
