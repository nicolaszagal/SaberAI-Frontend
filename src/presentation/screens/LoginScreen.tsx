import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getNodoFog, setNodoFog, validarNodoFog } from '../../infrastructure/config';
import { probarNodoFog, type PruebaNodo } from '../../infrastructure/api/nodoApi';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';

/** Pantalla de acceso: usuario y contraseña. Sin "recordarme" (el token vive solo en la pestaña). */
export function LoginScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { iniciarSesion, aviso } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodo, setNodo] = useState(getNodoFog);
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<PruebaNodo | null>(null);

  const puedeEnviar = usuario.length > 0 && password.length > 0 && !enviando;

  const cambiarNodo = (texto: string) => {
    setNodo(texto);
    setPrueba(null);
    setError(null);
    const v = validarNodoFog(texto);
    if (v.ok) setNodoFog(v.url);
  };

  const probar = async () => {
    const v = validarNodoFog(nodo);
    if (!v.ok) { setPrueba({ tipo: 'error', mensaje: v.mensaje }); return; }
    setNodoFog(v.url);
    setProbando(true);
    setPrueba(null);
    setPrueba(await probarNodoFog(v.url));
    setProbando(false);
  };

  const enviar = async () => {
    if (!puedeEnviar) return;
    const v = validarNodoFog(nodo);
    if (!v.ok) { setError(v.mensaje); return; }
    setNodoFog(v.url);
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(usuario, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
      setPassword('');
      setEnviando(false);
    }
  };

  const mensaje = error ?? aviso;

  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.logo}>SABRE.AI</Text>
        <Text style={s.titulo}>Iniciar sesión</Text>

        <Text style={s.label}>Nodo Fog</Text>
        <TextInput
          testID="login-nodo"
          style={s.input}
          value={nodo}
          onChangeText={cambiarNodo}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!enviando}
          maxLength={200}
          placeholder="http://localhost:8001"
          accessibilityLabel="Nodo Fog"
        />
        <TouchableOpacity
          testID="login-probar"
          accessibilityRole="button"
          accessibilityState={{ disabled: probando }}
          disabled={probando}
          style={[s.btnSec, probando && s.btnOff]}
          onPress={probar}
        >
          <Text style={s.btnSecText}>{probando ? 'Probando…' : 'Probar conexión'}</Text>
        </TouchableOpacity>
        {prueba && (
          <Text
            testID="login-prueba"
            accessibilityRole="alert"
            style={prueba.tipo === 'ok' ? s.ok : prueba.tipo === 'degradado' ? s.aviso : s.error}
          >
            {prueba.mensaje}
          </Text>
        )}

        <Text style={s.label}>Usuario</Text>
        <TextInput
          testID="login-usuario"
          style={s.input}
          value={usuario}
          onChangeText={setUsuario}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!enviando}
          maxLength={128}
          onSubmitEditing={enviar}
        />

        <Text style={s.label}>Contraseña</Text>
        <TextInput
          testID="login-password"
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!enviando}
          maxLength={256}
          onSubmitEditing={enviar}
        />

        {mensaje && (
          <Text testID="login-error" accessibilityRole="alert" style={s.error}>{mensaje}</Text>
        )}

        <TouchableOpacity
          testID="login-btn"
          accessibilityRole="button"
          accessibilityState={{ disabled: !puedeEnviar }}
          disabled={!puedeEnviar}
          style={[s.btn, !puedeEnviar && s.btnOff]}
          onPress={enviar}
        >
          <Text style={s.btnText}>{enviando ? 'Ingresando…' : 'Ingresar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: space(4) },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: C.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border, padding: space(6), gap: space(2),
  },
  logo:   { color: C.text, fontSize: FONT.xl, fontWeight: '800' },
  titulo: { color: C.textMuted, fontSize: FONT.md, marginBottom: space(2) },
  label:  { color: C.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  input: {
    minHeight: CONTROL_HEIGHT, borderWidth: 1, borderColor: C.borderBright, borderRadius: RADIUS.md,
    paddingHorizontal: space(3), color: C.text, backgroundColor: C.card, fontSize: FONT.md,
  },
  error:   { color: C.red, fontSize: FONT.sm, marginTop: space(1) },
  ok:      { color: C.green, fontSize: FONT.sm, marginTop: space(1) },
  aviso:   { color: C.orange, fontSize: FONT.sm, marginTop: space(1) },
  btnSec: {
    minHeight: CONTROL_HEIGHT, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderBright,
  },
  btnSecText: { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  btn: {
    minHeight: CONTROL_HEIGHT, alignItems: 'center', justifyContent: 'center', marginTop: space(2),
    borderRadius: RADIUS.md, backgroundColor: C.cyan,
  },
  btnOff:  { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: FONT.md, fontWeight: '700' },
});
