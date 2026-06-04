import React from 'react';
import Svg, { Path, Rect, Circle, G, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';

export default function BusHero({ width = 240, height = 160 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 240 160" fill="none">
      <Defs>
        <LinearGradient id="busBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB97A" />
          <Stop offset="1" stopColor="#FF8A3D" />
        </LinearGradient>
        <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F1E9DC" />
          <Stop offset="1" stopColor="#FAF7F2" />
        </LinearGradient>
      </Defs>

      {/* ground */}
      <Ellipse cx="120" cy="140" rx="100" ry="10" fill="url(#ground)" />

      {/* clouds */}
      <Circle cx="40" cy="30" r="10" fill="#FFFFFF" />
      <Circle cx="52" cy="28" r="12" fill="#FFFFFF" />
      <Circle cx="200" cy="22" r="8" fill="#FFFFFF" />
      <Circle cx="210" cy="20" r="10" fill="#FFFFFF" />

      {/* bus shadow */}
      <Ellipse cx="120" cy="130" rx="78" ry="6" fill="#1F2433" opacity="0.08" />

      {/* bus body */}
      <Rect x="42" y="55" width="156" height="68" rx="14" fill="url(#busBody)" />
      {/* roof line */}
      <Rect x="48" y="55" width="144" height="6" rx="3" fill="#E8702A" opacity="0.5" />

      {/* windows */}
      <Rect x="56" y="68" width="26" height="22" rx="5" fill="#E8F0FE" />
      <Rect x="86" y="68" width="26" height="22" rx="5" fill="#E8F0FE" />
      <Rect x="116" y="68" width="26" height="22" rx="5" fill="#E8F0FE" />
      <Rect x="146" y="68" width="26" height="22" rx="5" fill="#E8F0FE" />
      <Rect x="176" y="68" width="16" height="22" rx="4" fill="#4F8EF7" opacity="0.6" />

      {/* door */}
      <Rect x="52" y="95" width="14" height="26" rx="3" fill="#E8702A" opacity="0.6" />

      {/* side stripe */}
      <Rect x="48" y="105" width="148" height="4" rx="2" fill="#FFFFFF" opacity="0.8" />

      {/* headlight */}
      <Circle cx="193" cy="108" r="3" fill="#FFF4DA" />

      {/* wheels */}
      <Circle cx="72" cy="125" r="11" fill="#1F2433" />
      <Circle cx="72" cy="125" r="5" fill="#6B7280" />
      <Circle cx="172" cy="125" r="11" fill="#1F2433" />
      <Circle cx="172" cy="125" r="5" fill="#6B7280" />

      {/* location pin floating above */}
      <G>
        <Path
          d="M120 18 C113 18 108 23 108 30 C108 38 120 50 120 50 C120 50 132 38 132 30 C132 23 127 18 120 18 Z"
          fill="#4F8EF7"
        />
        <Circle cx="120" cy="30" r="4" fill="#FFFFFF" />
      </G>
    </Svg>
  );
}
