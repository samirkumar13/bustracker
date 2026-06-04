import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api, { routeAPI } from '../services/api';
import { colors, spacing, font, radius, shadow } from '../theme/theme';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Icon from '../components/Icon';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [saving, setSaving] = useState(false);

  const [children, setChildren] = useState([]);
  const [childEmail, setChildEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const isStudent = user?.role === 'STUDENT';
  const isParent = user?.role === 'PARENT';

  useEffect(() => {
    if (isStudent) routeAPI.getAll().then(({ data }) => setRoutes(data));
    if (isParent) loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const { data } = await api.get('/users/my-children');
      setChildren(data);
    } catch {}
  }

  async function linkChild() {
    if (!childEmail.trim()) return;
    setLinking(true);
    try {
      const { data } = await api.post('/users/link-child', { studentEmail: childEmail.trim() });
      Alert.alert('Linked', `${data.studentName} is now linked to your account.`);
      setChildEmail('');
      loadChildren();
    } catch (err) {
      Alert.alert('Could not link', err.response?.data?.error || 'Try again.');
    } finally { setLinking(false); }
  }

  async function onRouteSelect(route) {
    setSelectedRoute(route);
    setSelectedStop(null);
    const { data } = await api.get(`/stops/route/${route.id}`);
    setStops(data);
  }

  async function saveAssignment() {
    if (!selectedRoute || !selectedStop) return Alert.alert('Pick both', 'Please select a route and stop.');
    setSaving(true);
    try {
      await api.put(`/users/${user.id}/student-assignment`, {
        routeId: selectedRoute.id,
        stopId: selectedStop.id,
      });
      Alert.alert('Saved', `You're assigned to ${selectedStop.name}.`);
    } catch {
      Alert.alert('Error', 'Could not save assignment.');
    } finally { setSaving(false); }
  }

  function confirmLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Icon name="shield" size={11} color={colors.primaryDeep} />
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {/* PARENT: children + link */}
      {isParent && (
        <Card style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}><Icon name="users" size={16} color={colors.primaryDeep} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>My children</Text>
              <Text style={styles.sectionSub}>Link your child's account to receive bus alerts.</Text>
            </View>
          </View>

          {children.length > 0 && children.map((c) => (
            <View key={c.id} style={styles.childCard}>
              <View style={styles.childAvatar}>
                <Text style={styles.childInitial}>{c.user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{c.user.name}</Text>
                <Text style={styles.childMeta} numberOfLines={1}>
                  {(c.route?.name ?? 'No route')} · {(c.stop?.name ?? 'No stop')}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.linkRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="student@email.com"
                icon="mail"
                value={childEmail}
                onChangeText={setChildEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ marginBottom: 0 }}
              />
            </View>
            <Button label="Link" onPress={linkChild} loading={linking} size="md" icon="link" style={{ marginLeft: 10 }} />
          </View>
        </Card>
      )}

      {/* STUDENT: route + stop */}
      {isStudent && (
        <Card style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}><Icon name="map-pin" size={16} color={colors.primaryDeep} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>My bus stop</Text>
              <Text style={styles.sectionSub}>Select your route and pickup stop.</Text>
            </View>
          </View>

          <Text style={styles.label}>Route</Text>
          {routes.map((r) => {
            const active = selectedRoute?.id === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.9}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => onRouteSelect(r)}
              >
                <Icon name="map" size={16} color={active ? colors.primaryDeep : colors.textMuted} />
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{r.name}</Text>
                {active && <Icon name="check" size={16} color={colors.primaryDeep} />}
              </TouchableOpacity>
            );
          })}

          {stops.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: spacing.lg }]}>Pickup stop</Text>
              {stops.map((s) => {
                const active = selectedStop?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.9}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => setSelectedStop(s)}
                  >
                    <View style={styles.stopNum}><Text style={styles.stopNumText}>{s.order}</Text></View>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{s.name}</Text>
                    {active && <Icon name="check" size={16} color={colors.primaryDeep} />}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {selectedRoute && selectedStop && (
            <Button label="Save assignment" onPress={saveAssignment} loading={saving} icon="check" style={{ marginTop: spacing.md }} />
          )}
        </Card>
      )}

      {/* Account */}
      <Card style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}><Icon name="settings" size={16} color={colors.primaryDeep} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.sectionSub}>Sign out of this device.</Text>
          </View>
        </View>
        <Button label="Log out" onPress={confirmLogout} variant="outlineDanger" icon="log-out" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.primary, padding: spacing.xxl, paddingTop: 64, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { fontSize: 30, color: '#fff', fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  roleBadge: { marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, gap: 6 },
  roleText: { color: colors.primaryDeep, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  section: { margin: spacing.lg, marginBottom: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },

  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 10, gap: 12 },
  childAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  childInitial: { color: '#fff', fontWeight: '800', fontSize: 14 },
  childName: { fontSize: 14, fontWeight: '700', color: colors.text },
  childMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  option: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, marginBottom: 8, backgroundColor: colors.surface, gap: 10 },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  optionTextActive: { color: colors.primaryDeep, fontWeight: '700' },
  stopNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
});
