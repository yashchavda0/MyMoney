"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccent } from "@/components/accent-provider";
import { ACCENTS } from "@/lib/chart-theme";

/** Quick button that cycles through accent palettes. */
export function AccentToggle() {
  const { accent, setAccent } = useAccent();

  function cycle() {
    const i = ACCENTS.findIndex((a) => a.value === accent);
    setAccent(ACCENTS[(i + 1) % ACCENTS.length].value);
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Change colour palette" title="Change palette" onClick={cycle}>
      <Palette className="size-4" />
    </Button>
  );
}
