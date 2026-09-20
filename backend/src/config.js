import 'dotenv/config';

// OS TIPOS DE VEÍCULO, numa lista só.
//
// Estavam escritos à mão em catorze sítios do servidor, sempre como um
// ternário de dois — `x === 'motorbike' ? 'motorbike' : 'car'`. Cada um deles
// teria de virar um ternário de três, e o quarto tipo obrigaria a repetir
// tudo outra vez. Uma lista resolve os catorze de uma vez.
//
// A ORDEM é a que o passageiro vê: da mais barata para a mais especial.
export const TIPOS_VEICULO = ['motorbike', 'car', 'carry'];

// OS SERVIÇOS DA PLATAFORMA, e o que se pode ligar e desligar (20/09/2026).
//
// PORQUE EXISTE. O Pickup já se desligava no painel, mas por um caminho só
// dele: uma chave à parte no código, uma função com o nome dele, um `if` em
// cada sítio que o recusa. Acrescentar um serviço novo obrigava a repetir os
// três — e o Simão quer acrescentar serviços (jastip, comida, mart, pulsa e
// contas, saúde) e experimentá-los desligados antes de os abrir.
//
// `emConstrucao` é a parte que importa. Um serviço por acabar NÃO se liga:
// nem pelo painel, nem por engano, nem por uma linha na base de dados. A
// promessa é dupla — quem instala a app não vê um serviço que não funciona, e
// quem o está a construir não tem de o esconder à mão.
//
// O interruptor guarda-se em `config_servico`, na chave `<id>.ativo`, que é a
// mesma que o Carry já usava. Nada migra e não há duas verdades.
export const SERVICOS = [
  { id: 'motorbike', familia: 'viagem', emConstrucao: false },
  { id: 'car', familia: 'viagem', emConstrucao: false },
  { id: 'carry', familia: 'entrega', emConstrucao: false },
  // EM CONSTRUÇÃO até estar testado de ponta a ponta (20/09/2026). Enquanto
  // isto for `true`, nem o painel nem o servidor o deixam ligar.
  { id: 'jastip', familia: 'encomenda', emConstrucao: true },
];

export const servicoConhecido = (id) => SERVICOS.some((s) => s.id === id);

// AS REGRAS DO JASTIP, decididas pelo Simão a 20/09/2026.
//
// O teto é o tamanho máximo da perda de um motorista que adianta dinheiro a
// quem não paga: US$25 é menos de dois dias de trabalho numa mota. As três
// viagens exigidas são a única defesa que custa zero — quem cria uma conta só
// para encomendar não as tem.
//
// Os escalões ficam editáveis no painel (`jastip.regras`), como os preços do
// Pickup: um preço no código é um preço que obriga a publicar uma versão nova
// da app para mudar.
export const JASTIP_PADRAO = {
  tetoUsd: Number(process.env.JASTIP_TETO) || 25,
  viagensMinimas: Number(process.env.JASTIP_VIAGENS_MINIMAS) || 3,
  escaloes: [
    { ate: 10, taxa: 1 },
    { ate: 25, taxa: 1.5 },
  ],
  // Quem encomenda tem de ter o email confirmado, além das viagens feitas.
  //
  // É a única verificação de identidade que a app tem hoje que não se apaga
  // com uma desinstalação: o telefone repete-se em cartões novos, o nome
  // escreve-se como se quiser, e quem cria uma conta para levar o dinheiro de
  // um motorista não deixa atrás um email que já usou. Fica editável no painel
  // porque é uma trava, e uma trava tem de poder abrir-se sem publicar código.
  exigeEmailConfirmado: true,
};

// CARRY COM PESSOAS: até 15, decidido pelo Simão (13/09/26). As pessoas vão na
// caixa; é para grupos que não cabem num carro. O número de 15 é dele — é o
// que uma caixa de Carry leva em Díli sem ser perigoso, e isso sabe-se da rua.
export const MAX_PESSOAS_CARRY = 15;

// O QUE UMA CARGA PODE SER. Lista fechada e não texto livre: assim contam-se,
// e ao fim de um ano sabe-se o que Díli manda transportar — que é informação,
// e não uma pilha de frases para ler uma a uma. Quem tiver outra coisa escolhe
// "outros" e explica nas observações.
// Pela ordem do ecrã, definida pelo Simão (13/09/26). 'mudanca' é nova; o texto
// livre de 'outros' vai em rides.carga_outro. A MESMA lista está na app
// (CargaDoPedido), no cartão do motorista e no painel — o verificar-tipos da
// app confere que as quatro coincidem.
export const TIPOS_CARGA = [
  'compras',
  'caixas',
  'moveis',
  'mudanca',
  'eletrodomesticos',
  'materiais',
  'mercadorias',
  'outros',
];
export const VOLUMES_CARGA = ['pequeno', 'medio', 'grande'];
export const AJUDAS_CARGA = ['nenhuma', 'carregar', 'descarregar', 'ambas'];

// O VEÍCULO DE CARGA, descrito para o matching (14/09/26). A carroçaria diz
// o que o veículo protege (chuva, sol, roubo); a capacidade diz o que cabe. A
// capacidade é a que decide quem vê um pedido: uma carga GRANDE só vai a
// veículos grandes, uma MÉDIA a médios e grandes, uma PEQUENA a todos.
export const CARROCERIAS = ['aberta', 'coberta', 'fechada', 'caixa'];
export const CAPACIDADES = ['pequena', 'media', 'grande'];
// Porque é que um motorista pôs um pedido de lado. Fica registado na
// história da viagem: "carga incompatível" repetida diz que os pedidos estão
// a chegar aos veículos errados.
export const MOTIVOS_RECUSA = ['agora', 'incompativel'];
// As etapas que o motorista marca numa entrega de bens, pela ordem.
export const ETAPAS_CARGA = ['carregada', 'no_destino', 'descarregada'];

export const config = {
  // As regras do jastip, substituídas pelo que o painel gravar.
  jastip: JASTIP_PADRAO,
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
  // A MARGEM TEM DE SE VER, e é o Simão que sabe quanto.
  //
  // A primeira calibração pôs-nos 2% abaixo deles: $11,55 contra $11,78 na
  // viagem Becora–João Paulo II. Ele respondeu que em Timor-Leste uma
  // diferença dessas "não vale nada", e deu o número que vale: $10.
  //
  // Tem razão, e é uma coisa que eu não descobriria sozinho. Ninguém troca
  // de aplicação por 23 cêntimos. E não é só o tamanho da diferença — é o
  // NÚMERO REDONDO: "dez dólares" lê-se como uma coisa, "onze e cinquenta e
  // cinco" lê-se como a mesma coisa que "onze e setenta e oito".
  //
  // Uma margem de 2% não é uma margem pequena. É margem nenhuma, com o custo
  // de a dar.
  //
  // Fica em cerca de 15% abaixo em toda a tabela, ancorada nesse $10.
  //
  // FALTA UMA COISA QUE ELES TÊM: cobram mais por seis lugares do que por
  // quatro ($1,00 contra $0,85 por km). Nós temos o número de pessoas no
  // pedido e não o usamos no preço. Fica assinalado; não o faço sem o Simão
  // decidir.
  tarifas: {
    motorbike: {
      base: Number(process.env.FARE_MOTO_BASE) || 0.25,
      porKm: Number(process.env.FARE_MOTO_POR_KM) || 0.256,
      porMinuto: Number(process.env.FARE_MOTO_POR_MINUTO) || 0.02,
      minimo: Number(process.env.FARE_MOTO_MINIMO) || 0.5,
    },
    car: {
      base: Number(process.env.FARE_CAR_BASE) || 0.25,
      porKm: Number(process.env.FARE_CAR_POR_KM) || 0.64,
      porMinuto: Number(process.env.FARE_CAR_POR_MINUTO) || 0.03,
      minimo: Number(process.env.FARE_CAR_MINIMO) || 1.0,
      // ── A PARTIR DE CINCO PESSOAS ────────────────────────────────
      //
      // A concorrência cobra $1,00/km ao carro de seis lugares contra $0,85
      // ao de quatro — mais 17,6%. Aplicado ao nosso $0,64 dá $0,75, o que
      // nos deixa abaixo deles nas duas tabelas e na mesma proporção.
      //
      // É COBRADO PELAS PESSOAS E NÃO PELO VEÍCULO, e a diferença é toda.
      //
      // O nosso preço é firme no momento do pedido, e nesse momento não se
      // sabe que carro vai aceitar. Cobrar pelo veículo que aparece obrigava
      // a só dizer o preço quando ele chegasse — e a certeza do preço antes
      // de entrar é o que faz as pessoas confiarem num sistema a dinheiro.
      //
      // O número de pessoas é escolhido ANTES de o preço aparecer, e uma
      // viagem de cinco ou seis só pode ser aceite por um carro grande: o
      // sistema já filtra por lugares na lista e na aceitação. Cobrar pela
      // coisa que o passageiro controla e conhece guarda as duas pontas.
      //
      // Cinco e não seis: um carro normal leva quatro passageiros. É aos
      // cinco que passa a ser preciso outro veículo, e é aí que o custo do
      // motorista muda.
      lugaresGrande: Number(process.env.FARE_CAR_LUGARES_GRANDE) || 5,
      porKmGrande: Number(process.env.FARE_CAR_POR_KM_GRANDE) || 0.75,
    },
    // CARRY — transporte de bens. Valores DE PARTIDA, por decidir.
    //
    // O Simão escreveu "não assumir preços fixos; preparar para o
    // administrador configurar depois". Estes números existem para o serviço
    // poder funcionar hoje, e são a coisa deste ficheiro com menos fundamento:
    // não vêm de nenhum preço observado na rua, ao contrário da mota e do
    // carro, que vieram de quatro orçamentos da concorrência.
    //
    // Porque é que são mais altos do que o carro, mesmo assim: uma viagem de
    // Carry inclui parar, carregar e descarregar. O tempo do motorista não é
    // só a distância — e a parcela por minuto, aqui, conta mais do que nas
    // outras duas.
    //
    // Todos por variável de ambiente, como os outros: mudam no alojamento
    // sem publicar app nenhuma.
    carry: {
      base: Number(process.env.FARE_CARRY_BASE) || 1.5,
      porKm: Number(process.env.FARE_CARRY_POR_KM) || 0.85,
      porMinuto: Number(process.env.FARE_CARRY_POR_MINUTO) || 0.05,
      minimo: Number(process.env.FARE_CARRY_MINIMO) || 3.0,
      // COM PESSOAS o preço é por viagem (não por cabeça), com mínimo de $5 —
      // decisão do Simão. Os bens mantêm os $3: foi sobre as pessoas que se
      // perguntou, e mudar o mínimo dos bens seria decidir por ele.
      minimoPessoas: Number(process.env.FARE_CARRY_MINIMO_PESSOAS) || 5.0,

      // O VOLUME MULTIPLICA, A AJUDA SOMA. E a diferença não é de gosto.
      //
      // Carga maior é mais peso e mais viagem — custa mais em cada
      // quilómetro, por isso multiplica a distância. Ajudar a carregar é
      // tempo parado à porta, igual em Becora ou em Manleuana: custa o
      // mesmo numa viagem de um quilómetro e numa de vinte, por isso soma
      // um valor fixo em vez de multiplicar.
      //
      // Multiplicar a ajuda faria uma cadeira levada ao fim da rua custar
      // cêntimos de mão-de-obra e a mesma cadeira levada a Baucau custar
      // dez dólares — pelo mesmo esforço, feito à mesma porta.
      //
      // Valores de partida, como o resto do Carry: por confirmar com quem
      // carrega móveis em Díli.
      volume: {
        pequeno: Number(process.env.FARE_CARRY_VOL_PEQUENO) || 1,
        medio: Number(process.env.FARE_CARRY_VOL_MEDIO) || 1.25,
        grande: Number(process.env.FARE_CARRY_VOL_GRANDE) || 1.6,
      },
      ajuda: {
        nenhuma: Number(process.env.FARE_CARRY_AJUDA_NENHUMA) || 0,
        carregar: Number(process.env.FARE_CARRY_AJUDA_CARREGAR) || 1,
        descarregar: Number(process.env.FARE_CARRY_AJUDA_DESCARREGAR) || 1,
        ambas: Number(process.env.FARE_CARRY_AJUDA_AMBAS) || 2,
      },
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

// O SEGREDO DAS SESSÕES não pode ser um dos valores públicos.
//
// Com ele, quem o souber fabrica a sessão de qualquer pessoa e vê tudo o que
// ela vê. Estes dois estão escritos no repositório, que é PÚBLICO: o de
// reserva do próprio código, e o exemplo do .env que alguém pode colar tal e
// qual sem reparar.
//
// Antes isto só AVISAVA e o servidor subia na mesma — ou seja, um servidor
// mal configurado parecia saudável. Agora, ligado a uma base de dados que
// não é a local (o mesmo teste que decide o SSL, acima), RECUSA arrancar.
// Falhar alto é melhor do que servir a fingir que está seguro.
//
// Localmente, contra a base local, o valor de reserva continua a servir para
// desenvolver sem obrigar ninguém a definir nada.
//
// PORQUE NÃO EXIJO AQUI UM COMPRIMENTO MÍNIMO: o segredo verdadeiro está no
// alojamento, não no repositório — eu não o vejo, e não sei quantos
// caracteres tem. Uma regra de comprimento podia recusar o servidor que
// AGORA funciona, no próximo deploy, e deitar o serviço abaixo para toda a
// gente. Recuso só o que sei ao certo ser inseguro: os valores públicos. Um
// segredo curto leva um aviso, nunca uma paragem.
const SEGREDOS_PUBLICOS = new Set(['dev-secret-inseguro-mudar', 'trocar-este-segredo-em-producao']);
const baseLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

if (SEGREDOS_PUBLICOS.has(config.jwtSecret)) {
  if (baseLocal) {
    console.warn(
      '[config] AVISO: JWT_SECRET por definir. A usar o segredo de desenvolvimento (só local).'
    );
  } else {
    console.error(
      '[config] ERRO: JWT_SECRET está com um valor público, com uma base de dados remota.\n' +
        '          Qualquer pessoa poderia fabricar sessões. O servidor não vai arrancar.\n' +
        '          Gere um segredo com:  openssl rand -hex 32\n' +
        '          e defina JWT_SECRET nas variáveis de ambiente do alojamento.'
    );
    process.exit(1);
  }
} else if (config.jwtSecret.length < 32) {
  console.warn(
    '[config] AVISO: JWT_SECRET é curto. Recomenda-se 32+ caracteres (openssl rand -hex 32).'
  );
}
