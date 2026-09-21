const {
  documento, artigo, sub, p, rico, item, nota, assinaturas,
  EMPRESA, MORADA, CONTACTOS, APP, VERSAO_DNTT, DL_BASES, DM_TAXI,
} = require('./comum-dntt.js');

// EXPOSIÇÃO AO DNTT.
//
// Uma carta de apresentação, não uma defesa. Quem chega antes de ser chamado
// escolhe o assunto da conversa; quem chega depois responde ao assunto dos
// outros. O pedido é de audiência e de enquadramento — nunca de perdão, que
// pressupõe culpa, nem de tolerância, que pressupõe favor.
module.exports = documento(
  'Exposição ao Diretor Nacional dos Transportes Terrestres',
  `${EMPRESA}  ·  ${MORADA}  ·  ${CONTACTOS}  ·  ${VERSAO_DNTT}`,
  [
    p('Exmo. Senhor Diretor Nacional dos Transportes Terrestres', { forte: true, after: 40 }),
    p('Ministério dos Transportes e Comunicações', { after: 40 }),
    p('Avenida Balide n.º 227, Díli', { after: 260 }),

    rico([
      ['Assunto: '],
      'Apresentação da plataforma TimorgianaRide, pedido de audiência e manifestação de ' +
        'disponibilidade para o enquadramento regulamentar da atividade.',
    ], { after: 240 }),

    artigo('1.', 'Quem somos'),
    rico([
      'A ', [EMPRESA], ', com sede em ', [MORADA],
      ', desenvolveu e explora a aplicação informática ', [APP],
      ', destinada a pôr em contacto, em Díli, quem precisa de uma deslocação e quem está ' +
        'disponível para a realizar com veículo próprio.',
    ]),
    p(
      'A aplicação encontra-se em fase de ensaio, com um número reduzido de condutores conhecidos ' +
      'da empresa. Não foi ainda objeto de divulgação pública nem de campanha de angariação.'
    ),

    artigo('2.', 'Porque nos dirigimos ao DNTT antes de qualquer outra diligência'),
    p(
      'Tomámos conhecimento, pela comunicação social, da posição desta Direção Nacional quanto à ' +
      'falta de licenciamento de uma empresa que explora serviço semelhante. Entendemos que a ' +
      'questão é séria e que nos diz diretamente respeito.'
    ),
    p(
      'Entendemos igualmente que o caminho correto não é aguardar por uma notificação, mas ' +
      'apresentarmo-nos, expor com exatidão o que fazemos e colocarmo-nos à disposição desta ' +
      'Direção Nacional para o que ela determinar. É o que fazemos por esta via.'
    ),

    artigo('3.', 'O que a aplicação faz, e o que não faz'),
    p('Com o rigor que a matéria exige, e para que não subsista equívoco:', { after: 90 }),
    item('A empresa não possui veículos, não os aluga e não emprega condutores.'),
    item(
      'O contrato de transporte é celebrado entre o passageiro e o condutor. O preço é pago ' +
      'diretamente ao condutor, em numerário, no fim da viagem.'
    ),
    item(
      'A empresa não cobra comissão sobre a viagem. A sua única remuneração é uma Taxa de Acesso ' +
      'de valor fixo, paga pelo condutor pelo uso da aplicação durante um período determinado.'
    ),
    item(
      'A aplicação calcula e apresenta às partes um valor de referência para a viagem, com base na ' +
      'distância e na duração previstas.'
    ),
    nota(
      'Assinalamos este último ponto com particular clareza por ser aquele que, à luz do direito ' +
      'comparado, mais aproxima uma plataforma da qualificação como operador de transporte. ' +
      'Preferimos declará-lo do que vê-lo descoberto.'
    ),

    artigo('4.', 'O que já verificamos, e que julgamos ser do interesse desta Direção Nacional'),
    p(
      'A aplicação foi construída com exigências de verificação que, salvo melhor opinião, ' +
      'excedem as que hoje são praticadas no transporte informal:'
    ),
    item('Identificação de cada condutor por documento oficial, verificada antes da aprovação.'),
    item('Carta de condução, com categoria e prazo de validade registados e controlados.'),
    item('Inspeção do veículo, com data de validade; o condutor é impedido de trabalhar quando caduca.'),
    item('Matrícula, modelo, cor e capacidade do veículo, associados à conta do condutor.'),
    item('Fotografia do condutor no início de cada turno, que confirma quem está efetivamente ao volante.'),
    item('Registo de cada viagem: origem, destino, hora, trajeto percorrido e preço.'),
    item('Botão de emergência ligado à Polícia Nacional e a um alerta interno.'),
    item('Termos e política de privacidade aceites por cada utilizador, com registo da versão e da data.'),

    artigo('5.', 'O que solicitamos'),
    p('Vem, por isso, a ' + EMPRESA + ' respeitosamente solicitar a V. Ex.ª:', { after: 90 }),
    item(
      'A concessão de audiência, em data e local à conveniência desta Direção Nacional, para ' +
      'apresentação pormenorizada da plataforma;'
    ),
    item(
      'Que nos seja indicado, por escrito, qual o título habilitante que esta Direção Nacional ' +
      'entende aplicável à atividade descrita e quais os documentos e taxas do respetivo processo;'
    ),
    item(
      'Caso se entenda — como nos parece resultar da lei vigente — que não existe ainda título ' +
      'aplicável a plataformas eletrónicas, que seja admitida a nossa colaboração técnica na ' +
      'preparação do regime que vier a ser adotado.'
    ),

    artigo('6.', 'Do que nos colocamos à disposição'),
    item(
      'Facultar a esta Direção Nacional acesso de consulta ao painel de administração da ' +
      'plataforma, com a lista de condutores ativos, os documentos a caducar e as viagens por ' +
      'município, para efeitos de fiscalização e de estatística;'
    ),
    item('Suspender de imediato qualquer funcionalidade que esta Direção Nacional entenda não dever operar;'),
    item('Prestar, com a periodicidade que for fixada, informação sobre condutores, veículos e viagens.'),

    artigo('7.', 'Documentos que se juntam'),
    item('Parecer jurídico sobre o enquadramento legal da atividade (Anexo I);'),
    item('Anteprojeto de diploma ministerial para o transporte individual de passageiros a partir de plataforma eletrónica (Anexo II);'),
    item('Dossier de conformidade — o que a plataforma verifica e regista (Anexo III).'),

    p(
      'Com os melhores cumprimentos e na certeza da melhor atenção de V. Ex.ª,',
      { after: 40 }
    ),
    p('Pede deferimento.', { after: 200 }),

    assinaturas(`${EMPRESA}  ·  o Gerente`, 'Data'),
  ]
);
