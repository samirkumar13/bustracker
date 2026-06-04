import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/theme';
import Icon from './Icon';

export default function ScreenHeader({ title, subtitle, right, onBack }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Icon name="chevron-left" color={colors.text} size={22} />
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={{ width: 36, alignItems: 'flex-end' }}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 50, paddingBottom: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
