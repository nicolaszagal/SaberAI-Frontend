import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import type { HistorialEntry } from '../../domain/entities/Action';
import { useSession } from '../context/SessionContext';
import { StateMessage } from './StateMessage';
import { FENCER_LABEL, fencerColor } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';

function EntryCard({ entry }: { entry: HistorialEntry }) {
  const C = useC();
  const s = useMemo(() => cardStyles(C), [C]);
  const color = fencerColor(C, entry.fencer);
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <Text style={s.action}>{entry.action}</Text>
      <Text style={s.detail}>
        <Text style={{ color, fontWeight: '800' }}>{FENCER_LABEL[entry.fencer]}</Text>
        {`  ·  Confianza ${entry.confidence}%`}
      </Text>
      <Text style={s.meta}>{entry.timestamp}  ·  {entry.durationMs} ms</Text>
    </View>
  );
}

export function HistorialPanel() {
  const C = useC();
  const s = useMemo(() => panelStyles(C), [C]);
  const { historial } = useSession();
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Esta sesión</Text>
        <Text style={s.subtitle}>{historial.length} {historial.length === 1 ? 'sugerencia' : 'sugerencias'}</Text>
      </View>
      <ScrollView testID="historial-list" contentContainerStyle={s.list}>
        {historial.length === 0 && (
          <StateMessage
            testID="historial-empty"
            tipo="vacio"
            titulo="Sin análisis en esta sesión"
            siguiente="Analiza un clip y su sugerencia aparecerá aquí, la más reciente arriba."
          />
        )}
        {historial.map(e => <EntryCard key={e.id} entry={e} />)}
      </ScrollView>
    </View>
  );
}

const panelStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  header: {
    minHeight: space(10), paddingHorizontal: space(3), borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title:    { color: C.text, fontSize: FONT.md, fontWeight: '700' },
  subtitle: { color: C.textMuted, fontSize: FONT.xs },
  list:     { padding: space(2), gap: space(2) },
});

const cardStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: {
    borderLeftWidth: 4, backgroundColor: C.card, borderRadius: RADIUS.sm, padding: space(3), gap: space(1),
  },
  action: { color: C.text, fontSize: FONT.md, fontWeight: '800' },
  detail: { color: C.text, fontSize: FONT.sm },
  meta:   { color: C.textMuted, fontSize: FONT.xs },
});
