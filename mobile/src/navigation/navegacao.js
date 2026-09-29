// A NAVEGAÇÃO DA APP, para quem não é um ecrã (29/09/2026).
//
// O `RootNavigator` guarda aqui o contentor de navegação. Serve funções como
// `navegarAte` (lib/mapaLink.js), que são chamadas de vários sítios — um
// cartão, o mapa — e não recebem `navigation`. Pode estar vazio (a app a
// arrancar): quem usa confirma `isReady()` e tem um caminho de reserva.
export const navegacao = { current: null };
