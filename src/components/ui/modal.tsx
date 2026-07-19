"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "my-8 w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl",
          className,
        )}
      >
        {(title || description) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title && <h2 className="text-base font-semibold">{title}</h2>}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
