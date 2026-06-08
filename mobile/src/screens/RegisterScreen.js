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

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'PARENT' });
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      return Alert.alert('Missing info', 'Name, email and password are required.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return Alert.alert('Invalid email', 'Please enter a valid email address.');
    }
    if (form.password.length < 6) {
      return Alert.alert('Weak password', 'Password must be at least 6 characters.');
    }
    if (!consent) {
      return Alert.alert('Consent required', 'Please accept the data privacy terms to continue.');
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
      <Text style={styles.subtitle}>Sign up as a parent to track your child's bus.</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Icon name="users" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Parent account</Text>
          <Text style={styles.infoDesc}>
            After signing up, link your child using the student code your school provides.
          </Text>
        </View>
      </View>

      <Input label="Full name" icon="user" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Jane Smith" />
      <Input label="Email" icon="mail" value={form.email} onChangeText={(v) => set('email', v)} placeholder="you@school.com" keyboardType="email-address" autoCapitalize="none" />
      <Input label="Password" icon="lock" value={form.password} onChangeText={(v) => set('password', v)} placeholder="At least 6 characters" secureTextEntry />
      <Input label="Phone (optional)" icon="phone" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+1 555 0100" keyboardType="phone-pad" />

      {/* Data privacy consent */}
      <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(v => !v)} activeOpacity={0.7}>
        <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
          {consent && <Icon name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.consentText}>
          I agree that BusTracker may collect my child's{' '}
          <Text style={styles.consentBold}>bus attendance records</Text> and the{' '}
          <Text style={styles.consentBold}>real-time GPS location</Text> of their school bus.
          Location data is retained for 90 days and is never sold or shared with third parties.
        </Text>
      </TouchableOpacity>

      <Button label="Create account" onPress={handleRegister} loading={loading} size="lg" icon="user-plus" style={{ marginTop: 4 }} disabled={!consent} />

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
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 14, marginBottom: spacing.xl,
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  infoDesc: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
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

  consentRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: spacing.lg, marginBottom: spacing.md,
    padding: 14, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  consentBold: { fontWeight: '700', color: colors.text },
});
