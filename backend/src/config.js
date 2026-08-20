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
  // Motorizada: até 2 km custa 0,75 USD (valor definido pelo Simão). A
  // fórmula 0,25 + 0,25/km dá exactamente esse valor aos 2 km, por isso a
  // tabela cresce sem saltos em vez de ter um caso especial.
  // Carro: o dobro, proporção habitual entre mota-táxi e táxi.
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.25,
      perKm: Number(process.env.FARE_MOTO_KM) || 0.25,
      min: Number(process.env.FARE_MOTO_MIN) || 0.75,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 0.5,
      perKm: Number(process.env.FARE_CAR_KM) || 0.5,
      min: Number(process.env.FARE_CAR_MIN) || 1.5,
    },
  },

  // Só os motoristas a esta distância do passageiro são avisados
  // Emergência em Timor-Leste. Configurável por ambiente porque o número
  // certo pode mudar e não queremos gerar um APK novo por causa disso.
  numeroEmergencia: process.env.EMERGENCY_NUMBER || '112',
  avisoCancelamentos: Number(process.env.CANCEL_WARN_AFTER) || 3,

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
