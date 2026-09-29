import React, { createContext, useContext, useState } from 'react';
import type { CombateActivo } from '../../domain/entities/Combate';

interface CombatContextValue {
  combate: CombateActivo | null;
  setCombate: (c: CombateActivo | null) => void;
}

const CombatCtx = createContext<CombatContextValue | null>(null);

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [combate, setCombate] = useState<CombateActivo | null>(null);
  return <CombatCtx.Provider value={{ combate, setCombate }}>{children}</CombatCtx.Provider>;
}

export function useCombat(): CombatContextValue {
  const ctx = useContext(CombatCtx);
  if (!ctx) throw new Error('useCombat must be inside CombatProvider');
  return ctx;
}
