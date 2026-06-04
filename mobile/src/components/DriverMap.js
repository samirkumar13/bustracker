import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function DriverMap({ location, style }) {
  const webviewRef = useRef(null);

  useEffect(() => {
    if (!location || !webviewRef.current) return;
    webviewRef.current.injectJavaScript(`
      updatePosition(${location.lat}, ${location.lng});
      true;
    `);
  }, [location]);

  // Default to India (New Delhi) when no GPS fix yet.
  const initialLat = location?.lat ?? 28.6139;
  const initialLng = location?.lng ?? 77.2090;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${initialLat}, ${initialLng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const busIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;width:40px;height:40px;"><div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(34,197,94,0.25);animation:pulse 1.6s ease-out infinite;"></div><div style="position:relative;background:#22C55E;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(34,197,94,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;border-radius:50%;background:white;"></div></div></div><style>@keyframes pulse{0%{transform:scale(0.6);opacity:0.8}100%{transform:scale(1.5);opacity:0}}</style>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    let marker = L.marker([${initialLat}, ${initialLng}], { icon: busIcon })
      .addTo(map)
      .bindPopup('Your current location');

    const trail = [];
    let trailLine = null;

    function updatePosition(lat, lng) {
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);

      trail.push([lat, lng]);
      if (trail.length > 50) trail.shift();
      if (trailLine) map.removeLayer(trailLine);
      if (trail.length > 1) {
        trailLine = L.polyline(trail, { color: '#34a853', weight: 3, opacity: 0.5 }).addTo(map);
      }
    }
  </script>
</body>
</html>`;

  return (
    <WebView
      ref={webviewRef}
      source={{ html }}
      style={[styles.map, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
