import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LeafletMap from '../components/LeafletMap';
import { connectSocket, disconnectSocket } from '../services/socket';
import { busAPI } from '../services/api';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Badge from '../components/Badge';
import Icon from '../components/Icon';

export default function BusTrackingScreen({ route }) {
  const { busId, plateNumber } = route.params;
  const [busData, setBusData] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let socket;
    async function init() {
      const { data } = await busAPI.getOne(busId);
      setBusData(data);
      if (data.locations?.[0]) {
        setBusLocation({ lat: data.locations[0].lat, lng: data.locations[0].lng });
      }
      setLoading(false);

      socket = await connectSocket();
      socket.emit('track:bus', { busId });
      socket.on('bus:active', ({ busId: id, active }) => { if (id === busId) setIsLive(active); });
      socket.on('bus:location', ({ busId: id, lat, lng }) => {
        if (id !== busId) return;
        setBusLocation({ lat, lng });
        setIsLive(true);
      });
    }
    init();
    return () => {
      socket?.emit('untrack:bus', { busId });
      disconnectSocket();
    };
  }, [busId]);

  const stops = busData?.route?.stops ?? [];

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading bus…</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LeafletMap busLocation={busLocation} stops={stops} style={styles.map} />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelEyebrow}>You're tracking</Text>
            <Text style={styles.panelTitle}>Bus {plateNumber}</Text>
            <Text style={styles.panelRoute} numberOfLines={1}>
              {busData?.route?.name ?? 'No route assigned'}
            </Text>
          </View>
          <Badge label={isLive ? 'Live' : 'Offline'} tone={isLive ? 'success' : 'neutral'} pulse={isLive} />
        </View>

        <View style={styles.statsRow}>
          <Stat icon="map-pin" value={stops.length} label="Stops" />
          <Stat icon="user" value={busData?.driver?.user?.name?.split(' ')[0] ?? '—'} label="Driver" />
          <Stat icon="users" value={busData?.capacity ?? '—'} label="Capacity" />
        </View>
      </View>
    </View>
  );
}

function Stat({ icon, value, label }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={14} color={colors.primaryDeep} />
      </View>
      <Text style={styles.statNum} numberOfLines={1}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  panel: {
    backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.xl,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow.sheet,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 5, borderRadius: 3,
    backgroundColor: colors.hairline, marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  panelEyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
  panelTitle: { ...font.h1, fontSize: 22, marginTop: 2 },
  panelRoute: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: spacing.lg, gap: 10 },
  stat: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: 12, alignItems: 'flex-start',
  },
  statIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statNum: { fontSize: 14, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
});
