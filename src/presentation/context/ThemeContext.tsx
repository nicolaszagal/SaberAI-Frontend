import React, { createContext, useContext, useState, useMemo } from 'react';
import { DARK_THEME, LIGHT_THEME, type ThemeColors } from '../theme/colors';

export type ThemeName = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  C: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  C: LIGHT_THEME,
  toggleTheme: () => {},
});

/** Acceso al objeto de colores del tema activo */
export const useC = (): ThemeColors => useContext(ThemeContext).C;

/** Acceso al tema completo (nombre + toggle) */
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light');

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    C: theme === 'light' ? LIGHT_THEME : DARK_THEME,
    toggleTheme: () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
