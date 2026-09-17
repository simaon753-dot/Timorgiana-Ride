// DATAS, HORAS E DINHEIRO — sempre como em Díli.
//
// O navegador de quem abre o painel pode estar noutro fuso (um computador
// configurado em Lisboa, um portátil em viagem). Uma viagem pedida às 08:30
// em Díli não pode aparecer às 00:30. Por isso tudo passa por aqui, com o
// fuso de Timor-Leste escrito explicitamente.

export const FUSO = 'Asia/Dili';

const dataFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const horaFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
});
const diaCurtoFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: FUSO,
  day: '2-digit',
  month: 'short',
});

function paraData(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  // "2026-09-17" sozinho é um dia do calendário, não um instante: lê-se como
  // meio-dia em Díli para não escorregar para o dia anterior noutro fuso.
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T12:00:00+09:00`);
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function data(v: string | Date | null | undefined) {
  const d = paraData(v);
  return d ? dataFmt.format(d) : '—';
}

export function hora(v: string | Date | null | undefined) {
  const d = paraData(v);
  return d ? horaFmt.format(d) : '—';
}

export function dataHora(v: string | Date | null | undefined) {
  const d = paraData(v);
  return d ? `${dataFmt.format(d)} ${horaFmt.format(d)}` : '—';
}

export function diaCurto(v: string | Date | null | undefined) {
  const d = paraData(v);
  return d ? diaCurtoFmt.format(d).replace('.', '') : '—';
}

// "há 5 min", "há 3 h", "há 2 dias" — para o que é recente; a data para o resto.
export function haQuanto(v: string | Date | null | undefined) {
  const d = paraData(v);
  if (!d) return '—';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'agora mesmo';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 8) return `há ${dias} dia${dias === 1 ? '' : 's'}`;
  return data(d);
}

// O dia de hoje em Díli, no formato AAAA-MM-DD.
export function hojeEmDili() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
  return partes; // en-CA dá "2026-09-17"
}

// A hora de Díli agora (0–23), para o cumprimento.
export function horaEmDili() {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(new Date())
  );
}

// A moeda é o dólar americano, escrito como em Timor-Leste: US$15.00.
export function dolares(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `US$${Number(v).toFixed(2)}`;
}

export function numero(v: number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-PT').format(v);
}

export function percentagem(parte: number, todo: number) {
  if (!todo) return '—';
  return `${Math.round((parte / todo) * 100)}%`;
}

export function duracao(segundos: number | null | undefined) {
  if (segundos == null) return '—';
  if (segundos < 60) return `${segundos} s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function diasAte(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 86400000);
}
