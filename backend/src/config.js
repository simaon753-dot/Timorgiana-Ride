import 'dotenv/config';

export const config = {
  // O alojamento define a porta por variável de ambiente
  port: Number(process.env.PORT) || 4000,

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-inseguro-mudar',
  jwtExpiresIn: '30d',

  // Ligação PostgreSQL (Neon, Render, Railway…)
  databaseUrl: process.env.DATABASE_URL || '',

  // Tarifas sugeridas, por tipo de veículo. Ficam aqui (e não na app)
  // para poderem ser mudadas no painel do alojamento sem obrigar os
  // utilizadores a instalar uma versão nova.
  //
  // Valores de partida para Díli — a confirmar com quem conhece o mercado.
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.5,
      perKm: Number(process.env.FARE_MOTO_KM) || 0.25,
      min: Number(process.env.FARE_MOTO_MIN) || 1,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 1,
      perKm: Number(process.env.FARE_CAR_KM) || 0.5,
      min: Number(process.env.FARE_CAR_MIN) || 2,
    },
  },

  // Só os motoristas a esta distância do passageiro são avisados
  raioAvisoKm: Number(process.env.NOTIFY_RADIUS_KM) || 10,

  // Serviços geridos exigem TLS. Local (localhost) normalmente não.
  databaseSsl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || ''),
};

if (!config.databaseUrl) {
  console.error('[config] ERRO: DATABASE_URL não definido. Copia .env.example para .env.');
  process.exit(1);
}

if (config.jwtSecret === 'dev-secret-inseguro-mudar') {
  console.warn('[config] AVISO: JWT_SECRET não definido. A usar segredo de desenvolvimento.');
}
