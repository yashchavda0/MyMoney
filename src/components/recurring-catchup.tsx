"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { catchUpRecurring } from "@/app/actions/recurring";

// Module-level guard so this runs at most once per page-load session.
let ranThisSession = false;

/** Silently materializes any due recurring transactions when the app first mounts. */
export function RecurringCatchup() {
  const router = useRouter();
  React.useEffect(() => {
    if (ranThisSession) return;
    ranThisSession = true;
    catchUpRecurring()
      .then((res) => {
        if (res.created > 0) router.refresh();
      })
      .catch(() => {
        ranThisSession = false; // allow a retry on next mount if it failed
      });
  }, [router]);
  return null;
}
