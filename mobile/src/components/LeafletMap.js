import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * LeafletMap — OpenStreetMap powered map component
 *
 * Props:
 *   busLocation : { lat, lng } | null  — live bus position
 *   stops       : [{ name, lat, lng }] — route stop markers
 *   style       : ViewStyle
 */
export default function LeafletMap({ busLocation, stops = [], style }) {
  const webviewRef = useRef(null);
  const readyRef = useRef(false);
  const pendingStopsRef = useRef(null);
  const pendingBusRef = useRef(null);

  const stopsJson = useMemo(() => JSON.stringify(stops), [stops]);

  // Push stop / route updates whenever they change.
  useEffect(() => {
    const js = `updateStops(${stopsJson}); true;`;
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(js);
    } else {
      pendingStopsRef.current = stopsJson;
    }
  }, [stopsJson]);

  // Push live bus location updates.
  useEffect(() => {
    if (!busLocation) return;
    const js = `updateBus(${busLocation.lat}, ${busLocation.lng}); true;`;
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(js);
    } else {
      pendingBusRef.current = busLocation;
    }
  }, [busLocation?.lat, busLocation?.lng]);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #FAF7F2; }
    .leaflet-popup-content-wrapper {
      border-radius: 12px; box-shadow: 0 8px 24px rgba(31,36,51,0.18);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .leaflet-popup-content { margin: 10px 14px; font-size: 13px; color: #1F2433; }
    .leaflet-popup-tip { box-shadow: 0 4px 8px rgba(31,36,51,0.1); }
    @keyframes pulse { 0% { transform: scale(0.6); opacity: 0.8 } 100% { transform: scale(1.6); opacity: 0 } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initial center: bus location > first stop > world view
    const _stops = ${stopsJson};
    const _busLat = ${busLocation ? busLocation.lat : 'null'};
    const _busLng = ${busLocation ? busLocation.lng : 'null'};
    const _initLat = _busLat ?? (_stops[0]?.lat ?? 20);
    const _initLng = _busLng ?? (_stops[0]?.lng ?? 78);
    const _initZoom = (_busLat || _stops.length) ? 13 : 4;
    const map = L.map('map', { zoomControl: true }).setView([_initLat, _initLng], _initZoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
    }).addTo(map);

    const busIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;width:36px;height:36px;"><div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(255,138,61,0.3);animation:pulse 1.6s ease-out infinite;"></div><div style="position:relative;background:#FF8A3D;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(232,112,42,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;border-radius:50%;background:white;"></div></div></div>',
      iconSize: [36, 36], iconAnchor: [18, 18],
    });

    const stopIcon = L.divIcon({
      className: '',
      html: '<div style="background:#4F8EF7;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(31,36,51,0.25);"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11],
    });

    let stopLayer = L.layerGroup().addTo(map);
    let routeLine = null;
    let busMarker = null;

    function updateStops(stops) {
      stopLayer.clearLayers();
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

      const coords = [];
      stops.forEach((s, i) => {
        coords.push([s.lat, s.lng]);
        L.marker([s.lat, s.lng], { icon: stopIcon })
          .addTo(stopLayer)
          .bindPopup('<b>Stop ' + (i + 1) + '</b><br/>' + s.name);
      });

      if (coords.length > 1) {
        routeLine = L.polyline(coords, {
          color: '#FF8A3D', weight: 4, opacity: 0.85, dashArray: '8,6', lineCap: 'round',
        }).addTo(map);
      }

      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        if (busMarker) bounds.extend(busMarker.getLatLng());
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    }

    function updateBus(lat, lng) {
      if (!busMarker) {
        busMarker = L.marker([lat, lng], { icon: busIcon }).addTo(map).bindPopup('<b>Bus</b><br/>Live tracking');
      } else {
        busMarker.setLatLng([lat, lng]);
      }
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }

    // Initial paint
    updateStops(${stopsJson});
    ${busLocation ? `updateBus(${busLocation.lat}, ${busLocation.lng});` : ''}

    // Tell RN we're ready for live updates
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
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
      startInLoadingState
      onMessage={(e) => {
        if (e.nativeEvent.data !== 'ready') return;
        readyRef.current = true;
        if (pendingStopsRef.current && webviewRef.current) {
          webviewRef.current.injectJavaScript(`updateStops(${pendingStopsRef.current}); true;`);
          pendingStopsRef.current = null;
        }
        if (pendingBusRef.current && webviewRef.current) {
          const { lat, lng } = pendingBusRef.current;
          webviewRef.current.injectJavaScript(`updateBus(${lat}, ${lng}); true;`);
          pendingBusRef.current = null;
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
