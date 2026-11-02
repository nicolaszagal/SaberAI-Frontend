/**
 * Base común de los modales de apoyo a la revisión (trazos de pose y razonamiento): pantalla
 * completa, cabecera con título y nota, botón Cerrar y `Esc`. Con el modal abierto los atajos de
 * la pantalla de fondo callan y cerrarlo no toca la elección del árbitro (RNF-01, P-008).
 */
import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { useShortcut, useBloqueoDeAtajos } from '../hooks/useShortcut';
import { FONT, space } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** testID de la raíz del modal. */
  testID: string;
  /** testID del botón Cerrar. */
  cerrarTestID: string;
  titulo: string;
  nota: string;
  /** Fondo de la raíz; por defecto el del tema activo. */
  fondo?: string;
  children: React.ReactNode;
}

export function ModalRevision({ visible, onClose, testID, cerrarTestID, titulo, nota, fondo, children }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  // Con el modal abierto los atajos de la pantalla de fondo (incluido Esc de "Borrar elección") callan.
  useBloqueoDeAtajos(visible);
  useShortcut({ tecla: 'Escape', activo: visible, enModal: true }, onClose);

  return (
    <Modal visible={visible} transparent={false} animationType="none" onRequestClose={onClose}>
      <View testID={testID} style={[s.root, { backgroundColor: fondo ?? C.bg }]}>
        <View style={s.cabecera}>
          <Text accessibilityRole="header" style={s.titulo}>{titulo}</Text>
          <Text style={s.nota}>{nota}</Text>
          <Button testID={cerrarTestID} label="Cerrar" shortcut="Esc" onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:     { flex: 1 },
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(3), padding: space(3), backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  titulo:   { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  nota:     { color: C.textMuted, fontSize: FONT.xs, flex: 1 },
});
