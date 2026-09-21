const { documento, artigo, sub, p, rico, item, nota, VERSAO_DNTT } = require('./comum-dntt.js');

// ANTEPROJETO DE DIPLOMA MINISTERIAL.
//
// Escrito na via do meio: a plataforma REGISTA-SE e assume deveres de
// verificação; não se licencia como operador de transporte. É a solução que
// dá ao regulador o que ele precisa — um interlocutor com nome, uma lista de
// condutores e um sítio onde fiscalizar — sem transferir para a plataforma a
// exploração do transporte, que continua a ser do condutor.
//
// Inclui o motociclo, porque em Díli é ele que faz o trabalho e porque um
// regime que o ignore nasce a fingir que o problema não existe.
module.exports = documento(
  'Anteprojeto de Diploma Ministerial',
  `Transporte individual e remunerado de passageiros a partir de plataforma eletrónica  ·  proposta para apreciação da DNTT  ·  ${VERSAO_DNTT}`,
  [
    nota(
      'Documento de trabalho, apresentado por iniciativa privada para apreciação da Direção ' +
      'Nacional dos Transportes Terrestres. Não vincula nem representa posição oficial. Os valores ' +
      'das taxas são indicativos e carecem de fixação pela entidade competente.'
    ),

    p('Preâmbulo', { forte: true }),
    p(
      'Considerando que o Decreto-Lei n.º 2/2003, de 10 de Março, comete à Direção Nacional dos ' +
      'Transportes Terrestres a atribuição de licenças para veículos ligeiros destinados a ' +
      'transportes ocasionais de passageiros;'
    ),
    p(
      'Considerando que o Diploma Ministerial n.º 5/2010, de 5 de Maio, disciplina o transporte ' +
      'individual de passageiros apenas na modalidade de táxi, em veículo caracterizado;'
    ),
    p(
      'Considerando que a intermediação por meios eletrónicos entre passageiros e condutores se ' +
      'difundiu em Timor-Leste sem que a lei a preveja, e que dessa ausência resultam riscos para ' +
      'os passageiros, incerteza para os condutores e impossibilidade de fiscalização;'
    ),
    p(
      'Considerando que importa disciplinar a atividade sem a proibir, assegurando a identificação ' +
      'de quem conduz, as condições do veículo e a responsabilidade de quem organiza o serviço;'
    ),
    p('O Governo, pelo Ministro dos Transportes e Comunicações, manda publicar o seguinte diploma:', { after: 200 }),

    p('CAPÍTULO I  ·  Disposições gerais', { forte: true, centro: true }),

    artigo('Artigo 1.º', 'Objeto'),
    p(
      'O presente diploma estabelece o regime do transporte individual e remunerado de passageiros ' +
      'em veículos não caracterizados, solicitado através de plataforma eletrónica, bem como o ' +
      'regime das plataformas que o organizam.'
    ),

    artigo('Artigo 2.º', 'Definições'),
    item('«Plataforma eletrónica», o sistema informático que põe em contacto passageiros e condutores e através do qual a viagem é solicitada;'),
    item('«Operador de plataforma», a pessoa coletiva que explora a plataforma eletrónica;'),
    item('«Condutor aderente», a pessoa singular registada na plataforma que realiza o transporte com veículo próprio ou cedido;'),
    item('«Veículo aderente», o veículo ligeiro ou motociclo afeto à atividade, não caracterizado como táxi;'),
    item('«Viagem», o transporte solicitado através da plataforma, com origem e destino determinados pelo passageiro.'),

    artigo('Artigo 3.º', 'Natureza da atividade'),
    p('1. O contrato de transporte é celebrado entre o passageiro e o condutor aderente.'),
    p(
      '2. O operador de plataforma não é transportador, sem prejuízo dos deveres que o presente ' +
      'diploma lhe comete e da responsabilidade pelo seu incumprimento.'
    ),

    p('CAPÍTULO II  ·  Do operador de plataforma', { forte: true, centro: true }),

    artigo('Artigo 4.º', 'Registo obrigatório'),
    p(
      '1. O exercício da atividade de operador de plataforma depende de registo prévio na Direção ' +
      'Nacional dos Transportes Terrestres.'
    ),
    p('2. São requisitos do registo:', { after: 90 }),
    item('Ser pessoa coletiva constituída e registada em Timor-Leste;'),
    item('Ter a atividade compreendida no objeto social;'),
    item('Ter a situação tributária regularizada;'),
    item('Dispor de representante legal com domicílio em Timor-Leste;'),
    item('Dispor de meio de contacto permanente para as autoridades.'),
    p('3. O registo é válido por três anos e renovável por iguais períodos.'),

    artigo('Artigo 5.º', 'Deveres do operador de plataforma'),
    p('O operador de plataforma deve:', { after: 90 }),
    item('Verificar, antes de admitir o condutor, a sua identidade, carta de condução válida e da categoria adequada, e o registo e a inspeção válida do veículo;'),
    item('Impedir o acesso à plataforma de condutor ou veículo cujos documentos se encontrem caducados;'),
    item('Manter registo de cada viagem, com data, hora, origem, destino, condutor, veículo e preço, pelo prazo de dois anos;'),
    item('Facultar à Direção Nacional dos Transportes Terrestres, quando solicitado, a lista de condutores e veículos ativos;'),
    item('Apresentar ao passageiro, antes da aceitação da viagem, a identificação do condutor e a matrícula do veículo;'),
    item('Disponibilizar meio gratuito de reclamação e responder no prazo de quinze dias;'),
    item('Comunicar às autoridades competentes os acidentes e incidentes de segurança de que tenha conhecimento;'),
    item('Informar previamente o passageiro do preço ou do critério da sua formação.'),

    artigo('Artigo 6.º', 'Informação periódica'),
    p(
      'O operador de plataforma remete semestralmente à Direção Nacional dos Transportes Terrestres ' +
      'informação estatística sobre o número de condutores ativos, de veículos e de viagens, por ' +
      'município, em formato a definir por despacho do Diretor Nacional.'
    ),

    p('CAPÍTULO III  ·  Do condutor', { forte: true, centro: true }),

    artigo('Artigo 7.º', 'Requisitos do condutor aderente'),
    p('Só pode ser condutor aderente quem:', { after: 90 }),
    item('Seja legalmente domiciliado em Timor-Leste e titular de documento de identificação;'),
    item('Seja titular de carta de condução válida, da categoria adequada ao veículo, há mais de dois anos;'),
    item('Não tenha sido condenado por crime relacionado com a condução, contra as pessoas ou contra a liberdade e autodeterminação sexual;'),
    item('Tenha frequentado a ação de formação prevista no artigo seguinte.'),

    artigo('Artigo 8.º', 'Formação'),
    p(
      '1. O condutor aderente frequenta ação de formação de duração não inferior a oito horas, ' +
      'ministrada ou certificada pela Direção Nacional dos Transportes Terrestres, versando ' +
      'segurança rodoviária, atendimento ao passageiro, primeiros socorros e regras da atividade.'
    ),
    p('2. A formação é válida por cinco anos.'),

    artigo('Artigo 9.º', 'Deveres do condutor'),
    item('Portar, em serviço, os documentos pessoais e do veículo, e o comprovativo de registo na plataforma;'),
    item('Manter o veículo em bom estado de funcionamento, segurança e higiene;'),
    item('Transportar apenas passageiros que tenham solicitado a viagem através da plataforma;'),
    item('Não cobrar valor superior ao apresentado pela plataforma;'),
    item('No transporte em motociclo, dispor de capacete para o passageiro, em conformidade com o Diploma Ministerial n.º 2/2010, de 5 de Maio.'),

    p('CAPÍTULO IV  ·  Do veículo', { forte: true, centro: true }),

    artigo('Artigo 10.º', 'Requisitos do veículo aderente'),
    p('1. O veículo aderente deve:', { after: 90 }),
    item('Estar registado e matriculado em Timor-Leste;'),
    item('Ter inspeção periódica válida;'),
    item('Ter seguro válido que cubra a responsabilidade civil perante terceiros transportados;'),
    item('Não ostentar sinais próprios do táxi.'),
    p(
      '2. O veículo ostenta, em local visível, dístico identificativo do modelo aprovado pela ' +
      'Direção Nacional dos Transportes Terrestres, removível e associado à matrícula.'
    ),

    artigo('Artigo 11.º', 'Transporte em motociclo'),
    p(
      '1. É admitido o transporte de um passageiro em motociclo, desde que o veículo disponha de ' +
      'assento e apoios adequados e o condutor e o passageiro usem capacete.'
    ),
    p('2. É vedado o transporte de mais de um passageiro e o transporte de menores de doze anos.'),

    p('CAPÍTULO V  ·  Fiscalização e sanções', { forte: true, centro: true }),

    artigo('Artigo 12.º', 'Fiscalização'),
    p(
      'Compete à Direção Nacional dos Transportes Terrestres e à Polícia Nacional de Timor-Leste a ' +
      'fiscalização do cumprimento do presente diploma.'
    ),

    artigo('Artigo 13.º', 'Contraordenações'),
    p('1. Constituem contraordenação, punível com coima:', { after: 90 }),
    item('O exercício da atividade de operador de plataforma sem registo: de 500 a 2.000 dólares;'),
    item('A violação dos deveres do artigo 5.º: de 200 a 1.000 dólares;'),
    item('A condução sem preencher os requisitos do artigo 7.º: de 50 a 150 dólares;'),
    item('A violação dos deveres do artigo 9.º: de 25 a 100 dólares;'),
    item('A utilização de veículo em violação do artigo 10.º: de 50 a 200 dólares.'),
    p(
      '2. A reincidência no exercício sem registo determina o cancelamento do registo e a ' +
      'impossibilidade de novo pedido pelo prazo de dois anos.'
    ),

    p('CAPÍTULO VI  ·  Disposições finais e transitórias', { forte: true, centro: true }),

    artigo('Artigo 14.º', 'Taxas'),
    p('São devidas à Direção Nacional dos Transportes Terrestres as seguintes taxas:', { after: 90 }),
    item('Registo de operador de plataforma: 250 dólares;'),
    item('Renovação do registo: 150 dólares;'),
    item('Emissão do dístico identificativo do veículo: 5 dólares;'),
    item('Certificado de formação do condutor: 10 dólares.'),

    artigo('Artigo 15.º', 'Regime transitório'),
    p(
      '1. Os operadores que à data da entrada em vigor do presente diploma já se encontrem em ' +
      'atividade dispõem de noventa dias para requerer o registo.'
    ),
    p('2. Os condutores dispõem de cento e oitenta dias para cumprir o disposto nos artigos 7.º e 8.º.'),

    artigo('Artigo 16.º', 'Entrada em vigor'),
    p('O presente diploma entra em vigor no dia seguinte ao da sua publicação no Jornal da República.'),
  ]
);
