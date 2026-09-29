/**
 * ConfigScreen — Configuración del combate (CU-01, F-039, RF-07)
 * Registra evento, pista, árbitro y los tiradores A y B con su brazo armado
 * (POST /matches/config). El combate creado queda activo para las revisiones.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { Button } from '../components/Button';
import { StateMessage } from '../components/StateMessage';
import { useShortcut } from '../hooks/useShortcut';
import { FENCER_LABEL } from '../theme/fencer';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';
import { configureMatch, getArbitros, getEventos } from '../../infrastructure/api/fogApi';
import type {
  BrazoArmado, EventoCatalogo, UsuarioCatalogo,
} from '../../domain/entities/Combate';

interface TiradorForm {
  alias: string;
  brazo: BrazoArmado | null;
  esMenor: boolean | null;
  firmado: boolean;
  fecha: string;
  firmante: string;
}

const TIRADOR_VACIO: TiradorForm = { alias: '', brazo: null, esMenor: null, firmado: false, fecha: '', firmante: '' };

/** Devuelve el primer campo faltante del tirador o null si está completo. */
function validarTirador(lado: 'A' | 'B', t: TiradorForm): string | null {
  if (!t.alias.trim()) return `Falta el alias del tirador ${lado}`;
  if (!t.brazo) return `Falta el brazo armado del tirador ${lado}`;
  if (t.esMenor === null) return `Indica si el tirador ${lado} es menor de edad`;
  if (t.firmado && !t.fecha.trim()) return `Falta la fecha del consentimiento del tirador ${lado}`;
  if (t.firmado && t.esMenor && !t.firmante.trim()) return `Falta el firmante del tirador ${lado} (menor de edad)`;
  return null;
}

function Choice<T extends string | boolean>({ testID, options, value, onChange }: {
  testID: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  return (
    <View style={s.choiceRow}>
      {options.map(o => (
        <TouchableOpacity
          key={String(o.value)}
          testID={`${testID}-${String(o.value)}`}
          style={[s.choice, value === o.value && s.choiceOn]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[s.choiceText, value === o.value && s.choiceTextOn]}>{value === o.value ? '✓ ' : ''}{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function TiradorSection({ lado, value, onChange }: {
  lado: 'A' | 'B'; value: TiradorForm; onChange: (t: TiradorForm) => void;
}) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const set = (patch: Partial<TiradorForm>) => onChange({ ...value, ...patch });
  const id = `tirador-${lado.toLowerCase()}`;
  const color = lado === 'A' ? C.red : C.green;
  return (
    <View style={s.card}>
      <Text style={[s.cardTitle, { color }]}>Tirador {FENCER_LABEL[lado === 'A' ? 'ROJ' : 'VER']}</Text>
      <Field label="Alias">
        <TextInput testID={`${id}-alias`} style={s.input} value={value.alias}
          onChangeText={alias => set({ alias })} placeholderTextColor={C.textMuted} />
      </Field>
      <Field label="Brazo armado">
        <Choice testID={`${id}-brazo`} value={value.brazo} onChange={brazo => set({ brazo })}
          options={[{ value: 'right', label: 'Diestro' }, { value: 'left', label: 'Zurdo' }]} />
      </Field>
      <Field label="Menor de edad">
        <Choice testID={`${id}-menor`} value={value.esMenor} onChange={esMenor => set({ esMenor })}
          options={[{ value: false, label: 'No' }, { value: true, label: 'Sí' }]} />
      </Field>
      <Field label="Consentimiento firmado">
        <Choice testID={`${id}-firmado`} value={value.firmado} onChange={firmado => set({ firmado })}
          options={[{ value: false, label: 'No' }, { value: true, label: 'Sí' }]} />
      </Field>
      {value.firmado && (
        <Field label="Fecha del consentimiento (AAAA-MM-DD)">
          <TextInput testID={`${id}-fecha`} style={s.input} value={value.fecha}
            onChangeText={fecha => set({ fecha })} placeholder="2026-10-05" placeholderTextColor={C.textMuted} />
        </Field>
      )}
      {value.firmado && value.esMenor === true && (
        <Field label="Firmante (apoderado)">
          <TextInput testID={`${id}-firmante`} style={s.input} value={value.firmante}
            onChangeText={firmante => set({ firmante })} placeholderTextColor={C.textMuted} />
        </Field>
      )}
    </View>
  );
}

function Selector({ testID, items, value, onChange, vacio, cargando }: {
  testID: string;
  items: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  vacio: string;
  cargando: boolean;
}) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  if (items.length === 0) return <Text style={s.hint}>{cargando ? 'Cargando…' : `${vacio}. Pulsa Recargar cuando existan.`}</Text>;
  return (
    <View style={s.choiceRow}>
      {items.map(i => (
        <TouchableOpacity key={i.id} testID={`${testID}-${i.id}`}
          style={[s.choice, value === i.id && s.choiceOn]} onPress={() => onChange(i.id)}>
          <Text style={[s.choiceText, value === i.id && s.choiceTextOn]}>{value === i.id ? '✓ ' : ''}{i.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ConfigScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate, setCombate } = useCombat();

  const [eventos, setEventos]   = useState<EventoCatalogo[]>([]);
  const [arbitros, setArbitros] = useState<UsuarioCatalogo[]>([]);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  const [eventoId, setEventoId]   = useState<string | null>(null);
  const [arbitroId, setArbitroId] = useState<string | null>(null);
  const [pista, setPista]         = useState('');
  const [a, setA] = useState<TiradorForm>(TIRADOR_VACIO);
  const [b, setB] = useState<TiradorForm>(TIRADOR_VACIO);

  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const cargarCatalogo = useCallback(() => {
    let activo = true;
    setCatalogoError(null);
    setCargandoCatalogo(true);
    Promise.all([getEventos(), getArbitros()])
      .then(([ev, ar]) => { if (activo) { setEventos(ev); setArbitros(ar); } })
      .catch(e => { if (activo) setCatalogoError(e instanceof Error ? e.message : 'No se pudo leer el catálogo'); })
      .finally(() => { if (activo) setCargandoCatalogo(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => cargarCatalogo(), [cargarCatalogo]);

  async function handleCrear() {
    const falta =
      !eventoId ? 'Falta seleccionar el evento'
      : !pista.trim() ? 'Falta la pista'
      : !arbitroId ? 'Falta seleccionar el árbitro'
      : validarTirador('A', a) ?? validarTirador('B', b);
    if (falta) { setError(falta); return; }

    setEnviando(true);
    setError(null);
    try {
      const matchId = await configureMatch({
        eventoId: eventoId!, pista: pista.trim(), arbitroId: arbitroId!,
        a: { alias: a.alias.trim(), brazo: a.brazo!, esMenor: a.esMenor!, consentimientoFirmado: a.firmado,
             consentimientoFecha: a.fecha.trim() || null, firmante: a.firmante.trim() || null },
        b: { alias: b.alias.trim(), brazo: b.brazo!, esMenor: b.esMenor!, consentimientoFirmado: b.firmado,
             consentimientoFecha: b.fecha.trim() || null, firmante: b.firmante.trim() || null },
      });
      setCombate({
        matchId, pista: pista.trim(),
        arbitro: arbitros.find(x => x.id === arbitroId)!.nombre,
        aliasA: a.alias.trim(), aliasB: b.alias.trim(),
        brazoA: a.brazo!, brazoB: b.brazo!,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al crear el combate');
    } finally {
      setEnviando(false);
    }
  }

  useShortcut({ tecla: 'Enter', ctrl: true, activo: !enviando }, handleCrear);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {combate && (
        <View testID="combate-activo" style={[s.card, { borderColor: C.green }]}>
          <Text style={[s.cardTitle, { color: C.green }]}>Combate activo</Text>
          <Text style={s.value}>Pista {combate.pista} · Árbitro {combate.arbitro}</Text>
          <Text style={s.value}>
            A · {combate.aliasA} ({combate.brazoA === 'right' ? 'diestro' : 'zurdo'}) vs B · {combate.aliasB} ({combate.brazoB === 'right' ? 'diestro' : 'zurdo'})
          </Text>
        </View>
      )}

      <Text style={s.section}>{combate ? 'Nuevo combate' : 'Configurar combate'}</Text>
      {cargandoCatalogo && (
        <StateMessage testID="catalogo-cargando" tipo="cargando" titulo="Cargando eventos y árbitros…" />
      )}
      {catalogoError && (
        <StateMessage
          testID="catalogo-error" tipo="error"
          titulo="No se pudo cargar el catálogo"
          siguiente={`${catalogoError}. Comprueba la conexión con el Fog e inténtalo de nuevo.`}
          accion={{ label: 'Reintentar', onPress: cargarCatalogo }}
        />
      )}
      {!cargandoCatalogo && !catalogoError && (eventos.length === 0 || arbitros.length === 0) && (
        <StateMessage
          testID="catalogo-vacio" tipo="vacio"
          titulo={eventos.length === 0 && arbitros.length === 0 ? 'No hay eventos ni árbitros registrados'
            : eventos.length === 0 ? 'No hay eventos registrados' : 'No hay árbitros registrados'}
          siguiente="Sin ellos no se puede crear el combate. Regístralos y vuelve a cargar."
          accion={{ label: 'Recargar', onPress: cargarCatalogo }}
        />
      )}

      <View style={s.card}>
        <Field label="Evento">
          <Selector testID="evento" value={eventoId} onChange={setEventoId} vacio="No hay eventos registrados" cargando={cargandoCatalogo}
            items={eventos.map(e => ({ id: e.id, label: `${e.nombre} · ${e.fecha}` }))} />
        </Field>
        <Field label="Pista">
          <TextInput testID="pista" style={s.input} value={pista} onChangeText={setPista} placeholderTextColor={C.textMuted} />
        </Field>
        <Field label="Árbitro">
          <Selector testID="arbitro" value={arbitroId} onChange={setArbitroId} vacio="No hay árbitros registrados" cargando={cargandoCatalogo}
            items={arbitros.map(u => ({ id: u.id, label: u.nombre }))} />
        </Field>
      </View>

      <TiradorSection lado="A" value={a} onChange={setA} />
      <TiradorSection lado="B" value={b} onChange={setB} />

      {error && (
        <StateMessage
          testID="config-error" tipo="error" titulo={error}
          siguiente="Corrige el dato y vuelve a pulsar Crear combate."
        />
      )}
      <Button
        testID="crear-combate-btn" variant="primary"
        label={enviando ? 'Creando…' : 'Crear combate'} shortcut="Ctrl+Intro"
        onPress={handleCrear} disabled={enviando}
      />
    </ScrollView>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: space(4), gap: space(3), maxWidth: 720, alignSelf: 'center', width: '100%' },
  section: { color: C.text, fontSize: FONT.lg, fontWeight: '700', marginTop: space(1) },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: space(4), gap: space(3) },
  cardTitle: { fontSize: FONT.md, fontWeight: '800' },
  field: { gap: space(1) },
  label: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  value: { color: C.text, fontSize: FONT.sm },
  hint: { color: C.textMuted, fontSize: FONT.sm },
  input: {
    color: C.text, fontSize: FONT.md, backgroundColor: C.surface, minHeight: CONTROL_HEIGHT,
    borderWidth: 1, borderColor: C.borderBright, borderRadius: RADIUS.md, paddingHorizontal: space(3),
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  choice: {
    minHeight: CONTROL_HEIGHT, justifyContent: 'center', paddingHorizontal: space(4),
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderBright, backgroundColor: C.surface,
  },
  choiceOn: { borderColor: C.cyan, backgroundColor: C.cyan + '22' },
  choiceText: { color: C.textMuted, fontSize: FONT.sm, fontWeight: '700' },
  choiceTextOn: { color: C.text },
});
