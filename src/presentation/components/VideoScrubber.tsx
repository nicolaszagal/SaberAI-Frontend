import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { SESSION } from '../../data/mock';

type Speed = '0.25' | '0.5' | '1';

export function VideoScrubber() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [speed, setSpeed] = useState<Speed>('1');
  const progress = SESSION.currentFrame / SESSION.totalFrames;

  return (
    <View style={s.bar}>
      <View style={s.controls}>
        {(['↺', '◀', '⏸', '▶'] as const).map((icon, i) => (
          <TouchableOpacity key={icon} style={[s.btn, i === 2 && s.btnMain]}>
            <Text style={[s.btnIcon, i === 2 && s.btnIconMain]}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.frame}>
        FRAME{' '}
        <Text style={s.frameNum}>{String(SESSION.currentFrame).padStart(4, '0')}</Text>
        <Text style={s.frameOf}> / {SESSION.totalFrames}</Text>
      </Text>

      <View style={s.scrubWrap}>
        <View style={s.track}>
          <View style={[s.fill, { width: `${progress * 100}%` as any }]} />
          {[0.18, 0.43, 0.67].map(p => (
            <View key={p} style={[s.marker, { left: `${p * 100}%` as any }]} />
          ))}
          <View style={[s.thumb, { left: `${progress * 100}%` as any }]} />
        </View>
      </View>

      <View style={s.speedGroup}>
        <Text style={s.speedLabel}>VELOCIDAD</Text>
        {(['0.25', '0.5', '1'] as Speed[]).map(v => (
          <TouchableOpacity key={v} style={[s.speedBtn, speed === v && s.speedBtnOn]} onPress={() => setSpeed(v)}>
            <Text style={[s.speedText, speed === v && s.speedTextOn]}>{v}x</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  bar: {
    height: 44,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12,
  },
  controls: { flexDirection: 'row', gap: 3 },
  btn: {
    width: 30, height: 30, borderRadius: 4,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  btnMain:     { backgroundColor: C.borderBright + '33', borderColor: C.borderBright },
  btnIcon:     { color: C.textMuted, fontSize: 12 },
  btnIconMain: { color: C.text },
  frame:       { color: C.textMuted, fontSize: 11, letterSpacing: 0.5 },
  frameNum:    { color: C.text, fontWeight: '700' },
  frameOf:     { color: C.textMuted },
  scrubWrap:   { flex: 1, justifyContent: 'center', height: 20 },
  track:       { height: 4, backgroundColor: C.card, borderRadius: 2, position: 'relative' },
  fill:        { height: 4, backgroundColor: C.cyan, borderRadius: 2 },
  thumb: {
    position: 'absolute', top: -5, marginLeft: -7,
    width: 14, height: 14, borderRadius: 7, backgroundColor: C.text,
  },
  marker: {
    position: 'absolute', top: -3, width: 2, height: 10,
    backgroundColor: C.orange, opacity: 0.75, marginLeft: -1,
  },
  speedGroup:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  speedLabel:   { color: C.textMuted, fontSize: 10, letterSpacing: 0.5, marginRight: 4 },
  speedBtn: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 3,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  speedBtnOn:   { backgroundColor: C.cyan + '22', borderColor: C.cyan },
  speedText:    { color: C.textMuted, fontSize: 11, fontWeight: '600' },
  speedTextOn:  { color: C.cyan },
});
