const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T, assinaturas: AS } = C;

module.exports = C.documento(
  'Contrato de Utilização da Plataforma',
  `Entre a ${C.EMPRESA} e o Motorista  ·  ${C.MORADA}  ·  ${C.CONTACTOS}`,
  [
    C.sub('IDENTIFICAÇÃO DAS PARTES'),
    R([['PRIMEIRA OUTORGANTE: '], `${C.EMPRESA}, com sede em ${C.MORADA}, adiante designada por «Plataforma», que explora a aplicação ${C.APP}.`]),
    R([['SEGUNDO OUTORGANTE: '], '_______________________________________________, portador do documento de identificação n.º ______________________, com o número de telemóvel ______________________ e residente em _______________________________________________, adiante designado por «Motorista».']),
    P('As partes celebram entre si o presente contrato, que se rege pelas cláusulas seguintes.'),

    A('Cláusula 1.ª', 'Objeto'),
    P('A Plataforma disponibiliza ao Motorista o acesso a uma aplicação informática que aproxima passageiros de condutores disponíveis, permitindo-lhe receber e aceitar pedidos de viagem.'),
    P('A Plataforma não presta serviços de transporte. O transporte é executado pelo Motorista, com veículo próprio ou legitimamente cedido, e sob a sua exclusiva responsabilidade.'),

    A('Cláusula 2.ª', 'Natureza da relação'),
    R([['O presente contrato não constitui contrato de trabalho'], ' nem cria qualquer relação de subordinação jurídica, hierárquica ou disciplinar entre as partes.']),
    P('Em concreto, o Motorista:'),
    I('Não está obrigado a cumprir horários nem a atingir um número mínimo de viagens;'),
    I('Decide livremente quando liga e desliga o serviço;'),
    I('Pode aceitar ou recusar qualquer pedido de viagem;'),
    I('Não está sujeito a exclusividade, podendo utilizar outras plataformas ou exercer outra atividade;'),
    I('Suporta os custos da sua atividade, designadamente combustível, manutenção, seguro e impostos.'),

    A('Cláusula 3.ª', 'Obrigações do Motorista'),
    P('O Motorista obriga-se a:'),
    I('Manter válidos e submetidos na aplicação a carta de condução, o cartão de registo do veículo e o cartão de inspeção, bem como o documento de identificação e a fotografia;'),
    I('Contratar e manter em vigor o seguro de responsabilidade civil automóvel legalmente obrigatório (cláusula 7.ª);'),
    I('Cumprir o Código da Estrada e conduzir com prudência;'),
    I('Não conduzir sob o efeito de álcool, estupefacientes ou substâncias psicotrópicas;'),
    I('Realizar as viagens que aceitar, no veículo registado na aplicação e conduzido por si próprio;'),
    I('Tirar a fotografia de turno antes da primeira viagem de cada dia;'),
    I('Tratar todos os passageiros com respeito, sem discriminação de qualquer natureza;'),
    I('Cobrar exclusivamente o valor indicado pela aplicação, acrescido das taxas de entrada previstas na cláusula 6.ª;'),
    I('Observar os Regulamentos e a Política de Segurança dos Passageiros em vigor.'),

    A('Cláusula 4.ª', 'Obrigações da Plataforma'),
    P('A Plataforma obriga-se a:'),
    I('Manter a aplicação em funcionamento, com as interrupções técnicas inerentes a qualquer serviço informático;'),
    I('Encaminhar ao Motorista os pedidos de viagem compatíveis com o tipo de veículo, a lotação declarada e o município onde se encontra;'),
    I('Calcular e apresentar o preço de cada viagem;'),
    I('Apreciar a documentação submetida e comunicar as decisões de forma fundamentada;'),
    I('Avisar o Motorista quinze dias antes da caducidade de cada documento;'),
    I('Proteger os documentos e dados pessoais nos termos do Aviso de Privacidade.'),

    A('Cláusula 5.ª', 'Preço, cobrança e remuneração da Plataforma'),
    R(['O preço de cada viagem é fixado pela aplicação e ', ['pago pelo passageiro ao Motorista, em dinheiro, no final da viagem'], '. A Plataforma não recebe, não guarda nem movimenta qualquer quantia dos passageiros.']),
    R([['A Plataforma não cobra comissão sobre as viagens.'], ' Numa viagem de três dólares, o Motorista recebe três dólares.']),
    R(['O acesso à Plataforma é ', ['gratuito até 30 de abril de 2027'], '. A partir dessa data, o acesso passa a depender da aquisição de dias de utilização, de acordo com a tabela seguinte:']),
    T(
      ['Pacote', 'Carro', 'Motorizada'],
      [['3 dias', 'USD 4', 'USD 2'], ['10 dias', 'USD 12', 'USD 6'], ['30 dias', 'USD 30', 'USD 15']],
      [2900, 2800, 2800]
    ),
    R([['Só é descontado dia em que o Motorista conclua pelo menos uma viagem.'], ' Um dia em que não trabalhe, ou em que aceite uma viagem que o passageiro cancele, não é contado. A contagem faz-se pelo dia em Díli.']),
    P('O carregamento de dias pode ser feito por transferência bancária (Mandiri, BNU, BNCTL ou BRI), por Telemor, no escritório da Plataforma ou junto de agente autorizado.'),
    P('Qualquer alteração de preços é comunicada com antecedência, ficando o Motorista livre de deixar de utilizar a Plataforma.'),

    A('Cláusula 6.ª', 'Taxas de entrada em recintos'),
    P('Determinados recintos cobram taxa de entrada a veículos. Essa taxa é da responsabilidade do passageiro e é paga na cancela, não fazendo parte do preço da viagem nem transitando pela Plataforma.'),
    T(
      ['Recinto', 'Carro', 'Motorizada'],
      [
        ['Timor Plaza — estacionamento', 'USD 1 à entrada', 'Isento'],
        ['Aeroporto Nicolau Lobato — recinto', 'USD 1 por hora', 'USD 0,50 por hora'],
      ],
      [3400, 2600, 2500]
    ),
    P('A aplicação avisa o passageiro destas taxas antes de confirmar o pedido de viagem.'),

    A('Cláusula 7.ª', 'Seguro e responsabilidade'),
    R(['1.  O seguro de responsabilidade civil automóvel é ', ['obrigatório em Timor-Leste'], ` para todos os veículos motorizados, nos termos da ${C.SEGURO_LEI} (${C.SEGURO_ART}). O mesmo diploma fixa (${C.SEGURO_TETOS}) o limite máximo de responsabilidade da seguradora em `, ['USD 20.000'], ' para veículos de transporte de passageiros e de carga.']),
    P('2.  O Motorista obriga-se a contratar e manter em vigor essa apólice, junto de seguradora licenciada pelo Banco Central de Timor-Leste, e a confirmar junto dela que a cobertura abrange a atividade que efetivamente exerce.'),
    R(['3.  ', ['A Plataforma não é seguradora'], ', não presta cobertura de qualquer natureza, não exige a apresentação da apólice e não verifica a sua existência ou validade. A fiscalização do cumprimento desta obrigação compete às autoridades.']),
    R(['4.  ', ['Não estando o veículo seguro, o Motorista responde pessoalmente e sem qualquer limite'], ' pelos danos que cause a passageiros ou a terceiros, com todo o seu património presente e futuro, sem prejuízo da responsabilidade contraordenacional pela circulação sem seguro.']),
    C.nota('O n.º 4 não é uma ameaça: é a descrição do que acontece. O tecto de USD 20.000 protege quem tem apólice. Quem não tem não fica sem responsabilidade — fica sem quem a suporte, e responde pelo valor integral do dano, seja ele qual for.'),
    R(['5.  O Motorista exerce a sua atividade ', ['por sua conta e risco'], '. A Plataforma não responde por acidentes, contraordenações de trânsito, danos no veículo, danos causados a passageiros ou a terceiros, nem por qualquer ocorrência durante a prestação da viagem.']),
    P('6.  A Plataforma não garante um número mínimo de pedidos, um rendimento mínimo nem a disponibilidade ininterrupta do serviço.'),

    A('Cláusula 8.ª', 'Dados pessoais'),
    P('Os dados e documentos submetidos pelo Motorista são tratados exclusivamente para verificar a sua identidade e elegibilidade, operar o serviço e proteger passageiros e motoristas, nos termos do Aviso de Privacidade em vigor, que o Motorista declara conhecer e aceitar.'),
    P('Cada acesso aos documentos do Motorista por quem exerça funções de gestão fica registado.'),

    A('Cláusula 9.ª', 'Suspensão e cessação'),
    P('O acesso do Motorista fica automaticamente suspenso enquanto qualquer documento obrigatório estiver em falta, sem data de validade declarada ou fora de prazo, cessando a suspensão com a respetiva regularização.'),
    P('A Plataforma pode ainda suspender ou desativar a conta nos casos previstos na Tabela de Infrações e Sanções, designadamente:'),
    I('Apresentação de documentação falsa, alterada ou de terceiro;'),
    I('Utilização da conta por pessoa diferente do titular;'),
    I('Reclamações graves ou reiteradas quanto à segurança ou à conduta;'),
    I('Cobrança de valor diferente do indicado pela aplicação;'),
    I('Taxa excessiva de cancelamentos injustificados após aceitação.'),
    P('Qualquer das partes pode pôr termo ao presente contrato a todo o tempo, sem necessidade de invocar motivo e sem direito a indemnização. O Motorista fá-lo deixando de utilizar a aplicação ou solicitando a eliminação da conta.'),

    A('Cláusula 10.ª', 'Vigência e alterações'),
    P('O presente contrato vigora por tempo indeterminado a partir da data da sua assinatura, ou da aprovação da conta na aplicação, consoante o que ocorrer primeiro.'),
    P('As alterações aos Termos de Utilização e aos Regulamentos são comunicadas na aplicação e identificadas por versão datada, ficando registada a versão aceite pelo Motorista.'),

    A('Cláusula 11.ª', 'Lei aplicável e foro'),
    P('O presente contrato rege-se pela lei da República Democrática de Timor-Leste.'),
    P('As partes procurarão resolver por acordo qualquer litígio emergente deste contrato. Não sendo possível, é competente o tribunal da comarca de Díli, com expressa renúncia a qualquer outro.'),

    C.p(' ', { after: 200 }),
    R(['Feito em duplicado, ficando um exemplar na posse de cada parte.']),
    R(['Díli, ______ de _________________________ de 20______']),
    AS('A Plataforma  ·  Timorgiana, Lda', 'O Motorista'),
  ]
);
