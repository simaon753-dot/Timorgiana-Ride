import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Junta classes do Tailwind e resolve conflitos: `cn('p-4', 'p-2')` dá `p-2`.
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}

// As iniciais para o avatar: "Simão Neto Soares" → "SS" (primeiro e último).
export function iniciais(nome: string | null | undefined) {
  // Só palavras que começam por uma letra: "Administrador (demonstração)"
  // dava "A(" por causa do parêntese.
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p));
  if (!partes.length) return '?';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] ?? '' : '';
  return (a + b).toUpperCase();
}

export function primeiroNome(nome: string | null | undefined) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}
