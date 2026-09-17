import type { ReactNode } from 'react';

// Ilustrações em SVG e não imagens: pesam quase nada, ficam nítidas em
// qualquer ecrã e usam as cores do painel. São discretas de propósito — estão
// lá para dar forma a um espaço vazio, não para o encher.

export function IlustracaoPrancheta({ className = 'h-28 w-28' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="none">
      <circle cx="60" cy="62" r="50" fill="#F1F9F7" />
      <circle cx="60" cy="62" r="36" fill="#DFF3F0" opacity=".6" />
      <rect x="34" y="26" width="52" height="68" rx="8" fill="#fff" stroke="#0F766E" strokeWidth="2.5" />
      <rect x="47" y="20" width="26" height="12" rx="4" fill="#0F766E" />
      <circle cx="60" cy="26" r="2" fill="#fff" />
      <path d="M44 48h24M44 60h32M44 72h20" stroke="#B9D9D4" strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="84" r="13" fill="#fff" stroke="#0F766E" strokeWidth="2.5" />
      <path d="m78.5 84 4 4 7-8" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="40" r="3" fill="#FF6B57" opacity=".8" />
      <circle cx="98" cy="46" r="2" fill="#0F766E" opacity=".35" />
    </svg>
  );
}

// Um ícone dentro de dois círculos suaves — a mesma família da prancheta,
// para os estados vazios dos outros módulos.
export function IlustracaoIcone({ children, className = 'size-24' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} aria-hidden>
      <span className="absolute inset-0 rounded-full bg-teal-suave" />
      <span className="absolute inset-[18%] rounded-full bg-teal-claro/70" />
      <span className="relative flex size-12 items-center justify-center rounded-2xl border-2 border-teal bg-white text-teal [&_svg]:size-6">
        {children}
      </span>
    </div>
  );
}

// A PAISAGEM do cabeçalho: montanhas, o mar de Díli e uma estrada que desce
// até à costa. Linhas finas e cores claras — tem de se ver só quando se olha.
export function IlustracaoPaisagem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 110" className={className} aria-hidden fill="none" preserveAspectRatio="xMaxYMax meet">
      <circle cx="252" cy="30" r="12" fill="#FF6B57" opacity=".22" />
      <circle cx="252" cy="30" r="6" fill="#FF6B57" opacity=".45" />
      <path d="M0 78 C40 56 70 44 104 58 C132 70 150 40 186 34 C220 28 250 52 282 46 C300 43 312 38 320 36 V110 H0Z" fill="#DFF3F0" opacity=".7" />
      <path d="M40 110 C80 72 130 66 170 74 C214 83 260 60 320 56 V110Z" fill="#C8E8E3" opacity=".75" />
      <path d="M0 96 C30 92 50 99 80 96 S130 91 160 95 S220 100 250 96 S300 92 320 95" stroke="#0F766E" strokeOpacity=".22" strokeWidth="1.5" />
      <path d="M0 104 C35 101 60 106 95 103 S150 99 185 103 S250 107 320 103" stroke="#0F766E" strokeOpacity=".15" strokeWidth="1.5" />
      <path d="M196 110 C204 96 214 86 232 78 C246 72 258 66 270 58" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M196 110 C204 96 214 86 232 78 C246 72 258 66 270 58" stroke="#FF6B57" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" />
      <path d="M286 44 v-9 m-4 3 h8" stroke="#0F766E" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
