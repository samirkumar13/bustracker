import React from 'react';
import Svg, { Rect, Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';

// Generic friendly illustration for empty/placeholder states.
// variant: "attendance" | "noBus" | "noChildren"
export default function EmptyState({ width = 180, height = 140, variant = 'attendance' }) {
  if (variant === 'noBus') return <NoBus width={width} height={height} />;
  if (variant === 'noChildren') return <NoChildren width={width} height={height} />;
  return <Attendance width={width} height={height} />;
}

function Attendance({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 140" fill="none">
      <Defs>
        <LinearGradient id="clip" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE3CC" />
          <Stop offset="1" stopColor="#FFD0A8" />
        </LinearGradient>
      </Defs>
      <Rect x="40" y="20" width="100" height="110" rx="14" fill="url(#clip)" />
      <Rect x="62" y="10" width="56" height="20" rx="6" fill="#E8702A" />
      <Rect x="56" y="44" width="68" height="6" rx="3" fill="#FFFFFF" opacity="0.9" />
      <Rect x="56" y="60" width="48" height="6" rx="3" fill="#FFFFFF" opacity="0.7" />
      <Rect x="56" y="76" width="60" height="6" rx="3" fill="#FFFFFF" opacity="0.8" />
      <Rect x="56" y="92" width="40" height="6" rx="3" fill="#FFFFFF" opacity="0.7" />
      <Circle cx="135" cy="110" r="18" fill="#4F8EF7" />
      <Path d="M127 110 l6 6 l12 -12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function NoBus({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 140" fill="none">
      <Circle cx="90" cy="80" r="50" fill="#FFF2E6" />
      <Rect x="50" y="65" width="80" height="36" rx="8" fill="#FFB97A" />
      <Rect x="58" y="72" width="14" height="12" rx="2" fill="#E8F0FE" />
      <Rect x="76" y="72" width="14" height="12" rx="2" fill="#E8F0FE" />
      <Rect x="94" y="72" width="14" height="12" rx="2" fill="#E8F0FE" />
      <Rect x="112" y="72" width="14" height="12" rx="2" fill="#E8F0FE" />
      <Circle cx="65" cy="105" r="7" fill="#1F2433" />
      <Circle cx="115" cy="105" r="7" fill="#1F2433" />
      <Path d="M40 40 l100 80" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

function NoChildren({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 140" fill="none">
      <Circle cx="90" cy="75" r="50" fill="#E8F0FE" />
      <Circle cx="90" cy="60" r="14" fill="#4F8EF7" />
      <Path d="M64 105 C64 90 78 80 90 80 C102 80 116 90 116 105 Z" fill="#4F8EF7" />
      <Circle cx="135" cy="50" r="10" fill="#FF8A3D" />
      <Path d="M125 70 c0 -8 6 -14 10 -14 c4 0 10 6 10 14 z" fill="#FF8A3D" />
      <Circle cx="45" cy="50" r="10" fill="#22C55E" />
      <Path d="M35 70 c0 -8 6 -14 10 -14 c4 0 10 6 10 14 z" fill="#22C55E" />
    </Svg>
  );
}
