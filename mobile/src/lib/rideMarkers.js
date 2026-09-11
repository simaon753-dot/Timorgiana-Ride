// Constrói os marcadores do mapa a partir de uma viagem (origem + destino)
//
// E, quando as há, as PARAGENS PELO CAMINHO — que só existem no Carry.
// Entram pela ordem do percurso, entre a recolha e a entrega final: é assim
// que o motorista lê o mapa de cima para baixo e percebe o trabalho todo
// antes de aceitar.
export function rideMarkers(ride) {
  const m = [];
  if (ride?.originLat != null && ride?.originLng != null) {
    m.push({
      lat: ride.originLat,
      lng: ride.originLng,
      label: ride.originLabel || 'Origem',
      tipo: 'origem',
    });
  }
  // As paragens vêm do servidor já ordenadas (ORDER BY ordem). Confiar nessa
  // ordem e não reordenar aqui: a fila é do percurso, e há um só sítio onde
  // ela se decide.
  for (const p of ride?.destinos || []) {
    if (p?.lat == null || p?.lng == null) continue;
    m.push({
      lat: p.lat,
      lng: p.lng,
      label: p.label || 'Paragem',
      tipo: 'paragem',
    });
  }
  if (ride?.destLat != null && ride?.destLng != null) {
    m.push({
      lat: ride.destLat,
      lng: ride.destLng,
      label: ride.destLabel || 'Destino',
      tipo: 'destino',
    });
  }
  return m;
}
