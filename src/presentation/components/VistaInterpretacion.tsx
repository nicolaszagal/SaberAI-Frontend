/**
 * Vista de interpretación (F-031, F-035, F-008, CU-08, CU-09, D-14): el reproductor de trazos y el
 * razonamiento de la sugerencia, a la vez, en una sola pantalla completa. Pantalla ancha (≥ 900 px):
 * trazos a la izquierda (~60 %, fondo negro) y razonamiento a la derecha (~40 %, con scroll propio).
 * Angosta: trazos arriba y razonamiento debajo. Elegir un evento mueve el cursor de los trazos en el
 * lugar; hay un solo cierre. Cada parte muestra su propio aviso si falla, sin tapar a la otra.
 * Abrirla o cerrarla no toca la elección del árbitro (RNF-01, P-008).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useC } from '../context/ThemeContext';
import { ModalRevision } from './ModalRevision';
import { Reproductor, AvisoPose } from './ReproductorTrazos';
import { Contenido, AvisoRazonamiento } from './PanelRazonamiento';
import type { Interpretacion } from '../hooks/useInterpretacion';
import { FONDO_TRAZOS } from '../theme/fencer';
import { FONT, space } from '../theme/tokens';

/** Ancho útil desde el cual los trazos y el razonamiento van lado a lado. */
export const ANCHO_DOS_COLUMNAS = 900;

/** Cuánto tarda en montarse el modal antes de poder darle el foco a una sección (ms). */
const ESPERA_FOCO_MS = 80;

export function VistaInterpretacion({ ctl }: { ctl: Interpretacion }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { width, height } = useWindowDimensions();
  const ancha = width >= ANCHO_DOS_COLUMNAS;
  const { pose, razonamiento, frameSeleccionado, abierta, foco } = ctl;
  const trazosRef = useRef<View>(null);
  const razonamientoRef = useRef<View>(null);

  // La sección que se pidió (T, J o I) recibe el foco; en pantalla angosta el foco también la desplaza a la vista.
  useEffect(() => {
    if (!abierta) return undefined;
    const id = setTimeout(() => (foco === 'razonamiento' ? razonamientoRef : trazosRef).current?.focus(), ESPERA_FOCO_MS);
    return () => clearTimeout(id);
  }, [abierta, foco]);

  const poseDato = pose.estado.tipo === 'listo' ? pose.estado.dato : null;
  const conTrazos = poseDato !== null && poseDato.nFrames > 0 && poseDato.tiradores !== null;
  const razDato = razonamiento.estado.tipo === 'listo' ? razonamiento.estado.dato : null;

  const trazos = (
    <View ref={trazosRef} tabIndex={-1} testID="seccion-trazos" accessibilityLabel="Trazos de pose" style={[s.trazos, ancha ? s.trazosAncha : { height: Math.max(420, Math.round(height * 0.62)) }]}>
      <Text accessibilityRole="header" style={s.tituloTrazos}>Trazos de pose</Text>
      {conTrazos && poseDato ? (
        <Reproductor
          pose={poseDato} razonamiento={razDato} seleccion={frameSeleccionado}
          onSeleccionarEvento={ctl.verEnTrazos} onMoverManual={ctl.soltarEvento}
        />
      ) : (
        <View style={s.aviso}><AvisoPose estado={pose.estado} reintentar={pose.reintentar} /></View>
      )}
    </View>
  );

  const razonamientoPanel = (
    <View ref={razonamientoRef} tabIndex={-1} testID="seccion-razonamiento" accessibilityLabel="Razonamiento" style={s.razonamiento}>
      <Text accessibilityRole="header" style={s.tituloRazonamiento}>Razonamiento</Text>
      {razDato
        ? <Contenido r={razDato} seleccionado={frameSeleccionado?.evento ?? null} onVerEnTrazos={conTrazos ? ctl.verEnTrazos : undefined} />
        : <AvisoRazonamiento estado={razonamiento.estado} reintentar={razonamiento.reintentar} />}
    </View>
  );

  return (
    <ModalRevision
      visible={abierta} onClose={ctl.cerrar} testID="vista-interpretacion" cerrarTestID="interpretacion-cerrar"
      titulo="Interpretación" nota="Apoyo a la sugerencia: la decisión es del árbitro."
    >
      {ancha ? (
        <View testID="interpretacion-ancha" style={s.fila}>
          {trazos}
          <View style={s.columnaRazonamiento}>
            <ScrollView testID="interpretacion-scroll" contentContainerStyle={s.scrollRazonamiento}>
              {razonamientoPanel}
            </ScrollView>
          </View>
        </View>
      ) : (
        <ScrollView testID="interpretacion-angosta" contentContainerStyle={s.apilado}>
          {trazos}
          {razonamientoPanel}
        </ScrollView>
      )}
    </ModalRevision>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  fila:                 { flex: 1, flexDirection: 'row' },
  trazos:               { backgroundColor: FONDO_TRAZOS },
  trazosAncha:          { flex: 6, minWidth: 0 },
  tituloTrazos:         { color: '#FFFFFF', fontSize: FONT.md, fontWeight: '800', paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: space(1) },
  aviso:                { flex: 1, padding: space(4), backgroundColor: FONDO_TRAZOS },
  columnaRazonamiento:  { flex: 4, minWidth: 0, borderLeftWidth: 1, borderLeftColor: C.border },
  scrollRazonamiento:   { flexGrow: 1 },
  apilado:              { flexGrow: 1 },
  razonamiento:         { padding: space(4), gap: space(3), backgroundColor: C.bg },
  tituloRazonamiento:   { color: C.text, fontSize: FONT.md, fontWeight: '800' },
});
