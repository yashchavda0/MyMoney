"use client";

import * as React from "react";
import { Share, Plus, Download, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "money.iosInstallDismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS Safari exposes navigator.standalone instead of display-mode.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
}

/** Shared install state: native-prompt availability + platform + installed flag. */
export function useInstall() {
  const [installed, setInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = React.useState(false);

  React.useEffect(() => {
    setInstalled(detectStandalone());
    setIsIOS(detectIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
      deferred.current = null;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return false;
    await evt.prompt();
    await evt.userChoice;
    deferred.current = null;
    setCanPrompt(false);
    return true;
  }, []);

  return { installed, isIOS, canPrompt, promptInstall };
}

function IOSInstructions() {
  return (
    <ol className="space-y-3 text-sm">
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
        Tap the <Share className="mx-1 inline size-4 align-text-bottom" /> Share button in the browser toolbar.
      </li>
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
        Choose <span className="font-medium">Add to Home Screen</span>.
      </li>
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
        Tap <span className="font-medium">Add</span> — Money appears on your home screen.
      </li>
    </ol>
  );
}

/** Menu row for the More sheet / sidebar footer. Hidden once installed. */
export function InstallMenuItem({ className }: { className?: string }) {
  const { installed, isIOS, canPrompt, promptInstall } = useInstall();
  const [showHelp, setShowHelp] = React.useState(false);

  if (installed) return null;
  // If not installable natively and not iOS, there is nothing useful to offer.
  if (!canPrompt && !isIOS) return null;

  const onClick = () => {
    if (canPrompt) void promptInstall();
    else setShowHelp(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <Download className="size-4" />
        Add to Home Screen
      </button>
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Add Money to your Home Screen">
        <IOSInstructions />
      </Modal>
    </>
  );
}

/** First-visit dismissible banner for iOS Safari users who haven't installed. */
export function InstallBanner() {
  const { installed, isIOS, canPrompt } = useInstall();
  const [dismissed, setDismissed] = React.useState(true); // default hidden until we confirm
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Native-installable platforms use the menu item; the banner is iOS-only.
  if (installed || dismissed || !isIOS || canPrompt) return null;

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm md:hidden">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Plus className="size-4" />
        </div>
        <button className="min-w-0 flex-1 text-left" onClick={() => setShowHelp(true)}>
          <span className="block font-medium">Install Money</span>
          <span className="block truncate text-xs text-muted-foreground">Add to your Home Screen for quick access.</span>
        </button>
        <button onClick={close} aria-label="Dismiss" className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Add Money to your Home Screen">
        <IOSInstructions />
      </Modal>
    </>
  );
}
