// Termos em português. RASCUNHO PARA REVISÃO JURÍDICA.
//
// Escrito para ser lido por quem vai carregar em "aceito" — motoristas e
// passageiros em Díli, não juristas. Frases curtas, sem latim, e cada
// secção responde a uma pergunta que a pessoa realmente tem.
//
// Tratamento por VOCÊ, como o resto da aplicação. Estavam por tu, o que
// deixava os termos a falar de uma maneira e os ecrãs de outra.
//
// Os pontos marcados com ⚖ dependem do direito de Timor-Leste e da decisão
// do responsável pelo serviço. Não são texto meu para ficar como está.

export const termosPassageiro = {
  titulo: 'Termos de utilização',
  subtitulo: 'Leia antes de criar conta. É curto.',
  atualizado: 'Versão de Agosto de 2026',

  seccoes: [
    {
      titulo: 'O que a TimorgianaRide é',
      texto:
        'A TimorgianaRide põe em contacto quem precisa de transporte com quem o faz. ' +
        'Não somos uma empresa de transportes e não conduzimos: os motoristas são ' +
        'independentes e trabalham por conta própria.\n\n' +
        'A viagem é um acordo entre si e o motorista. Nós mostramos-vos um ao outro, ' +
        'calculamos o preço e damos-vos forma de falar.',
    },
    {
      titulo: 'Pagamento — em dinheiro, sem comissão',
      texto:
        'Paga ao motorista em dinheiro, no fim da viagem. O valor é o que a app mostrou ' +
        'antes de pedir; não muda no fim.\n\n' +
        'Nesta primeira fase o serviço é gratuito: não cobramos nada a si nem ao ' +
        'motorista. Se um dia passarmos a cobrar, dizemos antes — nunca a meio de uma ' +
        'viagem, nunca sem aviso.',
    },
    {
      titulo: 'Fase de testes',
      texto:
        'A app está em testes. Pode falhar, pode não haver motoristas disponíveis, e ' +
        'pode haver períodos em que não funcione.\n\n' +
        'Não prometemos que encontra sempre transporte. Se precisa de chegar a algum ' +
        'sítio a uma hora certa, não conte só connosco.',
    },
    {
      titulo: 'A sua segurança',
      texto:
        'Antes de entrar, confirme a matrícula e o nome do motorista no ecrã. Se não ' +
        'coincidirem, não entre.\n\n' +
        'Durante a viagem tem dois botões: **Partilhar viagem**, para mandar a alguém ' +
        'de confiança onde está, e **Emergência**, que nos avisa com a sua posição e ' +
        'lhe permite ligar à polícia, à ambulância ou aos bombeiros.\n\n' +
        'Em perigo imediato, ligue primeiro para o 112. Nós somos o segundo passo, não ' +
        'o primeiro.',
    },
    {
      titulo: 'Os seus dados',
      texto:
        'Guardamos o seu nome, telemóvel, as viagens que fez e os sítios de recolha e ' +
        'destino. Durante a viagem guardamos a posição do motorista, para a poder ' +
        'seguir no mapa.\n\n' +
        'O motorista vê o seu nome, o seu telemóvel e para onde vai — precisa disso ' +
        'para o ir buscar. Mais ninguém vê.\n\n' +
        'Não vendemos os seus dados a ninguém. Pode pedir para apagarmos a sua conta ' +
        'pelo contacto abaixo.',
    },
    {
      titulo: 'O que esperamos de si',
      texto:
        'Trate o motorista com respeito. Cancelar de vez em quando acontece; cancelar ' +
        'muitas vezes depois de o motorista já vir a caminho faz-lhe perder tempo e ' +
        'combustível, e pode levar à suspensão da conta.\n\n' +
        'Não use a app para nada ilegal.',
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
        'Qualquer problema, dúvida ou pedido sobre os seus dados: fale connosco pelo ' +
        'número que está dentro da app.\n\n' +
        'Se mudarmos estes termos, pedimos-lhe para os aceitar outra vez.',
    },
  ],
};

export const termosMotorista = {
  titulo: 'Termos para motoristas',
  subtitulo: 'O que assume ao conduzir com a TimorgianaRide.',
  atualizado: 'Versão de Agosto de 2026',

  seccoes: [
    {
      titulo: 'Trabalha por sua conta',
      texto:
        'Não é nosso empregado. Não tem horário, não tem chefe, e ninguém o obriga a ' +
        'aceitar viagem nenhuma. Fica disponível quando quiser.\n\n' +
        'Isso também quer dizer que não tem salário, férias pagas, subsídio nem ' +
        'indemnização por nossa parte. É um profissional independente que usa a nossa ' +
        'app para encontrar passageiros.\n\n' +
        '⚖ O enquadramento laboral desta relação tem de ser confirmado à luz da lei de ' +
        'Timor-Leste antes do lançamento público.',
    },
    {
      titulo: 'O dinheiro é todo seu',
      texto:
        'O passageiro paga-lhe em dinheiro, no fim da viagem. Não cobramos comissão ' +
        'nenhuma: numa viagem de $3, fica com $3.\n\n' +
        'Nesta primeira fase o serviço é gratuito para si. Se um dia passarmos a cobrar ' +
        'alguma coisa, avisamos com antecedência e fica livre de sair.\n\n' +
        'O preço é fixado pela app e não se negoceia com o passageiro. É essa garantia ' +
        'que faz as pessoas confiarem no serviço.',
    },
    {
      titulo: 'O que tem de ter em ordem',
      texto:
        'Antes de aceitar viagens tem de ter, e manter válidos:\n\n' +
        '• Carta de condução válida para o veículo que conduz\n' +
        '• Documentos do veículo em ordem\n' +
        '• Seguro que cubra o transporte de passageiros\n\n' +
        'Muitos seguros particulares NÃO cobrem transporte de passageiros a pagamento. ' +
        'Confirme com o seu segurador. A responsabilidade de estar em ordem é sua.\n\n' +
        'Se algum destes documentos caducar, tem de deixar de aceitar viagens.',
    },
    {
      titulo: 'Os documentos que nos enviou',
      texto:
        'Pedimos-lhe a carta de condução, o documento do veículo e uma fotografia sua. ' +
        'Servem para confirmarmos que é quem diz ser — é isso que dá confiança ao ' +
        'passageiro para entrar no seu carro.\n\n' +
        'Ficam guardados na nossa base de dados e são vistos só por quem gere o ' +
        'serviço. Não os mostramos aos passageiros nem os damos a mais ninguém.\n\n' +
        'Pode pedir para os apagarmos; nesse caso a sua conta de motorista deixa de ' +
        'poder receber viagens.',
    },
    {
      titulo: 'Segurança — sua e do passageiro',
      texto:
        'Conduza com cuidado e respeite as regras de trânsito. Não conduza sob efeito ' +
        'de álcool ou de qualquer substância.\n\n' +
        'Trate o passageiro com respeito, seja quem for. Não recusamos ninguém por ser ' +
        'quem é.\n\n' +
        'Também tem o botão de **Emergência** durante a viagem. Leva desconhecidos no ' +
        'carro, muitas vezes de noite — use-o se for preciso, e ligue para o 112 se ' +
        'houver perigo imediato.',
    },
    {
      titulo: 'Cancelamentos e faltas',
      texto:
        'Se aceita uma viagem, o passageiro fica à sua espera e deixa de procurar ' +
        'outro. Cancelar depois de aceitar deixa-o a pé.\n\n' +
        'Acontece, e a app pergunta porquê. Mas cancelar muitas vezes, ou aceitar e não ' +
        'aparecer, pode levar à suspensão da sua conta.',
    },
    {
      titulo: 'Quando podemos suspender a conta',
      texto:
        'Podemos suspender ou encerrar a sua conta se:\n\n' +
        '• Os documentos forem falsos ou tiverem caducado\n' +
        '• Houver queixas sérias de passageiros\n' +
        '• Cancelar repetidamente sem motivo\n' +
        '• Cobrar valor diferente do que a app mostrou\n\n' +
        'Sempre que possível avisamos antes e ouvimos a sua versão.',
    },
    {
      titulo: 'Responsabilidade',
      texto:
        'Conduz por sua conta e risco. Não respondemos por acidentes, multas, danos no ' +
        'veículo, nem por nada que aconteça durante uma viagem.\n\n' +
        'A app põe em contacto pessoas; não é uma seguradora nem uma empresa de ' +
        'transportes.\n\n' +
        '⚖ Esta secção tem de ser confirmada à luz da lei de Timor-Leste antes do ' +
        'lançamento público.',
    },
  ],
};
