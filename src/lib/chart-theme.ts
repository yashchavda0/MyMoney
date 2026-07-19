export type Accent = "cooler" | "warmer" | "emerald";

export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: "cooler", label: "Cooler", swatch: "#60a5fa" },
  { value: "warmer", label: "Warmer", swatch: "#fbbf24" },
  { value: "emerald", label: "Emerald", swatch: "#10b981" },
];

/** Series colors for charts, per accent (SVG needs concrete hex, not CSS vars). */
export const CHART_COLORS: Record<Accent, { income: string; expense: string; primary: string }> = {
  cooler: { income: "#2dd4bf", expense: "#fb7185", primary: "#60a5fa" },
  warmer: { income: "#4ade80", expense: "#fb7185", primary: "#fbbf24" },
  emerald: { income: "#34d399", expense: "#fb7185", primary: "#10b981" },
};

export const DEFAULT_ACCENT: Accent = "cooler";

/** Coerce an unknown stored value to a valid accent. */
export function normalizeAccent(value: string | null | undefined): Accent {
  return ACCENTS.some((a) => a.value === value) ? (value as Accent) : DEFAULT_ACCENT;
}
