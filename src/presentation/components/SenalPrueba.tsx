/**
 * Botón temporal "Señal de prueba" (EDGE02): emite el tocado a mano mientras no llega el cable RJ12.
 * Solo aparece si Edge informa modo de prueba. El tocado queda con fuente 'simulado': no es el aparato
 * ni cuenta como Validación 2.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { useShortcut } from '../hooks/useShortcut';
import { FONT, RADIUS, space } from '../theme/tokens';
import { emitirSenalPrueba } from '../../infrastructure/api/tocadosApi';

export function SenalPrueba({ activo }: { activo: boolean }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [error, setError] = useState<string | null>(null);

  async function emitir(luzA: boolean, luzB: boolean) {
    setError(null);
    try {
      await emitirSenalPrueba(luzA, luzB);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo emitir la señal de prueba');
    }
  }

  // 1, 2 y 3: no chocan con S, Enter, R, V, A, Esc, "," ni ".".
  useShortcut({ tecla: '1', activo }, () => { void emitir(true, false); });
  useShortcut({ tecla: '2', activo }, () => { void emitir(false, true); });
  useShortcut({ tecla: '3', activo }, () => { void emitir(true, true); });

  if (!activo) return null;
  return (
    <View testID="senal-prueba" style={s.card}>
      <Text testID="senal-prueba-rotulo" style={s.rotulo}>Señal simulada, no es el aparato</Text>
      <View style={s.fila}>
        <Button testID="senal-prueba-a" label="Luz A · ROJ" shortcut="1" onPress={() => { void emitir(true, false); }} />
        <Button testID="senal-prueba-b" label="Luz B · VER" shortcut="2" onPress={() => { void emitir(false, true); }} />
        <Button testID="senal-prueba-doble" label="Doble" shortcut="3" onPress={() => { void emitir(true, true); }} />
      </View>
      {error && <Text testID="senal-prueba-error" style={[s.nota, { color: C.red }]}>{error}</Text>}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: { margin: space(3), padding: space(3), gap: space(2), borderWidth: 1, borderStyle: 'dashed', borderColor: C.borderBright, borderRadius: RADIUS.md },
  rotulo: { color: C.text, fontSize: FONT.sm, fontWeight: '800' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  nota: { fontSize: FONT.xs },
});
