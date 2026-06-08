import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * LeafletMap — OpenStreetMap powered map component
 *
 * Props:
 *   busLocation : { lat, lng } | null  — live bus position
 *   stops       : [{ name, lat, lng }] — route stop markers
 *   etaList     : [{ name, status, etaMin }] — ETA annotations (same order as stops)
 *   style       : ViewStyle
 */
export default function LeafletMap({ busLocation, stops = [], etaList = [], style }) {
  const webviewRef = useRef(null);
  const readyRef = useRef(false);
  const pendingStopsRef = useRef(null);
  const pendingBusRef = useRef(null);

  const stopsJson = useMemo(() => JSON.stringify(stops), [stops]);
  const etaJson = useMemo(() => JSON.stringify(etaList), [etaList]);

  useEffect(() => {
    const js = `updateStops(${stopsJson}); true;`;
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(js);
    } else {
      pendingStopsRef.current = stopsJson;
    }
  }, [stopsJson]);

  useEffect(() => {
    if (!busLocation) return;
    const js = `updateBus(${busLocation.lat}, ${busLocation.lng}); true;`;
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(js);
    } else {
      pendingBusRef.current = busLocation;
    }
  }, [busLocation?.lat, busLocation?.lng]);

  // Inject ETA updates whenever they change (updates popup content + dot colour).
  useEffect(() => {
    if (!etaList.length) return;
    const js = `updateEtas(${etaJson}); true;`;
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(js);
    }
  }, [etaJson]);

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
    var _stops = ${stopsJson};
    var _busLat = ${busLocation ? busLocation.lat : 'null'};
    var _busLng = ${busLocation ? busLocation.lng : 'null'};
    var _initLat = _busLat != null ? _busLat : (_stops[0] ? _stops[0].lat : 20);
    var _initLng = _busLng != null ? _busLng : (_stops[0] ? _stops[0].lng : 78);
    var _initZoom = (_busLat != null || _stops.length) ? 13 : 4;
    var map = L.map('map', { zoomControl: true }).setView([_initLat, _initLng], _initZoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19,
    }).addTo(map);

    var busIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;width:40px;height:40px;"><div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(255,138,61,0.3);animation:pulse 1.6s ease-out infinite;"></div><div style="position:relative;background:#FF8A3D;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(232,112,42,0.45);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;">🚌</div></div>',
      iconSize: [40, 40], iconAnchor: [20, 20],
    });

    function makeStopIcon(status) {
      var bg = status === 'passed' ? '#D1D5DB'
        : status === 'arriving' ? '#22C55E'
        : status === 'next' ? '#FF8A3D'
        : '#4F8EF7';
      return L.divIcon({
        className: '',
        html: '<div style="background:' + bg + ';width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(31,36,51,0.25);"></div>',
        iconSize: [22, 22], iconAnchor: [11, 11],
      });
    }

    var defaultStopIcon = makeStopIcon('default');
    var stopLayer = L.layerGroup().addTo(map);
    var routeLine = null;
    var busMarker = null;
    var stopMarkers = [];

    function popupHtml(index, name, status, etaMin) {
      var label = '';
      if (status === 'passed') {
        label = '<br><span style="color:#9CA3AF">Passed</span>';
      } else if (status === 'arriving') {
        label = '<br><span style="color:#16a34a;font-weight:700">Arriving now</span>';
      } else if (status === 'next' && etaMin != null) {
        label = '<br><span style="color:#E8702A;font-weight:700">Next · ' + etaMin + ' min</span>';
      } else if (etaMin != null) {
        label = '<br><span style="color:#6B7280">~' + etaMin + ' min</span>';
      }
      return '<b>Stop ' + (index + 1) + ' — ' + name + '</b>' + label;
    }

    function drawFallbackLine(coords) {
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
      routeLine = L.polyline(coords, {
        color: '#FF8A3D', weight: 4, opacity: 0.85, dashArray: '8,6', lineCap: 'round',
      }).addTo(map);
    }

    function updateStops(stops) {
      stopLayer.clearLayers();
      stopMarkers = [];
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

      var coords = [];
      stops.forEach(function(s, i) {
        coords.push([s.lat, s.lng]);
        var marker = L.marker([s.lat, s.lng], { icon: makeStopIcon(s.status || 'default') })
          .addTo(stopLayer)
          .bindPopup(popupHtml(i, s.name, s.status, s.etaMin));
        stopMarkers.push(marker);
      });

      if (coords.length > 0) {
        var bounds = L.latLngBounds(coords);
        if (busMarker) bounds.extend(busMarker.getLatLng());
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }

      if (coords.length > 1) {
        // Fetch real road path from OSRM
        var waypoints = stops.map(function(s) { return s.lng + ',' + s.lat; }).join(';');
        fetch('https://router.project-osrm.org/route/v1/driving/' + waypoints + '?overview=full&geometries=geojson')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
            if (data.code === 'Ok') {
              // OSRM returns [lng, lat] — flip to [lat, lng] for Leaflet
              var roadCoords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              routeLine = L.polyline(roadCoords, {
                color: '#FF8A3D', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round',
              }).addTo(map);
            } else {
              drawFallbackLine(coords);
            }
          })
          .catch(function() { drawFallbackLine(coords); });
      }
    }

    function updateBus(lat, lng) {
      if (!busMarker) {
        busMarker = L.marker([lat, lng], { icon: busIcon }).addTo(map).bindPopup('<b>Bus</b><br/>Live tracking');
        // Only set view on first placement — never again, let user control the map
        map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
      } else {
        busMarker.setLatLng([lat, lng]);
      }
    }

    function updateEtas(etaList) {
      etaList.forEach(function(eta, i) {
        if (!stopMarkers[i]) return;
        stopMarkers[i].setIcon(makeStopIcon(eta.status));
        stopMarkers[i].bindPopup(popupHtml(i, eta.name, eta.status, eta.etaMin));
      });
    }

    updateStops(${stopsJson});
    ${busLocation ? `updateBus(${busLocation.lat}, ${busLocation.lng});` : ''}

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
