const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T, assinaturas: AS } = C;

module.exports = C.documento(
  'Declaração de Cedência de Veículo',
  `Entre o Proprietário do veículo e o Motorista  ·  para apresentação à ${C.EMPRESA}`,
  [
    C.nota('Esta declaração destina-se ao motorista que conduz veículo de que não é proprietário. Em Timor-Leste é frequente conduzir-se veículo de familiar, de sócio ou de empregador; sem um documento que o titule, o motorista não consegue demonstrar que circula legitimamente, e o proprietário não consegue demonstrar em que condições cedeu o veículo.'),

    C.sub('IDENTIFICAÇÃO DAS PARTES'),
    R([['PRIMEIRO OUTORGANTE — PROPRIETÁRIO'], '']),
    P('Nome: _______________________________________________________________________'),
    P('Documento de identificação n.º: _______________________  Telemóvel: __________________'),
    P('Morada: _____________________________________________________________________'),
    C.p(' ', { after: 60 }),
    R([['SEGUNDO OUTORGANTE — MOTORISTA'], '']),
    P('Nome: _______________________________________________________________________'),
    P('Documento de identificação n.º: _______________________  Telemóvel: __________________'),
    P('Carta de condução n.º: ________________________  Categoria: ____________________'),
    P('Morada: _____________________________________________________________________'),

    A('Cláusula 1.ª', 'Identificação do veículo'),
    T(
      ['Elemento', 'Preencher'],
      [
        ['Tipo', 'Carro  ☐        Motorizada  ☐'],
        ['Marca e modelo', '________________________________________'],
        ['Matrícula', '________________________________________'],
        ['Cor', '________________________________________'],
        ['N.º de chassis', '________________________________________'],
        ['N.º do motor', '________________________________________'],
        ['Lugares para passageiros', '________________________________________'],
      ],
      [3000, 5500]
    ),

    A('Cláusula 2.ª', 'Declaração de propriedade'),
    P('O Primeiro Outorgante declara ser o legítimo proprietário do veículo identificado na cláusula anterior, encontrando-se o mesmo livre de ónus ou encargos que impeçam a sua utilização nos termos da presente declaração.'),

    A('Cláusula 3.ª', 'Autorização de utilização'),
    R(['O Primeiro Outorgante autoriza expressamente o Segundo Outorgante a conduzir o referido veículo e a utilizá-lo no ', ['transporte remunerado de passageiros'], ` angariados através da aplicação ${C.APP}.`]),
    P('A autorização é pessoal e intransmissível, não podendo o Segundo Outorgante ceder a condução do veículo a terceiro para os mesmos fins.'),

    A('Cláusula 4.ª', 'Prazo'),
    P('A presente autorização é válida:'),
    I('☐  Por tempo indeterminado, até revogação escrita do Primeiro Outorgante;'),
    I('☐  Até ______ de _________________________ de 20______.'),
    P('A revogação produz efeitos a partir do momento em que seja comunicada ao Segundo Outorgante e à Timorgiana, Lda.'),

    A('Cláusula 5.ª', 'Seguro obrigatório'),
    R(['1.  Os Outorgantes declaram conhecer que o seguro de responsabilidade civil automóvel é ', ['obrigatório'], ` para todos os veículos motorizados que circulem em Timor-Leste, nos termos da ${C.SEGURO_LEI} (${C.SEGURO_ART}), e que o limite máximo de responsabilidade da seguradora é de `, ['USD 20.000'], ` para veículos de transporte de passageiros e de carga (${C.SEGURO_TETOS}).`]),
    P('2.  Assinale-se a situação do veículo:'),
    I('☐  O veículo está seguro. Apólice n.º ________________________, seguradora ________________________, válida até ______ / ______ / __________.'),
    I('☐  O veículo NÃO está seguro. Os Outorgantes declaram conhecer as consequências indicadas no n.º 4.'),
    P('3.  Estando o veículo seguro, o Primeiro Outorgante declara ter confirmado junto do segurador que a cobertura abrange a utilização do veículo no transporte remunerado de passageiros.'),
    R(['4.  ', ['Não estando o veículo seguro, os Outorgantes respondem pessoalmente e sem qualquer limite'], ' pelos danos causados a passageiros ou a terceiros, nos termos gerais de direito, sem prejuízo da responsabilidade contraordenacional pela circulação sem seguro.']),
    C.nota('A caixa do n.º 2 existe para ser marcada com verdade, e não para ser deixada em branco. Um veículo sem seguro pode continuar a circular — e circula —, mas quem o conduz e quem o cede passam a responder com o que têm. Escrever isso aqui, antes de acontecer, é o único momento em que ainda serve para alguma coisa. A Timorgiana, Lda não é seguradora e não presta cobertura de qualquer natureza.'),

    A('Cláusula 6.ª', 'Documentos do veículo'),
    P('O Primeiro Outorgante entrega ao Segundo Outorgante, ou coloca à sua disposição, o cartão de registo do veículo e o cartão de inspeção válidos, obrigando-se a mantê-los atualizados enquanto durar a presente autorização.'),
    P('O Segundo Outorgante obriga-se a comunicar ao Primeiro Outorgante, com a antecedência necessária, a aproximação do termo do prazo de qualquer desses documentos.'),

    A('Cláusula 7.ª', 'Responsabilidade'),
    P('As partes declaram conhecer e aceitar que:'),
    I('A responsabilidade civil emergente da circulação do veículo se rege pela lei aplicável e pelo contrato de seguro em vigor;'),
    I('As contraordenações de trânsito praticadas durante a condução pelo Segundo Outorgante são da responsabilidade deste, que se obriga a suportá-las;'),
    I('Os danos causados ao veículo por culpa do Segundo Outorgante são da responsabilidade deste, nos termos acordados entre as partes;'),
    R(['A Timorgiana, Lda é ', ['alheia a esta relação'], ', não é parte no presente acordo e não responde por danos, contraordenações, dívidas ou litígios entre os Outorgantes.']),

    A('Cláusula 8.ª', 'Condições acordadas entre as partes'),
    P('As partes podem aqui consignar as condições económicas da cedência, designadamente valor, periodicidade e encargos suportados por cada uma:'),
    P('_____________________________________________________________________________'),
    P('_____________________________________________________________________________'),
    P('_____________________________________________________________________________'),
    C.nota('A Timorgiana, Lda não intervém nestas condições nem as fiscaliza. Ficam escritas por interesse das próprias partes: um acordo verbal sobre dinheiro entre quem empresta um veículo e quem o conduz é a origem mais frequente de conflito.'),

    A('Cláusula 9.ª', 'Apresentação à Plataforma'),
    P('Os Outorgantes autorizam a apresentação de cópia da presente declaração à Timorgiana, Lda, para instrução do processo de admissão do Segundo Outorgante à aplicação, e reconhecem que aquela pode solicitar a sua exibição a qualquer momento.'),

    C.p(' ', { after: 200 }),
    R(['Feito em duplicado, ficando um exemplar na posse de cada Outorgante.']),
    R(['Díli, ______ de _________________________ de 20______']),
    AS('O Proprietário', 'O Motorista'),
    C.p(' ', { after: 120 }),
    R([['Testemunhas'], ' (facultativo)']),
    AS('Nome e assinatura', 'Nome e assinatura'),
  ]
);
