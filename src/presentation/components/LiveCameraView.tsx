import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useCameraStream } from '../hooks/useCameraStream';

interface LiveCameraViewProps {
  url: string;
  label: string;
  compact?: boolean;
  style?: ViewStyle;
}

function useDotPulse(active: boolean) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (active) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
    } else {
      opacity.setValue(1);
    }

    return () => loop?.stop();
  }, [active, opacity]);

  return opacity;
}

export function LiveCameraView({ url, label, compact, style }: LiveCameraViewProps) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { frameUri, connected, latencyMs } = useCameraStream(url);
  const dotOpacity = useDotPulse(connected);

  return (
    <View style={[s.container, style]}>
      <View style={s.frame}>
        {connected && frameUri ? (
          <Image source={{ uri: frameUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={s.offlinePlaceholder}>
            <Text style={s.offlineIcon}>🚫</Text>
            <Text style={s.offlineText}>CÁMARA OFFLINE</Text>
          </View>
        )}

        <View style={s.statusRow}>
          <Animated.View
            style={[s.statusDot, { backgroundColor: connected ? C.green : C.textMuted, opacity: dotOpacity }]}
          />
          <Text style={s.statusLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  frame: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  offlinePlaceholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  offlineIcon: { fontSize: 32, opacity: 0.6 },
  offlineText: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statusRow: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { color: C.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  footer: {
    height: 22, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  footerLatency: { color: C.textMuted, fontSize: 9 },
  liveBadge: {
    borderWidth: 1, borderColor: C.live, backgroundColor: C.live + '18',
    borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1,
  },
  liveBadgeText: { color: C.liveText, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});
