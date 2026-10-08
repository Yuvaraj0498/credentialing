"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Loader: a large spinning ring centred in the visible page area, with an animated label.
 * `compact` is for small boxes (popups, widgets); `full` fills the whole screen (app start-up).
 */
export function Loading({ label = "Loading", className = "", full = false, compact = false }: { label?: string; className?: string; full?: boolean; compact?: boolean }) {
  const text = label.replace(/(…|\.\.\.)$/, "");
  const size = full ? "min-h-screen" : compact ? "py-10" : "page-loader";
  return (
    <div role="status" aria-live="polite" className={"flex flex-col items-center justify-center gap-4 text-sm text-ink-light " + size + " " + className}>
      <span className={"brand-loader" + (compact ? " sm" : "")} aria-hidden="true" />
      <span className="loading-dots font-medium">{text}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "var(--danger-soft)" }}>
        <Icon name="AlertCircle" size={22} style={{ color: "var(--danger)" }} />
      </div>
      <div className="font-display font-semibold text-ink">Something went wrong</div>
      <div className="text-sm text-ink-light mt-1">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary mt-4">
          <Icon name="RefreshCw" size={13} /> Try again
        </button>
      )}
    </div>
  );
}

/** Wraps a data section: loading → error → content. */
export function AsyncBoundary({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry?: () => void; children: ReactNode }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <Loading />;
  return <>{children}</>;
}
