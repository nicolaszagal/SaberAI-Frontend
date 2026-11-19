/**
 * "Cerrar sesión de validación" (EDGE02, D-26): respaldo verificado (sin clips) y, solo si pasa, purga de los
 * clips de la sesión. La confirmación va en la propia página (nada de `confirm()`). Si el respaldo falla no se
 * borra nada y se informa, con la opción de reintentar. No es el "Cerrar sesión" del encabezado, que solo sale
 * de la cuenta.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { Button } from './Button';
import { FONT, RADIUS, space } from '../theme/tokens';
import { cerrarSesionValidacion, type SesionCerrada } from '../../infrastructure/api/tocadosApi';
import { FogError } from '../../infrastructure/api/fogApi';

type Fase = 'reposo' | 'confirmando' | 'cerrando' | 'cerrada' | 'fallo';

export function CerrarSesionValidacion() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate, finalizarCombate } = useCombat();
  const [fase, setFase] = useState<Fase>('reposo');
  const [resultado, setResultado] = useState<SesionCerrada | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  // Un combate nuevo abre otra sesión: el bloque vuelve a su estado inicial.
  const matchId = combate?.matchId ?? null;
  useEffect(() => { if (matchId) setFase('reposo'); }, [matchId]);

  async function cerrar() {
    setFase('cerrando');
    setFallo(null);
    try {
      const r = await cerrarSesionValidacion();
      setResultado(r);
      setFase('cerrada');
      finalizarCombate(); // el nodo ya no tiene combate activo
    } catch (e) {
      setFallo(
        e instanceof FogError ? e.detalle
          : e instanceof Error ? `No se pudo contactar al Fog: ${e.message}. No se borró nada.`
          : 'Error desconocido. No se borró nada.',
      );
      setFase('fallo');
    }
  }

  return (
    <View testID="cerrar-validacion" style={s.card}>
      <Text style={s.titulo}>Cerrar la sesión de validación</Text>

      {fase === 'reposo' && (
        <Button testID="cerrar-validacion-btn" label="Cerrar sesión de validación" onPress={() => setFase('confirmando')} />
      )}

      {fase === 'confirmando' && (
        <View testID="cerrar-validacion-confirmacion" style={s.aviso} accessibilityRole="alert">
          <Text style={s.texto}>
            Se hará el respaldo verificado de la sesión (sin los clips) y, solo si pasa, se borrarán los clips de
            video de Fog y de Edge. Esto no se puede deshacer.
          </Text>
          <View style={s.fila}>
            <Button testID="cerrar-validacion-confirmar" variant="primary" label="Sí, respaldar y borrar los clips" onPress={() => { void cerrar(); }} />
            <Button testID="cerrar-validacion-cancelar" label="Cancelar" onPress={() => setFase('reposo')} />
          </View>
        </View>
      )}

      {fase === 'cerrando' && (
        <Text testID="cerrar-validacion-progreso" style={s.texto}>Respaldando y verificando… no cierres esta página.</Text>
      )}

      {fase === 'cerrada' && resultado && (
        <Text testID="cerrar-validacion-ok" style={[s.texto, { color: C.green }]}>
          ✓ Sesión cerrada. Respaldo verificado; clips borrados: {resultado.clipsBorrados} en Fog y{' '}
          {resultado.archivosEdgeBorrados} archivos en Edge.
        </Text>
      )}

      {fase === 'fallo' && (
        <View testID="cerrar-validacion-fallo" style={s.aviso} accessibilityRole="alert">
          <Text style={[s.texto, { color: C.red }]}>✕ La sesión NO se cerró y no se borró ningún clip.</Text>
          <Text testID="cerrar-validacion-detalle" style={s.detalle}>{fallo}</Text>
          <View style={s.fila}>
            <Button testID="cerrar-validacion-reintentar" variant="primary" label="Reintentar" onPress={() => { void cerrar(); }} />
            <Button testID="cerrar-validacion-cancelar" label="Cancelar" onPress={() => setFase('reposo')} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: space(4), gap: space(3) },
  titulo: { color: C.text, fontSize: FONT.md, fontWeight: '800' },
  texto: { color: C.text, fontSize: FONT.sm },
  detalle: { color: C.textMuted, fontSize: FONT.xs },
  aviso: { gap: space(2) },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
});
