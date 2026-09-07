import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

// Монограмма «A» ARVELL.
// Перекладина — галочка ✓ (символ проверки), геометрия снята
// попиксельно с макета:
//  • короткий отрезок отходит от левой ножки на ~32% высоты (снизу)
//    и идёт круто вниз-вправо;
//  • нижняя точка — почти по центру буквы, на ~13% высоты;
//  • длинный отрезок (в ~2 раза длиннее короткого) поднимается
//    вверх-вправо, пересекает правую ножку на ~54% высоты
//    и чуть выступает за неё.
// Единый вес обводки, скруглённые концы и стык.
export default function Logo({ size = 96, color = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* левая ножка */}
      <Path
        d="M23 88 L49 12"
        stroke={color}
        strokeWidth={7.5}
        strokeLinecap="round"
      />
      {/* правая ножка */}
      <Path
        d="M49 12 L77 88"
        stroke={color}
        strokeWidth={7.5}
        strokeLinecap="round"
      />
      {/* перекладина-галочка ✓ */}
      <Path
        d="M36 64 L45 78 L65 47"
        stroke={color}
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}