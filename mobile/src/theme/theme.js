export const colors = {
  primary: '#FF8A3D',
  primaryDeep: '#E8702A',
  primarySoft: '#FFF2E6',

  accent: '#4F8EF7',
  accentSoft: '#E8F0FE',

  success: '#22C55E',
  successSoft: '#E6F8EC',
  danger: '#EF4444',
  dangerSoft: '#FDECEC',
  warning: '#F59E0B',

  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F0E6',
  hairline: '#EEE5D7',
  divider: '#F0E8DA',

  text: '#1F2433',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  overlay: 'rgba(31,36,51,0.5)',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#8B6F47',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  cta: {
    shadowColor: '#E8702A',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

export const font = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, fontWeight: '500', color: colors.text },
  small: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
};

export default { colors, spacing, radius, shadow, font };
