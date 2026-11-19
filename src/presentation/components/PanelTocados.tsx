/**
 * "Últimos tocados" (EDGE02): lista de lo que capturó Edge, con hora, luces, fuente y estado.
 * Cada tocado admite la decisión en pista (sin ver la sugerencia, D-04); el más reciente, además,
 * "Solicitar VAR". Al llegar un tocado nuevo, el anterior queda "No revisado" y sin VAR.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { FENCER_LABEL } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';
import type { Tocado } from '../../domain/entities/Tocado';
import { CLASES_MODELO, nombreAccion, tiradorDeClase } from '../../application/mappers/actionMapper';

interface Props {
  tocados: Tocado[];
  /** Tocado que muestra el visor. */
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  onSolicitarVar: (id: string) => void;
  /** `clase` null = "Anulado". */
  onDecision: (id: string, clase: string | null) => void;
  /** Hay una revisión en curso: no se puede pedir otra. */
  ocupado: boolean;
  error: string | null;
}

const ESTADO_TEXTO = { procesando: 'Procesando…', listo: 'Listo', error: 'Error al procesar' } as const;

/** "ROJ", "VER" o "ROJ + VER (doble)". */
export function lucesTexto(t: Pick<Tocado, 'luzA' | 'luzB'>): string {
  if (t.luzA && t.luzB) return 'ROJ + VER (doble)';
  return t.luzA ? 'ROJ' : 'VER';
}

export function claseLegible(clase: string): string {
  return `${nombreAccion(clase)} · ${FENCER_LABEL[tiradorDeClase(clase)]}`;
}

function hora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-PE', { hour12: false });
}

export function PanelTocados(p: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  return (
    <View testID="panel-tocados" style={s.panel}>
      <Text style={s.titulo}>Últimos tocados</Text>
      {p.error && <Text testID="tocados-error" style={[s.nota, { color: C.red }]}>{p.error}</Text>}
      {p.tocados.length === 0 && !p.error && (
        <Text testID="tocados-vacio" style={s.nota}>Aún no hay tocados. Llegan solos desde Edge con cada señal.</Text>
      )}
      {p.tocados.map((t, i) => {
        const ultimo = i === 0;
        const expandido = abiertos[t.tocadoId] ?? ultimo;
        const elegido = t.tocadoId === p.seleccionadoId;
        return (
          <View key={t.tocadoId} testID={`tocado-${t.tocadoId}`} style={[s.fila, elegido && s.filaOn]}>
            <TouchableOpacity
              testID={`ver-tocado-${t.tocadoId}`} accessibilityRole="button"
              accessibilityLabel={`Ver la repetición del tocado de las ${hora(t.creadoEn)}`}
              onPress={() => p.onSeleccionar(t.tocadoId)} disabled={!t.tieneClip}
            >
              <Text style={s.linea}>
                {hora(t.creadoEn)} · {lucesTexto(t)} · {t.fuente === 'favero' ? 'Favero' : 'Simulado'}
              </Text>
              <Text testID={`estado-${t.tocadoId}`} style={s.estado}>
                {ESTADO_TEXTO[t.estado]} · {t.revisado ? 'En revisión' : 'No revisado'}
                {!t.tieneClip ? ' · sin clip' : ''}
              </Text>
              {t.decisionPista && (
                <Text testID={`decision-actual-${t.tocadoId}`} style={s.decision}>
                  Decisión en pista: {t.decisionPista.anulado || !t.decisionPista.clase ? 'Anulado' : claseLegible(t.decisionPista.clase)}
                </Text>
              )}
            </TouchableOpacity>

            <View style={s.acciones}>
              {t.admiteVar && (
                <Button
                  testID={`solicitar-var-${t.tocadoId}`} variant="primary" label="Solicitar VAR" shortcut="Intro"
                  onPress={() => p.onSolicitarVar(t.tocadoId)} disabled={p.ocupado}
                />
              )}
              {!ultimo && (
                <Button
                  testID={`alternar-decision-${t.tocadoId}`} label={expandido ? 'Ocultar decisión' : 'Decisión en pista'}
                  onPress={() => setAbiertos(a => ({ ...a, [t.tocadoId]: !expandido }))}
                />
              )}
            </View>

            {expandido && (
              <View testID={`decision-${t.tocadoId}`} style={s.chips}>
                {CLASES_MODELO.map(clase => {
                  const activa = t.decisionPista?.clase === clase;
                  return (
                    <Button
                      key={clase} testID={`decision-${t.tocadoId}-${clase}`} label={claseLegible(clase)}
                      selected={activa} onPress={() => p.onDecision(t.tocadoId, clase)}
                    />
                  );
                })}
                <Button
                  testID={`decision-${t.tocadoId}-anulado`} label="Anulado"
                  selected={!!t.decisionPista?.anulado} onPress={() => p.onDecision(t.tocadoId, null)}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  panel: { padding: space(3), gap: space(2), borderBottomWidth: 1, borderBottomColor: C.border },
  titulo: { color: C.text, fontSize: FONT.md, fontWeight: '800' },
  nota: { color: C.textMuted, fontSize: FONT.sm },
  fila: { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: space(2), gap: space(2), backgroundColor: C.card },
  filaOn: { borderColor: C.cyan },
  linea: { color: C.text, fontSize: FONT.sm, fontWeight: '700' },
  estado: { color: C.textMuted, fontSize: FONT.xs },
  decision: { color: C.cyan, fontSize: FONT.xs, fontWeight: '700' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
});
