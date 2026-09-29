/**
 * HistoryScreen — Historial de revisiones
 * Lista las revisiones registradas por el backend (GET /revisiones), de la más
 * reciente a la más antigua. Solo muestra campos que devuelve la API.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { StateMessage } from '../components/StateMessage';
import { getRevisiones } from '../../infrastructure/api/fogApi';
import { translateAction, scaleConfidence } from '../../application/mappers/actionMapper';
import type { RevisionResumen } from '../../domain/entities/Combate';
import { FONT, RADIUS, space } from '../theme/tokens';
import type { Screen } from '../../../App';

/** "ATAQUE · A" a partir del nombre de clase del modelo (p. ej. AttackA). */
function claseLegible(clase: string | null): string {
  return clase ? `${translateAction(clase)} · ${clase.slice(-1)}` : '—';
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE');
}

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function HistoryScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [revisiones, setRevisiones] = useState<RevisionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    let activo = true;
    setError(null);
    setRevisiones(null);
    getRevisiones()
      .then(r => { if (activo) setRevisiones(r); })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo leer el historial'); });
    return () => { activo = false; };
  }, []);

  useEffect(() => cargar(), [cargar]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Revisiones registradas{revisiones ? ` · ${revisiones.length}` : ''}</Text>

      {error && (
        <StateMessage
          testID="historial-error" tipo="error"
          titulo="No se pudo cargar el historial"
          siguiente={`${error}. Comprueba la conexión con el Fog e inténtalo de nuevo.`}
          accion={{ label: 'Reintentar', onPress: cargar }}
        />
      )}
      {!error && revisiones === null && (
        <StateMessage testID="historial-cargando" tipo="cargando" titulo="Cargando revisiones…" />
      )}
      {revisiones?.length === 0 && (
        <StateMessage
          testID="historial-vacio" tipo="vacio"
          titulo="Sin revisiones registradas"
          siguiente="Cada clip que analizas abre una revisión y aparece aquí."
          accion={{ label: 'Ir a Revisión VAR', onPress: () => onNavigate('live') }}
        />
      )}

      {revisiones?.map(r => (
        <View key={r.id} testID="revision-row" style={s.row}>
          <Text style={s.fecha}>{formatFecha(r.abiertaEn)}</Text>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Sugerencia</Text>
            <Text style={s.cellValue}>
              {r.disponible ? claseLegible(r.clase) : 'No disponible'}
              {r.confianza != null ? `  ·  ${scaleConfidence(r.confianza)}%` : ''}
            </Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Veredicto del árbitro</Text>
            <Text style={s.cellValue}>
              {r.decision ? `${r.decision}${r.claseFinal ? `  ·  ${claseLegible(r.claseFinal)}` : ''}` : 'Pendiente'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: space(4), gap: space(2), maxWidth: 900, alignSelf: 'center', width: '100%' },
  title:   { color: C.text, fontSize: FONT.lg, fontWeight: '700', marginBottom: space(1) },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space(4), flexWrap: 'wrap',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: space(4), paddingVertical: space(3),
  },
  fecha:     { color: C.textMuted, fontSize: FONT.sm, width: 170 },
  cell:      { flex: 1, minWidth: 200, gap: 2 },
  cellLabel: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  cellValue: { color: C.text, fontSize: FONT.md, fontWeight: '600' },
});
