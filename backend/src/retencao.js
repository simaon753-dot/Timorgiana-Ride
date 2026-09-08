import { query } from './db.js';

// QUANTO TEMPO SE GUARDA CADA COISA
//
// Prazos decididos pelo Simão a 08/09/2026, depois de eu lhe pôr à frente o
// que cada tabela pesa e a que pergunta responde. São dois relógios porque são
// duas perguntas, e não havia razão para terem o mesmo prazo.
//
// QUEM VIU QUE DOCUMENTOS — 24 meses.
//   Uma linha guarda quatro números e uma data: quem, o quê, a quem, quando.
//   Nem um pedaço de documento. São cerca de 150 bytes, e com vinte motoristas
//   dá menos de meio megabyte por ano — 0,1% do plano gratuito.
//   O prazo é longo de propósito: estes dados existem em benefício de QUEM É
//   CONSULTADO, não de quem administra. É esta tabela que dá ao motorista a
//   resposta no dia em que ele perguntar quem lhe viu o bilhete de identidade.
//   Apagá-la cedo não o protege de nada.
//
// A HISTÓRIA DAS VIAGENS — 6 meses.
//   Aqui é ao contrário: cada viagem escreve cerca de oito eventos, e com cem
//   viagens por dia são vinte e quatro mil por mês. Com os detalhes em JSON e
//   as posições, à volta de 10 MB mensais — 120 MB no primeiro ano, num plano
//   de 500 MB partilhado com tudo o resto. É esta que ameaça a base.
export const MESES_ACESSOS = Number(process.env.RETENCAO_ACESSOS_MESES) || 24;
export const MESES_EVENTOS = Number(process.env.RETENCAO_EVENTOS_MESES) || 6;

// AS VIAGENS EM SI NÃO SE APAGAM AQUI, e é uma distinção que interessa.
//
// A linha da viagem é o registo de ganhos do motorista: o que ele conduziu e
// quanto recebeu. Apagá-la ao fim de seis meses seria apagar-lhe o histórico
// do trabalho, e ninguém pediu isso — o que expira é a HISTÓRIA MINUTO A
// MINUTO da viagem, que é o que pesa.
//
// Para as viagens há o caminho manual: o administrador transfere-as e apaga-as
// quando quiser, guardando o ficheiro no escritório. Ver a rota /exportar.

// Uma passagem de limpeza. Devolve o que apagou, para ficar no diário.
export async function limparAntigos() {
  const feito = {};

  const eventos = await query(
    `DELETE FROM ride_events
      WHERE created_at < NOW() - ($1 || ' months')::interval
      RETURNING id`,
    [String(MESES_EVENTOS)]
  );
  feito.eventos = eventos.length;

  const acessos = await query(
    `DELETE FROM admin_acessos
      WHERE created_at < NOW() - ($1 || ' months')::interval
      RETURNING id`,
    [String(MESES_ACESSOS)]
  );
  feito.acessos = acessos.length;

  return feito;
}

// Quanto está guardado e o que sai a seguir. Para o painel poder mostrar a
// regra a funcionar em vez de a prometer.
export async function estadoDaRetencao() {
  const [r] = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM ride_events) AS eventos,
       (SELECT MIN(created_at) FROM ride_events) AS evento_mais_antigo,
       (SELECT COUNT(*)::int FROM admin_acessos) AS acessos,
       (SELECT MIN(created_at) FROM admin_acessos) AS acesso_mais_antigo,
       (SELECT COUNT(*)::int FROM rides WHERE status IN ('completed','cancelled')) AS viagens`
  );
  return {
    eventos: {
      linhas: r.eventos,
      maisAntigo: r.evento_mais_antigo,
      meses: MESES_EVENTOS,
    },
    acessos: {
      linhas: r.acessos,
      maisAntigo: r.acesso_mais_antigo,
      meses: MESES_ACESSOS,
    },
    // As viagens não expiram sozinhas. Aparecem aqui para o painel poder
    // dizer quantas há por transferir.
    viagens: { linhas: r.viagens, meses: null },
  };
}
