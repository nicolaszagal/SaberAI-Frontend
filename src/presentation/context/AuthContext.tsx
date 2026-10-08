import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginApi, validarSesion } from '../../infrastructure/api/authApi';
import { alExpirarSesion, clearToken, getToken, setToken } from '../../infrastructure/api/sesionToken';

/** `validando`: se comprueba el token guardado con /auth/me antes de mostrar nada. */
export type EstadoAuth = 'validando' | 'sin_sesion' | 'autenticado';

interface AuthContextValue {
  estado: EstadoAuth;
  /** Aviso para el login cuando la sesión no pudo validarse (sin conexión). */
  aviso: string | null;
  /** Inicia sesión; lanza `LoginError` con el mensaje para el usuario si falla. */
  iniciarSesion: (usuario: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>(() => (getToken() ? 'validando' : 'sin_sesion'));
  const [aviso, setAviso] = useState<string | null>(null);

  // Al cargar, valida el token guardado con /auth/me.
  useEffect(() => {
    if (estado !== 'validando') return;
    let activo = true;
    validarSesion()
      .then(ok => { if (activo) setEstado(ok ? 'autenticado' : 'sin_sesion'); })
      .catch(() => {
        if (!activo) return;
        setAviso('No se pudo verificar la sesión. Inicie sesión de nuevo.');
        setEstado('sin_sesion');
      });
    return () => { activo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Un 401 en cualquier llamada a Fog devuelve al login.
  useEffect(() => alExpirarSesion(() => { setAviso(null); setEstado('sin_sesion'); }), []);

  const iniciarSesion = useCallback(async (usuario: string, password: string) => {
    setToken(await loginApi(usuario, password));
    setAviso(null);
    setEstado('autenticado');
  }, []);

  const cerrarSesion = useCallback(() => {
    clearToken();
    setAviso(null);
    setEstado('sin_sesion');
  }, []);

  const value = useMemo(
    () => ({ estado, aviso, iniciarSesion, cerrarSesion }),
    [estado, aviso, iniciarSesion, cerrarSesion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
