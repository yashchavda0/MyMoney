"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { enableSms, regenToken, setSmsEnabled, setAutoInsert } from "@/app/actions/sms";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="tabular min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
          {value}
        </code>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4 text-income" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function SmsAutoImportPanel({
  enabled,
  autoInsert,
  webhookUrl,
}: {
  enabled: boolean;
  autoInsert: boolean;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [showGuide, setShowGuide] = React.useState(false);

  async function onEnable() {
    setBusy(true);
    setError("");
    const res = await enableSms();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setToken(res.token);
    setShowGuide(true);
    router.refresh();
  }

  async function onRegen() {
    if (!window.confirm("Generate a new token? The old one stops working — update your Shortcut.")) return;
    setBusy(true);
    const res = await regenToken();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setToken(res.token);
    router.refresh();
  }

  async function onToggleEnabled() {
    setBusy(true);
    await setSmsEnabled(!enabled);
    setBusy(false);
    router.refresh();
  }

  async function onToggleAuto() {
    setBusy(true);
    await setAutoInsert(!autoInsert);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Why this exists / how it learns / privacy */}
      <Card>
        <CardContent className="space-y-3 pt-4 text-sm">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Why it learns.</span> Bank SMS wording differs across banks and
              every merchant is new at first. The app reads amount, account and merchant from each message, then maps your
              merchants to categories. You confirm the first unknown one; it remembers the rest.
            </p>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-income" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Privacy.</span> iOS never lets an app read your SMS. Instead a
              Shortcut you control sends only the bank message text to your own app over HTTPS, protected by a secret token.
              Duplicate messages for the same card swipe are ignored automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {!enabled ? (
        <Button onClick={onEnable} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Enable auto-import
        </Button>
      ) : (
        <Card>
          <CardHeader className="py-3">
            <CardTitle>Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyField label="Webhook URL (POST)" value={webhookUrl} />

            {token ? (
              <div className="space-y-1">
                <CopyField label="Your token — copy it now, shown once" value={token} />
                <p className="text-xs text-expense">Save it into your Shortcut now; you can&apos;t see it again.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Token is hidden. Regenerate if you lost it.</p>
                <Button variant="outline" size="sm" onClick={onRegen} disabled={busy}>
                  Regenerate token
                </Button>
              </div>
            )}

            <label className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">Auto-insert</span>
                <span className="block text-xs text-muted-foreground">
                  Off = every SMS waits in Review. On = insert when the category is known.
                </span>
              </span>
              <input type="checkbox" checked={autoInsert} onChange={onToggleAuto} className="size-4 accent-[var(--primary)]" />
            </label>

            <button
              onClick={() => setShowGuide((s) => !s)}
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              {showGuide ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              iPhone setup (zero-touch)
            </button>
            {showGuide && <IosGuide webhookUrl={webhookUrl} />}

            <div className="border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={onToggleEnabled} disabled={busy} className="text-destructive">
                Disable auto-import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function IosGuide({ webhookUrl }: { webhookUrl: string }) {
  const steps = [
    "Shortcuts app → Shortcuts tab → + → add action “Get Contents of URL”.",
    `Set URL to ${webhookUrl}, Method = POST, Request Body = JSON.`,
    "Add JSON fields: text = Shortcut Input, token = your token above, sender = (optional).",
    "Add “Show Notification” with the response so you see “Added ₹… ·  …”. Save it as “Log SMS”.",
    "Automation tab → + → Personal Automation → Message.",
    "Set “Sender contains” your bank IDs (e.g. HDFCBK, ICICIB) or “Message contains” debited / credited / spent.",
    "Action = Run Shortcut → “Log SMS”. Pass the message as its input.",
    "Turn OFF “Ask Before Running” → Don’t Ask. Now bank SMS post themselves.",
  ];
  return (
    <ol className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {i + 1}
          </span>
          <span className="text-muted-foreground">{s}</span>
        </li>
      ))}
    </ol>
  );
}
