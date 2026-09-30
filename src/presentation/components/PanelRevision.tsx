/**
 * Pasos del panel de revisión VAR (columna derecha de Revisión VAR):
 * Paso 1 · Clip, Paso 2 · Sugerencia, Paso 3 · Decisión del árbitro.
 * Todo lo que muestra el sistema es una sugerencia (RNF-01): la decisión es del árbitro.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { Button } from './Button';
import { StateMessage } from './StateMessage';
import { useShortcut } from '../hooks/useShortcut';
import { useTranscurrido } from '../hooks/useTranscurrido';
import { FENCER_LABEL, fencerColor } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';
import { LIMITE_ANALISIS_MS } from '../../application/AnalyzeClipUseCase';
import {
  CLASES_MODELO, etiquetaDecision, motivoLegible, nombreAccion, tiradorDeClase,
} from '../../application/mappers/actionMapper';

const LIMITE_S = LIMITE_ANALISIS_MS / 1000;

/** "Ataque · A · ROJ" a partir de una clase del modelo. */
function claseCompleta(clase: string): string {
  return `${nombreAccion(clase)} · ${FENCER_LABEL[tiradorDeClase(clase)]}`;
}

function Paso({ numero, titulo, children, testID }: {
  numero: number; titulo: string; children: React.ReactNode; testID?: string;
}) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  return (
    <View testID={testID} style={s.paso}>
      <Text style={s.pasoTitulo}>Paso {numero} · {titulo}</Text>
      {children}
    </View>
  );
}

// ─── Paso 1 · Clip ───────────────────────────────────────────────────────────

interface PasoClipProps {
  fileName: string | null;
  onElegirClip: () => void;
  /** Instante de cada luz en ms desde el inicio del clip; null = sin marcar. */
  tLuzAMs: number | null;
  tLuzBMs: number | null;
  onMarcarLuzA: () => void;
  onMarcarLuzB: () => void;
  onQuitarLuzA: () => void;
  onQuitarLuzB: () => void;
  onAnalizar: () => void;
  /** Qué falta para poder analizar, o null si ya se puede. */
  faltante: string | null;
}

export function PasoClip(p: PasoClipProps) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { sessionStatus, inicioAnalisis, errorMessage } = useSession();
  const transcurrido = useTranscurrido(inicioAnalisis);
  const analizando = sessionStatus === 'analyzing';

  return (
    <Paso numero={1} titulo="Clip" testID="paso-clip">
      <View style={s.fila}>
        <Button testID="select-clip-btn" label="Elegir archivo" shortcut="S" onPress={p.onElegirClip} disabled={analizando} />
        <Text testID="filename-display" style={s.nombreArchivo} numberOfLines={1}>
          {p.fileName ?? 'Ningún archivo (MP4 o MOV)'}
        </Text>
      </View>

      <Text style={s.etiqueta}>Luz Favero simulada · instante de cada luz (al menos una)</Text>
      {([
        { lado: 'a', nombre: 'A', rotulo: FENCER_LABEL.ROJ, tecla: 'R', color: C.red,
          t: p.tLuzAMs, marcar: p.onMarcarLuzA, quitar: p.onQuitarLuzA },
        { lado: 'b', nombre: 'B', rotulo: FENCER_LABEL.VER, tecla: 'V', color: C.green,
          t: p.tLuzBMs, marcar: p.onMarcarLuzB, quitar: p.onQuitarLuzB },
      ] as const).map(l => (
        <View key={l.lado} style={s.fila}>
          <Button
            testID={`marcar-luz-${l.lado}-btn`} label={`Marcar luz ${l.rotulo} aquí`} shortcut={l.tecla}
            onPress={l.marcar} disabled={analizando || !p.fileName}
            bg={l.t !== null ? l.color + '22' : undefined} border={l.t !== null ? l.color : undefined}
            color={l.t !== null ? l.color : undefined}
          />
          <Text testID={`luz-${l.lado}-valor`} style={s.valor}>
            {l.t === null ? `Luz ${l.nombre}: sin marcar` : `Luz ${l.nombre}: ${l.t} ms`}
          </Text>
          <Button
            testID={`quitar-luz-${l.lado}-btn`} label={`Quitar luz ${l.nombre}`}
            onPress={l.quitar} disabled={analizando || l.t === null}
          />
        </View>
      ))}

      <Button
        testID="analizar-btn" variant="primary" shortcut="Intro"
        label={analizando ? 'Analizando…' : 'ANALIZAR'}
        onPress={p.onAnalizar} disabled={p.faltante !== null || analizando}
      />
      {p.faltante !== null && !analizando && (
        <Text testID="analizar-falta" style={s.nota}>Falta: {p.faltante}.</Text>
      )}

      {/* Estado visible del análisis */}
      {analizando && (
        <View testID="status-analyzing" style={s.estado}>
          <ActivityIndicator size="small" color={C.cyan} />
          <Text style={[s.estadoTexto, { color: C.cyan }]}>
            Analizando… {transcurrido} s de {LIMITE_S} s
          </Text>
        </View>
      )}
      {sessionStatus === 'done' && (
        <Text testID="status-done" style={[s.estadoTexto, { color: C.green }]}>✓ Listo</Text>
      )}
      {sessionStatus === 'error' && errorMessage && (
        <StateMessage
          testID="status-error" tipo="error"
          titulo="Error: no se pudo analizar el clip"
          siguiente={`${errorMessage.replace(/\.?\s*$/, '.')} Revisa el clip y vuelve a intentarlo.`}
          accion={{ label: 'Reintentar', shortcut: 'Intro', onPress: p.onAnalizar }}
        />
      )}
    </Paso>
  );
}

// ─── Paso 2 · Sugerencia ─────────────────────────────────────────────────────

export function PasoSugerencia() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { revision, sessionStatus } = useSession();
  const sug = revision?.sugerencia ?? null;
  const analizando = sessionStatus === 'analyzing';

  return (
    <Paso numero={2} titulo="Sugerencia" testID="paso-sugerencia">
      {analizando ? (
        <Text style={s.mutado}>Analizando el clip…</Text>
      ) : sessionStatus === 'done' && revision && sug ? (
        <View style={[s.tarjeta, { borderLeftColor: fencerColor(C, sug.fencer) }]}>
          <Text style={s.etiqueta}>Sugerencia del sistema</Text>
          <Text testID="action-label" style={s.principal}>{nombreAccion(sug.action)}</Text>
          <Text testID="fencer-label" style={[s.tirador, { color: fencerColor(C, sug.fencer) }]}>
            {FENCER_LABEL[sug.fencer]}
          </Text>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Confianza</Text>
            <Text testID="confidence-value" style={s.confianza}>{sug.confidence}%</Text>
          </View>
          <View style={s.barraFondo}>
            <View testID="confidence-bar" style={[s.barra, { width: `${Math.min(100, Math.max(0, sug.confidence))}%` as `${number}%` }]} />
          </View>
        </View>
      ) : sessionStatus === 'done' && revision ? (
        <View testID="no-disponible" style={[s.tarjeta, { borderLeftColor: C.orange }]}>
          <Text style={s.principal}>Clasificación no disponible</Text>
          <Text testID="no-disponible-motivo" style={s.valor}>{motivoLegible(revision.motivo)}</Text>
          <Text style={s.valor}>Continúe con el procedimiento VAR habitual.</Text>
        </View>
      ) : (
        <Text testID="action-waiting" style={s.mutado}>
          Sin sugerencia todavía. Completa el Paso 1 y pulsa ANALIZAR.
        </Text>
      )}
    </Paso>
  );
}

// ─── Paso 3 · Decisión del árbitro ───────────────────────────────────────────

/** Elección del árbitro antes de enviar: una clase de las 6, o anular. */
type Eleccion = { tipo: 'clase'; clase: string } | { tipo: 'anular' } | null;

/**
 * Decisión del árbitro (contexto_sabre.md §8, DEF-28). Siempre elige la clase final
 * entre las 6, o anula. La sugerencia se resalta pero nunca se preselecciona. Con una
 * clase, responde "¿Cambia la decisión original en pista?" (Sí = cambiar, No = mantener),
 * sin respuesta por defecto. Nada se envía sin un resumen confirmado.
 */
export function PasoDecision() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { revision, sessionStatus, veredicto, veredictoStatus, veredictoError, registrarVeredicto } = useSession();
  const [eleccion, setEleccion] = useState<Eleccion>(null);
  const [cambia, setCambia] = useState<boolean | null>(null);

  const sug = revision?.sugerencia ?? null;
  const registrado = veredictoStatus === 'registrado';
  const enviando = veredictoStatus === 'enviando';
  // Sin revisión abierta (aún sin analizar, analizando, error o límite de 60 s) no se decide.
  const puedeDecidir = sessionStatus === 'done' && !!revision?.revisionId && !registrado && !enviando;

  const anula = eleccion?.tipo === 'anular';
  const clase = eleccion?.tipo === 'clase' ? eleccion.clase : null;
  const completo = anula || (clase !== null && cambia !== null);

  function elegirClase(c: string) { setEleccion({ tipo: 'clase', clase: c }); }
  function elegirAnular() { setEleccion({ tipo: 'anular' }); setCambia(null); }
  function limpiar() { setEleccion(null); setCambia(null); }
  function enviar() {
    if (!completo) return;
    if (anula) void registrarVeredicto('anular', null);
    else if (clase !== null) void registrarVeredicto(cambia ? 'cambiar' : 'mantener', clase);
  }

  useShortcut({ tecla: 'a', activo: puedeDecidir }, elegirAnular);
  useShortcut({ tecla: 'Escape', activo: puedeDecidir && eleccion !== null }, limpiar);

  return (
    <Paso numero={3} titulo="Decisión del árbitro" testID="paso-decision">
      {puedeDecidir && (
        <>
          <View testID="selector-clase" style={s.selector}>
            <Text style={s.etiqueta}>Clase final (elige una de las 6)</Text>
            {CLASES_MODELO.map(c => {
              const esSugerida = sug?.action === c;
              return (
                <Button
                  key={c} testID={`clase-${c}`}
                  label={`${claseCompleta(c)}${esSugerida ? ' · Sugerencia del sistema' : ''}`}
                  selected={clase === c}
                  onPress={() => elegirClase(c)}
                  bg={esSugerida ? C.cyan + '22' : undefined}
                  border={esSugerida ? C.cyan : undefined}
                />
              );
            })}
          </View>
          <Button
            testID="veredicto-anular" label="Anular la acción" shortcut="A" onPress={elegirAnular}
            selected={anula}
            bg={C.anularBg} border={C.red} color={C.anularText}
          />

          {clase !== null && (
            <View testID="pregunta-cambia" style={s.selector}>
              <Text style={s.etiqueta}>¿Cambia la decisión original en pista?</Text>
              <View style={s.fila}>
                <Button testID="cambia-si" label="Sí" selected={cambia === true} onPress={() => setCambia(true)} />
                <Button testID="cambia-no" label="No" selected={cambia === false} onPress={() => setCambia(false)} />
              </View>
            </View>
          )}

          {completo && (
            <View testID="resumen-decision" style={[s.tarjeta, { borderLeftColor: C.blue }]}>
              <Text style={s.etiqueta}>Resumen antes de registrar</Text>
              <Text style={s.valor}>
                {anula
                  ? 'Anula la acción · sin clase final'
                  : `${cambia ? 'Cambia' : 'Mantiene'} la decisión en pista · clase final: ${claseCompleta(clase!)}`}
              </Text>
            </View>
          )}

          <View style={s.fila}>
            <Button
              testID="veredicto-enviar" variant="primary" label="Confirmar y registrar"
              onPress={enviar} disabled={!completo}
            />
            <Button testID="decision-limpiar" label="Borrar elección" shortcut="Esc" onPress={limpiar} disabled={eleccion === null} />
          </View>
          {!completo && (
            <Text testID="decision-falta" style={s.nota}>
              Falta: {eleccion === null ? 'elegir la clase final o anular' : 'responder si cambia la decisión original en pista'}.
            </Text>
          )}
        </>
      )}

      {!puedeDecidir && !registrado && !enviando && (
        <Text testID="decision-deshabilitada" style={s.nota}>
          {sessionStatus === 'done' && !revision?.revisionId
            ? 'No hay revisión abierta: continúe con el procedimiento VAR habitual.'
            : 'Disponible cuando el análisis termine.'}
        </Text>
      )}
      {enviando && <Text style={s.mutado}>Registrando el veredicto…</Text>}
      {registrado && veredicto && (
        <View testID="veredicto-confirmado" style={[s.tarjeta, { borderLeftColor: C.green }]}>
          <Text style={[s.estadoTexto, { color: C.green }]}>✓ Veredicto registrado</Text>
          <Text style={s.valor}>
            {etiquetaDecision(veredicto.decision)}
            {veredicto.claseFinal ? ` · ${claseCompleta(veredicto.claseFinal)}` : ''}
          </Text>
        </View>
      )}
      {veredictoStatus === 'error' && veredictoError && (
        <StateMessage
          testID="veredicto-error" tipo="error"
          titulo="No se pudo registrar el veredicto"
          siguiente={`${veredictoError.replace(/\.?\s*$/, '.')} Revisa tu decisión y vuelve a confirmarla.`}
        />
      )}
    </Paso>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  paso:        { gap: space(2), padding: space(3), borderBottomWidth: 1, borderBottomColor: C.border },
  pasoTitulo:  { color: C.text, fontSize: FONT.md, fontWeight: '800' },
  fila:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  etiqueta:    { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  valor:       { color: C.text, fontSize: FONT.sm },
  nota:        { color: C.textMuted, fontSize: FONT.xs },
  mutado:      { color: C.textMuted, fontSize: FONT.sm },
  nombreArchivo: { flex: 1, minWidth: 100, color: C.textMuted, fontSize: FONT.sm },
  estado:      { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  estadoTexto: { fontSize: FONT.sm, fontWeight: '700' },
  tarjeta:     { borderLeftWidth: 4, backgroundColor: C.card, borderRadius: RADIUS.sm, padding: space(3), gap: space(1) },
  principal:   { color: C.text, fontSize: FONT.xl, fontWeight: '800' },
  tirador:     { fontSize: FONT.lg, fontWeight: '800' },
  confianza:   { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  barraFondo:  { height: 8, backgroundColor: C.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  barra:       { height: 8, backgroundColor: C.green, borderRadius: RADIUS.sm },
  selector:    { gap: space(2), padding: space(2), borderWidth: 1, borderColor: C.borderBright, borderRadius: RADIUS.md, backgroundColor: C.card },
});
