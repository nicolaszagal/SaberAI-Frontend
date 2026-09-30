/**
 * HistoryScreen — Historial de revisiones del evento activo (CU-12)
 * Lista las revisiones del evento configurado (GET /revisiones?evento_id=), de la más
 * reciente a la más antigua, con su detalle (GET /revisiones/{id}) al seleccionar una fila
 * y la exportación del resumen de la sesión (L02). Solo muestra campos que devuelve la API.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { Button } from '../components/Button';
import { StateMessage } from '../components/StateMessage';
import { getResumenSesion, getRevision, getRevisiones, getResumenValidacionTexto } from '../../infrastructure/api/fogApi';
import { descargarTexto, puedeDescargar } from '../../infrastructure/descarga';
import {
  concordancia, etiquetaDecision, motivoLegible, scaleConfidence, tiradorDeClase, translateAction,
} from '../../application/mappers/actionMapper';
import type { ResumenSesion, ResumenValidacion, RevisionDetalle, RevisionResumen } from '../../domain/entities/Combate';
import { FENCER_LABEL } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';
import type { Screen } from '../../../App';

/** "ATAQUE · A" a partir del nombre de clase del modelo (p. ej. AttackA). */
function claseLegible(clase: string | null): string {
  return clase ? `${translateAction(clase)} · ${clase.slice(-1)}` : '—';
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE');
}

function textoDecision(decision: string | null, claseFinal: string | null): string {
  if (!decision) return 'Pendiente';
  return `${etiquetaDecision(decision)}${claseFinal ? `  ·  ${claseLegible(claseFinal)}` : ''}`;
}

function textoConcordancia(r: RevisionResumen): string {
  const c = concordancia(r);
  return c === null ? '—' : c ? 'Coincide' : 'Difiere';
}

function formatoLatencia(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** "8 revisiones · κ 0.33 (aceptable) · latencia p95 48 ms": solo con los datos que existen. */
function lineaResumen(v: ResumenValidacion): string {
  const partes = [`${v.nRevisiones} ${v.nRevisiones === 1 ? 'revisión' : 'revisiones'}`];
  if (v.kappa.calculable && v.kappa.kappa != null) {
    partes.push(`κ ${v.kappa.kappa.toFixed(2)}${v.kappa.banda ? ` (${v.kappa.banda})` : ''}`);
  }
  if (v.latencia.p95Ms != null) partes.push(`latencia p95 ${formatoLatencia(v.latencia.p95Ms)}`);
  else if (v.latencia.p95ExcedeUmbral) partes.push('latencia p95 > 60 s');
  return partes.join(' · ');
}

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function HistoryScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate, validando } = useCombat();
  const eventoId = combate?.eventoId ?? null;

  const [resumen, setResumen] = useState<ResumenSesion | null>(null);
  const [revisiones, setRevisiones] = useState<RevisionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<RevisionDetalle | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportado, setExportado] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!eventoId) return undefined;
    let activo = true;
    setError(null);
    setRevisiones(null);
    setSeleccionada(null);
    getRevisiones(eventoId)
      .then(r => { if (activo) setRevisiones(r); })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo leer el historial'); });
    return () => { activo = false; };
  }, [eventoId]);

  useEffect(() => cargar(), [cargar]);

  // Resumen real de la sesión: si no hay evento o la consulta falla, no se muestra nada.
  useEffect(() => {
    setResumen(null);
    if (!eventoId) return undefined;
    let activo = true;
    getResumenSesion(eventoId).then(r => { if (activo) setResumen(r); }).catch(() => {});
    return () => { activo = false; };
  }, [eventoId]);

  const bloques = resumen
    ? ([['V1', 'Validación 1', resumen.V1], ['V2', 'Validación 2', resumen.V2]] as const)
      .filter(([, , v]) => v.nRevisiones > 0)
    : [];

  const cargarDetalle = useCallback((id: string) => {
    let activo = true;
    setDetalle(null);
    setDetalleError(null);
    getRevision(id)
      .then(d => { if (activo) setDetalle(d); })
      .catch(e => { if (activo) setDetalleError(e instanceof Error ? e.message : 'No se pudo leer la revisión'); });
    return () => { activo = false; };
  }, []);

  useEffect(() => (seleccionada ? cargarDetalle(seleccionada) : undefined), [seleccionada, cargarDetalle]);

  async function exportar() {
    if (!eventoId || exportando) return;
    setExportando(true);
    setExportado(null);
    setExportError(null);
    try {
      const texto = await getResumenValidacionTexto(eventoId);
      let contenido = texto;
      try { contenido = JSON.stringify(JSON.parse(texto), null, 2); } catch { /* se exporta tal cual */ }
      const nombre = `resumen-${eventoId}.json`;
      descargarTexto(nombre, contenido);
      setExportado(nombre);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'No se pudo exportar la evidencia');
    } finally {
      setExportando(false);
    }
  }

  if (validando && !combate) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <StateMessage testID="historial-cargando" tipo="cargando" titulo="Verificando el combate activo…" />
      </ScrollView>
    );
  }

  if (!eventoId) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <Text style={s.title}>Historial de revisiones</Text>
        <StateMessage
          testID="historial-sin-evento" tipo="vacio"
          titulo="No hay un evento activo"
          siguiente="El historial es el del evento elegido al configurar el combate."
          accion={{ label: 'Configurar combate', onPress: () => onNavigate('config') }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Text style={s.title}>Revisiones del evento{revisiones ? ` · ${revisiones.length}` : ''}</Text>
        {puedeDescargar && (
          <Button
            testID="exportar-evidencia-btn"
            label={exportando ? 'Exportando…' : 'Exportar evidencia'}
            onPress={exportar} disabled={exportando}
          />
        )}
      </View>

      {bloques.length > 0 && (
        <View testID="resumen-sesion" style={s.resumen}>
          {bloques.map(([clave, etiqueta, v]) => (
            <Text key={clave} testID={`resumen-${clave}`} style={s.resumenTexto}>
              {etiqueta} · {lineaResumen(v)}
            </Text>
          ))}
        </View>
      )}

      {exportado && (
        <Text testID="exportar-ok" style={s.ok}>Evidencia exportada: {exportado}</Text>
      )}
      {exportError && (
        <StateMessage
          testID="exportar-error" tipo="error"
          titulo="No se pudo exportar la evidencia"
          siguiente={`${exportError}. Comprueba la conexión con el Fog e inténtalo de nuevo.`}
          accion={{ label: 'Reintentar', onPress: exportar }}
        />
      )}

      {error && (
        <StateMessage
          testID="historial-error" tipo="error"
          titulo="No se pudo cargar el historial"
          siguiente={`${error}. Comprueba la conexión con el Fog e inténtalo de nuevo.`}
          accion={{ label: 'Reintentar', onPress: cargar }}
        />
      )}
      {!error && revisiones === null && (
        <StateMessage testID="historial-cargando" tipo="cargando" titulo="Cargando revisiones…" />
      )}
      {revisiones?.length === 0 && (
        <StateMessage
          testID="historial-vacio" tipo="vacio"
          titulo="Sin revisiones registradas"
          siguiente="Cada clip que analizas abre una revisión y aparece aquí."
          accion={{ label: 'Ir a Revisión VAR', onPress: () => onNavigate('live') }}
        />
      )}

      {revisiones?.map(r => {
        const abierta = seleccionada === r.id;
        return (
          <View key={r.id}>
            <TouchableOpacity
              testID="revision-row"
              accessibilityRole="button"
              accessibilityState={{ selected: abierta }}
              style={[s.row, abierta && s.rowOn]}
              onPress={() => setSeleccionada(abierta ? null : r.id)}
            >
              <Text style={s.fecha}>{formatFecha(r.abiertaEn)}</Text>
              <Cell s={s} label="Sugerencia" valor={r.disponible ? claseLegible(r.clase) : 'No disponible'} />
              <Cell s={s} label="Confianza" valor={r.confianza != null ? `${scaleConfidence(r.confianza)}%` : '—'} small />
              <Cell s={s} label="Veredicto del árbitro" valor={textoDecision(r.decision, r.claseFinal)} />
              <Cell s={s} label="Concordancia" valor={textoConcordancia(r)} small />
            </TouchableOpacity>
            {abierta && (
              <Detalle s={s} detalle={detalle} error={detalleError} onReintentar={() => cargarDetalle(r.id)} />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

type Estilos = ReturnType<typeof styles>;

function Cell({ s, label, valor, small }: { s: Estilos; label: string; valor: string; small?: boolean }) {
  return (
    <View style={[s.cell, small && s.cellSmall]}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{valor}</Text>
    </View>
  );
}

function Detalle({ s, detalle, error, onReintentar }: {
  s: Estilos; detalle: RevisionDetalle | null; error: string | null; onReintentar: () => void;
}) {
  if (error) {
    return (
      <View style={s.detalle}>
        <StateMessage
          testID="detalle-error" tipo="error"
          titulo="No se pudo cargar el detalle de la revisión"
          siguiente={`${error}. Inténtalo de nuevo.`}
          accion={{ label: 'Reintentar', onPress: onReintentar }}
        />
      </View>
    );
  }
  if (!detalle) {
    return (
      <View style={s.detalle}>
        <StateMessage testID="detalle-cargando" tipo="cargando" titulo="Cargando detalle…" />
      </View>
    );
  }
  const sug = detalle.sugerencia;
  return (
    <View testID="revision-detalle" style={s.detalle}>
      <Text style={s.detalleTitulo}>Sugerencia del sistema</Text>
      {!sug && <Text style={s.detalleValor}>Aún sin clasificación</Text>}
      {sug && !sug.disponible && (
        <Text style={s.detalleValor}>Clasificación no disponible · {motivoLegible(sug.motivoNoDisp)}</Text>
      )}
      {sug?.disponible && sug.clase && (
        <Text style={s.detalleValor}>
          {claseLegible(sug.clase)} · Tirador {FENCER_LABEL[tiradorDeClase(sug.clase)]}
          {sug.confianza != null ? ` · ${scaleConfidence(sug.confianza)}%` : ''}
        </Text>
      )}
      {detalle.probabilidades && (
        <View style={s.probs}>
          {Object.entries(detalle.probabilidades).map(([clase, p]) => (
            <Text key={clase} testID={`prob-${clase}`} style={s.prob}>{claseLegible(clase)}: {scaleConfidence(p)}%</Text>
          ))}
        </View>
      )}

      <Text style={s.detalleTitulo}>Decisión del árbitro</Text>
      <Text style={s.detalleValor}>{textoDecision(detalle.decision, detalle.claseFinal)}</Text>
      {detalle.registradoEn && <Text style={s.detalleMeta}>Registrada: {formatFecha(detalle.registradoEn)}</Text>}

      {detalle.auditoriaHash && (
        <>
          <Text style={s.detalleTitulo}>Auditoría</Text>
          <Text style={s.detalleMeta}>Registro n.º {detalle.auditoriaSeq}</Text>
          <Text selectable style={s.hash}>{detalle.auditoriaHash}</Text>
        </>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: space(4), gap: space(2), maxWidth: 1000, alignSelf: 'center', width: '100%' },
  head:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3), flexWrap: 'wrap' },
  title:   { color: C.text, fontSize: FONT.lg, fontWeight: '700', marginBottom: space(1) },
  resumen: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space(4), rowGap: space(1) },
  resumenTexto: { color: C.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  ok:      { color: C.green, fontSize: FONT.sm, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space(4), flexWrap: 'wrap',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: space(4), paddingVertical: space(3),
  },
  rowOn:     { borderColor: C.cyan },
  fecha:     { color: C.textMuted, fontSize: FONT.sm, width: 170 },
  cell:      { flex: 1, minWidth: 180, gap: 2 },
  cellSmall: { minWidth: 100, flex: 0.6 },
  cellLabel: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  cellValue: { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  detalle: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    padding: space(4), gap: space(2), marginTop: space(1),
  },
  detalleTitulo: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '700', marginTop: space(1) },
  detalleValor:  { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  detalleMeta:   { color: C.textMuted, fontSize: FONT.sm },
  probs:         { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  prob:          { color: C.text, fontSize: FONT.sm },
  hash:          { color: C.textMuted, fontSize: FONT.xs, fontFamily: 'monospace' },
});
