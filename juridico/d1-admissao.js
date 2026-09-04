const C = require('./comum.js');
const { artigo: A, sub: S, p: P, rico: R, item: I, nota: N, tabela: T } = C;

module.exports = C.documento(
  'Regulamento de Admissão de Motoristas',
  `${C.EMPRESA}  ·  ${C.MORADA}  ·  ${C.CONTACTOS}  ·  Versão de ${C.VERSAO}`,
  [
    A('Artigo 1.º', 'Objeto'),
    P('O presente Regulamento fixa os requisitos, os documentos e o procedimento de admissão de motoristas à plataforma tecnológica TimorgianaRide, explorada pela Timorgiana, Lda.'),
    P('Aplica-se a todos os candidatos, independentemente do município onde pretendam exercer atividade e do tipo de veículo que conduzam.'),

    A('Artigo 2.º', 'Natureza da admissão'),
    P('A admissão à plataforma confere ao motorista o acesso a uma ferramenta tecnológica de aproximação entre passageiros e condutores. Não constitui contrato de trabalho, não cria vínculo de subordinação jurídica, não confere exclusividade e não garante um número mínimo de viagens.'),
    P('O motorista exerce a sua atividade por conta própria, com veículo próprio ou legitimamente cedido, e sob a sua exclusiva responsabilidade.'),

    A('Artigo 3.º', 'Requisitos gerais do candidato'),
    P('São requisitos cumulativos de admissão:'),
    I('Ser maior de idade nos termos da lei de Timor-Leste;'),
    I('Ser titular de carta de condução válida e adequada à categoria do veículo que pretende conduzir;'),
    I('Dispor de veículo em condições legais de circulação, com registo e inspeção válidos;'),
    I('Dispor de seguro de responsabilidade civil automóvel válido, nos termos legais (artigo 3.º-A);'),
    I('Possuir telemóvel com acesso à Internet e capacidade de executar a aplicação;'),
    I('Aceitar os Termos de Utilização e o Aviso de Privacidade em vigor.'),

    A('Artigo 3.º-A', 'Seguro de responsabilidade civil'),
    R(['O seguro de responsabilidade civil automóvel é ', ['obrigatório em Timor-Leste'], ` para todos os veículos motorizados, nos termos da ${C.SEGURO_LEI} (${C.SEGURO_ART}).`]),
    R([`O mesmo diploma fixa (${C.SEGURO_TETOS}) os limites máximos de responsabilidade da seguradora em `, ['USD 20.000 para veículos de transporte de passageiros e de carga'], ' e USD 6.000 para os restantes veículos motorizados.']),
    P('Constitui obrigação exclusiva do motorista contratar e manter em vigor esse seguro, junto de seguradora licenciada pelo Banco Central de Timor-Leste, e confirmar junto dela que a apólice cobre a atividade que efetivamente exerce.'),
    R([['A Timorgiana, Lda não exige a apresentação da apólice, não a verifica e não é seguradora.'], ' A verificação do cumprimento desta obrigação compete às autoridades.']),
    C.nota('Esta é a advertência que mais importa deste Regulamento. Um motorista que circule sem seguro não fica sem responsabilidade: fica sem quem a suporte por ele. Responde com o seu próprio património — casa, veículo, rendimento futuro — e sem qualquer limite, por danos causados a um passageiro ou a terceiro. Os USD 20.000 do tecto legal existem para quem tem apólice; quem não tem, não tem tecto nenhum.'),

    A('Artigo 4.º', 'Documentos obrigatórios'),
    P('A candidatura só é apreciada quando estiverem submetidos os cinco documentos seguintes:'),
    T(
      ['Documento', 'Finalidade', 'Validade'],
      [
        ['1. Fotografia do motorista', 'Ligar a conta a um rosto; é o que o passageiro vê antes de entrar no veículo', 'Não caduca'],
        ['2. Documento de identificação', 'Confirmar a identidade civil do candidato', 'Não é exigida data'],
        ['3. Carta de condução', 'Confirmar a habilitação legal para conduzir', 'Data obrigatória'],
        ['4. Cartão de registo do veículo', 'Confirmar a identificação e a titularidade do veículo', 'Data obrigatória'],
        ['5. Cartão de inspeção (Kartaun Inspesaun)', 'Confirmar a aptidão técnica do veículo para circular', 'Data obrigatória'],
      ],
      [2500, 4100, 1900]
    ),
    N('O documento de identificação não exige data de validade. O bilhete de identidade tem prazo, mas o que dele releva é a identidade — e essa não caduca. Suspender uma conta por um documento de identificação por renovar seria impedir alguém de trabalhar por motivo alheio à condução.'),

    A('Artigo 5.º', 'Datas de validade'),
    R(['Os documentos indicados nos n.os 3, 4 e 5 do artigo anterior só são aceites com ', ['data de validade'], ' declarada pelo candidato.']),
    P('A data é lida tal como consta do documento, no formato dia/mês/ano. No Kartaun Inspesaun, é a data que figura na linha «Valido Inspesaun».'),
    R([['Um documento submetido sem data de validade equivale, para todos os efeitos deste Regulamento, a documento em falta.']]),

    A('Artigo 6.º', 'Veracidade das declarações'),
    P('As datas de validade são declaradas pelo próprio candidato. A aplicação regista e recorda; não verifica o conteúdo dos documentos.'),
    P('A declaração de data falsa ou a submissão de documento falso, alterado ou pertencente a terceiro constituem infração grave, nos termos da Tabela de Infrações e Sanções, e determinam a recusa da candidatura ou a desativação da conta, sem prejuízo da responsabilidade civil e criminal do infrator.'),

    A('Artigo 7.º', 'Procedimento de candidatura'),
    P('A candidatura é apresentada exclusivamente através da aplicação e compreende:'),
    I('Registo de conta com nome completo, número de telemóvel e palavra-passe;'),
    I('Aceitação, em declarações autónomas, dos Termos de Utilização e do Aviso de Privacidade;'),
    I('Declaração do veículo: tipo, marca e modelo, matrícula, cor e, tratando-se de automóvel, número de lugares disponíveis para passageiros;'),
    I('Submissão dos cinco documentos e das respetivas datas.'),
    P('Antes do envio definitivo de cada documento, é apresentada ao candidato a fotografia captada e a data introduzida, para confirmação.'),

    A('Artigo 8.º', 'Apreciação e decisão'),
    P('A candidatura é apreciada pela Timorgiana, Lda, que verifica a legibilidade dos documentos, a correspondência entre o titular e a fotografia, e a coerência entre a matrícula declarada e a documentação apresentada.'),
    P('A decisão pode ser de aprovação ou de recusa e é comunicada ao candidato na própria aplicação.'),
    R(['A recusa é sempre ', ['fundamentada'], ', indicando ao candidato o que deve corrigir.']),

    A('Artigo 9.º', 'Efeitos da recusa'),
    P('A recusa não impede nova candidatura. O candidato recusado mantém acesso à lista de documentos, podendo substituir os que motivaram a recusa e submeter novamente a candidatura.'),

    A('Artigo 10.º', 'Suspensão automática'),
    P('A conta do motorista fica automaticamente impedida de entrar ao serviço sempre que se verifique alguma das seguintes situações:'),
    I('Falta de qualquer dos cinco documentos obrigatórios;'),
    I('Falta de data de validade em documento que a exija;'),
    I('Documento com validade expirada, considerando o dia em Díli.'),
    R([['A suspensão cessa automaticamente'], ' com a submissão do documento regularizado, sem necessidade de qualquer ato da Timorgiana, Lda. Um motorista que renove a inspeção de manhã pode trabalhar nessa tarde.']),
    P('A suspensão não interrompe viagem em curso. A verificação é feita no momento em que o motorista entra ao serviço, e nunca durante uma viagem já iniciada.'),

    A('Artigo 11.º', 'Aviso prévio de caducidade'),
    R(['A aplicação avisa o motorista ', ['quinze dias'], ' antes da data de validade de cada documento, indicando quantos dias faltam.']),
    P('Tratando-se do cartão de inspeção, o aviso recorda que a renovação só é admitida a partir dos dez dias anteriores ao termo do prazo, conforme instrução constante do próprio cartão.'),

    A('Artigo 12.º', 'Substituição de documentos após aprovação'),
    P('Aprovada a conta, os documentos ficam fixados. A sua substituição depende da indicação de um dos seguintes motivos:'),
    T(
      ['Motivo', 'Situação típica'],
      [
        ['Caducou e foi renovado', 'Renovação ordinária do documento'],
        ['Perdi o documento e obtive outro', 'Emissão de segunda via'],
        ['O documento deteriorou-se', 'Substituição por dano físico'],
        ['Enviei o documento errado ou a fotografia é ilegível', 'Correção de erro do próprio motorista'],
      ],
      [3400, 5100]
    ),
    P('O documento substituído entra imediatamente em vigor, para que o motorista não fique impedido de trabalhar, mas fica assinalado como pendente de confirmação até ser verificado pela Timorgiana, Lda.'),

    A('Artigo 13.º', 'Fotografia de turno'),
    P('Em cada dia de trabalho, e antes da primeira viagem, o motorista tira uma fotografia de si próprio através da aplicação.'),
    P('Os documentos verificam a conta; a fotografia de turno verifica quem está ao volante nesse dia. Destina-se a impedir que a conta de um motorista aprovado seja utilizada por terceiro.'),

    A('Artigo 14.º', 'Proteção dos documentos'),
    P('Os documentos submetidos são conservados em base de dados cifrada nas cópias de segurança e acedidos unicamente por quem exerça funções de gestão da plataforma.'),
    P('Cada acesso a documentos de um motorista fica registado, com identificação de quem acedeu, de quem foi consultado e do momento do acesso.'),
    P('Os documentos não são vendidos, cedidos nem partilhados com terceiros, salvo obrigação legal ou ordem de autoridade competente.'),

    A('Artigo 15.º', 'Entrada em vigor'),
    P(`O presente Regulamento entra em vigor em ${C.VERSAO} e aplica-se às candidaturas apresentadas a partir dessa data, bem como à manutenção das contas já aprovadas.`),
    P('A Timorgiana, Lda pode alterá-lo, avisando os motoristas na aplicação com antecedência razoável.'),
  ]
);
