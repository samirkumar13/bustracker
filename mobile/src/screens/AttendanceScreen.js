import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/illustrations/EmptyState';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      let endpoint;
      if (user.role === 'STUDENT') {
        endpoint = `/attendance/student/${user.id}`;
      } else if (user.role === 'PARENT') {
        const { data: children } = await api.get('/users/my-children');
        if (!children.length) { setLoading(false); setRefreshing(false); return; }
        endpoint = `/attendance/student/${children[0].userId}`;
      } else {
        setLoading(false); return;
      }
      const { data } = await api.get(endpoint);
      setRecords(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    load();
    let socket;
    (async () => {
      socket = await connectSocket();
      socket.on(`attendance:${user.id}`, (event) => {
        setRecords((prev) => [{
          id: Date.now().toString(),
          status: event.status,
          timestamp: event.timestamp,
          student: { user: { name: event.studentName } },
        }, ...prev]);
      });
    })();
    return () => disconnectSocket();
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const boarded = records.filter((r) => r.status === 'BOARDED').length;
  const exited = records.length - boarded;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Attendance</Text>
        <Text style={styles.title}>Today's activity</Text>
        <Text style={styles.sub}>Live NFC scans from the bus reader appear here.</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Stat icon="log-in" tone="success" value={boarded} label="Boarded" />
        <Stat icon="log-out" tone="danger" value={exited} label="Exited" />
      </View>

      {/* Timeline */}
      <Text style={styles.timelineTitle}>Recent scans</Text>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {[1,2,3].map((i) => (
            <View key={i} style={styles.skelRow}>
              <Skeleton width={36} height={36} br={18} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width={140} height={14} />
                <Skeleton width={100} height={11} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState variant="attendance" />
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySub}>Records will appear when your child taps their NFC card on the bus reader.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const boarded = item.status === 'BOARDED';
            return (
              <View style={styles.row}>
                <View style={styles.timelineCol}>
                  <View style={[styles.dot, { backgroundColor: boarded ? colors.success : colors.danger }]}>
                    <Icon name={boarded ? 'log-in' : 'log-out'} size={14} color="#fff" />
                  </View>
                  {index !== records.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.cardWrap}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardStatus}>{boarded ? 'Boarded the bus' : 'Exited the bus'}</Text>
                    <View style={[styles.pill, { backgroundColor: boarded ? colors.successSoft : colors.dangerSoft }]}>
                      <Text style={[styles.pillText, { color: boarded ? '#0F9C50' : '#B82828' }]}>
                        {boarded ? 'IN' : 'OUT'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Icon name="clock" size={12} color={colors.textFaint} />
                    <Text style={styles.cardTime}>
                      {new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Stat({ icon, tone, value, label }) {
  const isSuccess = tone === 'success';
  const fg = isSuccess ? colors.success : colors.danger;
  const bg = isSuccess ? colors.successSoft : colors.dangerSoft;
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: bg }]}>
        <Icon name={icon} size={18} color={fg} />
      </View>
      <View style={{ marginLeft: 12 }}>
        <Text style={statStyles.value}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { ...font.h1, marginTop: 2 },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, gap: 12, marginTop: spacing.sm, marginBottom: spacing.lg },
  timelineTitle: { ...font.label, paddingHorizontal: spacing.xl, marginBottom: 12 },

  skelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  row: { flexDirection: 'row', marginBottom: 6 },
  timelineCol: { width: 36, alignItems: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  line: { flex: 1, width: 2, backgroundColor: colors.hairline, marginTop: 4 },
  cardWrap: {
    flex: 1, marginLeft: 12, marginBottom: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardStatus: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  cardTime: { fontSize: 12, color: colors.textMuted },

  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
});
