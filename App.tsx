import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemeProvider, useC } from './src/presentation/context/ThemeContext';
import { CombatProvider } from './src/presentation/context/CombatContext';
import { AuthProvider, useAuth } from './src/presentation/context/AuthContext';
import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { SessionProvider } from './src/presentation/context/SessionContext';
import { AppHeader } from './src/presentation/components/AppHeader';
import { LiveScreen } from './src/presentation/screens/LiveScreen';
import { ConfigScreen } from './src/presentation/screens/ConfigScreen';
import { HistoryScreen } from './src/presentation/screens/HistoryScreen';

// Validación 1: CamerasScreen y TournamentScreen quedan aparcadas en validacion2/.
export type Screen = 'live' | 'config' | 'history';

const SCREENS: Screen[] = ['live', 'config', 'history'];

/** Mapea un pathname de navegador a la pantalla correspondiente (web only); la ruta por defecto es Revisión VAR. */
function screenFromPath(pathname: string): Screen {
  const segment = pathname.replace(/^\//, '');
  return (SCREENS as string[]).includes(segment) ? (segment as Screen) : 'live';
}

/** Ruta del navegador de cada pantalla: Revisión VAR es la raíz. */
function pathOf(screen: Screen): string {
  return screen === 'live' ? '/' : `/${screen}`;
}

// ─── Inner app (needs ThemeProvider already mounted) ─────────────────────────

function Inner() {
  const C = useC();
  // La pantalla inicial se toma de la URL solicitada (deep link / recarga);
  // sin ruta conocida se abre Revisión VAR.
  const [screen, setScreen] = useState<Screen>(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? screenFromPath(window.location.pathname)
      : 'live',
  );

  // ── Orientation lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, []);

  // ── Browser history (web only) ────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    window.history.replaceState({ screen }, '', pathOf(screen));

    const onPopState = (e: PopStateEvent) => {
      const s: Screen = (e.state?.screen as Screen) ?? screenFromPath(window.location.pathname);
      setScreen(s);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Navigate (pushes browser entry) ──────────────────────────────────────
  const navigate = useCallback((next: Screen) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({ screen: next }, '', pathOf(next));
    }
    setScreen(next);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="auto" />
      <AppHeader screen={screen} onNavigate={navigate} />
      <View style={styles.body}>
        {screen === 'live'      && <LiveScreen onNavigate={navigate} />}
        {screen === 'config'     && <ConfigScreen />}
        {screen === 'history'    && <HistoryScreen onNavigate={navigate} />}
      </View>
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

/** Puerta de acceso: sin sesión validada no se monta ninguna pantalla protegida ni se llama al Fog. */
function Gate() {
  const C = useC();
  const { estado } = useAuth();
  if (estado === 'validando') return <View testID="validando-sesion" style={{ flex: 1, backgroundColor: C.bg }} />;
  if (estado === 'sin_sesion') return <LoginScreen />;
  return (
    <CombatProvider>
      <SessionProvider>
        <Inner />
      </SessionProvider>
    </CombatProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ body: { flex: 1 } });
