import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LEAFLET_CSS, LEAFLET_JS } from './leafletEmbutido.js';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Centro por omissão: Díli, Timor-Leste
const DILI = { lat: -8.5569, lng: 125.5603 };

// Mapa OpenStreetMap (Leaflet) dentro de um WebView.
// Usa-se WebView em vez de react-native-maps porque funciona no Expo Go
// sem ser preciso compilar uma build nativa.
//
// pickable=true: tocar no mapa coloca um marcador e devolve as coordenadas.
// markers: [{ lat, lng, label }] para mostrar pontos (só leitura).
export default function OSMMap({
  pickable = false,
  markers = [],
  center,
  height = 240,
  onPick,
  onRoute, // recebe { km } quando há rota entre dois pontos
  liveMarker, // { lat, lng } que se move — ex.: o motorista a aproximar-se
  liveLabel, // nome da rua onde o veículo vai agora (acompanha o marcador)
  fill = false, // ocupa todo o espaço do pai, sem moldura nem cantos
}) {
  const webRef = useRef(null);
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);

  // O HTML NÃO depende do liveMarker: se dependesse, o mapa recarregava a
  // cada nova posição do motorista — a piscar de 12 em 12 segundos e a
  // perder o zoom que o utilizador tivesse feito. Em vez disso, injectamos
  // uma instrução no mapa já carregado, que apenas move o ícone.
  const html = useMemo(
    () => buildHtml({ center: c, markers, pickable }),
    [c.lat, c.lng, pickable, markersKey]
  );

  useEffect(() => {
    if (!liveMarker || !webRef.current) return;
    webRef.current.injectJavaScript(
      `window.moverMotorista && window.moverMotorista(${liveMarker.lat}, ${liveMarker.lng}, ${JSON.stringify(
        liveLabel || ''
      )}); true;`
    );
  }, [liveMarker?.lat, liveMarker?.lng, liveLabel]);

  // O WebView não existe na versão web — mostrar um aviso simpático
  // em vez do erro vermelho do react-native-webview.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, styles.fallback, fill ? styles.fill : { height }]}>
        <Text style={styles.fallbackIcon}>🗺️</Text>
        <Text style={styles.fallbackText}>O mapa está disponível na app do telemóvel.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d?.type === 'route' && onRoute) onRoute({ km: d.km });
            else if (typeof d?.lat === 'number' && onPick) onPick(d);
          } catch {
            /* ignora mensagens que não sejam do nosso formato */
          }
        }}
        style={styles.web}
      />
    </View>
  );
}

function buildHtml({ center, markers, pickable }) {
  const pts = markers.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    label: m.label || '',
    tipo: m.tipo || '',
  }));
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>${LEAFLET_CSS}</style>
<style>
html,body,#map{height:100%;margin:0;padding:0;background:#e9e4db}
.rotulo.leaflet-tooltip{
  background:#0E5C54; color:#F2F8F6; border:none; border-radius:6px;
  padding:4px 9px; font:600 11.5px/1.25 -apple-system,Roboto,sans-serif;
  box-shadow:0 2px 6px rgba(0,0,0,.3); max-width:150px; white-space:normal;
  text-align:center;
}
.rotulo.destino{ background:#E85531; }
/* Pinos desenhados à mão, sem ficheiro nenhum.
   O marcador por omissão do Leaflet é um <img> que aponta para
   marker-icon.png. Quando o Leaflet vinha do unpkg, ele deduzia esse
   caminho a partir do URL do próprio script; embutido na aplicação não há
   URL nenhum de onde deduzir, e o que aparecia era a imagem partida com o
   texto alternativo "Marker" por baixo. Desenhar aqui resolve isso e
   funciona sem rede, que é o objectivo.

   A PRIMEIRA VERSÃO era um quadrado com três cantos redondos, rodado 45°.
   Dava uma gota, e de longe passava. Mas a ponta saía afiada como um
   alfinete e o corpo era pequeno de mais para se ver por cima dos
   mosaicos, sobretudo em ruas claras.

   Passa a ser o desenho que toda a gente reconhece de um mapa: corpo cheio,
   contorno branco e um FURO branco no meio. O furo é o que faz o pino ler-se
   contra qualquer fundo — é ele que dá a forma, mesmo quando a cor se
   confunde com o que está por baixo.

   Em SVG e não em CSS porque uma gota a sério não se faz com bordas
   arredondadas: o encontro entre a cabeça redonda e a ponta é uma curva, e
   com `border-radius` sai um bico colado a um círculo. */
.pino svg{ display:block; filter:drop-shadow(0 2px 3px rgba(0,0,0,.4)); }
/* Atribuição.
   Os dados do mapa são do OpenStreetMap sob a licença ODbL, que EXIGE
   atribuição visível — não é uma cortesia. O controlo do Leaflet está
   desligado porque ocupa espaço e não segue o desenho da aplicação, por
   isso a atribuição é feita aqui: pequena, discreta, e sempre presente. */
.credito{
  position:absolute; right:0; bottom:0; z-index:900;
  background:rgba(255,255,255,.78); color:#3A4441;
  font:500 9px/1.5 -apple-system,Roboto,sans-serif;
  padding:1px 5px; border-radius:4px 0 0 0;
  pointer-events:none;
}
.rotulo.agora{ background:#1C2421; }
.rotulo.leaflet-tooltip-bottom.agora:before{ border-bottom-color:#1C2421; }
.rotulo.leaflet-tooltip-top.origem:before{ border-top-color:#0E5C54; }
.rotulo.leaflet-tooltip-top.destino:before{ border-top-color:#E85531; }
</style>
</head><body>
<div id="map"></div>
<div class="credito">© OpenStreetMap</div>
<script>${LEAFLET_JS}</script>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.lat},${center.lng}], 14);
  // Zoom em baixo à esquerda: em cima colidia com o crachá de distância
  // e tempo, e à direita com os botões de expandir e fechar.
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  // Mosaicos, afinados para uma rede lenta.
  //
  //   keepBuffer:0   — o Leaflet carrega por omissão um anel de mosaicos
  //                    FORA do ecrã, para o arrastar ficar suave. São
  //                    duas a três vezes mais mosaicos do que se vê. Numa
  //                    ligação lenta esse anel atrasa os que interessam,
  //                    que são os que estão à frente dos olhos.
  //   updateWhenIdle — só pede mosaicos quando o dedo pára. A arrastar,
  //                    pedia uma vaga nova a cada quadro do movimento e
  //                    quase todos eram deitados fora antes de chegarem.
  //   maxZoom:18     — o 19 existe e é mais um nível de mosaicos para
  //                    descarregar. Para encontrar um carro na rua, o 18
  //                    já mostra os números de porta.
  //   updateWhenZooming:false — o mesmo, para o gesto de ampliar.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18, keepBuffer:0, updateWhenIdle:true, updateWhenZooming:false,
    crossOrigin:true
  }).addTo(map);
  var pts = ${JSON.stringify(pts)};
  var COR = { origem: '#0E5C54', destino: '#E85531' };
  function pino(tipo){
    var cor = COR[tipo] || COR.origem;
    return L.divIcon({
      html:
        '<div class="pino"><svg width="26" height="36" viewBox="0 0 26 36">' +
        // A gota. A cabeça é um arco, a ponta desce em duas curvas que se
        // encontram no fundo — é esse encontro que dá a forma de gota em
        // vez de um bico colado a um círculo.
        '<path d="M13 1.6C7 1.6 2.2 6.4 2.2 12.4c0 8 10.8 21.5 10.8 21.5' +
        's10.8-13.5 10.8-21.5C23.8 6.4 19 1.6 13 1.6z" fill="' + cor +
        '" stroke="#FFF" stroke-width="2"/>' +
        // O furo. Sem ele o pino é uma mancha de cor; com ele lê-se mesmo
        // sobre um telhado da mesma cor.
        '<circle cx="13" cy="12.4" r="4.3" fill="#FFF"/>' +
        '</svg></div>',
      className: '', iconSize: [26,36],
      // A PONTA assenta na coordenada, não o centro do desenho. A ponta do
      // caminho está em y≈34; com o contorno de 2px o extremo visível fica
      // em 35. Ancorar no meio punha o pino meia rua acima do sítio real
      // quando o mapa está ampliado.
      iconAnchor: [13,35]
    });
  }
  pts.forEach(function(p){
    var m = L.marker([p.lat,p.lng], {
      icon: pino(p.tipo === 'destino' ? 'destino' : 'origem')
    }).addTo(map);
    // No mapa mostra-se só a primeira parte do nome. O nome completo já
    // está no painel de baixo, e dois rótulos longos em pontos próximos
    // sobrepõem-se e deixam de se ler — num ecrã de telemóvel isso
    // acontece em qualquer viagem curta dentro de Díli.
    var curto = (p.label || '').split(',')[0].trim();
    if (curto) {
      // permanent: o nome fica sempre à vista, na cabeça do pino. Antes
      // era um popup e só aparecia a quem soubesse tocar no marcador.
      m.bindTooltip(curto, {
        permanent: true, direction: 'top', offset: [0,-34],
        className: 'rotulo ' + (p.tipo === 'destino' ? 'destino' : 'origem'), opacity: 1
      });
    }
  });
  if (pts.length > 1) { map.fitBounds(pts.map(function(p){return [p.lat,p.lng];}),{padding:[40,40]}); }
  else if (pts.length === 1) { map.setView([pts[0].lat,pts[0].lng], 15); }

  // --- Rota entre origem e destino -------------------------------------
  // Tenta o OSRM (segue as estradas reais). Se falhar — sem rede, sítio
  // sem estradas mapeadas — desenha uma linha reta tracejada, para o
  // utilizador ver sempre a ligação entre os dois pontos.
  function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  function straightLine(a,b){
    var camada = L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color:'#0E5C54',weight:4,opacity:0.6,dashArray:'8,8'}).addTo(map);
    var R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
    var s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    send({type:'route', km: Math.round(2*R*Math.asin(Math.sqrt(s))*10)/10, approx:true});
    return camada;
  }
  if (pts.length > 1) {
    var a = pts[0], b = pts[pts.length-1];

    // A linha recta aparece PRIMEIRO, e a rota verdadeira substitui-a
    // quando chegar. Antes esperava-se pelo servidor de rotas e, numa
    // ligação lenta, o mapa ficava sem linha nenhuma durante segundos —
    // ou para sempre, se o pedido falhasse em silêncio. Ver uma ligação
    // aproximada de imediato é melhor do que ver a certa mais tarde.
    var provisoria = straightLine(a,b);

    // "overview=simplified" em vez de "full": o "full" traz a rota com
    // TODOS os pontos que o motor calculou — centenas, para uma viagem em
    // Díli. Num ecrã de telemóvel não se distingue de uma versão com
    // vinte, e é dez vezes menos para descarregar.
    var url = 'https://router.project-osrm.org/route/v1/driving/'+a.lng+','+a.lat+';'+b.lng+','+b.lat+'?overview=simplified&geometries=geojson';

    // Sem prazo, um pedido pendurado nunca resolve nem falha, e o
    // catch que traz a linha de reserva nunca chega a correr.
    var cortar = null;
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    if (ctrl) cortar = setTimeout(function(){ ctrl.abort(); }, 12000);

    fetch(url, ctrl ? {signal: ctrl.signal} : undefined).then(function(r){ return r.json(); }).then(function(j){
      if (cortar) clearTimeout(cortar);
      var route = j && j.routes && j.routes[0];
      if(!route) throw new Error('sem rota');
      var line = route.geometry.coordinates.map(function(c){ return [c[1],c[0]]; });
      if (provisoria) map.removeLayer(provisoria);
      L.polyline(line,{color:'#0E5C54',weight:5,opacity:0.85}).addTo(map);
      map.fitBounds(L.polyline(line).getBounds(),{padding:[30,30]});
      send({type:'route', km: Math.round(route.distance/100)/10});
    }).catch(function(){
      if (cortar) clearTimeout(cortar);
      /* fica a linha recta que já está desenhada */
    });
  }
  // Ícone do motorista, movido de fora sem recarregar o mapa
  var motoristaIcon = L.divIcon({
    html: '<div style="font-size:26px;line-height:26px">\u{1F697}</div>',
    className: '', iconSize: [26,26], iconAnchor: [13,13]
  });
  var motorista = null;
  window.moverMotorista = function(lat, lng, rua){
    if (motorista) { motorista.setLatLng([lat,lng]); }
    else { motorista = L.marker([lat,lng], {icon: motoristaIcon, zIndexOffset: 1000}).addTo(map); }
    // O rótulo acompanha o veículo e diz a rua onde ele vai agora. Ao
    // contrário da recolha e do destino, este muda durante a viagem — é
    // essa mudança que responde a "onde estamos neste momento".
    if (rua) {
      if (motorista.getTooltip()) { motorista.setTooltipContent(rua); }
      else {
        motorista.bindTooltip(rua, {
          permanent: true, direction: 'bottom', offset: [0,16],
          className: 'rotulo agora', opacity: 1
        });
      }
    }
  };

  ${
    pickable
      ? `var pin=null;
       map.on('click', function(e){
         if(pin){pin.setLatLng(e.latlng);} else {pin=L.marker(e.latlng).addTo(map);}
         if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({lat:e.latlng.lat,lng:e.latlng.lng})); }
       });`
      : ''
  }
</script>
</body></html>`;
}

const criarEstilos = () =>
  StyleSheet.create({
    wrap: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#e9e4db',
    },
    fill: { flex: 1, borderRadius: 0, borderWidth: 0 },
    web: { flex: 1, backgroundColor: 'transparent' },
    fallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    fallbackIcon: { fontSize: 32, marginBottom: spacing.sm },
    fallbackText: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
