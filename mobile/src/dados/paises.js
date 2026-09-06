// Indicativos telefónicos, para o campo do telemóvel.
//
// NÃO É A LISTA DE TODOS OS PAÍSES, e é de propósito. São cerca de duzentos,
// e quem se inscreve nesta aplicação está em Díli — precisa de encontrar o
// seu em dois segundos, não de percorrer uma lista onde o Timor-Leste é o
// último.
//
// Estão aqui: Timor-Leste em primeiro, os vizinhos, os países de língua
// portuguesa, e os que têm presença de trabalho ou cooperação em Timor-Leste.
// Se faltar algum que faça falta, acrescenta-se uma linha.
//
// O primeiro é o primeiro na lista e o escolhido por omissão. Noventa e nove
// por cento das inscrições não vão tocar neste campo.
export const PAISES = [
  { codigo: 'TL', indicativo: '+670', bandeira: '🇹🇱', nome: 'Timor-Leste' },

  { codigo: 'ID', indicativo: '+62', bandeira: '🇮🇩', nome: 'Indonésia' },
  { codigo: 'AU', indicativo: '+61', bandeira: '🇦🇺', nome: 'Austrália' },
  { codigo: 'PT', indicativo: '+351', bandeira: '🇵🇹', nome: 'Portugal' },
  { codigo: 'BR', indicativo: '+55', bandeira: '🇧🇷', nome: 'Brasil' },

  { codigo: 'AO', indicativo: '+244', bandeira: '🇦🇴', nome: 'Angola' },
  { codigo: 'CV', indicativo: '+238', bandeira: '🇨🇻', nome: 'Cabo Verde' },
  { codigo: 'GW', indicativo: '+245', bandeira: '🇬🇼', nome: 'Guiné-Bissau' },
  { codigo: 'MZ', indicativo: '+258', bandeira: '🇲🇿', nome: 'Moçambique' },
  { codigo: 'ST', indicativo: '+239', bandeira: '🇸🇹', nome: 'São Tomé e Príncipe' },

  { codigo: 'CN', indicativo: '+86', bandeira: '🇨🇳', nome: 'China' },
  { codigo: 'CU', indicativo: '+53', bandeira: '🇨🇺', nome: 'Cuba' },
  { codigo: 'IN', indicativo: '+91', bandeira: '🇮🇳', nome: 'Índia' },
  { codigo: 'JP', indicativo: '+81', bandeira: '🇯🇵', nome: 'Japão' },
  { codigo: 'KR', indicativo: '+82', bandeira: '🇰🇷', nome: 'Coreia do Sul' },
  { codigo: 'MY', indicativo: '+60', bandeira: '🇲🇾', nome: 'Malásia' },
  { codigo: 'NZ', indicativo: '+64', bandeira: '🇳🇿', nome: 'Nova Zelândia' },
  { codigo: 'PH', indicativo: '+63', bandeira: '🇵🇭', nome: 'Filipinas' },
  { codigo: 'PG', indicativo: '+675', bandeira: '🇵🇬', nome: 'Papua-Nova Guiné' },
  { codigo: 'SG', indicativo: '+65', bandeira: '🇸🇬', nome: 'Singapura' },
  { codigo: 'TH', indicativo: '+66', bandeira: '🇹🇭', nome: 'Tailândia' },
  { codigo: 'VN', indicativo: '+84', bandeira: '🇻🇳', nome: 'Vietname' },

  { codigo: 'DE', indicativo: '+49', bandeira: '🇩🇪', nome: 'Alemanha' },
  { codigo: 'ES', indicativo: '+34', bandeira: '🇪🇸', nome: 'Espanha' },
  { codigo: 'FR', indicativo: '+33', bandeira: '🇫🇷', nome: 'França' },
  { codigo: 'GB', indicativo: '+44', bandeira: '🇬🇧', nome: 'Reino Unido' },
  { codigo: 'IE', indicativo: '+353', bandeira: '🇮🇪', nome: 'Irlanda' },
  { codigo: 'IT', indicativo: '+39', bandeira: '🇮🇹', nome: 'Itália' },
  { codigo: 'NL', indicativo: '+31', bandeira: '🇳🇱', nome: 'Países Baixos' },
  { codigo: 'NO', indicativo: '+47', bandeira: '🇳🇴', nome: 'Noruega' },
  { codigo: 'US', indicativo: '+1', bandeira: '🇺🇸', nome: 'Estados Unidos' },
];

export const PAIS_POR_OMISSAO = PAISES[0];
