/**
 * Modal de razonamiento (F-035, F-008, CU-09): las frases que explican la sugerencia, el criterio FIE
 * de referencia y los eventos medidos sobre la pose. Se abre bajo demanda; abrirlo o cerrarlo no toca
 * la elección del árbitro (RNF-01, P-008). El texto llega del Fog tal cual: aquí no se reescribe.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { ModalRevision } from './ModalRevision';
import { StateMessage } from './StateMessage';
import type { EstadoRazonamientoCarga } from '../hooks/useRazonamiento';
import type { EventoRazonamiento, EstadoRazonamiento, VistaRazonamiento } from '../../domain/entities/Razonamiento';
import { motivoLegible, nombreAccion, scaleConfidence, tiradorDeClase } from '../../application/mappers/actionMapper';
import { tiempoDesdeMs } from '../../application/pose/geometriaPose';
import { FENCER_LABEL, fencerColor } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';

/** Nota fija al pie del razonamiento: separa lo medido de lo que decide el árbitro. */
export const NOTA_RAZONAMIENTO =
  'Los eventos se miden sobre la pose y el artículo FIE es la referencia de la clase sugerida. La decisión es del árbitro.';

const TEXTO_NO_REGISTRADO = 'Esta revisión es anterior al registro de razonamiento.';
const TEXTO_NO_CALCULADO = 'No se pudo calcular el razonamiento de esta sugerencia.';

/** Estados que traen evidencia (frases, criterio y eventos) y se muestran con insignia. */
const ESTADOS_CON_EVIDENCIA: readonly EstadoRazonamiento[] = ['respaldada', 'discordante', 'no_concluyente', 'insuficiente'];

const TEXTO_INSIGNIA: Partial<Record<EstadoRazonamiento, string>> = {
  respaldada: 'Respaldada por la pose',
  discordante: 'Evidencia discordante',
  no_concluyente: 'No concluyente',
  insuficiente: 'Evidencia insuficiente',
};

/** Color de la insignia (siempre con texto además del color); todos tienen contraste AA sobre `card`. */
function colorInsignia(C: ThemeColors, estado: EstadoRazonamiento): string {
  switch (estado) {
    case 'respaldada': return C.green;
    case 'discordante': return C.orange;
    case 'no_concluyente': return C.cyan;
    default: return C.textMuted;
  }
}

/** Rótulo de un evento: tirador y tipo, o "acercamiento" si no tiene tirador. */
function rotuloEvento(e: EventoRazonamiento): string {
  if (e.tipo === 'inicio_desplazamiento') return 'Inicio del acercamiento (ambos tiradores)';
  return `${FENCER_LABEL[e.tirador === 'B' ? 'VER' : 'ROJ']} · Inicio de extensión del brazo`;
}

interface Props {
  visible: boolean;
  estado: EstadoRazonamientoCarga;
  reintentar: () => void;
  onClose: () => void;
  /** El árbitro pidió ver un evento en los trazos. */
  onVerEnTrazos: (evento: EventoRazonamiento) => void;
}

export function ModalRazonamiento({ visible, estado, reintentar, onClose, onVerEnTrazos }: Props) {
  return (
    <ModalRevision
      visible={visible} onClose={onClose} testID="modal-razonamiento" cerrarTestID="razonamiento-cerrar"
      titulo="Razonamiento" nota="Apoyo a la sugerencia: la decisión es del árbitro."
    >
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(3), maxWidth: 800, width: '100%', alignSelf: 'center' }}>
        {estado.tipo === 'listo'
          ? <Contenido r={estado.dato} onVerEnTrazos={onVerEnTrazos} />
          : <Aviso estado={estado} reintentar={reintentar} />}
      </ScrollView>
    </ModalRevision>
  );
}

function Aviso({ estado, reintentar }: { estado: EstadoRazonamientoCarga; reintentar: () => void }) {
  if (estado.tipo === 'error') {
    if (estado.status === 409 && estado.codigo === 'sin_clasificacion') {
      return (
        <StateMessage
          testID="razonamiento-409" tipo="error"
          titulo="Esta revisión aún no tiene una clasificación registrada"
          siguiente="El razonamiento explica una clasificación: sin ella no hay nada que mostrar."
        />
      );
    }
    return (
      <StateMessage
        testID="razonamiento-error" tipo="error"
        titulo="No se pudo cargar el razonamiento"
        siguiente={`${estado.mensaje.replace(/\.?\s*$/, '.')} Comprueba la conexión con el Fog.`}
        accion={{ label: 'Reintentar', onPress: reintentar }}
      />
    );
  }
  return <StateMessage testID="razonamiento-cargando" tipo="cargando" titulo="Cargando el razonamiento…" />;
}

function Contenido({ r, onVerEnTrazos }: { r: VistaRazonamiento; onVerEnTrazos: (e: EventoRazonamiento) => void }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);

  if (r.estado === 'no_disponible') {
    return (
      <View testID="razonamiento-no-disponible" style={[s.tarjeta, { borderLeftColor: C.orange }]}>
        <Text style={s.principal}>Clasificación no disponible</Text>
        <Text testID="razonamiento-motivo" style={s.valor}>{motivoLegible(r.motivo)}</Text>
        <Text style={s.valor}>Continúe con el procedimiento VAR habitual.</Text>
      </View>
    );
  }
  if (!ESTADOS_CON_EVIDENCIA.includes(r.estado)) {
    const texto = r.estado === 'no_calculado' ? TEXTO_NO_CALCULADO : TEXTO_NO_REGISTRADO;
    return (
      <View testID={`razonamiento-${r.estado.replace('_', '-')}`} style={[s.tarjeta, { borderLeftColor: C.borderBright }]}>
        <Text style={s.valor}>{texto}</Text>
      </View>
    );
  }

  const clase = r.criterio?.clase ?? null;
  const color = colorInsignia(C, r.estado);
  const eventos = r.eventos.filter(e => e.tipo !== 'tocado');
  return (
    <>
      <View testID="razonamiento-sugerencia" style={[s.tarjeta, { borderLeftColor: clase ? fencerColor(C, tiradorDeClase(clase)) : C.borderBright }]}>
        <Text style={s.etiqueta}>Sugerencia</Text>
        {clase && (
          <Text testID="razonamiento-clase" style={s.principal}>
            {nombreAccion(clase)} · {FENCER_LABEL[tiradorDeClase(clase)]}
          </Text>
        )}
        {r.confianza !== null && (
          <Text style={s.valor}>Confianza <Text testID="razonamiento-confianza" style={s.negrita}>{scaleConfidence(r.confianza)}%</Text></Text>
        )}
      </View>

      <View testID="razonamiento-estado" style={[s.insignia, { borderColor: color }]}>
        <Text style={[s.insigniaTexto, { color }]}>{TEXTO_INSIGNIA[r.estado]}</Text>
      </View>

      {r.frases.length > 0 && (
        <View testID="razonamiento-frases" style={s.frases}>
          {r.frases.map((f, i) => <Text key={i} testID="razonamiento-frase" style={s.frase}>{f}</Text>)}
        </View>
      )}

      {r.criterio && (
        <Text testID="razonamiento-criterio" style={s.valor}>
          Criterio FIE de referencia: <Text style={s.negrita}>{r.criterio.articulo}</Text>
        </Text>
      )}

      {eventos.length > 0 && (
        <View style={s.eventos}>
          <Text style={s.etiqueta}>Eventos medidos sobre la pose</Text>
          {eventos.map((e, i) => (
            <View key={i} testID="razonamiento-evento" style={s.evento}>
              <Text style={s.eventoRotulo}>{rotuloEvento(e)}</Text>
              <Text testID="razonamiento-evento-tiempo" style={s.eventoTiempo}>
                {e.censuradoInicio ? 'antes del inicio del clip' : `${tiempoDesdeMs(e.tMs)} del tocado`}
              </Text>
              <Pressable
                testID="ver-en-trazos" accessibilityRole="button"
                accessibilityLabel={`Ver en trazos: ${rotuloEvento(e)}`}
                onPress={() => onVerEnTrazos(e)} style={s.enlace}
              >
                <Text style={s.enlaceTexto}>Ver en trazos</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text testID="razonamiento-nota" style={s.nota}>{NOTA_RAZONAMIENTO}</Text>
    </>
  );
}

const styles = (C: ThemeColors) => StyleSheet.create({
  tarjeta:       { borderLeftWidth: 4, backgroundColor: C.card, borderRadius: RADIUS.sm, padding: space(3), gap: space(1) },
  etiqueta:      { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  principal:     { color: C.text, fontSize: FONT.xl, fontWeight: '800' },
  valor:         { color: C.text, fontSize: FONT.sm },
  negrita:       { fontWeight: '800' },
  insignia:      { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 2, borderRadius: RADIUS.sm, paddingHorizontal: space(3), paddingVertical: space(1) },
  insigniaTexto: { fontSize: FONT.md, fontWeight: '800' },
  frases:        { gap: space(1) },
  frase:         { color: C.text, fontSize: FONT.lg },
  eventos:       { gap: space(2) },
  evento:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(3), backgroundColor: C.card, borderRadius: RADIUS.sm, padding: space(2), minHeight: 44 },
  eventoRotulo:  { color: C.text, fontSize: FONT.sm, fontWeight: '700', flexGrow: 1 },
  eventoTiempo:  { color: C.textMuted, fontSize: FONT.sm },
  enlace:        { minHeight: 44, justifyContent: 'center', paddingHorizontal: space(2) },
  enlaceTexto:   { color: C.cyan, fontSize: FONT.sm, fontWeight: '700', textDecorationLine: 'underline' },
  nota:          { color: C.textMuted, fontSize: FONT.xs },
});
