import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme/theme';

export default function Card({ children, onPress, style, padding = 16, elevated = true }) {
  const inner = (
    <View
      style={[
        styles.card,
        { padding, borderColor: colors.hairline },
        elevated && shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>{inner}</TouchableOpacity>
  ) : inner;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1 },
});
