import * as ImageManipulator from 'expo-image-manipulator';

// ENCOLHER ANTES DE ENVIAR (21/09/2026).
//
// O QUE ACONTECIA. As fotografias iam da câmara para o servidor em base64,
// com a compressão do ImagePicker e mais nada. Uma câmara de telemóvel de
// hoje dá 12 a 50 megapíxeis; mesmo comprimido, isso são 1 a 4 MB — e o
// base64 acrescenta um terço. Dentro da app existiam três cópias do mesmo
// ficheiro ao mesmo tempo: a original, o texto base64, e a cópia dele dentro
// do JSON do pedido. Num telemóvel de 3 GB com o mapa aberto, é assim que se
// fica sem memória.
//
// E na rede de Díli, 4 MB não sobem em 15 segundos — o pedido expirava e,
// até hoje, era repetido do início.
//
// 1280 PÍXELS NO LADO MAIOR. É mais do que suficiente para o que estas
// fotografias servem: ler uma carta de condução, reconhecer um sofá, ver o
// valor de um talão. Fica à volta de 200 a 400 kB — dez vezes menos, sem
// diferença visível no ecrã de quem as vê.
//
// SE FALHAR, DEVOLVE O ORIGINAL. Uma fotografia grande que chega vale mais
// do que uma pequena que não existe: quem está a enviar a carta de condução
// não pode ficar sem a enviar porque o redimensionamento se engasgou.
const LADO_MAIOR = 1280;

export async function encolherFoto(uri, { qualidade = 0.6, base64Original = null } = {}) {
  try {
    const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: LADO_MAIOR } }], {
      compress: qualidade,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (r?.base64) return { uri: r.uri, base64: r.base64 };
  } catch {
    /* ver a nota acima */
  }
  return { uri, base64: base64Original };
}
