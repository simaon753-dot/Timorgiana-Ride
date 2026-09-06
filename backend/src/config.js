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
  // A TARIFA, e o que cada parcela paga.
  //
  // Quatro parcelas: sair, andar perto, andar longe, e demorar.
  //
  // O REGRESSO VAZIO é a razão de haver duas parcelas de quilómetro, e foi o
  // Simão que a deu com um caso concreto: "nenhum motorista faz Terminal
  // Becora até Uma Adat João Paulo II por $7,25". São 13,5 km e 37 minutos.
  //
  // Quem faz essa viagem conduz 13,5 km com passageiro e depois 13,5 km SEM
  // NINGUÉM, porque o João Paulo II não tem procura para o trazer de volta.
  // Faz 27 km de trabalho e a fórmula linear pagava-lhe 13,5. Numa viagem de
  // 2 km no centro isso não acontece: acaba perto de mais procura.
  //
  // A distância longa não é cara por ser longa — é cara por DEIXAR O
  // MOTORISTA LONGE. Por isso os quilómetros além dos primeiros cinco custam
  // quase o dobro: é aí que o regresso vazio começa a pesar.
  //
  // O TEMPO custa o mesmo nos dois veículos. Meia hora é meia hora, de carro
  // ou de mota, e é meia hora da vida de uma pessoa. Essa parcela paga o
  // motorista, não o veículo.
  //
  // O QUILÓMETRO não custa o mesmo: combustível e desgaste de um carro andam
  // à volta de três vezes os de uma mota.
  //
  // TUDO ISTO É UM PONTO DE PARTIDA, calibrado num único caso que o Simão
  // conhece e nas referências do mercado de Díli (microlet $0,25 a viagem;
  // táxi negociado à volta de $10; aeroporto $15+). Com comissão zero, o
  // preço É o rendimento do motorista — o que se decide aqui é quanto ganha
  // quem conduz, e isso lê-se na rua. Muda-se em variáveis de ambiente no
  // Render, sem publicar nada.
  //
  // NOMES NOVOS: os antigos eram FARE_CAR_MIN para o mínimo e
  // FARE_CAR_MIN_MIN para o por-minuto, que ninguém acertava à primeira.
  // Os antigos DEIXARAM DE SER LIDOS.
  kmLongeAPartirDe: Number(process.env.FARE_KM_LONGE_A_PARTIR_DE) || 5,
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.25,
      porKm: Number(process.env.FARE_MOTO_POR_KM) || 0.2,
      porKmLonge: Number(process.env.FARE_MOTO_POR_KM_LONGE) || 0.35,
      porMinuto: Number(process.env.FARE_MOTO_POR_MINUTO) || 0.05,
      minimo: Number(process.env.FARE_MOTO_MINIMO) || 1.0,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 0.5,
      porKm: Number(process.env.FARE_CAR_POR_KM) || 0.5,
      porKmLonge: Number(process.env.FARE_CAR_POR_KM_LONGE) || 0.9,
      porMinuto: Number(process.env.FARE_CAR_POR_MINUTO) || 0.05,
      minimo: Number(process.env.FARE_CAR_MINIMO) || 2.0,
    },
  },

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
