const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T } = C;

module.exports = C.documento(
  'Regulamento de Registo e Inspeção de Veículos',
  `${C.EMPRESA}  ·  ${C.MORADA}  ·  ${C.CONTACTOS}  ·  Versão de ${C.VERSAO}`,
  [
    A('Artigo 1.º', 'Objeto'),
    P('O presente Regulamento fixa as condições que um veículo deve reunir para ser utilizado no transporte de passageiros angariados através da aplicação TimorgianaRide, bem como as regras de registo, inspeção e substituição desse veículo.'),

    A('Artigo 2.º', 'Veículos admitidos'),
    P('São admitidos dois tipos de veículo:'),
    T(
      ['Tipo', 'Designação na aplicação', 'Lotação'],
      [
        ['Automóvel ligeiro de passageiros', 'Carro', 'Declarada pelo motorista, sem contar com o condutor'],
        ['Motociclo ou ciclomotor', 'Motorizada', 'Um passageiro'],
      ],
      [2900, 2300, 3300]
    ),
    P('A lotação declarada é vinculativa: um pedido de viagem para mais pessoas do que o veículo comporta não é apresentado ao motorista.'),

    A('Artigo 3.º', 'Registo do veículo na aplicação'),
    P('O motorista declara, no ato de candidatura ou quando passe a utilizar outro veículo:'),
    I('Tipo de veículo — carro ou motorizada;'),
    I('Marca e modelo;'),
    I('Matrícula;'),
    I('Cor, escolhida de entre as cores previstas na aplicação;'),
    I('Tratando-se de carro, o número de lugares para passageiros.'),
    N('A cor é registada por código e não por palavra. O passageiro lê «Branco» em português e o motorista lê «Mutin» em tétum — a mesma cor, na língua de cada um. É por ela que o passageiro identifica o veículo na rua.'),

    A('Artigo 4.º', 'Cartão de registo do veículo'),
    P('É obrigatória a submissão do cartão de registo do veículo, com indicação da respetiva data de validade.'),
    P('A matrícula constante do cartão deve corresponder à matrícula declarada na aplicação. A divergência entre ambas determina a recusa da candidatura ou a suspensão da conta até esclarecimento.'),

    A('Artigo 5.º', 'Cartão de inspeção'),
    R(['É obrigatória a submissão do ', ['Cartão de Inspeção (Kartaun Inspesaun)'], ', emitido pela Direção Nacional de Transportes Terrestres ao abrigo do Decreto-Lei n.º 6/2003, artigo 110.º.']),
    P('A data a declarar é a que consta da linha «Valido Inspesaun» do cartão, e não a data de inspeção, a data de compra ou a data de registo, que também nele figuram.'),
    R(['O cartão tem, em regra, a validade de ', ['um ano'], '.']),

    A('Artigo 6.º', 'Renovação da inspeção'),
    R(['O próprio cartão determina que a renovação seja requerida ', ['a partir dos dez dias anteriores'], ' ao termo do prazo, advertindo que a circulação com o cartão fora de prazo é sancionada com multa agravada.']),
    R(['A aplicação avisa o motorista ', ['quinze dias'], ' antes, indicando quantos dias faltam, e recorda a partir de que data pode dirigir-se à Direção Nacional de Transportes Terrestres. O aviso é dado com antecedência suficiente para reparar nele, e não tão cedo que provoque uma deslocação inútil.']),

    A('Artigo 7.º', 'Efeitos da caducidade'),
    P('O cartão de inspeção caducado, o cartão de registo caducado ou a carta de condução caducada determinam a impossibilidade automática de entrar ao serviço.'),
    R(['O documento é válido ', ['até ao dia nele inscrito, inclusive'], '. A contagem faz-se pelo dia em Díli.']),
    P('A conta é reativada automaticamente com a submissão do documento renovado, sem necessidade de qualquer ato da Timorgiana, Lda.'),

    A('Artigo 8.º', 'Estado e conservação do veículo'),
    P('Constitui obrigação permanente do motorista manter o veículo em condições de segurança e asseio, designadamente:'),
    I('Travões, pneus, luzes, espelhos e buzina em estado de funcionamento;'),
    I('Cintos de segurança operacionais em todos os lugares declarados, tratando-se de carro;'),
    I('Capacete disponível para o passageiro, tratando-se de motorizada;'),
    I('Habitáculo limpo e sem odores que incomodem o passageiro;'),
    I('Ausência de danos que comprometam a segurança da circulação.'),

    A('Artigo 9.º', 'Seguro obrigatório'),
    R(['O seguro de responsabilidade civil automóvel é ', ['obrigatório para todos os veículos motorizados'], ` que circulem em Timor-Leste, incluindo os de matrícula estrangeira que entrem no território, nos termos da ${C.SEGURO_LEI} (${C.SEGURO_ART}).`]),
    R([`O mesmo diploma fixa (${C.SEGURO_TETOS}) os limites máximos de responsabilidade da seguradora:`]),
    T(
      ['Categoria do veículo', 'Limite por sinistro'],
      [
        ['Transporte de passageiros e de carga', 'USD 20.000'],
        ['Restantes veículos motorizados', 'USD 6.000'],
      ],
      [5400, 3100]
    ),
    P('O veículo afeto ao transporte de passageiros angariados através da aplicação insere-se na primeira categoria.'),
    P('Compete exclusivamente ao motorista, ou ao proprietário do veículo, contratar e manter em vigor a apólice junto de seguradora licenciada pelo Banco Central de Timor-Leste, e confirmar junto dela que a cobertura abrange a atividade efetivamente exercida.'),
    R([['A Timorgiana, Lda não é seguradora, não presta cobertura de qualquer natureza, não exige a apresentação da apólice e não responde por sinistros ocorridos durante a viagem.']]),
    C.nota('A ausência de seguro não elimina a responsabilidade — elimina quem a suporta. Quem circule sem apólice responde com o seu próprio património, sem qualquer limite, pelos danos que cause. O tecto de USD 20.000 protege quem está segurado; quem não está fica exposto ao valor integral do dano, seja ele qual for.'),

    A('Artigo 10.º', 'Alteração ou substituição do veículo'),
    P('A substituição do veículo obriga à atualização imediata dos dados na aplicação e à submissão do novo cartão de registo e do novo cartão de inspeção.'),
    R([['É proibido realizar viagens em veículo diferente do registado na aplicação.'], ' O passageiro identifica o veículo pela marca, pelo modelo, pela cor e pela matrícula que a aplicação lhe mostra; um veículo diferente do anunciado põe em causa a segurança de quem espera na rua.']),

    A('Artigo 11.º', 'Veículo de terceiro'),
    P('O motorista que conduza veículo de que não seja proprietário deve dispor de autorização escrita do proprietário para o afetar ao transporte remunerado de passageiros, nos termos do modelo de declaração disponibilizado pela Timorgiana, Lda.'),
    P('A Timorgiana, Lda pode solicitar a exibição dessa autorização a qualquer momento.'),

    A('Artigo 12.º', 'Verificações'),
    P('A aplicação verifica automaticamente, no momento da apreciação da candidatura e sempre que um documento seja substituído:'),
    I('A presença dos documentos exigidos;'),
    I('A existência de data de validade nos documentos que a exijam;'),
    I('A não caducidade de qualquer documento;'),
    I('A plausibilidade da data declarada, assinalando as que se afastem manifestamente do prazo normal do documento;'),
    I('A proximidade do termo do prazo, nos trinta dias seguintes.'),
    N('A verificação de plausibilidade não recusa nada: assinala. Um cartão de inspeção declarado como válido por três anos não é um documento válido — é um lapso ou uma invenção —, e o que a aplicação faz é chamar a atenção de quem decide para essa fotografia em concreto.'),

    A('Artigo 13.º', 'Entrada em vigor'),
    P(`O presente Regulamento entra em vigor em ${C.VERSAO}.`),
  ]
);
