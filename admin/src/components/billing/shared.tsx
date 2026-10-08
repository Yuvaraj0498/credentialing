"use client";

import { Pill } from "@/components/Pill";
import { useAuth } from "@/stores/auth";
import type { InvoiceStatus, Party } from "@/types/billing";

/** Billing roles: read = platform_admin, org_admin, auditor; write = platform_admin, org_admin. */
export function useBillingAccess() {
  const { user } = useAuth();
  const role = user?.role;
  const canRead = role === "platform_admin" || role === "org_admin" || role === "auditor";
  const canWrite = role === "platform_admin" || role === "org_admin";
  return { canRead, canWrite, role };
}

/** Prototype pill rule: paid → success, due → warn, otherwise danger (draft/void neutral). */
export function invoicePillType(status: InvoiceStatus) {
  if (status === "paid") return "success";
  if (status === "due") return "warn";
  if (status === "draft" || status === "void") return "neutral";
  return "danger";
}

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return <Pill type={invoicePillType(status)}>{status}</Pill>;
}

export const isPayable = (status: InvoiceStatus) => status !== "paid" && status !== "void";

export const brandColor = (brand: string) => (brand === "Visa" ? "#1a1f71" : brand === "Mastercard" ? "#eb001b" : "#0f172a");

/** null cap = unlimited. */
export const capText = (n: number | null | undefined) => (n == null ? "∞" : String(n));

export const cityLine = (p: Party) => [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export const capitalize = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
