import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LEAFLET_CSS, LEAFLET_JS, PROTOMAPS_JS } from './leafletEmbutido.js';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { lerMapaBase64 } from '../lib/mapaOffline.js';
import { useTema } from '../context/TemaContext.js';

// Centro por omissão: Díli, Timor-Leste
const DILI = { lat: -8.5569, lng: 125.5603 };

// O mapa de Díli em base64, partilhado por todos os mapas da aplicação.
//
// Fora do componente de propósito: dois mapas abertos ao mesmo tempo — o
// do pedido e o expandido — usam a mesma leitura em vez de cada um ler
// 2,9 MB do disco por sua conta.
//
// `avisar` deixa os componentes saber quando os dados chegam, para
// reconstruírem o HTML com o mapa lá dentro.
let mapaB64 = null;
let leituraEmCurso = null;
const aoChegar = new Set();

function pedirMapa() {
  if (mapaB64 || leituraEmCurso) return;
  leituraEmCurso = lerMapaBase64()
    .then((b64) => {
      mapaB64 = b64;
      for (const f of aoChegar) f(b64);
    })
    .catch((e) => {
      // Sem mapa local fica o das imagens: a app funciona exactamente
      // como funcionava antes de isto existir.
      console.warn('Mapa de Díli não carregou:', e?.message);
    })
    .finally(() => {
      leituraEmCurso = null;
    });
}

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
  const { tema } = useTema();
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);

  // Enquanto o mapa local não chega, desenha-se com as imagens da
  // internet. Quando chega, o HTML é refeito com ele lá dentro — uma vez
  // por sessão, porque a partir daí já está em memória.
  const [mapaLocal, setMapaLocal] = useState(mapaB64);
  useEffect(() => {
    if (mapaB64) return undefined;
    const f = (b64) => setMapaLocal(b64);
    aoChegar.add(f);
    pedirMapa();
    return () => aoChegar.delete(f);
  }, []);

  // O HTML NÃO depende do liveMarker: se dependesse, o mapa recarregava a
  // cada nova posição do motorista — a piscar de 12 em 12 segundos e a
  // perder o zoom que o utilizador tivesse feito. Em vez disso, injectamos
  // uma instrução no mapa já carregado, que apenas move o ícone.
  const html = useMemo(
    () => buildHtml({ center: c, markers, pickable, mapaLocal, tema }),
    [c.lat, c.lng, pickable, markersKey, mapaLocal, tema]
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
            if (d?.type === 'mapaOffline') {
              // Sem isto, uma falha do mapa local era invisível: ficava a
              // camada de imagens e ninguém saberia porquê.
              console.log(
                `Mapa de Díli: ${d.ok ? 'activo' : 'falhou'}` +
                  (d.bytes ? ` · ${Math.round(d.bytes / 1024)} KB` : '') +
                  (d.pedidos != null ? ` · ${d.pedidos} pedidos de mosaico` : '') +
                  (d.erro ? ` · ${d.erro}` : '')
              );
            } else if (d?.type === 'route' && onRoute) onRoute({ km: d.km });
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

function buildHtml({ center, markers, pickable, mapaLocal, tema }) {
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
/* Pinos desenhados em CSS.
   O marcador por omissão do Leaflet é um <img> que aponta para
   marker-icon.png. Quando o Leaflet vinha do unpkg, ele deduzia esse
   caminho a partir do URL do próprio script; embutido na aplicação não há
   URL nenhum de onde deduzir, e o que aparecia era a imagem partida com o
   texto alternativo "Marker" por baixo.
   Uma gota feita com bordas arredondadas e uma rotação não precisa de
   ficheiro nenhum — funciona sem rede, que é o objectivo. */
.pino{
  width:20px; height:20px; border-radius:50% 50% 50% 0;
  transform:rotate(-45deg); border:2.5px solid #FFF;
  box-shadow:0 2px 5px rgba(0,0,0,.35);
}
.pino.origem{ background:#0E5C54; }
.pino.destino{ background:#E85531; }
/* Atribuição.
   Os dados do mapa são do OpenStreetMap sob a licença ODbL, que EXIGE
   atribuição visível — não é uma cortesia. O controlo do Leaflet está
   desligado porque ocupa espaço e não segue o desenho da aplicação, por
   isso a atribuição é feita aqui: pequena, discreta, e sempre presente. */
/* Painel de diagnóstico do mapa local. Existe SÓ para esta experiência:
   diz em que ponto a coisa parou, para deixarmos de adivinhar a partir
   de um ecrã cinzento. Sai quando soubermos a resposta. */
.aviso{
  position:absolute; left:0; bottom:0; z-index:901;
  color:#fff; font:600 10px/1.45 ui-monospace,Menlo,monospace;
  padding:4px 8px; border-radius:0 6px 0 0; max-width:88%;
  background:rgba(192,57,43,.94);
}
.aviso.bom{ background:rgba(14,92,84,.94); }
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
<script>${PROTOMAPS_JS}</script>
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
  // --- Mapa de Díli guardado no telemóvel -------------------------------
  //
  // Os bytes vêm dentro deste HTML, em base64. Não é elegante, mas é o
  // único canal fiável: o injectJavaScript e o postMessage passam ambos
  // pelo evaluateJavascript do Android, que serve para executar código e
  // não para transportar megabytes — e o que falhava falhava em silêncio.
  //
  // O leitor PMTiles pede intervalos de bytes por fetch(). Como o
  // ficheiro não está em servidor nenhum, o fetch é interceptado: um
  // endereço combinado devolve fatias do que está em memória.
  var LOCAL = 'https://mapa.local/dili.pmtiles';
  var MAPA_B64 = ${JSON.stringify(mapaLocal || '')};

  function aviso(txt, bom){
    var d = document.getElementById('avisoMapa');
    if (!d) { d = document.createElement('div'); d.id='avisoMapa'; document.body.appendChild(d); }
    d.className = 'aviso' + (bom ? ' bom' : '');
    d.textContent = txt;
  }
  // Enquanto nada acontecer, o painel diz que está à espera. Um painel em
  // branco seria mais um ecrã sem informação, que é o problema a resolver.
  aviso('mapa local: sem dados no HTML');

  var camadaOffline = null;
  if (MAPA_B64) {
    try {
      var bin = atob(MAPA_B64);
      var _bytes = new Uint8Array(bin.length);
      for (var bi = 0; bi < bin.length; bi++) _bytes[bi] = bin.charCodeAt(bi);

      var assinatura = String.fromCharCode.apply(null, _bytes.subarray(0,7));
      if (assinatura !== 'PMTiles') throw new Error('assinatura ' + assinatura);

      var pedidos = 0;
      var fetchOriginal = window.fetch.bind(window);
      window.fetch = function(recurso, opcoes){
        var endereco = (typeof recurso === 'string') ? recurso : (recurso && recurso.url);
        if (endereco !== LOCAL) return fetchOriginal.apply(null, arguments);
        pedidos++;
        var cab = (opcoes && opcoes.headers) || {};
        var intervalo = cab.Range || cab.range ||
          (typeof cab.get === 'function' ? cab.get('Range') : null);
        var ini = 0, fim = _bytes.length - 1;
        if (intervalo) {
          var mm = /bytes=(\d+)-(\d*)/.exec(intervalo);
          if (mm) { ini = parseInt(mm[1],10); if (mm[2]) fim = parseInt(mm[2],10); }
        }
        if (fim >= _bytes.length) fim = _bytes.length - 1;
        var fatia = _bytes.subarray(ini, fim + 1);
        return Promise.resolve(new Response(fatia, {
          status: intervalo ? 206 : 200,
          headers: { 'Content-Range': 'bytes ' + ini + '-' + fim + '/' + _bytes.length }
        }));
      };

      camadaOffline = protomapsL.leafletLayer({
        url: LOCAL,
        flavor: ${JSON.stringify(tema === 'escuro' ? 'dark' : 'light')},
        // O ficheiro tem dados até ao zoom 15. Sem isto, acima de 15 o
        // mapa ficava em branco em vez de ampliar o que já tem — e é
        // acima de 15 que se encontra um carro numa rua.
        maxDataZoom: 15,
        attribution: '© OpenStreetMap'
      });
      camadaOffline.addTo(map);

      // Diagnóstico: sem isto, uma falha a desenhar é indistinguível de
      // uma falha a carregar, e as duas mostram o mesmo cinzento.
      aviso(Math.round(_bytes.length/1024) + ' KB lidos · a pedir mosaicos…', true);

      // A medição que separa as duas hipóteses que restam: se as telas
      // têm pixéis pintados, o problema é de POSIÇÃO (desenha-se fora do
      // sítio); se estão vazias, é de DESENHO (os dados não viram formas).
      function pintados(){
        var cs = document.querySelectorAll('#map canvas');
        var comTinta = 0, dim = '';
        for (var i = 0; i < cs.length; i++) {
          var cv = cs[i];
          if (!dim) dim = cv.width + 'x' + cv.height;
          try {
            var ctx = cv.getContext('2d');
            if (!ctx || !cv.width || !cv.height) continue;
            var d = ctx.getImageData(0, 0, cv.width, cv.height).data;
            // Basta um pixel não transparente para a tela contar.
            for (var k = 3; k < d.length; k += 4000) { if (d[k] !== 0) { comTinta++; break; } }
          } catch (e) { /* tela protegida — conta como desconhecida */ }
        }
        return { total: cs.length, comTinta: comTinta, dim: dim };
      }

      [1500, 4000, 9000].forEach(function(quando){
        setTimeout(function(){
          var t = pintados();
          var regras = (camadaOffline && camadaOffline.paintRules || []).length;
          aviso(Math.round(_bytes.length/1024) + 'KB ' + pedidos + 'ped ' +
                t.comTinta + '/' + t.total + 'telas ' + (t.dim || '?') +
                ' r' + regras + ' z' + map.getZoom(), t.comTinta > 0);
          send({ type:'mapaOffline', ok:true, bytes:_bytes.length, pedidos:pedidos,
                 telas:t.total, comTinta:t.comTinta, dim:t.dim, regras:regras });
        }, quando);
      });
    } catch (e) {
      var msg = String(e && e.message || e);
      aviso('ERRO: ' + msg);
      send({ type:'mapaOffline', ok:false, erro:msg });
      camadaOffline = null;
    }
  }

  // Camada de imagens: é o que se vê enquanto o mapa local não chega, e o
  // que fica se ele falhar. Nunca deixar o utilizador sem mapa nenhum.
  var camadaImagens = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18, keepBuffer:0, updateWhenIdle:true, updateWhenZooming:false,
    crossOrigin:true
  });
  // A camada de imagens só é dispensada se a vectorial existir. Um mapa
  // cinzento é pior do que um mapa que gasta dados.
  if (!camadaOffline) camadaImagens.addTo(map);
  var pts = ${JSON.stringify(pts)};
  function pino(tipo){
    return L.divIcon({
      html: '<div class="pino ' + tipo + '"></div>',
      className: '', iconSize: [20,20],
      // A ponta tem de assentar na coordenada, não o centro do desenho.
      // Depois de rodar 45°, o canto agudo desce para 10 + 10·√2 ≈ 24 px
      // — quatro pixéis abaixo da caixa de 20. Ancorar em 20 punha o pino
      // quatro pixéis acima do sítio real, que em zoom alto é meia rua.
      iconAnchor: [10,24]
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
        permanent: true, direction: 'top', offset: [0,-22],
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
