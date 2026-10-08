"use client";

import { type ReactNode } from "react";
import { DOC_STATUS, PROVIDER_STATUS, STATUS } from "@/lib/constants";

export type PillType = "success" | "warn" | "danger" | "info" | "accent" | "neutral" | string;

export function Pill({ children, type = "neutral" }: { children: ReactNode; type?: PillType }) {
  return <span className={"pill pill-" + type}>{children}</span>;
}

/** Enrollment status pill (STATUS map). */
export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.draft;
  return <Pill type={s.pill}>{s.label}</Pill>;
}

/** Provider status pill. */
export function ProviderStatusPill({ status }: { status: string }) {
  const s = PROVIDER_STATUS[status] || { label: status, pill: "neutral" };
  return <Pill type={s.pill}>{s.label}</Pill>;
}

export function DocStatusBadge({ status }: { status: string }) {
  const s = DOC_STATUS[status] || DOC_STATUS.missing;
  return <Pill type={s.pill}>{s.label}</Pill>;
}

export function ConfidenceDot({ level }: { level: "high" | "medium" | "low" | string }) {
  return <span className={"confidence-dot conf-" + level}></span>;
}
