import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import DriverMap from '../components/DriverMap';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { busAPI } from '../services/api';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import EmptyState from '../components/illustrations/EmptyState';

export default function DriverScreen() {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [busId, setBusId] = useState(null);
  const [busPlate, setBusPlate] = useState('');
  const [loading, setLoading] = useState(true);
  const watchRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await busAPI.getAll();
        const myBus = data.find((b) => b.driver?.userId === user?.id);
        if (myBus) { setBusId(myBus.id); setBusPlate(myBus.plateNumber); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function startTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Location access is required to broadcast your bus position.');

    const socket = await connectSocket();
    socket.emit('driver:start', { busId });

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
      (loc) => {
        const { latitude: lat, longitude: lng, speed } = loc.coords;
        setLocation({ lat, lng });
        socket.emit('driver:location', { busId, lat, lng, speed });
      }
    );
    setIsTracking(true);
  }

  function stopTracking() {
    watchRef.current?.remove();
    getSocket()?.emit('driver:stop', { busId });
    disconnectSocket();
    setIsTracking(false);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!busId) {
    return (
      <View style={styles.center}>
        <EmptyState variant="noBus" />
        <Text style={styles.nobus}>No bus assigned</Text>
        <Text style={styles.noBusSub}>Contact your school admin to get assigned to a bus before starting a trip.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DriverMap location={location} style={styles.map} />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Driver mode</Text>
            <Text style={styles.title}>Bus {busPlate}</Text>
          </View>
          <Badge label={isTracking ? 'Broadcasting' : 'Idle'} tone={isTracking ? 'success' : 'neutral'} pulse={isTracking} />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoChip}>
            <Icon name={isTracking ? 'radio' : 'pause-circle'} size={14} color={colors.primaryDeep} />
            <Text style={styles.infoText}>
              {isTracking ? 'Sharing live location every 3s' : 'Tap Start Trip when you\'re ready to drive'}
            </Text>
          </View>
        </View>

        <Button
          label={isTracking ? 'Stop Trip' : 'Start Trip'}
          icon={isTracking ? 'square' : 'play'}
          variant={isTracking ? 'danger' : 'success'}
          size="lg"
          onPress={isTracking ? stopTracking : startTracking}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg },
  nobus: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  noBusSub: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  panel: {
    backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.xl,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow.sheet,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.hairline, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { ...font.h1, fontSize: 22, marginTop: 2 },
  infoRow: { marginTop: spacing.md },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, gap: 8,
  },
  infoText: { fontSize: 12, color: colors.primaryDeep, fontWeight: '600' },
});
