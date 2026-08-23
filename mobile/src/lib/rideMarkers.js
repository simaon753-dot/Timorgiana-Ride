// Constrói os marcadores do mapa a partir de uma viagem (origem + destino)
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
