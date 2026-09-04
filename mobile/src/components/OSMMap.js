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
  // Raio de incerteza do GPS, em metros. Desenha o círculo.
  precisaoM = null,
  // Deixa arrastar os pinos para corrigir o ponto.
  arrastavel = false,
  onArrastar,
  // Modo de escolha: o pino fica FIXO no centro do ecrã e o mapa é que se
  // move por baixo. Devolve o centro sempre que o mapa pára.
  //
  // Recebe 'origem' ou 'destino' e não um sim/não: a mira toma a cor do
  // campo que se está a marcar. Ver uma mira teal enquanto se escolhe o
  // destino era dizer uma coisa e marcar outra.
  modoEscolha = null,
  onCentro,
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
    () => buildHtml({ center: c, markers, pickable, precisaoM, arrastavel, modoEscolha }),
    [c.lat, c.lng, pickable, markersKey, precisaoM, arrastavel, modoEscolha]
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
            else if (d?.type === 'arrastou' && onArrastar) onArrastar(d);
            else if (d?.type === 'centro' && onCentro) onCentro(d);
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

function buildHtml({ center, markers, pickable, precisaoM, arrastavel, modoEscolha }) {
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
/* O nome AO LADO do pino, num cartão branco.
   Estava por cima, numa etiqueta da cor do pino com o texto branco. Três
   problemas com isso, e nenhum se vê num só marcador:

   TAPAVA O QUE INTERESSA. A etiqueta ficava sobre o mapa acima do ponto —
   justamente onde está a rua por onde se chega. Ao lado, o caminho continua
   à vista.

   DOIS PONTOS PRÓXIMOS COLIDIAM. Numa viagem curta dentro de Díli, recolha e
   destino ficam a poucos quarteirões; duas etiquetas empilhadas por cima uma
   da outra deixavam de se ler as duas.

   E O TEXTO ERA COLORIDO SOBRE COR. Branco sobre teal lê-se; mas o cartão
   branco com texto escuro lê-se sempre, e é o que separa o nome do mapa em
   vez de o pintar por cima.

   Duas linhas: o nome em cima, e por baixo o que vem depois da vírgula —
   normalmente a rua ou a zona. É a informação que distingue duas "Kios Mana"
   na mesma cidade. */
/* A mira do modo de escolha. Fica a meio da largura e com a PONTA na
   metade da altura — é a ponta que marca o sítio, não o centro do desenho.
   Sobe-se o pino inteiro pela sua altura para que a ponta caia no meio. */
#mira{
  position:absolute; left:50%; top:50%; z-index:800;
  /* Desce 3 px: o ponto está a 42 dos 45 pixéis de altura, e é o PONTO que
     tem de cair no meio do ecrã — não a base da caixa. */
  transform:translate(-50%,-100%) translateY(3px); pointer-events:none;
  filter:drop-shadow(0 3px 4px rgba(0,0,0,.4));
}
/* Uma sombra elíptica no chão, no ponto exacto. Sem ela é difícil perceber
   onde a ponta assenta quando o mapa está a mexer. */
/* O ponto do próprio desenho faz de sombra: marca o sítio exacto sem
   precisar de uma elipse à parte. */
/* A mexer, o pino levanta-se um pouco — é o que dá a sensação de que o mapa
   está a passar por baixo dele e não o contrário. */
#mira.aMexer{ transform:translate(-50%,-100%) translateY(-3px); transition:transform .12s; }
.rotulo.leaflet-tooltip{
  background:#FFF; color:#14201D; border:none; border-radius:10px;
  padding:7px 12px; font:400 11px/1.3 -apple-system,Roboto,sans-serif;
  box-shadow:0 3px 10px rgba(0,0,0,.28); max-width:190px; text-align:left;
}
/* O nome NÃO PARTE, e cortou-se com reticências se for comprido.
   Sem isto o cartão encolhia até à palavra mais estreita e "Kios Mana Rita"
   saía em três linhas, uma palavra por linha — uma coluna de texto ao lado
   do pino, que é pior do que não ter rótulo. Acontece porque um elemento
   posicionado em absoluto, sem largura fixa, encolhe até ao mínimo do
   conteúdo; dizer que o título não parte faz desse mínimo a linha inteira. */
.rotulo b{
  display:block; font-weight:700; font-size:12.5px; letter-spacing:-.1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.rotulo i{
  display:block; font-style:normal; color:#6A7671; margin-top:1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
/* A seta que o Leaflet desenha a apontar do rótulo para o marcador.
   No modelo não existe: o cartão encosta-se ao pino e isso chega. Uma seta
   a apontar para um pino que está mesmo ao lado é ruído. */
.rotulo.leaflet-tooltip:before{ display:none; }
/* Um risco da cor à esquerda, para se saber qual é a recolha e qual é o
   destino sem ter de olhar para o pino. */
.rotulo.origem{ border-left:3px solid #0E5C54; }
.rotulo.destino{ border-left:3px solid #E85531; }
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
   com bordas arredondadas sai um bico colado a um círculo — que é
   exactamente o que se via ao ampliar. */
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
/* O rótulo do motorista continua escuro e não branco.
   É o único que se MEXE durante a viagem, e distingui-lo dos dois que estão
   parados evita a confusão de o ver a passar por cima deles. */
.rotulo.agora{ background:#14201D; color:#EAF2EF; border-left:3px solid #FF6B4A; }
.rotulo.agora i{ color:#9DB0AA; }
</style>
</head><body>
<div id="map"></div>
<!-- O PINO FIXO DO MODO DE ESCOLHA.
     Não é um marcador do Leaflet: é um desenho por cima do mapa, preso ao
     centro do ecrã. É essa a diferença que faz o modo funcionar — o pino
     não se move, o mapa é que anda por baixo dele.
     Sem apanhar o dedo (pointer-events), porque quem toca aqui quer
     arrastar o mapa, não o pino. -->
<div id="mira" hidden></div>
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
  // Escapa o que vai para dentro do rótulo.
  //
  // OBRIGATÓRIO desde que o rótulo passou a receber HTML em vez de texto. Os
  // nomes dos sítios vêm do OpenStreetMap e, cada vez mais, do que os
  // próprios passageiros escrevem ao baptizar um lugar — um "<" bastava para
  // partir o cartão, e um nome com uma etiqueta lá dentro executaria dentro
  // do mapa. Enquanto era texto simples o Leaflet tratava disto; a partir do
  // momento em que se passa HTML, passa a ser connosco.
  function escapar(t){
    return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var pts = ${JSON.stringify(pts)};
  // O desenho do pino, num sítio só — usado pelo marcador e pela mira.
  //
  // A FORMA. Cabeça redonda e cheia, e duas curvas que saem para fora antes
  // de convergirem na ponta. É o que distingue uma gota de um bico colado a
  // um círculo, e foi o modelo que o Simão pediu.
  //
  // O PONTO POR BAIXO marca o sítio exacto; o pino flutua sobre ele. Separa
  // duas coisas que antes se confundiam: onde o desenho está e onde o sítio
  // está.
  //
  // O CONTORNO É ESCURO, como no modelo — MAS COM UM HALO BRANCO POR FORA.
  //
  // O modelo é um azul vivo, e sobre ele um contorno escuro lê-se bem. O
  // nosso teal é escuro: com contorno escuro, sobre um telhado escuro do
  // mapa, o pino desaparecia e sobrava o furo branco a flutuar. Desenhado e
  // comparado sobre quatro fundos antes de decidir.
  //
  // O halo custa dois pixéis e devolve o que o contorno branco antigo dava —
  // sem perder o aspecto do modelo.
  var GOTA = 'M2 18 A16 16 0 1 1 34 18 C34 26 26 32 18 41 C10 32 2 26 2 18 Z';
  var COR = {
    origem:  { fill: '#0E5C54', risco: '#08403A' },
    destino: { fill: '#E85531', risco: '#8C2E14' }
  };
  function desenho(tipo, largura, altura){
    var c = COR[tipo] || COR.origem;
    return '<svg width="' + largura + '" height="' + altura + '" viewBox="0 0 36 54">' +
      '<path d="' + GOTA + '" fill="none" stroke="#FFF" stroke-width="5.6" stroke-linejoin="round"/>' +
      '<path d="' + GOTA + '" fill="' + c.fill + '" stroke="' + c.risco +
        '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<circle cx="18" cy="18" r="6" fill="#FFF"/>' +
      '<circle cx="18" cy="50" r="2.4" fill="#FFF"/>' +
      '<circle cx="18" cy="50" r="1.7" fill="' + c.risco + '"/>' +
      '</svg>';
  }
  function pino(tipo){
    return L.divIcon({
      html: '<div class="pino">' + desenho(tipo, 30, 45) + '</div>',
      className: '', iconSize: [30,45],
      // O PONTO assenta na coordenada — não a ponta da gota, e muito menos o
      // centro do desenho. O ponto está em y=50 de 54; à escala de 45 pixéis
      // isso são 42 a contar do topo.
      iconAnchor: [15,42]
    });
  }
  var ARRASTAVEL = ${arrastavel ? 'true' : 'false'};
  pts.forEach(function(p){
    var m = L.marker([p.lat,p.lng], {
      icon: pino(p.tipo === 'destino' ? 'destino' : 'origem'),
      // ARRASTAR PARA CORRIGIR.
      //
      // O GPS de um telemóvel entre prédios erra 20 a 40 metros, e nenhum
      // código corrige uma leitura de satélite. O que se pode fazer é deixar
      // quem está lá — e sabe onde está — pôr o ponto no sítio.
      //
      // Antes só havia o toque no mapa, e com a recolha já preenchida esse
      // toque definia o DESTINO. Ou seja: não havia forma nenhuma de corrigir
      // o ponto de partida sem abrir a pesquisa e escolher outra coisa.
      draggable: ARRASTAVEL,
      autoPan: true
    }).addTo(map);
    if (ARRASTAVEL) {
      m.on('dragend', function(){
        var q = m.getLatLng();
        send({ type:'arrastou', tipo: p.tipo === 'destino' ? 'destino' : 'origem',
               lat: q.lat, lng: q.lng });
      });
    }
    // No mapa mostra-se só a primeira parte do nome. O nome completo já
    // está no painel de baixo, e dois rótulos longos em pontos próximos
    // sobrepõem-se e deixam de se ler — num ecrã de telemóvel isso
    // acontece em qualquer viagem curta dentro de Díli.
    var partes = (p.label || '').split(',');
    var curto = (partes[0] || '').trim();
    var detalhe = (partes[1] || '').trim();
    if (curto) {
      // permanent: o nome fica sempre à vista. Antes era um popup e só
      // aparecia a quem soubesse tocar no marcador.
      //
      // direction 'auto': o Leaflet põe o cartão do lado do pino que fica
      // virado para dentro do mapa. Fixá-lo à esquerda ou à direita deixava
      // o nome a sair do ecrã sempre que o ponto ficasse junto a essa borda
      // — e o ponto junto à borda é o caso normal quando se arrasta o mapa.
      m.bindTooltip(
        '<b>' + escapar(curto) + '</b>' + (detalhe ? '<i>' + escapar(detalhe) + '</i>' : ''),
        {
          permanent: true, direction: 'auto',
          // 16 no x afasta o cartão do pino, que tem 13 de meia largura.
          // -22 no y sobe-o até à altura da CABEÇA do pino: a âncora está na
          // ponta, e a cabeça fica 22 pixéis acima dela.
          offset: [18,-27],
          className: 'rotulo ' + (p.tipo === 'destino' ? 'destino' : 'origem'),
          opacity: 1
        }
      );
    }
  });
  // O CÍRCULO DE INCERTEZA do GPS.
  //
  // Mostra o que o telemóvel realmente sabe: "estou algures aqui dentro". Sem
  // ele, um pino desenhado com traço fino parece uma certeza — e o Simão viu
  // exactamente isso, um ponto seguro de si a 35 metros de onde estava.
  //
  // Só se desenha acima de 15 metros: abaixo disso o círculo é mais pequeno
  // do que o pino e só faria sujidade.
  var PRECISAO = ${precisaoM == null ? 'null' : Number(precisaoM)};
  if (PRECISAO && PRECISAO > 15 && pts.length) {
    var o = pts.filter(function(p){ return p.tipo !== 'destino'; })[0] || pts[0];
    L.circle([o.lat,o.lng], {
      radius: PRECISAO, color:'#0E5C54', weight:1, opacity:.35,
      fillColor:'#0E5C54', fillOpacity:.10, interactive:false
    }).addTo(map);
  }

  // ── Modo de escolha ────────────────────────────────────────────────
  var MODO_ESCOLHA = ${JSON.stringify(modoEscolha || null)};
  if (MODO_ESCOLHA) {
    var mira = document.getElementById('mira');
    // O MESMO desenho do marcador. Se fossem dois, divergiam — e o que se
    // vê ao apontar deixava de ser o que fica marcado.
    mira.innerHTML = desenho(MODO_ESCOLHA === 'destino' ? 'destino' : 'origem', 30, 45);
    mira.hidden = false;
    map.on('movestart', function(){ mira.classList.add('aMexer'); });
    map.on('moveend', function(){
      mira.classList.remove('aMexer');
      var c = map.getCenter();
      send({ type:'centro', lat:c.lat, lng:c.lng });
    });
    // O primeiro envio é imediato: quem abre o modo já está a apontar para
    // algum sítio, e esperar pelo primeiro arrasto deixaria o botão de
    // confirmar sem nome nenhum por baixo.
    var c0 = map.getCenter();
    send({ type:'centro', lat:c0.lat, lng:c0.lng });
  }

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
      // Escapado como os outros. O Leaflet põe o conteúdo do rótulo em
      // innerHTML mesmo quando se lhe passa uma string simples, e esta rua
      // vem do Nominatim — dados de fora, que não se injectam sem lavar.
      var conteudo = '<b>' + escapar(rua) + '</b>';
      if (motorista.getTooltip()) { motorista.setTooltipContent(conteudo); }
      else {
        motorista.bindTooltip(conteudo, {
          // Ao lado do carro, como os outros, e não por baixo: por baixo
          // ficava sobre a estrada que o carro está prestes a percorrer.
          permanent: true, direction: 'auto', offset: [16,0],
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
