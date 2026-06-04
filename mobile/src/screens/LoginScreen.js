import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, font } from '../theme/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import BusHero from '../components/illustrations/BusHero';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Missing info', 'Please enter your email and password.');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.error || 'Check your credentials and try again.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <BusHero width={240} height={160} />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Track your child's school bus in real time.</Text>

        <View style={styles.card}>
          <Input
            label="Email"
            icon="mail"
            placeholder="parent@school.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            icon="lock"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button label="Log in" onPress={handleLogin} loading={loading} size="lg" icon="arrow-right" />
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkMuted}>New here? </Text>
          <Text style={styles.linkAccent}>Create an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingTop: 60 },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  title: { ...font.display, textAlign: 'center' },
  subtitle: { ...font.small, textAlign: 'center', marginTop: 6, marginBottom: spacing.xxl, fontSize: 14 },
  card: { backgroundColor: 'transparent' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  linkMuted: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
