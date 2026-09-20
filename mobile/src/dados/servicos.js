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
    icone: 'caixa',
    tinta: 'tintaCarry',
    acento: 'acentoCarry',
    ecra: 'Encomenda',
  },
];
