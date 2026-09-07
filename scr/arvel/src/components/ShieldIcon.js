import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

export default function ShieldIcon({ size = 20, color = colors.accent, filled = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 12l2.3 2.3L15.5 9.5"
        stroke={filled ? colors.accentText : color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
