import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { colors } from '../theme';

const base = (size, color) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
});

export function HomeIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 11l9-7 9 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v10h14V10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.8} />
      <Path d="M20 20l-3.2-3.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color = colors.textMuted, filled = false }) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 20.5l-1.4-1.3C5.4 14.5 2.5 11.9 2.5 8.7 2.5 6.1 4.6 4 7.2 4c1.5 0 2.9.7 3.8 1.8C11.9 4.7 13.3 4 14.8 4 17.4 4 19.5 6.1 19.5 8.7c0 3.2-2.9 5.8-8.1 10.5L12 20.5z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 5h16v11H9l-4 3.5V16H4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function UserIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ size = 24, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ size = 26, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Polyline points="15 5 8 12 15 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ size = 18, color = colors.accentText }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3.2} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function CheckCircle({ size = 22, bg = colors.accent, mark = colors.accentText }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={11} fill={bg} />
      <Polyline points="7 12.5 10.5 16 17 8.5" stroke={mark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function CartIcon({ size = 22, color = colors.accentText }) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 7h12l-1.2 9.5a2 2 0 01-2 1.7H9.2a2 2 0 01-2-1.7L6 7z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 7a3 3 0 016 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ShareIcon({ size = 22, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={6} cy={12} r={2.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={17} cy={6} r={2.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={17} cy={18} r={2.4} stroke={color} strokeWidth={1.8} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function StarIcon({ size = 18, color = colors.accent }) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5z"
        fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
      <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SunIcon({ size = 22, color = colors.accent }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function LogoutIcon({ size = 22, color = colors.danger }) {
  return (
    <Svg {...base(size)}>
      <Path d="M14 4H6v16h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 12h9m0 0l-3-3m3 3l-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HelpIcon({ size = 22, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
      <Path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .8-1.5 1.2-1.5 2.3" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1} fill={color} />
    </Svg>
  );
}

export function DocIcon({ size = 22, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 3h7l4 4v14H7z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M14 3v4h4M10 12h6M10 16h6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronRight({ size = 22, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Polyline points="9 6 15 12 9 18" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function PhoneCallIcon({ size = 22, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 3h3l1.5 4.5L8 9.5a12 12 0 006.5 6.5l2-2.5L21 15v3a2 2 0 01-2.2 2A17 17 0 014 5.2 2 2 0 016 3z"
        stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

export function SendIcon({ size = 22, color = colors.accentText }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 12l16-7-7 16-2-6-7-3z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

export function ImageIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={5} width={18} height={14} rx={2.5} stroke={color} strokeWidth={1.7} />
      <Circle cx={8.5} cy={10} r={1.6} stroke={color} strokeWidth={1.4} />
      <Path d="M5 17l4.5-4 3 2.5L16 12l3 3.5" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function MoreIcon({ size = 24, color = colors.text }) {
  return (
    <Svg {...base(size)}>
      <Circle cx={5} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={19} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

// Заглушки-картинки товара (футболка / кроссовок)
export function TeeIcon({ size = 80, color = colors.textFaint, accent = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M35 22l-15 8 5 12 7-3v37h36V39l7 3 5-12-15-8-6 5h-13z"
        stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <Rect x={48} y={40} width={4} height={14} rx={2} fill={accent} />
    </Svg>
  );
}

export function SneakerIcon({ size = 80, color = colors.textFaint, accent = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M16 60c0-6 4-10 10-12l10-4 8 8 16 2c10 1 18 6 18 12v4H16z"
        stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <Rect x={47} y={45} width={4} height={12} rx={2} fill={accent} />
    </Svg>
  );
}


export function TrashIcon({ size = 20, color = colors.danger }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 7h16M9 7V4h6v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 7l1 12.5a2 2 0 002 2h5a2 2 0 002-2L17.5 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Иконка-сетка 2×2 для вкладки «Каталог»
export function GridIcon({ size = 24, color = colors.textMuted }) {
  return (
    <Svg {...base(size)}>
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={2} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={2} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={2} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={2} />
    </Svg>
  );
}