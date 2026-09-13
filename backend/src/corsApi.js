// QUEM PODE LER A API A PARTIR DE UM BROWSER.
//
// Era `cors()` sem opções: qualquer site, de qualquer origem, podia ler as
// respostas da API. Convém pôr o risco na escala certa — a autenticação é por
// token Bearer e não por cookie, portanto um site estranho não consegue agir
// em nome de ninguém: não tem o token. Isto é defesa em profundidade, não o
// fecho de uma porta escancarada.
//
// QUEM FALA COM A API, verificado antes de mexer (11/09/26):
//   · A app — por `fetch` nativo do React Native, que NÃO aplica CORS e não
//     manda cabeçalho Origin. Não é afectada por nada disto.
//   · O painel — servido por este mesmo servidor, portanto da mesma origem.
//   · Nenhuma WebView da app: o OSMMap (Leaflet numa WebView) foi substituído
//     pelo MapaGoogle, que é nativo.
//   · As páginas de piloto/ e mapa-proprio/ não fazem chamada nenhuma.
//
// SÓ A /api. Os ficheiros públicos — termos, privacidade, e o mapa próprio
// (timor-leste.pmtiles, estilo.json) — continuam abertos a qualquer origem.
// O mapa próprio está desligado na app, mas no dia em que voltar a ligar-se
// numa WebView precisa de ler aqueles ficheiros de outra origem. Fechá-los
// agora era partir isso em silêncio, longe de quem o fizesse.
//
// O SOCKET.IO FICA COMO ESTÁ, de propósito. O CORS lá só governa o transporte
// de long-polling por HTTP, a app não é um browser e o painel não usa sockets.
// O ganho seria quase nulo, e um engano deixava o tempo real sem funcionar
// para toda a gente.

// A app aberta no browser em desenvolvimento (`expo start --web`).
const ORIGENS_DESENVOLVIMENTO = ['http://localhost:8081', 'http://localhost:19006'];

// A regra, sem Express à volta — para se poder testar a verdadeira.
//
// `propria` é a origem deste servidor, calculada do pedido e não escrita à
// mão: o painel continua a funcionar no dia em que houver um domínio próprio,
// sem ninguém se lembrar de vir aqui acrescentá-lo.
export function origemPermitida({ caminho, origem, propria }) {
  const eApi = caminho === '/api' || caminho.startsWith('/api/');
  if (!eApi) return true;
  // Sem Origin: não é um browser a pedir de outro site (é a app, o curl, o
  // painel num GET da mesma origem). CORS não tem nada a dizer.
  if (!origem) return true;
  return origem === propria || ORIGENS_DESENVOLVIMENTO.includes(origem);
}

// Para o `cors()`: decide por pedido. `origin: true` devolve a origem de quem
// pediu; `origin: false` não devolve cabeçalho nenhum, e o browser recusa-se a
// entregar a resposta ao site que a pediu.
//
// Depende de `trust proxy` estar ligado (server.js), senão `req.protocol`
// seria `http` atrás do proxy do Render e a própria origem nunca bateria.
export function corsPorPedido(req, cb) {
  const propria = `${req.protocol}://${req.get('host')}`;
  cb(null, {
    origin: origemPermitida({ caminho: req.path, origem: req.header('Origin'), propria }),
  });
}
