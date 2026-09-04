const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T } = C;

module.exports = C.documento(
  'Checklist Documental para Aprovação na Aplicação',
  `${C.EMPRESA}  ·  Instrumento de trabalho  ·  Versão de ${C.VERSAO}`,
  [
    C.nota('NOTA PRÉVIA, PARA QUE ESTE DOCUMENTO NÃO DESCREVA O QUE NÃO EXISTE. Hoje a aplicação NÃO aprova ninguém sozinha. Ela verifica automaticamente o que é objectivo e apresenta o resultado a quem decide, no painel. A decisão final é de uma pessoa. Este documento separa, por isso, o que a máquina verifica do que continua a exigir olhos humanos. A Timorgiana, Lda decidiu manter a decisão humana e não adotar a aprovação automática — ver o n.º 5.'),

    A('1.', 'Os cinco documentos'),
    T(
      ['#', 'Documento', 'Data de validade'],
      [
        ['1', 'Fotografia do motorista', 'Não aplicável'],
        ['2', 'Documento de identificação', 'Não exigida'],
        ['3', 'Carta de condução', 'Obrigatória'],
        ['4', 'Cartão de registo do veículo', 'Obrigatória'],
        ['5', 'Cartão de inspeção (Kartaun Inspesaun)', 'Obrigatória'],
      ],
      [600, 5200, 2700]
    ),

    A('2.', 'Verificações automáticas'),
    P('São feitas pela aplicação, sem intervenção humana, no momento da candidatura e sempre que um documento seja substituído.'),
    T(
      ['Verificação', 'Regra', 'Se falhar'],
      [
        ['Presença', 'Estão submetidos os cinco documentos', 'Bloqueia'],
        ['Data declarada', 'Carta, registo e inspeção têm data', 'Bloqueia'],
        ['Não caducado', 'Nenhuma data é anterior ao dia de hoje em Díli', 'Bloqueia'],
        ['Data plausível', 'Inspeção até 400 dias; carta e registo até 15 anos', 'Assinala'],
        ['Prazo próximo', 'Algum documento caduca nos próximos 30 dias', 'Assinala'],
        ['Substituição por confirmar', 'Documento trocado após aprovação, ainda não confirmado', 'Assinala'],
      ],
      [2200, 4400, 1900]
    ),
    R([['Bloqueia'], ' significa que a conta não pode entrar ao serviço enquanto a situação se mantiver. ', ['Assinala'], ' significa que a aplicação chama a atenção de quem decide, sem impedir nada.']),
    N('A verificação de plausibilidade é a que mais trabalho poupa. As datas são escritas pelo próprio motorista a olhar para o cartão, e nada o impede de escrever 2035. A aplicação não sabe ler o cartão, mas sabe que um Kartaun Inspesaun vale um ano: uma validade a três anos de distância não é um documento válido, é um lapso ou uma invenção. Não recusa — levanta o dedo, para que se olhe com atenção para aquela fotografia em vez de olhar para as cinco com a mesma atenção.'),

    A('3.', 'Verificações humanas'),
    P('Não são automatizáveis e continuam a exigir que alguém abra a fotografia. No painel, cada documento amplia-se e pode ser rodado, porque os cartões são fotografados ao alto e aparecem deitados.'),
    T(
      ['#', 'A confirmar', 'Onde se confirma'],
      [
        ['a', 'A fotografia lê-se: o cartão está focado, completo e sem reflexos', 'Ampliar cada documento'],
        ['b', 'O nome do documento de identificação é o nome da conta', 'Documento 2 e nome no painel'],
        ['c', 'O rosto da fotografia é o rosto da carta de condução', 'Documentos 1 e 3'],
        ['d', 'A data escrita corresponde à data impressa no cartão', 'Comparar com a data no painel'],
        ['e', 'A matrícula do cartão de registo é a matrícula declarada', 'Documento 4 e dados do veículo'],
        ['f', 'O cartão de inspeção é do mesmo veículo do cartão de registo', 'Chassis ou matrícula nos dois'],
        ['g', 'A categoria da carta permite conduzir o veículo declarado', 'Documento 3 e tipo de veículo'],
      ],
      [500, 5100, 2900]
    ),
    R(['A alínea ', ['d'], ' é a que justifica o desenho do painel: a data e a fotografia aparecem lado a lado, porque só se pode confrontar o que se vê ao mesmo tempo.']),

    A('4.', 'Regra de decisão'),
    T(
      ['Situação', 'Decisão'],
      [
        ['Alguma verificação automática bloqueia', 'Não aprovar. Recusar com indicação do que falta'],
        ['Todas passam e nenhuma alínea humana levanta dúvida', 'Aprovar'],
        ['Alguma verificação assinala, sem dúvida humana', 'Aprovar, e avisar o motorista do prazo próximo'],
        ['Alguma alínea humana levanta dúvida', 'Recusar com motivo, para que corrija e volte a submeter'],
      ],
      [4400, 4100]
    ),
    P('A recusa não fecha a porta: o motorista recusado continua a ver a lista de documentos, substitui o que motivou a recusa e submete de novo.'),

    A('5.', 'A aprovação é sempre humana'),
    R([['A Timorgiana, Lda decidiu não adotar a aprovação automática.'], ' A decisão de admitir um motorista é, e continuará a ser, tomada por uma pessoa.']),
    P('A aplicação verifica o que é objetivo — presença dos documentos, existência e plausibilidade das datas, caducidade — e apresenta o resultado a quem decide. Não decide em lugar dele.'),
    C.nota('A razão é simples e vale a pena ficar escrita. Nenhuma verificação automática distingue um cartão verdadeiro de uma boa fotocópia, nem confirma que o rosto da fotografia é o rosto da carta de condução. Aprovar sozinha pouparia tempo em troca de aceitar que um documento falso circulasse durante alguns dias — e quem paga esse tempo poupado é o passageiro que entra no veículo.'),
    P('Em consequência, nenhuma conta de motorista fica ativa sem que os documentos tenham sido vistos por quem exerce funções de gestão da plataforma.'),

    A('6.', 'Após a aprovação'),
    P('Aprovada a conta, os documentos ficam fixados. A sua substituição obriga a indicar um dos quatro motivos previstos — caducou, perdeu-se, deteriorou-se, ou foi enviado o documento errado — e o documento novo fica assinalado como pendente de confirmação até ser verificado.'),
    P('O documento substituído entra em vigor imediatamente, para que ninguém fique impedido de trabalhar à espera de revisão.'),

    A('7.', 'Registo de acessos'),
    P('Cada consulta aos documentos de um motorista fica registada, com identificação de quem consultou, de quem foi consultado e do momento.'),
    P('O registo existe para responder a uma pergunta concreta, no dia em que alguém a faça: quem consultou os meus documentos?'),

    A('8.', 'Folha de conferência'),
    P('Para uso interno, quando a conferência seja feita fora da aplicação.'),
    T(
      ['Candidato', ''],
      [
        ['Nome', '________________________________________________________'],
        ['Telemóvel', '________________________________________________________'],
        ['Veículo e matrícula', '________________________________________________________'],
        ['Verificações automáticas', '☐ todas passaram      ☐ com sinal de aviso: ______________'],
        ['a) Fotografias legíveis', '☐ sim      ☐ não'],
        ['b) Nome corresponde', '☐ sim      ☐ não'],
        ['c) Rosto corresponde', '☐ sim      ☐ não'],
        ['d) Datas correspondem ao cartão', '☐ sim      ☐ não'],
        ['e) Matrícula corresponde', '☐ sim      ☐ não'],
        ['f) Inspeção é do mesmo veículo', '☐ sim      ☐ não'],
        ['g) Categoria da carta adequada', '☐ sim      ☐ não'],
        ['Decisão', '☐ Aprovado      ☐ Recusado — motivo: ____________________'],
        ['Data e responsável', '________________________________________________________'],
      ],
      [3100, 5400]
    ),
  ]
);
