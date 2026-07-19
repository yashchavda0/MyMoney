"use client";

import * as React from "react";
import { type Accent, DEFAULT_ACCENT, normalizeAccent } from "@/lib/chart-theme";

const STORAGE_KEY = "accent";

interface AccentCtx {
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const Ctx = React.createContext<AccentCtx | null>(null);

export function useAccent() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useAccent must be used within AccentProvider");
  return ctx;
}

/** Inline script that applies the saved accent before first paint (no flash). */
export function AccentScript() {
  const valid = "cooler warmer emerald";
  const js = `(function(){try{var a=localStorage.getItem('${STORAGE_KEY}');if('${valid}'.indexOf(a)<0)a='${DEFAULT_ACCENT}';document.documentElement.setAttribute('data-accent',a);}catch(e){document.documentElement.setAttribute('data-accent','${DEFAULT_ACCENT}');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<Accent>(DEFAULT_ACCENT);

  React.useEffect(() => {
    const stored = normalizeAccent(localStorage.getItem(STORAGE_KEY));
    setAccentState(stored);
    document.documentElement.setAttribute("data-accent", stored);
  }, []);

  const setAccent = React.useCallback((a: Accent) => {
    setAccentState(a);
    document.documentElement.setAttribute("data-accent", a);
    try {
      localStorage.setItem(STORAGE_KEY, a);
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = React.useMemo(() => ({ accent, setAccent }), [accent, setAccent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
