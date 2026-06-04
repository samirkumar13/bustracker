import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native';
import { busAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import Button from '../components/Button';
import Skeleton, { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/illustrations/EmptyState';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function fetchBuses() {
    setError('');
    try {
      const { data } = await busAPI.getAll();
      setBuses(data);
    } catch {
      setError('Could not load buses. Is the server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchBuses(); }, []);
  function onRefresh() { setRefreshing(true); fetchBuses(); }

  const liveCount = buses.filter(b => b.driver?.isActive).length;
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={logout} hitSlop={10}>
          <Icon name="log-out" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Hero summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Icon name="truck" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{loading ? '…' : `${buses.length} buses in your school`}</Text>
            <Text style={styles.summarySub}>
              {loading ? 'Loading status…' : `${liveCount} currently live • Pull down to refresh`}
            </Text>
          </View>
        </View>
      </View>

      {/* Section title */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Buses</Text>
        <Text style={styles.sectionHint}>Tap a bus to track</Text>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Icon name="alert-circle" size={36} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Retry" onPress={fetchBuses} icon="refresh-ccw" />
        </View>
      ) : loading ? (
        <View>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={buses}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState variant="noBus" />
              <Text style={styles.emptyTitle}>No buses yet</Text>
              <Text style={styles.emptySub}>Buses your school adds will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const live = item.driver?.isActive;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => navigation.navigate('BusTracking', { busId: item.id, plateNumber: item.plateNumber })}
              >
                <View style={[styles.busIcon, live && { backgroundColor: colors.primarySoft }]}>
                  <Icon name="truck" size={22} color={live ? colors.primaryDeep : colors.textMuted} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.plate}>{item.plateNumber}</Text>
                    <Badge label={live ? 'Live' : 'Offline'} tone={live ? 'success' : 'neutral'} pulse={live} />
                  </View>
                  <Text style={styles.route} numberOfLines={1}>
                    {item.route?.name ?? 'No route assigned'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="user" size={12} color={colors.textFaint} />
                    <Text style={styles.meta}>{item.driver?.user?.name ?? 'Unassigned'}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textFaint} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: spacing.md,
  },
  greeting: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  name: { ...font.h1, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
  },
  summary: {
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg,
    ...shadow.cta,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  summarySub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  sectionTitle: { ...font.h2 },
  sectionHint: { fontSize: 12, color: colors.textFaint },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  busIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plate: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  route: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  meta: { fontSize: 12, color: colors.textFaint, marginLeft: 4 },
  empty: { alignItems: 'center', paddingTop: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  errorWrap: { alignItems: 'center', padding: 32, gap: 12 },
  errorText: { color: colors.text, textAlign: 'center', fontSize: 14 },
});
