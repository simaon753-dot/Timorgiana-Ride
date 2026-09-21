const {
  documento, artigo, sub, p, rico, item, nota, tabela,
  EMPRESA, APP, VERSAO_DNTT, DL_BASES, DL_ESTRADA, DM_TAXI,
} = require('./comum-dntt.js');

// PARECER JURÍDICO.
//
// Escrito para ser lido por quem decide no DNTT e por quem, mais tarde, tenha
// de decidir num tribunal. Por isso cita o que existe e assinala o que não
// existe — a lacuna é o argumento principal e tem de estar demonstrada, não
// afirmada.
module.exports = documento(
  'Parecer Jurídico',
  `Enquadramento legal do transporte individual de passageiros a partir de plataforma eletrónica em Timor-Leste  ·  ${VERSAO_DNTT}`,
  [
    artigo('I.', 'Objeto'),
    p(
      'Determinar qual o regime jurídico aplicável, em Timor-Leste, à atividade de intermediação ' +
      'eletrónica entre passageiros e condutores de veículos ligeiros, e qual o título habilitante ' +
      'exigível à entidade que explora a plataforma informática.'
    ),

    artigo('II.', 'Direito aplicável'),
    p('O sistema de transportes rodoviários rege-se, no essencial, pelos seguintes diplomas:', { after: 90 }),
    item(DL_BASES),
    item(DL_ESTRADA),
    item(DM_TAXI),
    item('Diplomas Ministeriais n.os 2/MTCOP/2003 e 3/MTCOP/2003, sobre tarifas e sistema de transporte coletivo rodoviário.'),
    p(
      'É esta, aliás, a lista que a própria Direção Nacional dos Transportes Terrestres publica ' +
      'como base da sua atividade.'
    ),

    artigo('III.', 'Qualificação da atividade'),
    sub('a) Transporte regular e transporte ocasional'),
    rico([
      'Nos termos do artigo 13.º do ', ['Decreto-Lei n.º 2/2003'],
      ', são transportes regulares os realizados «segundo itinerários, paragens, horários e preços ' +
      'previamente definidos» (n.º 2) e ocasionais os realizados «sem carácter de regularidade (…) ' +
      'segundo itinerários, horários e preços livremente negociados ou estabelecidos caso por caso» (n.º 3).',
    ]),
    p(
      'A viagem pedida por aplicação não tem itinerário, paragem nem horário previamente definidos. ' +
      'Qualifica-se, por isso, como transporte ocasional de passageiros em veículo ligeiro.'
    ),
    sub('b) O licenciamento recai sobre o veículo'),
    rico([
      'O artigo 13.º, n.º 4, determina que «os veículos afectos à exploração dos transportes ' +
      'públicos estão sujeitos a licenciamento». E o artigo 18.º, n.º 2, comete à Direção Nacional ' +
      'dos Transportes Terrestres «a atribuição de licenças para veículos ligeiros e pesados ' +
      'destinados a transportes ocasionais de passageiros». ',
      ['O objeto do licenciamento é o veículo, não o programa informático.'],
    ]),
    sub('c) Acesso à profissão de transportador'),
    rico([
      'O artigo 15.º exige, a quem exerça a profissão de transportador público rodoviário, que a ' +
      'empresa seja timorense ou controlada em mais de 50% por nacionais, que reúna idoneidade e ' +
      'capacidade financeira e profissional «a definir em regulamento», e que esteja inscrita no ' +
      '«registo nacional de transportadores rodoviários, ',
      ['a criar para o efeito'],
      '».',
    ]),
    nota(
      'Assinala-se, com o respeito devido, que não foi possível confirmar que tal registo tenha ' +
      'sido criado, nem que tenha sido publicado o regulamento que define a idoneidade e as ' +
      'capacidades exigidas. A confirmar-se, o regime de acesso à profissão encontra-se ' +
      'incompleto, o que releva para aferir a exigibilidade do título.'
    ),

    artigo('IV.', 'O regime do táxi e os seus limites'),
    rico([
      'O ', ['Diploma Ministerial n.º 5/2010'],
      ' é o único regime que disciplina o transporte individual e remunerado de passageiros. ' +
      'Sujeita-o a «prévia concessão de Licença para Transporte Público pela Direcção Nacional dos ' +
      'Transportes Terrestres» (artigo 1.º, n.º 2) e fixa as taxas respetivas (artigo 8.º): 50 USD ' +
      'pela primeira licença e 25 USD pela renovação anual.',
    ]),
    p('O seu âmbito material é, porém, estrito. O artigo 5.º exige que o veículo seja:', { after: 90 }),
    item('automóvel fechado de quatro portas;'),
    item('pintado uniformemente de amarelo;'),
    item('com indicador luminoso «TÁXI» sobre o tejadilho e a menção «TÁXI» em ambas as portas;'),
    item('com menos de sete anos à data da primeira licença;'),
    item('titular de licença da Direção Nacional do Comércio Doméstico para o exercício da atividade.'),
    p(
      'Acresce que o preço se encontra sujeito a tabela oficial, sendo vedado ao condutor «cobrar ' +
      'tarifa acima da tabela oficial» (artigo 7.º, n.º 3, alínea a)).'
    ),
    rico([
      'Resulta daqui uma conclusão que se impõe: ',
      ['o regime do táxi não é aplicável ao transporte em motociclo'],
      ', que nenhum diploma timorense prevê como modalidade de transporte público de passageiros, ' +
      'nem foi pensado para veículos não caracterizados.',
    ]),

    artigo('V.', 'A lacuna quanto às plataformas eletrónicas'),
    p(
      'Percorridos os diplomas em vigor, não se encontra norma que preveja, defina ou sujeite a ' +
      'título habilitante a atividade de intermediação eletrónica entre passageiros e condutores. ' +
      'Não existe procedimento, não existem requisitos e não existe taxa.'
    ),
    p(
      'Não se trata de um espaço de liberdade que a lei tenha querido criar: trata-se de uma ' +
      'lacuna, explicável pela data dos diplomas — 2003 e 2010 — muito anteriores à difusão deste ' +
      'modelo de serviço. A consequência prática é que a entidade que quisesse licenciar-se não ' +
      'disporia de título que pudesse requerer.'
    ),

    artigo('VI.', 'Do regime sancionatório'),
    rico([
      'O artigo 7.º, alínea c), do ', ['Decreto-Lei n.º 2/2003'],
      ' remete a aplicação de sanções para «os diplomas de execução do presente decreto-lei». O ',
      ['Diploma Ministerial n.º 5/2010'],
      ' prevê coimas para o atraso na renovação da licença (artigo 3.º, n.º 3), para o atraso na ' +
      'inspeção semestral (artigo 4.º, n.º 3) e para infrações do condutor (artigos 6.º e 7.º).',
    ]),
    rico([
      ['Não se encontra, porém, norma que sancione a exploração de plataforma eletrónica sem ' +
        'título'],
      ', pela razão simples de que a lei não conhece essa figura. O risco sancionatório efetivo ' +
      'recai, assim, não sobre a empresa, mas sobre o condutor, cujo veículo não se encontra ' +
      'licenciado para transporte público.',
    ]),
    nota(
      'Esta conclusão não é invocada como defesa. É invocada como razão para regular: um regime ' +
      'que só pode ser aplicado a quem conduz, e nunca a quem organiza, é um regime que pune o ' +
      'elo mais fraco e deixa intacto o que se pretendia disciplinar.'
    ),

    artigo('VII.', 'Direito comparado'),
    sub('a) União Europeia'),
    p(
      'No acórdão Asociación Profesional Elite Taxi c. Uber Systems Spain (processo C-434/15, de 20 ' +
      'de dezembro de 2017), o Tribunal de Justiça qualificou o serviço de intermediação como ' +
      '«serviço no domínio dos transportes», por a plataforma criar a oferta e exercer influência ' +
      'decisiva sobre as suas condições, designadamente o preço. No acórdão Airbnb Ireland ' +
      '(C-390/18, de 19 de dezembro de 2019) concluiu em sentido inverso, precisamente por a ' +
      'plataforma não fixar o preço.'
    ),
    sub('b) Portugal'),
    p(
      'A Lei n.º 45/2018, de 10 de agosto, criou o regime do transporte individual e remunerado de ' +
      'passageiros em veículos descaracterizados a partir de plataforma eletrónica (TVDE), sujeitando ' +
      'a operador, motorista, veículo e plataforma a títulos próprios. É, pela proximidade do sistema ' +
      'jurídico, o modelo de mais fácil adaptação a Timor-Leste.'
    ),
    sub('c) Indonésia'),
    p(
      'O transporte de passageiros em motociclo não é reconhecido como transporte público pela Lei ' +
      'n.º 22/2009, tendo sido disciplinado por regulamento ministerial de segurança (Permenhub n.º ' +
      '12/2019). É solução juridicamente discutida, mas demonstra que a matéria pode ser tratada por ' +
      'via regulamentar e com fundamento na segurança.'
    ),

    artigo('VIII.', 'Conclusões'),
    ...[
      'A atividade de transporte a pedido em veículo ligeiro qualifica-se como transporte ocasional de passageiros, sujeito a licenciamento do veículo pela DNTT (artigos 13.º, n.º 4, e 18.º, n.º 2, do Decreto-Lei n.º 2/2003).',
      'O regime do táxi (Diploma Ministerial n.º 5/2010) não é aplicável a veículos não caracterizados nem a motociclos.',
      'Não existe em Timor-Leste título habilitante para plataformas eletrónicas de intermediação, nem procedimento pelo qual possa ser requerido.',
      'Não existe norma que sancione a exploração de plataforma sem título; o risco sancionatório recai sobre o condutor.',
      'O regime de acesso à profissão de transportador depende de registo e de regulamento cuja existência não foi possível confirmar.',
      'A situação não se resolve por fiscalização, mas por norma. Recomenda-se a aprovação de diploma ministerial, cujo anteprojeto se junta.',
    ].map((t, i) => item(`${i + 1}.ª  ${t}`)),

    p(
      'É este o nosso parecer, salvo melhor opinião e sem prejuízo do esclarecimento que a Direção ' +
      'Nacional dos Transportes Terrestres entenda solicitar.',
      { italico: true }
    ),
  ]
);
