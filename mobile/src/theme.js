// Identidade visual TimorgianaRide
// Paleta: teal (primária), coral (ação/destaque), papel (fundo)

export const colors = {
  teal: '#0E5C54',
  tealDark: '#0A463F',
  tealLight: '#1C7A70',
  coral: '#FF6B4A',
  coralDark: '#E85531',
  paper: '#F7F4EF',

  white: '#FFFFFF',
  text: '#1C2421', // quase preto, com toque verde
  textMuted: '#6B756F',
  border: '#E2DDD4',
  inputBg: '#FFFFFF',

  danger: '#C0392B',
  success: '#2E7D5B',
  star: '#F4B400',

  // Texto sobre fundos escuros
  onTeal: '#F2F8F6',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34 };

export const theme = { colors, spacing, radius, fontSize };
export default theme;
