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
  hasLuzA: boolean;
  hasLuzB: boolean;
  onLuzA: () => void;
  onLuzB: () => void;
  tTocadoMs: number | null;
  onMarcarTocado: () => void;
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
  const luzHint = p.hasLuzA && p.hasLuzB ? 'Ambas luces' : p.hasLuzA ? 'Luz A' : p.hasLuzB ? 'Luz B' : 'Sin luz';

  return (
    <Paso numero={1} titulo="Clip" testID="paso-clip">
      <View style={s.fila}>
        <Button testID="select-clip-btn" label="Elegir archivo" shortcut="S" onPress={p.onElegirClip} disabled={analizando} />
        <Text testID="filename-display" style={s.nombreArchivo} numberOfLines={1}>
          {p.fileName ?? 'Ningún archivo (MP4 o MOV)'}
        </Text>
      </View>

      <Text style={s.etiqueta}>Luz Favero simulada (al menos una)</Text>
      <View style={s.fila}>
        <Button
          testID="luz-a-btn" label={`${p.hasLuzA ? '● ' : '○ '}${FENCER_LABEL.ROJ}`} onPress={p.onLuzA} disabled={analizando}
          bg={p.hasLuzA ? C.red + '22' : undefined} border={p.hasLuzA ? C.red : undefined} color={p.hasLuzA ? C.red : C.textMuted}
        />
        <Button
          testID="luz-b-btn" label={`${p.hasLuzB ? '● ' : '○ '}${FENCER_LABEL.VER}`} onPress={p.onLuzB} disabled={analizando}
          bg={p.hasLuzB ? C.green + '22' : undefined} border={p.hasLuzB ? C.green : undefined} color={p.hasLuzB ? C.green : C.textMuted}
        />
        <Text testID="luz-hint" style={s.valor}>{luzHint}</Text>
      </View>

      <Text style={s.etiqueta}>Instante del tocado (t_tocado_ms)</Text>
      <View style={s.fila}>
        <Button testID="marcar-tocado-btn" label="Marcar tocado aquí" onPress={p.onMarcarTocado} disabled={analizando || !p.fileName} />
        <Text testID="tocado-valor" style={s.valor}>
          {p.tTocadoMs === null ? 'Sin marcar' : `${p.tTocadoMs} ms`}
        </Text>
      </View>

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

export function PasoDecision() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { revision, sessionStatus, veredicto, veredictoStatus, veredictoError, registrarVeredicto } = useSession();
  const [eligiendo, setEligiendo] = useState(false);

  const sug = revision?.sugerencia ?? null;
  const registrado = veredictoStatus === 'registrado';
  const enviando = veredictoStatus === 'enviando';
  // Sin revisión abierta (aún sin analizar, analizando, error o límite de 60 s) no se decide.
  const puedeDecidir = sessionStatus === 'done' && !!revision?.revisionId && !registrado && !enviando;
  const puedeMantener = puedeDecidir && sug !== null;

  function mantener() { if (sug) void registrarVeredicto('mantener', sug.action); }
  function anular() { setEligiendo(false); void registrarVeredicto('anular', null); }
  function elegir(clase: string) { setEligiendo(false); void registrarVeredicto('cambiar', clase); }

  useShortcut({ tecla: 'm', activo: puedeMantener }, mantener);
  useShortcut({ tecla: 'c', activo: puedeDecidir && !eligiendo }, () => setEligiendo(true));
  useShortcut({ tecla: 'a', activo: puedeDecidir }, anular);
  useShortcut({ tecla: 'Escape', activo: eligiendo }, () => setEligiendo(false));

  return (
    <Paso numero={3} titulo="Decisión del árbitro" testID="paso-decision">
      <View style={s.fila}>
        <Button
          testID="veredicto-mantener" label="Mantener" shortcut="M" onPress={mantener} disabled={!puedeMantener}
          bg={C.confirmBg} border={C.green} color={C.confirmText}
        />
        <Button
          testID="veredicto-cambiar" label="Cambiar" shortcut="C" onPress={() => setEligiendo(true)} disabled={!puedeDecidir}
          bg={C.manualBg} border={C.blue} color={C.manualText}
        />
        <Button
          testID="veredicto-anular" label="Anular" shortcut="A" onPress={anular} disabled={!puedeDecidir}
          bg={C.anularBg} border={C.red} color={C.anularText}
        />
      </View>

      {eligiendo && puedeDecidir && (
        <View testID="selector-clase" style={s.selector}>
          <Text style={s.etiqueta}>Elige la clase final</Text>
          {CLASES_MODELO.map(clase => (
            <Button
              key={clase} testID={`clase-${clase}`}
              label={`${claseCompleta(clase)}${sug?.action === clase ? ' (sugerida)' : ''}`}
              onPress={() => elegir(clase)}
            />
          ))}
          <Button testID="selector-cancelar" label="Cancelar" shortcut="Esc" onPress={() => setEligiendo(false)} />
        </View>
      )}

      {!puedeDecidir && !registrado && !enviando && (
        <Text testID="decision-deshabilitada" style={s.nota}>
          {sessionStatus === 'done' && !revision?.revisionId
            ? 'No hay revisión abierta: continúe con el procedimiento VAR habitual.'
            : 'Disponible cuando el análisis termine.'}
        </Text>
      )}
      {sessionStatus === 'done' && revision?.revisionId && sug === null && !registrado && (
        <Text style={s.nota}>Sin sugerencia: puede Cambiar (elige la clase) o Anular.</Text>
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
          siguiente={`${veredictoError.replace(/\.?\s*$/, '.')} Vuelve a elegir tu decisión.`}
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
