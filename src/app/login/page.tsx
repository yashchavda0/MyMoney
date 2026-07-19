"use client";

import * as React from "react";
import { Wallet, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Money</h1>
          <p className="text-sm text-muted-foreground">Your personal expense tracker</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <MailCheck className="mx-auto mb-3 size-8 text-income" />
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a magic link to <span className="text-foreground">{email}</span>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={status === "sending"}>
              {status === "sending" && <Loader2 className="size-4 animate-spin" />}
              Send magic link
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No password needed. We&apos;ll email you a sign-in link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
