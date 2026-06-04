import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/theme';

const TONES = {
  success: { bg: colors.successSoft, fg: '#0F9C50', dot: colors.success },
  danger:  { bg: colors.dangerSoft,  fg: '#B82828', dot: colors.danger },
  accent:  { bg: colors.accentSoft,  fg: '#1E5FCB', dot: colors.accent },
  neutral: { bg: colors.surfaceAlt,  fg: colors.textMuted, dot: colors.textFaint },
  warning: { bg: '#FFF4DA',          fg: '#B7791F', dot: colors.warning },
  primary: { bg: colors.primarySoft, fg: colors.primaryDeep, dot: colors.primary },
};

export default function Badge({ label, tone = 'neutral', pulse = false, dot = true, style }) {
  const t = TONES[tone] || TONES.neutral;
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {dot && (
        <Animated.View
          style={[styles.dot, { backgroundColor: t.dot, opacity: pulse ? anim : 1 }]}
        />
      )}
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
