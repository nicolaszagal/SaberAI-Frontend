import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';

interface Props {
  label: string;
  /** Atajo que se muestra dentro del botón (p. ej. `S` o `Ctrl+Intro`). */
  shortcut?: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  /** `primary` = relleno de acento; `neutral` = borde y fondo de tarjeta. */
  variant?: 'primary' | 'neutral';
  /** Colores propios (botones de veredicto). */
  bg?: string;
  border?: string;
  color?: string;
  /** Opción elegida en un grupo de alternativas (se anuncia como seleccionada). */
  selected?: boolean;
}

/** Botón de al menos 44 px de alto con el atajo de teclado siempre visible. */
export function Button({ label, shortcut, onPress, disabled, testID, variant = 'neutral', bg, border, color, selected }: Props) {
  const C = useC();
  const s = useMemo(() => styles(), []);
  const primary = variant === 'primary';
  const fondo  = disabled ? C.card : bg ?? (primary ? C.primary : C.card);
  const borde  = disabled ? C.border : border ?? (primary ? C.primary : C.borderBright);
  const texto  = disabled ? C.textMuted : color ?? (primary ? C.onPrimary : C.text);
  const marca  = selected && !disabled ? C.primary : null;
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={selected === undefined ? undefined : { selected, disabled: !!disabled }}
      style={[s.btn, { backgroundColor: fondo, borderColor: marca ?? borde }, marca ? s.elegido : null]}
    >
      <Text style={[s.label, { color: texto }]}>{label}</Text>
      {shortcut ? (
        <View style={[s.key, { borderColor: texto }]}>
          <Text style={[s.keyText, { color: texto }]}>{shortcut}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = () => StyleSheet.create({
  btn: {
    minHeight: CONTROL_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space(2), paddingHorizontal: space(4), borderRadius: RADIUS.md, borderWidth: 1,
  },
  elegido: { borderWidth: 3 },
  label:   { fontSize: FONT.sm, fontWeight: '700' },
  key:     { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: space(1.5), paddingVertical: 2, opacity: 0.85 },
  keyText: { fontSize: FONT.xs, fontWeight: '600' },
});
