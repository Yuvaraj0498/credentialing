"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { busyStore } from "@/lib/busy";

/**
 * While something is being saved (create / edit / delete / upload) and the list refreshes after it, the whole
 * screen — sidebar and popups included — is blurred with the loader on top. Quick saves (< 0.2 s) don't flash it.
 */
/** The same blurred full-screen loader, shown while `show` is true (e.g. while signing in). */
export function BlurLoader({ show, label = "Please wait" }: { show: boolean; label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!show || !mounted) return null;
  return createPortal(
    <div role="status" aria-live="polite" className="page-blur busy-blur text-sm text-ink-light">
      <span className="brand-loader" aria-hidden="true" />
      <span className="loading-dots font-medium">{label}</span>
    </div>,
    document.body
  );
}

export function BusyOverlay() {
  const count = useSyncExternalStore(busyStore.subscribe, busyStore.count, () => 0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (count === 0) {
      const t = setTimeout(() => setShown(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, [count]);
  if (!shown || count === 0) return null;
  return createPortal(
    <div role="status" aria-live="polite" className="page-blur busy-blur text-sm text-ink-light">
      <span className="brand-loader" aria-hidden="true" />
      <span className="loading-dots font-medium">Please wait</span>
    </div>,
    document.body
  );
}
