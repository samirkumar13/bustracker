import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme/theme';
import Icon from './Icon';

export default function Button({
  label, onPress, loading, disabled,
  variant = 'primary', size = 'md',
  icon, iconSet = 'feather', style, textStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, paddingVertical: s.py, paddingHorizontal: s.px },
        variant === 'primary' && shadow.cta,
        isDisabled && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} set={iconSet} color={v.fg} size={s.icon} style={{ marginRight: 8 }} /> : null}
          <Text style={[{ color: v.fg, fontSize: s.font, fontWeight: '700' }, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const VARIANTS = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  accent: { bg: colors.accent, fg: '#fff', border: colors.accent },
  success: { bg: colors.success, fg: '#fff', border: colors.success },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
  outline: { bg: colors.surface, fg: colors.text, border: colors.hairline },
  outlineDanger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
};

const SIZES = {
  sm: { py: 10, px: 14, font: 13, icon: 16 },
  md: { py: 14, px: 18, font: 15, icon: 18 },
  lg: { py: 16, px: 22, font: 16, icon: 20 },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
