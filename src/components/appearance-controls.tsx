"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAccent } from "@/components/accent-provider";
import { ACCENTS, type Accent } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export function AppearanceControls() {
  const { accent, setAccent } = useAccent();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Theme</Label>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton active={!isDark} onClick={() => setTheme("light")} icon={<Sun className="size-4" />} label="Light" />
            <ModeButton active={isDark} onClick={() => setTheme("dark")} icon={<Moon className="size-4" />} label="Dark" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Colour palette</Label>
          <div className="grid grid-cols-2 gap-2">
            {ACCENTS.map((a) => (
              <PaletteButton key={a.value} accent={a} active={accent === a.value} onClick={() => setAccent(a.value)} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PaletteButton({
  accent,
  active,
  onClick,
}: {
  accent: { value: Accent; label: string; swatch: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="size-4 rounded-full" style={{ backgroundColor: accent.swatch }} />
        {accent.label}
      </span>
      {active && <Check className="size-4 text-primary" />}
    </button>
  );
}
