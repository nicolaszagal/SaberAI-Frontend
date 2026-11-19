/**
 * Sección "Cámara" de Configuración (EDGE02): dispositivo, resolución y fps, vista de prueba
 * (un cuadro cada pocos segundos, no video en vivo) y fps medidos. Todo pasa por Fog (`/edge/*`).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { StateMessage } from './StateMessage';
import { useEstadoEdge } from '../hooks/useTocados';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';
import {
  getCamarasEdge, getConfigCamara, getPreviewCamara, guardarConfigCamara,
} from '../../infrastructure/api/tocadosApi';
import type { CamaraDispositivo, ConfigCamara } from '../../domain/entities/Tocado';

/** Cada cuánto cambia el cuadro de vista previa (ms). */
export const INTERVALO_PREVIEW_MS = 4000;

const RESOLUCIONES = [
  { id: '720', label: '720p', ancho: 1280, alto: 720 },
  { id: '1080', label: '1080p', ancho: 1920, alto: 1080 },
] as const;
const FPS = [30, 60] as const;

export function SeccionCamara() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { estado, error: errorEdge } = useEstadoEdge();
  const [camaras, setCamaras] = useState<CamaraDispositivo[]>([]);
  const [cfg, setCfg] = useState<ConfigCamara | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargaError(null);
    Promise.all([getCamarasEdge(), getConfigCamara()])
      .then(([c, conf]) => { setCamaras(c); setCfg(conf); })
      .catch(e => setCargaError(e instanceof Error ? e.message : 'No se pudo leer la cámara de Edge'));
  }, []);
  useEffect(() => cargar(), [cargar]);

  // Un cuadro cada pocos segundos, nunca video en vivo.
  useEffect(() => {
    let vivo = true;
    let anterior: string | null = null;
    const tick = async () => {
      try {
        const url = await getPreviewCamara();
        if (!vivo) { if (url) URL.revokeObjectURL(url); return; }
        if (url) { if (anterior) URL.revokeObjectURL(anterior); anterior = url; setPreview(url); }
      } catch { /* sin vista previa: se reintenta en el próximo ciclo */ }
    };
    void tick();
    const id = setInterval(() => { void tick(); }, INTERVALO_PREVIEW_MS);
    return () => { vivo = false; clearInterval(id); if (anterior) URL.revokeObjectURL(anterior); };
  }, []);

  async function guardar() {
    if (!cfg) return;
    setGuardando(true);
    setMensaje(null);
    try {
      setCfg(await guardarConfigCamara(cfg));
      setMensaje({ ok: true, texto: 'Cámara guardada.' });
    } catch (e) {
      setMensaje({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar la cámara' });
    } finally {
      setGuardando(false);
    }
  }

  const resActual = cfg ? RESOLUCIONES.find(r => r.alto === cfg.alto)?.id ?? null : null;

  return (
    <View testID="seccion-camara" style={s.card}>
      <Text style={s.titulo}>Cámara</Text>
      {cargaError && (
        <StateMessage
          testID="camara-error" tipo="error" titulo="No se pudo leer la cámara de Edge"
          siguiente={`${cargaError}. Comprueba que Edge esté corriendo en este equipo.`}
          accion={{ label: 'Reintentar', onPress: cargar }}
        />
      )}
      {cfg && (
        <>
          <Text style={s.etiqueta}>Dispositivo</Text>
          <View style={s.fila}>
            {camaras.length === 0 && <Text testID="camara-sin-dispositivos" style={s.nota}>Edge no encontró cámaras.</Text>}
            {camaras.map(c => (
              <TouchableOpacity
                key={c.indice} testID={`camara-${c.indice}`} accessibilityRole="button"
                style={[s.choice, cfg.camara_indice === c.indice && s.choiceOn]}
                onPress={() => setCfg({ ...cfg, camara_indice: c.indice })}
              >
                <Text style={[s.choiceText, cfg.camara_indice === c.indice && s.choiceTextOn]}>
                  {cfg.camara_indice === c.indice ? '✓ ' : ''}{c.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.etiqueta}>Resolución (mínimo 720p)</Text>
          <View style={s.fila}>
            {RESOLUCIONES.map(r => (
              <TouchableOpacity
                key={r.id} testID={`resolucion-${r.id}`} accessibilityRole="button"
                style={[s.choice, resActual === r.id && s.choiceOn]}
                onPress={() => setCfg({ ...cfg, ancho: r.ancho, alto: r.alto })}
              >
                <Text style={[s.choiceText, resActual === r.id && s.choiceTextOn]}>{resActual === r.id ? '✓ ' : ''}{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.etiqueta}>Fotogramas por segundo (mínimo 30)</Text>
          <View style={s.fila}>
            {FPS.map(f => (
              <TouchableOpacity
                key={f} testID={`fps-${f}`} accessibilityRole="button"
                style={[s.choice, cfg.fps === f && s.choiceOn]} onPress={() => setCfg({ ...cfg, fps: f })}
              >
                <Text style={[s.choiceText, cfg.fps === f && s.choiceTextOn]}>{cfg.fps === f ? '✓ ' : ''}{f} fps</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button testID="guardar-camara-btn" variant="primary" label={guardando ? 'Guardando…' : 'Guardar cámara'} onPress={guardar} disabled={guardando} />
          {mensaje && (
            <Text testID="camara-mensaje" style={[s.nota, { color: mensaje.ok ? C.green : C.red }]}>{mensaje.texto}</Text>
          )}
        </>
      )}

      {estado ? (
        <View testID="camara-estado" style={s.estado}>
          <Text style={s.nota}>
            {estado.camara.abierta ? 'Cámara abierta' : `Cámara sin abrir${estado.camara.error ? `: ${estado.camara.error}` : ''}`}
            {' · '}{estado.camara.resolucion.ancho}×{estado.camara.resolucion.alto}
          </Text>
          <Text testID="camara-fps" style={s.nota}>
            fps medidos: {estado.camara.fps_medidos.toFixed(1)} de {estado.camara.fps_configurados} configurados
          </Text>
          {estado.camara.avisos.map(a => (
            <Text key={a} testID="camara-aviso" style={[s.nota, { color: C.red }]}>⚠ {a}</Text>
          ))}
        </View>
      ) : errorEdge ? (
        <Text testID="camara-edge-caido" style={[s.nota, { color: C.red }]}>Edge no responde. {errorEdge}</Text>
      ) : null}

      <Text style={s.etiqueta}>Vista de prueba (un cuadro cada pocos segundos, no es video en vivo)</Text>
      {preview ? (
        <Image testID="camara-preview" source={{ uri: preview }} style={s.preview} resizeMode="contain" accessibilityLabel="Vista de prueba de la cámara" />
      ) : (
        <Text testID="camara-preview-vacia" style={s.nota}>Todavía no hay imagen de la cámara.</Text>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: space(4), gap: space(3) },
  titulo: { color: C.text, fontSize: FONT.lg, fontWeight: '700' },
  etiqueta: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  nota: { color: C.textMuted, fontSize: FONT.sm },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  estado: { gap: space(1) },
  choice: {
    minHeight: CONTROL_HEIGHT, justifyContent: 'center', paddingHorizontal: space(4),
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderBright, backgroundColor: C.surface,
  },
  choiceOn: { borderColor: C.cyan, backgroundColor: C.cyan + '22' },
  choiceText: { color: C.textMuted, fontSize: FONT.sm, fontWeight: '700' },
  choiceTextOn: { color: C.text },
  preview: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: RADIUS.md },
});
