/**
 * HistoryScreen — Historial de revisiones
 * Lista las revisiones registradas por el backend (GET /revisiones), de la más
 * reciente a la más antigua. Solo muestra campos que devuelve la API.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { getRevisiones } from '../../infrastructure/api/fogApi';
import { translateAction, scaleConfidence } from '../../application/mappers/actionMapper';
import type { RevisionResumen } from '../../domain/entities/Combate';

/** "ATAQUE · A" a partir del nombre de clase del modelo (p. ej. AttackA). */
function claseLegible(clase: string | null): string {
  return clase ? `${translateAction(clase)} · ${clase.slice(-1)}` : '—';
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE');
}

export function HistoryScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [revisiones, setRevisiones] = useState<RevisionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getRevisiones()
      .then(r => { if (activo) setRevisiones(r); })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo leer el historial'); });
    return () => { activo = false; };
  }, []);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>REVISIONES REGISTRADAS{revisiones ? ` · ${revisiones.length}` : ''}</Text>

      {error && <Text testID="historial-error" style={s.error}>{error}</Text>}
      {!error && revisiones === null && <Text style={s.hint}>Cargando…</Text>}
      {revisiones?.length === 0 && <Text testID="historial-vacio" style={s.hint}>Sin revisiones registradas</Text>}

      {revisiones?.map(r => (
        <View key={r.id} testID="revision-row" style={s.row}>
          <Text style={s.fecha}>{formatFecha(r.abiertaEn)}</Text>
          <View style={s.cell}>
            <Text style={s.cellLabel}>SUGERENCIA</Text>
            <Text style={s.cellValue}>
              {r.disponible ? claseLegible(r.clase) : 'No disponible'}
              {r.confianza != null ? `  ·  ${scaleConfidence(r.confianza)}%` : ''}
            </Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>VEREDICTO DEL ÁRBITRO</Text>
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
  content: { padding: 16, gap: 8, maxWidth: 900, alignSelf: 'center', width: '100%' },
  title:   { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  hint:    { color: C.textMuted, fontSize: 12 },
  error:   { color: C.red, fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  fecha:     { color: C.textMuted, fontSize: 11, width: 150 },
  cell:      { flex: 1, minWidth: 200, gap: 2 },
  cellLabel: { color: C.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  cellValue: { color: C.text, fontSize: 13, fontWeight: '600' },
});
