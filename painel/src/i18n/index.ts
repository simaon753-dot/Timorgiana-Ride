import { pt } from './pt';

// OS TEXTOS DO PAINEL, num dicionário e não espalhados pelo código.
//
// Hoje só há português, que é a língua por omissão. O tétum e o inglês entram
// na Fase 3 como mais dois dicionários com AS MESMAS CHAVES: o tipo `Chave`
// obriga cada tradução a ter todas as entradas do português, e uma chave em
// falta é um erro de compilação e não um texto em branco no ecrã.

export type Chave = keyof typeof pt;
export type Dicionario = Record<Chave, string>;
export type Lingua = 'pt';

const dicionarios: Record<Lingua, Dicionario> = { pt };
let lingua: Lingua = 'pt';

export function mudarLingua(l: Lingua) {
  lingua = l;
  document.documentElement.lang = l;
}

// t('aprov.titulo') · t('comum.haHoras', { n: 3 })
export function t(chave: Chave, vars?: Record<string, string | number>): string {
  const texto: string = dicionarios[lingua][chave] ?? chave;
  if (!vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

// Para tabelas de rótulos: tl('veiculo', 'car') lê 'veiculo.car', e devolve o
// código cru se não houver tradução — melhor ver "xpto" do que nada.
export function tl(grupo: string, codigo: string | null | undefined): string {
  if (!codigo) return '—';
  const k = `${grupo}.${codigo}` as Chave;
  return (dicionarios[lingua] as Record<string, string>)[k] ?? codigo;
}
