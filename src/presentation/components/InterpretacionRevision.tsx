/**
 * Botones y modales de apoyo a la revisión (F-031 trazos, F-035 razonamiento), compartidos por
 * Revisión VAR y el detalle del Historial. El estado vive en `useInterpretacion`, a nivel de pantalla,
 * para que la caché sobreviva mientras la pantalla siga montada.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { ModalTrazos } from './ModalTrazos';
import { ModalRazonamiento } from './ModalRazonamiento';
import type { Interpretacion } from '../hooks/useInterpretacion';
import { space } from '../theme/tokens';

/** "Ver trazos" (T) y "Ver razonamiento" (J); habilitados cuando hay una revisión. */
export function BotonesInterpretacion({ ctl }: { ctl: Interpretacion }) {
  const sinRevision = ctl.revisionId === null;
  return (
    <View style={styles.fila}>
      <Button testID="ver-trazos-btn" label="Ver trazos" shortcut="T" onPress={ctl.abrirTrazos} disabled={sinRevision} />
      <Button testID="ver-razonamiento-btn" label="Ver razonamiento" shortcut="J" onPress={ctl.abrirRazonamiento} disabled={sinRevision} />
    </View>
  );
}

/** Los dos modales; solo uno está abierto a la vez. */
export function ModalesInterpretacion({ ctl }: { ctl: Interpretacion }) {
  return (
    <>
      <ModalTrazos
        visible={ctl.modal === 'trazos'} revisionId={ctl.revisionId} onClose={ctl.cerrar}
        abrirEn={ctl.abrirEn} razonamiento={ctl.razonamiento.guardado}
      />
      <ModalRazonamiento
        visible={ctl.modal === 'razonamiento'} estado={ctl.razonamiento.estado}
        reintentar={ctl.razonamiento.reintentar} onClose={ctl.cerrar} onVerEnTrazos={ctl.verEnTrazos}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
});
