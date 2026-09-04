const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T } = C;

module.exports = C.documento(
  'Política de Segurança dos Passageiros',
  `${C.EMPRESA}  ·  ${C.MORADA}  ·  ${C.CONTACTOS}  ·  Versão de ${C.VERSAO}`,
  [
    P('Esta Política descreve o que a TimorgianaRide faz para proteger quem viaja, o que pede ao passageiro que faça, e — com igual clareza — o que não pode garantir.'),

    A('1.', 'Quem conduz foi verificado'),
    P('Nenhum motorista recebe pedidos de viagem sem que a sua conta tenha sido aprovada. A aprovação exige cinco documentos: fotografia, documento de identificação, carta de condução, cartão de registo do veículo e cartão de inspeção.'),
    R(['A carta de condução, o registo e a inspeção têm de estar ', ['dentro do prazo'], '. Um documento caducado impede automaticamente o motorista de entrar ao serviço, e a conta só volta a funcionar quando o documento renovado for enviado.']),

    A('2.', 'Quem conduz hoje é quem foi verificado'),
    R(['Antes da primeira viagem de cada dia, o motorista tira uma ', ['fotografia de si próprio'], ' na aplicação.']),
    P('Os documentos verificam a conta; esta fotografia verifica a pessoa que está ao volante nesse dia. Serve para impedir que a conta de um motorista aprovado seja utilizada por outra pessoa.'),

    A('3.', 'O veículo que chega é o veículo anunciado'),
    P('Antes de entrar, o passageiro vê na aplicação a fotografia do motorista, o seu nome, a marca e o modelo do veículo, a cor e a matrícula.'),
    R([['Se alguma destas coisas não corresponder, não entre.'], ' Cancele a viagem e comunique-nos.']),

    A('4.', 'Código de recolha'),
    R(['A aplicação mostra ao passageiro um ', ['código'], ' que este diz ao motorista antes de a viagem começar. Sem esse código, a viagem não é iniciada.']),
    P('O código faz duas coisas: prova ao motorista que quem entrou no veículo é quem pediu a viagem, e impede que sejam registadas viagens que não aconteceram.'),

    A('5.', 'Botão de emergência'),
    R(['Durante toda a viagem, passageiro e motorista dispõem de um ', ['botão de socorro'], ' que envia um alerta imediato com a posição do momento.']),
    P('O alerta identifica o tipo de emergência pedido, para que quem responde saiba se deve chamar a polícia, uma ambulância ou prestar outro auxílio.'),
    R([['O botão de socorro não substitui os números nacionais de emergência.'], ' Em perigo imediato, ligue primeiro para as autoridades.']),

    A('6.', 'Partilhar a viagem'),
    P('O passageiro pode partilhar a viagem com quem quiser — familiar, amigo, colega. A pessoa com quem partilhar passa a saber quem conduz, em que veículo, e para onde vai a viagem.'),
    N('Numa cidade pequena, isto é frequentemente a proteção mais eficaz de todas: alguém, algures, sabe em que carro entrou e para onde.'),

    A('7.', 'Contacto durante a viagem'),
    P('Passageiro e motorista podem falar entre si por telefone ou por mensagem dentro da aplicação, para se encontrarem no ponto de recolha.'),
    R(['As conversas ', ['não são lidas pela administração da plataforma'], '. O acesso a documentos de identificação, esse, fica registado.']),

    A('8.', 'Avaliação'),
    P('No final de cada viagem, o passageiro avalia o motorista. As avaliações são acompanhadas e uma classificação persistentemente baixa determina a análise da conta.'),

    A('9.', 'Preço e pagamento'),
    R(['O preço é fixado pela aplicação e ', ['não se negoceia dentro do veículo'], '. O pagamento é feito em dinheiro, ao motorista, no final da viagem.']),
    P('Determinados recintos cobram taxa de entrada, que é da responsabilidade do passageiro e paga na cancela:'),
    T(
      ['Recinto', 'Carro', 'Motorizada'],
      [
        ['Timor Plaza — estacionamento', 'USD 1 à entrada', 'Isento'],
        ['Aeroporto Nicolau Lobato', 'USD 1 por hora', 'USD 0,50 por hora'],
      ],
      [3400, 2600, 2500]
    ),
    P('A aplicação avisa desta taxa antes de confirmar o pedido, para que ninguém seja surpreendido à cancela.'),

    A('10.', 'Conduta exigida ao motorista'),
    P('É expressamente proibido ao motorista:'),
    I('Conduzir sob o efeito de álcool, estupefacientes ou substâncias psicotrópicas;'),
    I('Discriminar qualquer passageiro em razão do sexo, origem, língua, religião, deficiência ou condição social;'),
    I('Ter comportamento ou linguagem de natureza sexual, intimidatória ou ofensiva;'),
    I('Cobrar valor diferente do indicado pela aplicação;'),
    I('Desviar-se do percurso sem acordo do passageiro;'),
    I('Transportar pessoa não incluída no pedido de viagem;'),
    I('Utilizar veículo diferente do registado.'),

    A('11.', 'Conduta exigida ao passageiro'),
    P('É pedido ao passageiro que:'),
    I('Use cinto de segurança no automóvel e capacete na motorizada;'),
    I('Não transporte mais pessoas do que as declaradas no pedido;'),
    I('Não fume nem consuma bebidas alcoólicas dentro do veículo;'),
    I('Não transporte substâncias ou objetos proibidos por lei;'),
    I('Trate o motorista com respeito e não danifique o veículo;'),
    I('Pague o valor devido no final da viagem.'),

    A('12.', 'Menores'),
    P('Os menores devem viajar acompanhados por adulto responsável. O motorista pode recusar o transporte de menor desacompanhado.'),

    A('13.', 'Objetos esquecidos'),
    P('O objeto esquecido no veículo deve ser comunicado logo que possível, pela aplicação ou pelos contactos abaixo. A plataforma auxilia na aproximação entre passageiro e motorista para a devolução, mas não responde pela perda de bens.'),

    A('14.', 'Acidente'),
    P('Em caso de acidente, deve o passageiro:'),
    I('Assegurar primeiro a sua própria segurança e a dos demais;'),
    I('Contactar as autoridades e os serviços de emergência;'),
    I('Utilizar o botão de socorro da aplicação;'),
    I('Comunicar a ocorrência à plataforma logo que possível.'),
    R([`A responsabilidade civil emergente do acidente recai sobre o motorista. O seguro de responsabilidade civil automóvel é obrigatório em Timor-Leste (${C.SEGURO_LEI}) e cobre os danos até `, ['USD 20.000'], ' tratando-se de veículo de transporte de passageiros.']),
    R([['Nem todos os veículos que circulam em Díli estão seguros.'], ' Não estando, o passageiro lesado terá de exigir a indemnização directamente ao motorista, nos termos gerais de direito. A Timorgiana, Lda não é seguradora, não presta cobertura e não substitui a apólice que falte.']),

    A('15.', 'Como reclamar'),
    P(`Qualquer ocorrência de segurança pode ser comunicada pelos contactos ${C.CONTACTOS}, ou através da aplicação.`),
    P('As reclamações relativas a segurança são analisadas com prioridade e podem determinar a suspensão imediata da conta do motorista enquanto durar a análise.'),

    A('16.', 'O que não podemos garantir'),
    R([['Somos uma plataforma tecnológica de intermediação, e não uma empresa de transportes.'], ' Não conduzimos, não somos proprietários dos veículos e não somos seguradora.']),
    P('Verificamos documentos, registamos quem conduz, damos meios de alerta e agimos sobre as reclamações que recebemos. Não podemos garantir o comportamento de uma pessoa dentro de um veículo, nem substituir-nos às autoridades.'),
    P('Esta Política descreve o que fazemos — e diz também o que não fazemos, porque uma promessa que não se pode cumprir é pior do que a sua ausência.'),
  ]
);
