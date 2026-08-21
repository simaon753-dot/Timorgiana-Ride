// Link de mapa para ABRIR NOUTRA APLICAÇÃO — não é o mapa da nossa app.
//
// A app continua a desenhar tudo com OpenStreetMap, sem contas nem custos.
// Mas um link do site do OSM abre uma página pesada no browser, e numa rede
// como a de Díli isso demora e frustra. Estes links abrem o mapa nativo do
// telemóvel (Google Maps no Android, Apple Maps no iPhone), que já lá está
// instalado, funciona depressa e faz navegação.
//
// É só um endereço dentro de uma mensagem: não traz biblioteca, nem chave,
// nem dependência nova ao projecto.
export function linkMapa(lat, lng) {
  if (lat == null || lng == null) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Para abrir no próprio telemóvel de quem toca. O esquema `geo:` deixa a
// pessoa escolher a aplicação que prefere; se o telemóvel não souber o que
// fazer com ele, cai no endereço normal.
export function abrirNoMapa(Linking, lat, lng) {
  if (lat == null || lng == null) return Promise.resolve(false);
  const nativo = `geo:${lat},${lng}?q=${lat},${lng}`;
  return Linking.openURL(nativo).catch(() => Linking.openURL(linkMapa(lat, lng)));
}
