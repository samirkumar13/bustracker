import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity,
} from 'react-native';
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, font, radius } from '../theme/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import Icon from '../components/Icon';

const ROLES = [
  { key: 'PARENT',  label: 'Parent',  icon: 'users',     desc: 'Track my child' },
  { key: 'STUDENT', label: 'Student', icon: 'book-open', desc: 'I ride the bus' },
];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'PARENT' });
  const [loading, setLoading] = useState(false);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      return Alert.alert('Missing info', 'Name, email and password are required.');
    }
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      await AsyncStorage.setItem('token', data.token);
      await login(form.email, form.password);
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.error || 'Try again.');
    } finally { setLoading(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
        <Icon name="chevron-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join your school's bus tracker in seconds.</Text>

      <Text style={styles.section}>I am a</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => {
          const active = form.role === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              activeOpacity={0.9}
              style={[styles.roleCard, active && styles.roleActive]}
              onPress={() => set('role', r.key)}
            >
              <View style={[styles.roleIcon, active && { backgroundColor: '#fff' }]}>
                <Icon name={r.icon} size={20} color={active ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.roleLabel, active && { color: '#fff' }]}>{r.label}</Text>
              <Text style={[styles.roleDesc, active && { color: 'rgba(255,255,255,0.85)' }]}>{r.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input label="Full name" icon="user" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Jane Smith" />
      <Input label="Email" icon="mail" value={form.email} onChangeText={(v) => set('email', v)} placeholder="you@school.com" keyboardType="email-address" autoCapitalize="none" />
      <Input label="Password" icon="lock" value={form.password} onChangeText={(v) => set('password', v)} placeholder="At least 6 characters" secureTextEntry />
      <Input label="Phone (optional)" icon="phone" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+1 555 0100" keyboardType="phone-pad" />

      <Button label="Create account" onPress={handleRegister} loading={loading} size="lg" icon="user-plus" style={{ marginTop: 4 }} />

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.goBack()}>
        <Text style={styles.linkMuted}>Already a member? </Text>
        <Text style={styles.linkAccent}>Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: 60, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, marginBottom: spacing.lg,
  },
  title: { ...font.display, fontSize: 26 },
  subtitle: { ...font.small, marginTop: 6, marginBottom: spacing.xl, fontSize: 14 },
  section: { ...font.label, marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl },
  roleCard: {
    flex: 1, padding: 14, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  roleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleIcon: {
    width: 36, height: 36, borderRadius: 18, marginBottom: 10,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  roleLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  roleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  linkMuted: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
