import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/theme';
import Icon from './Icon';

export default function Input({ label, icon, iconSet = 'feather', style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, focused && styles.focused]}>
        {icon ? <Icon name={icon} set={iconSet} size={18} color={focused ? colors.primary : colors.textFaint} style={{ marginRight: 10 }} /> : null}
        <TextInput
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6, letterSpacing: 0.3 },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  focused: { borderColor: colors.primary, backgroundColor: '#fff' },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0, margin: 0 },
});
