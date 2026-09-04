const C = require('./comum.js');
const { artigo: A, p: P, rico: R, item: I, nota: N, tabela: T } = C;

const L = [3300, 1500, 1900, 1900];

module.exports = C.documento(
  'Tabela de Infrações e Sanções',
  `${C.EMPRESA}  ·  ${C.MORADA}  ·  ${C.CONTACTOS}  ·  Versão de ${C.VERSAO}`,
  [
    A('Artigo 1.º', 'Âmbito'),
    P('A presente Tabela fixa as infrações aos Regulamentos, ao Contrato de Utilização da Plataforma e à Política de Segurança dos Passageiros, e as sanções que lhes correspondem.'),
    P('Aplica-se aos motoristas admitidos à plataforma TimorgianaRide.'),

    A('Artigo 2.º', 'Graduação'),
    T(
      ['Grau', 'Critério'],
      [
        ['Leve', 'Prejudica o serviço, sem pôr em risco pessoas'],
        ['Grave', 'Põe em risco o passageiro, ou lesa-o patrimonialmente'],
        ['Muito grave', 'Compromete a integridade das pessoas ou a confiança na plataforma'],
      ],
      [1800, 6700]
    ),

    A('Artigo 3.º', 'Sanções aplicáveis'),
    I('Advertência escrita, comunicada na aplicação;'),
    I('Suspensão temporária do acesso, por três, sete ou quinze dias;'),
    I('Suspensão preventiva, sem prazo fixo, enquanto durar a análise dos factos;'),
    I('Desativação definitiva da conta;'),
    I('Suspensão automática, que não é sanção e cessa com a regularização do documento.'),

    A('Artigo 3.º-A', 'A escala e a razão dela'),
    T(
      ['Grau', '1.ª vez', 'Reincidência'],
      [
        ['Leve', 'Advertência', '3 dias'],
        ['Grave', '7 dias', '15 dias'],
        ['Muito grave', 'Suspensão preventiva até concluir a análise', 'Desativação'],
      ],
      [2000, 3600, 2900]
    ),
    R([['Não há suspensões de trinta dias, e isso é deliberado.'], ' Um motorista impedido de trabalhar durante um mês arranja outro trabalho e não volta. Uma sanção assim parece um degrau intermédio e funciona como um fim — sem o dizer, e sem as garantias de quem é desativado.']),
    P('Ou os factos são graves ao ponto de justificar o fim da relação, e então é isso que se decide e se comunica, ou são uma interrupção que a pessoa tem de conseguir atravessar. Um motorista de motorizada em Díli que fique trinta dias parado perde o rendimento de um mês por uma infração que, na maior parte dos casos, não causou dano a ninguém.'),
    P('Há ainda um terceiro prejudicado que não aparece na tabela: com poucos motoristas em serviço, cada suspensão longa retira capacidade à rede, e quem também paga é o passageiro que não encontra viagem.'),

    A('Artigo 3.º-B', 'A suspensão não consome dias pagos'),
    R(['Os dias de utilização adquiridos pelo motorista ', ['só são descontados quando ele conclua uma viagem'], '. Um motorista suspenso não realiza viagens e, por isso, não consome os dias que pagou.']),
    P('A suspensão custa-lhe rendimento, que é o que a torna uma sanção; não lhe custa o que já tinha comprado, que seria uma segunda pena pela mesma infração.'),
    N('A suspensão automática por documento fora de prazo não é uma pena: é a consequência de não estar em condições legais de conduzir. Cessa sozinha, no momento em que o documento renovado for enviado, sem intervenção de ninguém.'),

    A('Artigo 4.º', 'Documentação'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Documento obrigatório em falta, sem data de validade, ou caducado', 'Automática', 'Suspensão até regularizar', 'Suspensão até regularizar'],
        ['Não atualizar os dados do veículo após substituição', 'Grave', 'Suspensão até regularizar', 'Suspensão 15 dias'],
        ['Declarar data de validade que não corresponde ao documento', 'Grave', 'Suspensão 7 dias', 'Suspensão 15 dias'],
        ['Apresentar documento falso, alterado ou de terceiro', 'Muito grave', 'Desativação', '—'],
      ],
      L
    ),

    A('Artigo 5.º', 'Identidade e uso da conta'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Não tirar a fotografia de turno', 'Leve', 'Impedimento de entrar ao serviço', 'Advertência'],
        ['Ceder a conta a terceiro para conduzir', 'Muito grave', 'Desativação', '—'],
        ['Realizar viagem em veículo diferente do registado', 'Grave', 'Suspensão 7 dias', 'Suspensão 15 dias'],
      ],
      L
    ),

    A('Artigo 6.º', 'Condução e segurança'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Conduzir sob efeito de álcool ou estupefacientes', 'Muito grave', 'Desativação e comunicação às autoridades', '—'],
        ['Conduzir de forma perigosa, com queixa fundamentada', 'Muito grave', 'Suspensão imediata e análise', 'Desativação'],
        ['Não disponibilizar capacete ao passageiro (motorizada)', 'Grave', 'Advertência', 'Suspensão 7 dias'],
        ['Circular com veículo em mau estado de segurança', 'Grave', 'Suspensão até comprovar reparação', 'Suspensão 15 dias'],
        ['Transportar mais passageiros do que a lotação declarada', 'Grave', 'Advertência', 'Suspensão 15 dias'],
      ],
      L
    ),

    A('Artigo 7.º', 'Conduta perante o passageiro'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Tratamento desrespeitoso ou linguagem ofensiva', 'Grave', 'Advertência', 'Suspensão 15 dias'],
        ['Discriminação de passageiro', 'Muito grave', 'Suspensão preventiva e análise', 'Desativação'],
        ['Conduta de natureza sexual, intimidatória ou de assédio', 'Muito grave', 'Desativação e comunicação às autoridades', '—'],
        ['Desviar-se do percurso sem acordo do passageiro', 'Grave', 'Suspensão 7 dias', 'Suspensão 15 dias'],
        ['Recusar-se a terminar a viagem no destino pedido', 'Muito grave', 'Suspensão preventiva e análise', 'Desativação'],
      ],
      L
    ),

    A('Artigo 8.º', 'Preço e cobrança'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Cobrar valor superior ao indicado pela aplicação', 'Grave', 'Suspensão 7 dias e devolução', 'Desativação'],
        ['Exigir pagamento antes de terminada a viagem', 'Leve', 'Advertência', 'Suspensão 3 dias'],
        ['Cobrar ao passageiro taxa de entrada não devida', 'Grave', 'Advertência e devolução', 'Suspensão 15 dias'],
        ['Combinar viagem fora da aplicação para evitar registo', 'Leve', 'Advertência', 'Advertência'],
      ],
      L
    ),
    N('Combinar uma viagem fora da aplicação não lesa a plataforma, que não cobra comissão. Lesa o passageiro: fora da aplicação não há código de recolha, não há botão de socorro, não há registo de quem conduziu. É por isso que consta desta tabela, e é por isso que a sanção é leve.'),

    A('Artigo 9.º', 'Assiduidade e cancelamentos'),
    T(
      ['Infração', 'Grau', '1.ª vez', 'Reincidência'],
      [
        ['Cancelar após aceitar, sem motivo atendível', 'Leve', 'Advertência', 'Suspensão 3 dias'],
        ['Não comparecer no ponto de recolha', 'Grave', 'Advertência', 'Suspensão 15 dias'],
        ['Taxa de cancelamento persistentemente elevada', 'Grave', 'Análise da conta', 'Suspensão 15 dias'],
      ],
      L
    ),

    A('Artigo 10.º', 'Procedimento'),
    P('Antes da aplicação de qualquer sanção que não seja a suspensão automática, é dado ao motorista conhecimento dos factos e oportunidade de se pronunciar, salvo quando a gravidade dos factos imponha suspensão preventiva imediata.'),
    P('A decisão é comunicada na aplicação, com indicação do motivo, e fica registada.'),

    A('Artigo 11.º', 'Suspensão preventiva'),
    P('Perante queixa de conduta de natureza sexual, violência, condução sob efeito de álcool ou estupefacientes, ou qualquer facto que ponha em risco imediato a segurança dos passageiros, a conta é suspensa de imediato enquanto durar a análise.'),
    P('A suspensão preventiva não constitui, por si, reconhecimento da infração.'),

    A('Artigo 12.º', 'Reincidência'),
    P('Há reincidência quando a mesma infração seja praticada nos doze meses seguintes à comunicação da sanção anterior.'),

    A('Artigo 13.º', 'Concurso e agravamento'),
    P('Praticadas várias infrações, aplica-se a sanção mais gravosa, podendo subir-se um degrau na escala do artigo 3.º-A. O agravamento nunca ultrapassa os quinze dias de suspensão: acima disso, a decisão a tomar é a desativação, e deve ser tomada como tal.'),

    A('Artigo 14.º', 'Comunicação às autoridades'),
    P('Os factos que indiciem a prática de crime são comunicados às autoridades competentes, independentemente da sanção aplicada no âmbito da plataforma.'),

    A('Artigo 15.º', 'Reapreciação'),
    P('O motorista pode pedir a reapreciação de qualquer sanção pelos contactos da Timorgiana, Lda, no prazo de quinze dias a contar da comunicação.'),
  ]
);
