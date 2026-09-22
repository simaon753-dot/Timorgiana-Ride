// OS SERVIÇOS QUE NÃO SÃO VEÍCULOS (20/09/2026).
//
// Os três veículos dizem em QUE se anda (tiposDeVeiculo.js). Isto diz o QUE se
// pede. São perguntas diferentes: uma encomenda vai de mota ou de carro, e o
// passageiro escolhe o veículo no ecrã do preço, como em qualquer viagem.
//
// Por isso não entram na tabela dos veículos: um serviço aqui não tem
// matrícula, nem lugares, nem fotografia de veículo — tem um ecrã por onde
// começa e um interruptor no painel.
//
// Um serviço só aparece na app quando o servidor o diz ligado
// (`/api/quote/servicos`). Enquanto estiver em construção, não existe para
// quem usa a app: não se mostra um serviço que ainda não funciona.
export const SERVICOS_EXTRA = [
  {
    id: 'jastip',
    chaveNome: 'encomendaTitulo',
    chaveNota: 'encomendaNota',
    // A ILUSTRAÇÃO DO SIMÃO, e por isso SEM disco de acento por trás
    // (22/09/2026). O desenho a cores dentro de um disco colorido perde-se;
    // e ele já disse uma vez que quer o ícone sozinho, sem círculo atrás.
    imagem: require('../../assets/icones/servico-encomenda.png'),
    icone: 'caixa',
    tinta: 'tintaCarry',
    acento: 'acentoCarry',
    ecra: 'Encomenda',
  },
  // A FLORISTA ABRE O SITE DELA, e é o único mosaico daqui que não abre um
  // ecrã (21/09/2026). Por isso traz `externo: true` em vez de `ecra`: o
  // endereço não está escrito aqui nem em lado nenhum da app — vem com a
  // resposta de `/api/quote/servicos`, para mudar de domínio não obrigar a
  // publicar uma versão nova.
  {
    id: 'flores',
    chaveNome: 'floresTitulo',
    chaveNota: 'floresNota',
    imagem: require('../../assets/icones/servico-flores.png'),
    icone: 'flor',
    tinta: 'tintaFlor',
    acento: 'acentoFlor',
    externo: true,
  },
];
