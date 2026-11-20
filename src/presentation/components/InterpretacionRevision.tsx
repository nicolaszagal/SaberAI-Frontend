/**
 * Botón y resumen de la vista de interpretación (F-031 trazos, F-035 razonamiento), compartidos por
 * Revisión VAR y el detalle del Historial. El estado vive en `useInterpretacion`, a nivel de pantalla,
 * para que la caché sobreviva mientras la pantalla siga montada.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { InsigniaRazonamiento, ESTADOS_CON_EVIDENCIA } from './PanelRazonamiento';
import { useC } from '../context/ThemeContext';
import type { Interpretacion } from '../hooks/useInterpretacion';
import { FONT, space } from '../theme/tokens';

/** "Ver interpretación" (I; T y J abren la misma vista); habilitado cuando hay una revisión. */
export function BotonInterpretacion({ ctl }: { ctl: Interpretacion }) {
  return (
    <Button
      testID="ver-interpretacion-btn" label="Ver interpretación" shortcut="I"
      onPress={() => ctl.abrir('trazos')} disabled={ctl.revisionId === null}
    />
  );
}

/**
 * Línea de resumen bajo la sugerencia: la insignia del estado del razonamiento y su primera frase,
 * tal como llega del Fog. No muestra nada mientras el razonamiento no esté cargado o si no trae evidencia.
 */
export function ResumenInterpretacion({ ctl }: { ctl: Interpretacion }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const estado = ctl.razonamiento.estado;
  if (estado.tipo !== 'listo' || !ESTADOS_CON_EVIDENCIA.includes(estado.dato.estado)) return null;
  const frase = estado.dato.frases[0];
  return (
    <View testID="resumen-razonamiento" style={s.linea}>
      <InsigniaRazonamiento estado={estado.dato.estado} testID="resumen-razonamiento-estado" />
      {frase !== undefined && <Text testID="resumen-razonamiento-frase" style={s.frase}>{frase}</Text>}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  linea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  frase: { color: C.text, fontSize: FONT.sm, flexShrink: 1 },
});
