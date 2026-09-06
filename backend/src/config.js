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
  // A TARIFA, e porque é esta.
  //
  // ABAIXO DA CONCORRÊNCIA, por decisão do Simão. Em Timor-Leste já operam
  // duas aplicações (TRON e GOTimor), e ele mandou fotografias de quatro
  // orçamentos delas. Dois pontos do carro chegaram para reconstruir a
  // recta exacta, e os outros dois confirmaram-na ao cêntimo:
  //
  //     mota          $0,30 + $0,35/km
  //     carro 4 lug.  $0,30 + $0,85/km
  //     carro 6 lug.  $0,30 + $1,00/km
  //     (sem parcela de tempo — é uma recta pura)
  //
  // Ficamos cerca de 10% abaixo em todas as distâncias.
  //
  // ISTO DESFEZ UMA CONCLUSÃO MINHA DE HÁ UMA HORA. Eu tinha inventado duas
  // parcelas de quilómetro — os primeiros cinco a um preço, os seguintes a
  // quase o dobro — para pagar o regresso vazio de quem leva alguém para
  // longe. O raciocínio continua a fazer sentido, mas eu tinha-o construído
  // a partir de UM caso. Agora há quatro preços de quem opera aqui há
  // tempo, e eles cobram em recta. Quatro observações do mercado valem mais
  // do que uma inferência minha, por boa que a inferência pareça.
  //
  // O QUE FICOU da correcção anterior: a parcela de TEMPO, e o quilómetro
  // do carro a ser mais do dobro do da mota. Meia hora é meia hora nos dois
  // veículos, e é meia hora da vida de uma pessoa; o combustível e o
  // desgaste é que não são iguais.
  //
  // A parcela de tempo é pequena de propósito ($0,03 e $0,02): protege o
  // motorista preso no trânsito sem nos levar acima deles num dia mau.
  //
  // OS MÍNIMOS SÃO BAIXOS, e também isso é o mercado a mandar.
  //
  // Eu tinha-os posto em $2,00 e $1,00, com o argumento de que abaixo disso
  // não compensa arrancar. Mas a recta deles não tem mínimo nenhum: numa
  // viagem de um quilómetro cobram $1,15 de carro. Com o meu mínimo de
  // $2,00 ficávamos QUASE AO DOBRO deles justamente nas viagens mais curtas
  // — que são as mais frequentes, e aquelas em que um microlet a 25 centavos
  // está à espera.
  //
  // Segunda vez hoje que um argumento meu, bom no papel, cede a um número
  // de quem já opera aqui.
  //
  // FALTA UMA COISA QUE ELES TÊM: cobram mais por seis lugares do que por
  // quatro ($1,00 contra $0,85 por km). Nós temos o número de pessoas no
  // pedido e não o usamos no preço. Fica assinalado; não o faço sem o Simão
  // decidir.
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.3,
      porKm: Number(process.env.FARE_MOTO_POR_KM) || 0.28,
      porMinuto: Number(process.env.FARE_MOTO_POR_MINUTO) || 0.02,
      minimo: Number(process.env.FARE_MOTO_MINIMO) || 0.5,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 0.3,
      porKm: Number(process.env.FARE_CAR_POR_KM) || 0.7,
      porMinuto: Number(process.env.FARE_CAR_POR_MINUTO) || 0.03,
      minimo: Number(process.env.FARE_CAR_MINIMO) || 1.0,
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
