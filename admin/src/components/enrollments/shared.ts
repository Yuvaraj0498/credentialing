"use client";

import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { Payer, ProviderLite } from "@/types/enrollments";

/** Display name of a provider-lite row ("First Last" or the server `name`). */
export function providerName(p?: ProviderLite | null): string {
  if (!p) return "";
  const fl = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return fl || p.name || "";
}

/** First name (used by "Submit for <firstName>", placeholders). */
export function providerFirstName(p?: ProviderLite | null): string {
  if (!p) return "";
  if (p.firstName) return p.firstName;
  return (p.name || "").split(/\s+/)[0] || "";
}

/** Last name (wizard rows show "Last, First"). */
export function providerLastName(p?: ProviderLite | null): string {
  if (!p) return "";
  if (p.lastName) return p.lastName;
  const base = (p.name || "").split(",")[0].trim().split(/\s+/);
  return base.length > 1 ? base[base.length - 1] : "";
}

/** "Last, First" like the prototype wizard rows. */
export function providerLastFirst(p?: ProviderLite | null): string {
  const last = providerLastName(p);
  const first = providerFirstName(p);
  return last ? last + ", " + first : providerName(p);
}

export function fetchProvidersLite() {
  return api.get<ProviderLite[]>("/providers/all-lite");
}

export function useProvidersLite(enabled = true) {
  return useAsync<ProviderLite[]>(enabled ? fetchProvidersLite : null, [enabled]);
}

export function usePayers(activeOnly = true) {
  return useAsync<Payer[]>(() => api.get<Payer[]>("/payers", { activeOnly }), [activeOnly]);
}

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "on_hold", label: "On Hold" },
  { value: "terminated", label: "Terminated" },
];

/** Adds months to a YYYY-MM-DD date. */
export function addMonthsISO(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}

/** Client-side file save (JSON export etc.). */
export function saveBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
