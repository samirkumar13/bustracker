import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

const SETS = { feather: Feather, ion: Ionicons, mci: MaterialCommunityIcons };

export default function Icon({ name, set = 'feather', size = 20, color = colors.text, style }) {
  const Comp = SETS[set] || Feather;
  return <Comp name={name} size={size} color={color} style={style} />;
}
