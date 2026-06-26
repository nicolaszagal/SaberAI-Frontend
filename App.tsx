import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemeProvider, useC } from './src/presentation/context/ThemeContext';
import { SessionProvider } from './src/presentation/context/SessionContext';
import { AppHeader } from './src/presentation/components/AppHeader';
import { DashboardScreen } from './src/presentation/screens/DashboardScreen';
import { LiveScreen } from './src/presentation/screens/LiveScreen';
import { CamerasScreen } from './src/presentation/screens/CamerasScreen';
import { ConfigScreen } from './src/presentation/screens/ConfigScreen';
import { HistoryScreen } from './src/presentation/screens/HistoryScreen';
import { TournamentScreen } from './src/presentation/screens/TournamentScreen';

export type Screen = 'dashboard' | 'live' | 'cameras' | 'config' | 'history' | 'tournament';

// ─── Inner app (needs ThemeProvider already mounted) ─────────────────────────

function Inner() {
  const C = useC();
  const [screen, setScreen] = useState<Screen>('dashboard');

  // ── Orientation lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, []);

  // ── Browser history (web only) ────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    window.history.replaceState({ screen: 'dashboard' }, '', '/');

    const onPopState = (e: PopStateEvent) => {
      const s: Screen = (e.state?.screen as Screen) ?? 'dashboard';
      setScreen(s);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Navigate (pushes browser entry) ──────────────────────────────────────
  const navigate = useCallback((next: Screen) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = next === 'dashboard' ? '/' : `/${next}`;
      window.history.pushState({ screen: next }, '', path);
    }
    setScreen(next);
  }, []);

  // ── Back (uses browser history on web) ───────────────────────────────────
  const goBack = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.back();   // triggers popstate → setScreen('dashboard')
    } else {
      setScreen('dashboard');
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="auto" />
      <AppHeader screen={screen} onBack={goBack} />
      <View style={styles.body}>
        {screen === 'dashboard' && <DashboardScreen onNavigate={navigate} />}
        {screen === 'live'      && <LiveScreen />}
        {screen === 'cameras'   && <CamerasScreen />}
        {screen === 'config'     && <ConfigScreen />}
        {screen === 'history'    && <HistoryScreen />}
        {screen === 'tournament' && <TournamentScreen />}
      </View>
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <Inner />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ body: { flex: 1 } });
