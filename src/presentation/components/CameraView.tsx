import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import { StickFigurePose } from './StickFigurePose';

interface Props {
  label: string;
  sublabel: string;
  fps: number;
  latencyMs?: number;
  showPose?: boolean;
  compact?: boolean;
}

export function CameraView({ label, sublabel, fps, latencyMs, showPose, compact }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);

  return (
    <View style={[s.container, compact && s.compact]}>
      <View style={s.header}>
        <View style={s.headerL}>
          <View style={[s.dot, compact && s.dotOff]} />
          <Text style={s.camLabel}>{label}</Text>
          <Text style={s.sublabel}> · {sublabel}</Text>
        </View>
        <View style={s.headerR}>
          <Text style={s.fps}>{fps} fps</Text>
          {latencyMs !== undefined && (
            <View style={s.poseBadge}>
              <Text style={s.poseWord}>POSE</Text>
              <Text style={s.poseDash}> · </Text>
              <Text style={s.poseMs}>{latencyMs}ms</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.video}>
        {showPose ? (
          <StickFigurePose />
        ) : (
          <>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <Pattern id={`cv_${label}`} x="0" y="0" width="14" height="14"
                  patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <Line x1="0" y1="0" x2="0" y2="14" stroke="#1a1a1a" strokeWidth="0.8" />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="#0c0c0c" />
              <Rect width="100%" height="100%" fill={`url(#cv_${label})`} />
            </Svg>
            {compact && <Text style={s.noSignal}>SIN SEÑAL</Text>}
          </>
        )}
      </View>

      {!compact && (
        <View style={s.footer}>
          <Text style={s.footerTime}>00:01:01 · {fps}fps</Text>
          <Text style={s.footerLive}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  compact:   { flex: 0, height: 130 },
  header: {
    height: 30, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10,
  },
  headerL:   { flexDirection: 'row', alignItems: 'center' },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 7 },
  dotOff:    { backgroundColor: '#888' },
  camLabel:  { color: C.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sublabel:  { color: C.textMuted, fontSize: 11 },
  headerR:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fps:       { color: C.textMuted, fontSize: 10 },
  poseBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.greenDark + '44',
    borderWidth: 1, borderColor: C.greenDark,
    borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
  },
  poseWord:  { color: C.green, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  poseDash:  { color: C.textMuted, fontSize: 9 },
  poseMs:    { color: C.textMuted, fontSize: 9 },
  video: {
    flex: 1, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0e0e0e',
  },
  noSignal: { color: C.textDim, fontSize: 10, letterSpacing: 1, position: 'absolute' },
  footer: {
    height: 22, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10,
  },
  footerTime: { color: C.textMuted, fontSize: 9 },
  footerLive: { color: C.live, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
