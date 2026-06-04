import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/theme';

export default function Skeleton({ width = '100%', height = 16, style, br = radius.sm }) {
  const anim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skel,
        { width, height, borderRadius: br, opacity: anim },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Skeleton width={120} height={18} />
        <Skeleton width={180} height={13} style={{ marginTop: 10 }} />
        <Skeleton width={100} height={11} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={56} height={22} br={999} />
    </View>
  );
}

const styles = StyleSheet.create({
  skel: { backgroundColor: colors.surfaceAlt },
  card: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
});
