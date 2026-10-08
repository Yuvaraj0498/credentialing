"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { EMAIL_RE } from "@/lib/validation";

export interface EmailCheckTarget {
  /** what the address is for */
  kind: "user" | "provider" | "organization";
  /** the record being edited (its own address is fine) */
  id?: number | null;
  /** a user login: the provider it belongs to (the provider's address is fine) */
  providerId?: number | null;
  /** a user login that is the organization's admin (the organization's address is fine) */
  orgAdmin?: boolean;
}

/**
 * Warns while an email is typed when it already belongs to another person (organization, user of any role
 * or provider). Returns the warning, or "" when the address is free / not checked yet. The save checks again.
 */
export function useEmailCheck(email: string, target: EmailCheckTarget, enabled = true): string {
  const value = email.trim().toLowerCase();
  const debounced = useDebounced(value, 400);
  const [result, setResult] = useState<{ email: string; message: string }>({ email: "", message: "" });
  const { kind, id, providerId, orgAdmin } = target;

  useEffect(() => {
    if (!enabled || !EMAIL_RE.test(debounced)) return;
    let cancelled = false;
    api
      .get<{ available: boolean; message: string | null }>("/email-check", { email: debounced, kind, id: id ?? undefined, providerId: providerId ?? undefined, orgAdmin: orgAdmin || undefined })
      .then((r) => {
        if (!cancelled) setResult({ email: debounced, message: r.available ? "" : r.message || "This email is already in use" });
      })
      .catch(() => {
        /* the save reports it */
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, kind, id, providerId, orgAdmin, enabled]);

  return enabled && result.email === value ? result.message : "";
}
