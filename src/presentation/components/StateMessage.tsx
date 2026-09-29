import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { FONT, RADIUS, space } from '../theme/tokens';

interface Props {
  /** `vacio` = sin datos, `cargando` = esperando respuesta, `error` = falló. */
  tipo: 'vacio' | 'cargando' | 'error';
  /** Qué pasó, en una frase. */
  titulo: string;
  /** Qué hacer a continuación. */
  siguiente?: string;
  /** Botón de la acción siguiente (p. ej. Reintentar). */
  accion?: { label: string; onPress: () => void; shortcut?: string };
  testID?: string;
}

/** Estado vacío, cargando o error con mensaje claro y la acción siguiente. */
export function StateMessage({ tipo, titulo, siguiente, accion, testID }: Props) {
  const C = useC();
  const s = useMemo(() => styles(), []);
  const color = tipo === 'error' ? C.red : tipo === 'cargando' ? C.cyan : C.text;
  const icono = tipo === 'error' ? '✕ ' : '';
  return (
    <View
      testID={testID}
      accessibilityRole={tipo === 'error' ? 'alert' : undefined}
      style={[s.box, { backgroundColor: C.card, borderColor: tipo === 'error' ? C.red : C.border }]}
    >
      <View style={s.head}>
        {tipo === 'cargando' && <ActivityIndicator size="small" color={C.cyan} />}
        <Text style={[s.titulo, { color }]}>{icono}{titulo}</Text>
      </View>
      {siguiente ? <Text style={[s.siguiente, { color: C.textMuted }]}>{siguiente}</Text> : null}
      {accion ? (
        <View style={s.accion}>
          <Button label={accion.label} shortcut={accion.shortcut} onPress={accion.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = () => StyleSheet.create({
  box:       { borderWidth: 1, borderRadius: RADIUS.md, padding: space(4), gap: space(2) },
  head:      { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  titulo:    { fontSize: FONT.md, fontWeight: '700', flexShrink: 1 },
  siguiente: { fontSize: FONT.sm },
  accion:    { flexDirection: 'row', marginTop: space(1) },
});
