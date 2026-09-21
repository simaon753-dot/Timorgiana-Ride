const {
  documento, artigo, sub, p, rico, item, nota, tabela,
  EMPRESA, APP, VERSAO_DNTT,
} = require('./comum-dntt.js');

// DOSSIER DE CONFORMIDADE.
//
// O documento que responde à pergunta que o regulador faz a seguir: «e como
// é que sabemos que isso é verdade?». Cada linha diz o que se exige, o que a
// plataforma faz, e ONDE ISSO SE VÊ. Sem a terceira coluna isto seria uma
// declaração de intenções, que não vale nada num processo.
module.exports = documento(
  'Dossier de Conformidade',
  `O que a plataforma ${APP} verifica, regista e pode demonstrar  ·  ${VERSAO_DNTT}`,
  [
    artigo('1.', 'Para que serve este documento'),
    p(
      'A Direção Nacional dos Transportes Terrestres precisa de saber quem conduz, em que veículo, ' +
      'com que documentos e em que condições. Este documento demonstra que a plataforma já recolhe ' +
      'e conserva essa informação, e indica onde cada elemento pode ser verificado.'
    ),
    nota(
      'Todos os elementos abaixo são verificáveis em demonstração presencial, no painel de ' +
      'administração da plataforma, a realizar nas instalações da Direção Nacional dos Transportes ' +
      'Terrestres ou por acesso concedido para esse efeito.'
    ),

    artigo('2.', 'Condutor'),
    tabela(
      ['Exigência', 'O que a plataforma faz', 'Onde se verifica'],
      [
        ['Identificação', 'Documento de identificação exigido no registo e verificado antes da aprovação da conta', 'Painel · ficha do motorista'],
        ['Carta de condução', 'Fotografia da carta, categoria e data de validade registadas', 'Painel · documentos'],
        ['Validade dos documentos', 'A conta é bloqueada automaticamente quando um documento caduca', 'Painel · documentos a caducar'],
        ['Quem está ao volante', 'Fotografia do condutor no início de cada turno de trabalho', 'Painel · fotografias de turno'],
        ['Aceitação das regras', 'Termos do motorista aceites com registo da versão e da data', 'Painel · ficha do motorista'],
        ['Historial', 'Viagens realizadas, avaliações recebidas e cancelamentos', 'Painel · ficha do motorista'],
      ],
      [2200, 4000, 2600]
    ),

    artigo('3.', 'Veículo'),
    tabela(
      ['Exigência', 'O que a plataforma faz', 'Onde se verifica'],
      [
        ['Matrícula', 'Matrícula associada à conta do condutor e apresentada ao passageiro antes da viagem', 'App do passageiro · painel'],
        ['Identificação', 'Marca, modelo e cor registados e mostrados ao passageiro', 'App do passageiro · painel'],
        ['Inspeção', 'Documento de inspeção com data de validade; bloqueia a conta quando caduca', 'Painel · documentos'],
        ['Capacidade', 'Lugares e, no transporte de bens, a capacidade de carga', 'Painel · ficha do veículo'],
        ['Licença de transporte', 'Campo previsto para a licença da DNTT, a preencher quando exigida', 'Painel · ficha do veículo'],
      ],
      [2200, 4000, 2600]
    ),

    artigo('4.', 'Viagem'),
    tabela(
      ['Exigência', 'O que a plataforma faz', 'Onde se verifica'],
      [
        ['Registo', 'Data, hora, origem, destino, condutor, veículo e preço de cada viagem', 'Painel · viagens'],
        ['Trajeto', 'Posição do veículo registada durante a viagem', 'Painel · detalhe da viagem'],
        ['Preço', 'Valor de referência calculado por distância e duração, apresentado antes de pedir', 'App · ecrã do pedido'],
        ['Pagamento', 'Em numerário, diretamente ao condutor. A plataforma não movimenta dinheiro', '—'],
        ['Conservação', 'Registos conservados e apagados segundo prazo definido na política de privacidade', 'Painel · retenção de dados'],
      ],
      [2200, 4000, 2600]
    ),

    artigo('5.', 'Segurança do passageiro'),
    tabela(
      ['Exigência', 'O que a plataforma faz', 'Onde se verifica'],
      [
        ['Saber quem vem', 'Nome, fotografia, avaliação, matrícula e modelo mostrados antes da viagem', 'App do passageiro'],
        ['Emergência', 'Botão de emergência com chamada às autoridades e alerta interno', 'App · painel de alertas'],
        ['Partilha', 'Possibilidade de partilhar a viagem em curso com terceiro', 'App do passageiro'],
        ['Código de recolha', 'Código de quatro dígitos que o passageiro comunica ao condutor para iniciar a viagem', 'App · painel'],
        ['Reclamações', 'Avaliação por viagem e registo de motivos de cancelamento', 'Painel · viagens'],
      ],
      [2200, 4000, 2600]
    ),

    artigo('6.', 'Documentos já existentes'),
    p(
      'A empresa dispõe dos seguintes documentos, elaborados antes do início da fase de ensaio e ' +
      'disponíveis para consulta:'
    ),
    item('Regulamento de Admissão de Motoristas;'),
    item('Regulamento de Registo e Inspeção de Veículos;'),
    item('Contrato de Utilização da Plataforma, assinado por cada condutor;'),
    item('Declaração de Cedência de Veículo, quando o condutor não é o proprietário;'),
    item('Política de Segurança dos Passageiros, de acesso público;'),
    item('Tabela de Infrações e Sanções aplicável aos condutores aderentes;'),
    item('Checklist Documental para Aprovação;'),
    item('Termos de Utilização e Aviso de Privacidade, aceites na aplicação em português, tétum e inglês.'),

    artigo('7.', 'O que a empresa não faz'),
    p('Por rigor, e porque a omissão também informa:', { after: 90 }),
    item('Não possui veículos nem os aluga;'),
    item('Não emprega condutores nem lhes fixa horário;'),
    item('Não recebe nem movimenta o preço da viagem;'),
    item('Não cobra comissão sobre a viagem, apenas uma Taxa de Acesso fixa ao condutor;'),
    item('Não presta serviço de transporte coletivo, escolar, turístico ou transfronteiriço.'),

    artigo('8.', 'Elementos a confirmar'),
    nota(
      'Os seguintes elementos devem ser confirmados pela empresa antes da entrega do dossier: ' +
      'número de registo comercial e objeto social; licença da Direção Nacional do Comércio ' +
      'Doméstico; situação tributária; apólice de seguro aplicável ao transporte remunerado de ' +
      'passageiros; e número de condutores e veículos ativos à data.'
    ),
  ]
);
