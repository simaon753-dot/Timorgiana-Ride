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
  // TRÊS PARCELAS: sair, andar, e demorar.
  //
  // Até 06/09/2026 eram duas — base e por quilómetro — e o carro custava
  // EXACTAMENTE o dobro da moto em ambas. Isso era simetria, não era custo.
  //
  // O QUE MUDOU, e porquê:
  //
  // O TEMPO custa o mesmo nos dois. Meia hora é meia hora, de carro ou de
  // mota, e é meia hora da vida de uma pessoa. Por isso `perMin` é IGUAL
  // para os dois — é a parcela que paga o motorista, não o veículo.
  //
  // O QUILÓMETRO não custa o mesmo. Um carro gasta em combustível e desgaste
  // à volta de três vezes o que gasta uma mota, e não duas. É aí que a
  // diferença entre os dois veículos deve viver, e agora vive: $0,37 contra
  // $0,12, que é 3,1 vezes.
  //
  // Sem a parcela de tempo, uma viagem de 9,8 km pagava o mesmo fizesse ela
  // 27 minutos ou 45. Os motoristas notam isso em três dias, e a
  // consequência é previsível: começam a recusar viagens para onde há
  // engarrafamento — que são exactamente as que alguém precisa mais.
  //
  // Os valores foram escolhidos para que uma viagem típica de Díli (9,8 km,
  // 27 min) continue a custar o mesmo de antes: $2,75 de mota e $5,50 de
  // carro. Assim o Simão pode julgar a MUDANÇA DE FORMA sem a confundir com
  // uma mudança de preço. O nível é decisão dele, e muda-se sem publicar
  // nada — são variáveis de ambiente no Render.
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.25,
      perKm: Number(process.env.FARE_MOTO_KM) || 0.12,
      perMin: Number(process.env.FARE_MOTO_MIN_MIN) || 0.05,
      min: Number(process.env.FARE_MOTO_MIN) || 0.75,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 0.5,
      perKm: Number(process.env.FARE_CAR_KM) || 0.37,
      perMin: Number(process.env.FARE_CAR_MIN_MIN) || 0.05,
      min: Number(process.env.FARE_CAR_MIN) || 1.5,
    },
  },

  // Só os motoristas a esta distância do passageiro são avisados
  // Emergência em Timor-Leste. Três serviços diferentes, porque marcar o
  // número errado numa emergência custa minutos que ninguém tem.
  //
  //   115 — Protecção Civil (DNPC). Confirmado no sítio do Governo:
  //         incêndios, cheias, árvores caídas, acidentes.
  //   112 — Polícia. Fonte não oficial, A CONFIRMAR localmente.
  //   110 — Ambulância / emergência médica. Idem.
  //
  // Alteráveis por ambiente de propósito: um número errado corrige-se em
  // minutos no servidor, não em dias à espera de um APK novo.
  numerosEmergencia: {
    medica: process.env.EMERGENCY_MEDICAL || '110',
    // Segunda linha da ambulância, confirmada localmente. O 110 é o
    // número curto; quando não atende, este é o fixo do serviço. Numa
    // emergência, um número que não atende vale zero — e é justamente
    // quando ninguém se lembra de procurar o alternativo.
    medicaAlternativa: process.env.EMERGENCY_MEDICAL_ALT || '3311044',
    policia: process.env.EMERGENCY_POLICE || '112',
    protecao: process.env.EMERGENCY_CIVIL || '115',
  },
  // Mantido para não partir quem já o lia; aponta para a polícia.
  numeroEmergencia: process.env.EMERGENCY_NUMBER || process.env.EMERGENCY_POLICE || '112',
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
