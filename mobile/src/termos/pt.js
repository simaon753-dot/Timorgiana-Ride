// Termos em português. RASCUNHO PARA REVISÃO JURÍDICA.
//
// Escrito para ser lido por quem vai carregar em "aceito" — motoristas e
// passageiros em Díli, não juristas. Frases curtas, sem latim, e cada
// secção responde a uma pergunta que a pessoa realmente tem.
//
// Os pontos marcados com ⚖ dependem do direito de Timor-Leste e da decisão
// do responsável pelo serviço. Não são texto meu para ficar como está.

export const termosPassageiro = {
  titulo: 'Termos de utilização',
  subtitulo: 'Lê antes de criares conta. É curto.',
  atualizado: 'Versão de Agosto de 2026',

  seccoes: [
    {
      titulo: 'O que a TimorgianaRide é',
      texto:
        'A TimorgianaRide põe em contacto quem precisa de transporte com quem o faz. ' +
        'Não somos uma empresa de transportes e não conduzimos: os motoristas são ' +
        'independentes e trabalham por conta própria.\n\n' +
        'A viagem é um acordo entre ti e o motorista. Nós mostramos-vos um ao outro, ' +
        'calculamos o preço e damos-vos forma de falar.',
    },
    {
      titulo: 'Pagamento — em dinheiro, sem comissão',
      texto:
        'Pagas ao motorista em dinheiro, no fim da viagem. O valor é o que a app ' +
        'mostrou antes de pedires; não muda no fim.\n\n' +
        'Nesta primeira fase o serviço é gratuito: não cobramos nada a ti nem ao ' +
        'motorista. Se um dia passarmos a cobrar, dizemos-te antes — nunca a meio ' +
        'de uma viagem, nunca sem aviso.',
    },
    {
      titulo: 'Fase de testes',
      texto:
        'A app está em testes. Pode falhar, pode não haver motoristas disponíveis, e ' +
        'pode haver períodos em que não funcione.\n\n' +
        'Não prometemos que encontras sempre transporte. Se precisas de chegar a ' +
        'algum sítio a uma hora certa, não contes só connosco.',
    },
    {
      titulo: 'A tua segurança',
      texto:
        'Antes de entrares, confirma a matrícula e o nome do motorista no ecrã. Se ' +
        'não coincidirem, não entres.\n\n' +
        'Durante a viagem tens dois botões: **Partilhar viagem**, para mandares a ' +
        'alguém de confiança onde estás, e **Emergência**, que nos avisa com a tua ' +
        'posição e te deixa ligar à polícia.\n\n' +
        'Em perigo imediato, liga primeiro para o 112. Nós somos o segundo passo, ' +
        'não o primeiro.',
    },
    {
      titulo: 'Os teus dados',
      texto:
        'Guardamos o teu nome, telemóvel, as viagens que fizeste e os sítios de ' +
        'recolha e destino. Durante a viagem guardamos a posição do motorista, para ' +
        'a poderes seguir no mapa.\n\n' +
        'O motorista vê o teu nome, o teu telemóvel e para onde vais — precisa disso ' +
        'para te ir buscar. Mais ninguém vê.\n\n' +
        'Não vendemos os teus dados a ninguém. Podes pedir para apagarmos a tua ' +
        'conta pelo contacto abaixo.',
    },
    {
      titulo: 'O que esperamos de ti',
      texto:
        'Trata o motorista com respeito. Cancelar de vez em quando acontece; cancelar ' +
        'muitas vezes depois de o motorista já vir a caminho faz-lhe perder tempo e ' +
        'combustível, e pode levar à suspensão da conta.\n\n' +
        'Não uses a app para nada ilegal.',
    },
    {
      titulo: 'Responsabilidade',
      texto:
        'Os motoristas são independentes. Não os empregamos, e não respondemos por ' +
        'acidentes, atrasos, objectos perdidos ou pelo comportamento de ninguém ' +
        'durante uma viagem.\n\n' +
        'Verificamos os documentos que os motoristas nos enviam, mas isso é uma ' +
        'verificação de identidade — não é uma garantia de condução segura.\n\n' +
        '⚖ Esta secção tem de ser confirmada à luz da lei de Timor-Leste antes do ' +
        'lançamento público.',
    },
    {
      titulo: 'Falar connosco',
      texto:
        'Qualquer problema, dúvida ou pedido sobre os teus dados: fala connosco pelo ' +
        'número que está dentro da app.\n\n' +
        'Se mudarmos estes termos, pedimos-te para os aceitares outra vez.',
    },
  ],

  aceitar: 'Li e aceito os termos',
  aceitarCurto: 'Li e aceito os **termos de utilização**',
};

export const termosMotorista = {
  titulo: 'Termos para motoristas',
  subtitulo: 'O que assumes ao conduzir com a TimorgianaRide.',
  atualizado: 'Versão de Agosto de 2026',

  seccoes: [
    {
      titulo: 'Trabalhas por tua conta',
      texto:
        'Não és nosso empregado. Não tens horário, não tens chefe, e ninguém te ' +
        'obriga a aceitar viagem nenhuma. Ficas disponível quando quiseres.\n\n' +
        'Isso também quer dizer que não tens salário, férias pagas, subsídio nem ' +
        'indemnização por nossa parte. És um profissional independente que usa a ' +
        'nossa app para encontrar passageiros.\n\n' +
        '⚖ O enquadramento laboral desta relação tem de ser confirmado à luz da lei ' +
        'de Timor-Leste antes do lançamento público.',
    },
    {
      titulo: 'O dinheiro é todo teu',
      texto:
        'O passageiro paga-te em dinheiro, no fim da viagem. Não cobramos comissão ' +
        'nenhuma: numa viagem de $3, ficas com $3.\n\n' +
        'Nesta primeira fase o serviço é gratuito para ti. Se um dia passarmos a ' +
        'cobrar alguma coisa, avisamos com antecedência e ficas livre de sair.\n\n' +
        'O preço é fixado pela app e não se negoceia com o passageiro. É essa ' +
        'garantia que faz as pessoas confiarem no serviço.',
    },
    {
      titulo: 'O que tens de ter em ordem',
      texto:
        'Antes de aceitares viagens tens de ter, e manter válidos:\n\n' +
        '• Carta de condução válida para o veículo que conduzes\n' +
        '• Documentos do veículo em ordem\n' +
        '• Seguro que cubra o transporte de passageiros\n\n' +
        'Muitos seguros particulares NÃO cobrem transporte de passageiros a ' +
        'pagamento. Confirma com o teu segurador. A responsabilidade de estar em ' +
        'ordem é tua.\n\n' +
        'Se algum destes documentos caducar, tens de deixar de aceitar viagens.',
    },
    {
      titulo: 'Os documentos que nos enviaste',
      texto:
        'Pedimos-te a carta de condução, o documento do veículo e uma fotografia ' +
        'tua. Servem para confirmarmos que és quem dizes ser — é isso que dá ' +
        'confiança ao passageiro para entrar no teu carro.\n\n' +
        'Ficam guardados na nossa base de dados e são vistos só por quem gere o ' +
        'serviço. Não os mostramos aos passageiros nem os damos a mais ninguém.\n\n' +
        'Podes pedir para os apagarmos; nesse caso a tua conta de motorista deixa ' +
        'de poder receber viagens.',
    },
    {
      titulo: 'Segurança — tua e do passageiro',
      texto:
        'Conduz com cuidado e respeita as regras de trânsito. Não conduzas sob ' +
        'efeito de álcool ou de qualquer substância.\n\n' +
        'Trata o passageiro com respeito, seja quem for. Não recusamos ninguém por ' +
        'ser quem é.\n\n' +
        'Também tu tens o botão de **Emergência** durante a viagem. Levas ' +
        'desconhecidos no carro, muitas vezes de noite — usa-o se for preciso, e ' +
        'liga para o 112 se houver perigo imediato.',
    },
    {
      titulo: 'Cancelamentos e faltas',
      texto:
        'Se aceitas uma viagem, o passageiro fica à tua espera e deixa de procurar ' +
        'outro. Cancelar depois de aceitar deixa-o a pé.\n\n' +
        'Acontece, e a app pergunta-te porquê. Mas cancelar muitas vezes, ou aceitar ' +
        'e não aparecer, pode levar à suspensão da tua conta.',
    },
    {
      titulo: 'Quando podemos suspender a conta',
      texto:
        'Podemos suspender ou encerrar a tua conta se:\n\n' +
        '• Os documentos forem falsos ou tiverem caducado\n' +
        '• Houver queixas sérias de passageiros\n' +
        '• Cancelares repetidamente sem motivo\n' +
        '• Cobrares valor diferente do que a app mostrou\n\n' +
        'Sempre que possível avisamos-te antes e ouvimos a tua versão.',
    },
    {
      titulo: 'Responsabilidade',
      texto:
        'A viagem é entre ti e o passageiro. Não respondemos por acidentes, danos, ' +
        'multas, nem por nada que aconteça durante a viagem.\n\n' +
        'A app pode falhar ou ficar indisponível. Não garantimos volume de viagens ' +
        'nem rendimento nenhum.\n\n' +
        '⚖ Esta secção tem de ser confirmada à luz da lei de Timor-Leste antes do ' +
        'lançamento público.',
    },
  ],

  aceitar: 'Li e aceito os termos para motoristas',
  aceitarCurto: 'Li e aceito os **termos para motoristas**',
};
