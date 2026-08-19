import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius, spacing, fontSize } from '../theme.js';

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
}) {
  const c = center || markers[0] || DILI;
  const markersKey = JSON.stringify(markers);

  const html = useMemo(
    () => buildHtml({ center: c, markers, pickable }),
    [c.lat, c.lng, pickable, markersKey]
  );

  // O WebView não existe na versão web — mostrar um aviso simpático
  // em vez do erro vermelho do react-native-webview.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, styles.fallback, { height }]}>
        <Text style={styles.fallbackIcon}>🗺️</Text>
        <Text style={styles.fallbackText}>O mapa está disponível na app do telemóvel.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d && typeof d.lat === 'number' && onPick) onPick(d);
          } catch {
            /* ignora mensagens que não sejam coordenadas */
          }
        }}
        style={styles.web}
      />
    </View>
  );
}

function buildHtml({ center, markers, pickable }) {
  const pts = markers.map((m) => ({ lat: m.lat, lng: m.lng, label: m.label || '' }));
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e9e4db}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${center.lat},${center.lng}], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var pts = ${JSON.stringify(pts)};
  pts.forEach(function(p){ L.marker([p.lat,p.lng]).addTo(map).bindPopup(p.label); });
  if (pts.length > 1) { map.fitBounds(pts.map(function(p){return [p.lat,p.lng];}),{padding:[40,40]}); }
  else if (pts.length === 1) { map.setView([pts[0].lat,pts[0].lng], 15); }
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

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#e9e4db',
  },
  web: { flex: 1, backgroundColor: 'transparent' },
  fallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fallbackIcon: { fontSize: 32, marginBottom: spacing.sm },
  fallbackText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
});
