import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import LeafletMap from '../components/LeafletMap';
import { connectSocket, disconnectSocket } from '../services/socket';
import { busAPI } from '../services/api';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Badge from '../components/Badge';
import Icon from '../components/Icon';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Annotates each stop with { status, etaMin }.
// Nearest stop to bus = "next"; stops before it = "passed"; stops after = "upcoming".
function computeEtas(busLat, busLng, busSpeed, stops) {
  if (!stops.length) return stops;
  const kmh = busSpeed > 2 ? busSpeed : 20;

  let nearestIdx = 0;
  let minDist = Infinity;
  stops.forEach((s, i) => {
    const d = haversineKm(busLat, busLng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearestIdx = i; }
  });

  return stops.map((stop, i) => {
    if (i < nearestIdx) return { ...stop, status: 'passed', etaMin: null };

    let dist = haversineKm(busLat, busLng, stops[nearestIdx].lat, stops[nearestIdx].lng);
    for (let j = nearestIdx; j < i; j++) {
      dist += haversineKm(stops[j].lat, stops[j].lng, stops[j + 1].lat, stops[j + 1].lng);
    }

    if (dist < 0.1) return { ...stop, status: 'arriving', etaMin: 0 };
    const etaMin = Math.max(1, Math.round((dist / kmh) * 60));
    return { ...stop, status: i === nearestIdx ? 'next' : 'upcoming', etaMin };
  });
}

export default function BusTrackingScreen({ route }) {
  const { busId, plateNumber } = route.params;
  const [busData, setBusData] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [busSpeed, setBusSpeed] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let socket;
    async function init() {
      const { data } = await busAPI.getOne(busId);
      setBusData(data);
      const lastLoc = data.locations?.[0];
      if (lastLoc) {
        setBusLocation({ lat: lastLoc.lat, lng: lastLoc.lng });
        if (lastLoc.speed != null) setBusSpeed(lastLoc.speed);
      }
      setLoading(false);

      socket = await connectSocket();
      socket.emit('track:bus', { busId });
      socket.on('bus:active', ({ busId: id, active }) => { if (id === busId) setIsLive(active); });
      socket.on('bus:location', ({ busId: id, lat, lng, speed }) => {
        if (id !== busId) return;
        setBusLocation({ lat, lng });
        if (speed != null) setBusSpeed(speed);
        setIsLive(true);
      });
    }
    init();
    return () => {
      socket?.emit('untrack:bus', { busId });
      disconnectSocket();
    };
  }, [busId]);

  const stops = useMemo(() => busData?.route?.stops ?? [], [busData]);

  const stopsWithEta = useMemo(() => {
    if (!busLocation) return stops.map((s) => ({ ...s, status: null, etaMin: null }));
    return computeEtas(busLocation.lat, busLocation.lng, busSpeed, stops);
  }, [busLocation?.lat, busLocation?.lng, busSpeed, stops]);

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading bus…</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LeafletMap
        busLocation={busLocation}
        stops={stops}
        etaList={stopsWithEta}
        style={styles.map}
      />

      <View style={styles.panel}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>You're tracking</Text>
            <Text style={styles.title}>Bus {plateNumber}</Text>
            <Text style={styles.routeName} numberOfLines={1}>
              {busData?.route?.name ?? 'No route assigned'}
            </Text>
          </View>
          <Badge label={isLive ? 'Live' : 'Offline'} tone={isLive ? 'success' : 'neutral'} pulse={isLive} />
        </View>

        {stops.length > 0 ? (
          <ScrollView style={styles.stopScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {stopsWithEta.map((stop, index) => (
              <StopRow key={stop.id} stop={stop} isLast={index === stopsWithEta.length - 1} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noStopsRow}>
            <Icon name="map-pin" size={14} color={colors.textFaint} />
            <Text style={styles.noStopsText}>No stops on this route</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StopRow({ stop, isLast }) {
  const isPassed = stop.status === 'passed';
  const isNext = stop.status === 'next';
  const isArriving = stop.status === 'arriving';

  return (
    <View style={rowStyles.wrap}>
      <View style={rowStyles.timeline}>
        <View style={[
          rowStyles.dot,
          isPassed && rowStyles.dotPassed,
          (isNext || isArriving) && rowStyles.dotActive,
        ]} />
        {!isLast && <View style={[rowStyles.line, isPassed && rowStyles.linePassed]} />}
      </View>
      <View style={[rowStyles.content, isLast && { paddingBottom: 4 }]}>
        <Text style={[rowStyles.name, isPassed && rowStyles.namePassed]}>{stop.name}</Text>
        <EtaLabel stop={stop} />
      </View>
    </View>
  );
}

function EtaLabel({ stop }) {
  if (!stop.status) {
    return <Text style={etaS.muted}>Waiting for GPS…</Text>;
  }
  if (stop.status === 'passed') {
    return <Text style={etaS.muted}>Passed</Text>;
  }
  if (stop.status === 'arriving') {
    return (
      <View style={etaS.greenBadge}>
        <Text style={etaS.greenText}>Arriving now</Text>
      </View>
    );
  }
  if (stop.status === 'next') {
    return (
      <View style={etaS.orangeBadge}>
        <Text style={etaS.orangeText}>Next · {stop.etaMin} min</Text>
      </View>
    );
  }
  return <Text style={etaS.upcoming}>~{stop.etaMin} min</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  panel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 320,
    ...shadow.sheet,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 5, borderRadius: 3,
    backgroundColor: colors.hairline, marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { ...font.h1, fontSize: 22, marginTop: 2 },
  routeName: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  stopScroll: { flexGrow: 0 },
  noStopsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  noStopsText: { fontSize: 13, color: colors.textFaint },
});

const rowStyles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  timeline: { width: 26, alignItems: 'center' },
  dot: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2, borderColor: colors.primarySoft,
    marginTop: 3,
  },
  dotPassed: { backgroundColor: colors.hairline, borderColor: colors.hairline },
  dotActive: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.primary, borderColor: colors.primarySoft,
    marginTop: 1,
  },
  line: { width: 2, flex: 1, backgroundColor: colors.primary, opacity: 0.25, marginTop: 3 },
  linePassed: { backgroundColor: colors.hairline, opacity: 1 },
  content: { flex: 1, paddingBottom: 14, paddingLeft: 6 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text },
  namePassed: { color: colors.textFaint, fontWeight: '500' },
});

const etaS = StyleSheet.create({
  muted: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  upcoming: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  greenBadge: {
    marginTop: 3, alignSelf: 'flex-start',
    backgroundColor: colors.successSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  greenText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  orangeBadge: {
    marginTop: 3, alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  orangeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDeep },
});
