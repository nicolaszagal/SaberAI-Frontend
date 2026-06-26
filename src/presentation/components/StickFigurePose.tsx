import React from 'react';
import Svg, { Circle, Line, G, Defs, Pattern, Rect } from 'react-native-svg';
import { useC } from '../context/ThemeContext';

const GREEN_POSE = {
  head:      { cx: 27, cy: 13, r: 4 },
  torso:     { x1: 27, y1: 17, x2: 27, y2: 34 },
  shoulders: { x1: 20, y1: 22, x2: 36, y2: 22 },
  uArmR:     { x1: 36, y1: 22, x2: 47, y2: 24 },
  lArmR:     { x1: 47, y1: 24, x2: 57, y2: 24 },
  weapon:    { x1: 57, y1: 24, x2: 71, y2: 24 },
  uArmL:     { x1: 20, y1: 22, x2: 13, y2: 28 },
  lArmL:     { x1: 13, y1: 28, x2:  9, y2: 34 },
  hips:      { x1: 22, y1: 34, x2: 32, y2: 34 },
  thighR:    { x1: 32, y1: 34, x2: 38, y2: 50 },
  shinR:     { x1: 38, y1: 50, x2: 43, y2: 64 },
  thighL:    { x1: 22, y1: 34, x2: 13, y2: 49 },
  shinL:     { x1: 13, y1: 49, x2:  9, y2: 60 },
};

const RED_POSE = {
  head:      { cx: 74, cy: 11, r: 4 },
  torso:     { x1: 74, y1: 15, x2: 74, y2: 34 },
  shoulders: { x1: 66, y1: 21, x2: 82, y2: 21 },
  uArmL:     { x1: 66, y1: 21, x2: 70, y2: 30 },
  lArmL:     { x1: 70, y1: 30, x2: 68, y2: 40 },
  uArmR:     { x1: 82, y1: 21, x2: 88, y2: 14 },
  lArmR:     { x1: 88, y1: 14, x2: 92, y2:  8 },
  hips:      { x1: 68, y1: 34, x2: 80, y2: 34 },
  thighR:    { x1: 80, y1: 34, x2: 86, y2: 50 },
  shinR:     { x1: 86, y1: 50, x2: 90, y2: 63 },
  thighL:    { x1: 68, y1: 34, x2: 62, y2: 50 },
  shinL:     { x1: 62, y1: 50, x2: 58, y2: 63 },
};

function Limb({ x1, y1, x2, y2, color }: { x1:number; y1:number; x2:number; y2:number; color:string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.8} strokeLinecap="round" />;
}

export function StickFigurePose() {
  const C = useC();

  return (
    <Svg
      width="100%" height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Defs>
        <Pattern id="sp" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="12" stroke="#1c1c1c" strokeWidth="0.7" />
        </Pattern>
      </Defs>
      <Rect width="100" height="100" fill="#0e0e0e" />
      <Rect width="100" height="100" fill="url(#sp)" />

      {/* Verde */}
      <G>
        <Circle {...GREEN_POSE.head} fill="none" stroke={C.green} strokeWidth={1.8} />
        {Object.entries(GREEN_POSE).filter(([k]) => k !== 'head' && k !== 'weapon').map(([k, v]) => (
          <Limb key={k} {...(v as any)} color={C.green} />
        ))}
        <Line {...GREEN_POSE.weapon} stroke={C.green} strokeWidth={0.9} strokeLinecap="round" />
      </G>

      {/* Rojo */}
      <G>
        <Circle {...RED_POSE.head} fill="none" stroke={C.red} strokeWidth={1.8} />
        {Object.entries(RED_POSE).filter(([k]) => k !== 'head').map(([k, v]) => (
          <Limb key={k} {...(v as any)} color={C.red} />
        ))}
      </G>

      {/* Punto de toque */}
      <Circle cx={71} cy={24} r={2.8} fill={C.orange} stroke="#fff" strokeWidth={0.5} />
      <Line x1={76} y1={21} x2={72} y2={24} stroke={C.red} strokeWidth={1} strokeLinecap="round" />
      <Line x1={76} y1={27} x2={72} y2={24} stroke={C.red} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}
