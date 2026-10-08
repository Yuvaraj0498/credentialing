import type { PermAction, PermEntity, Role } from "@/types";

export type Matrix = Record<string, Record<string, Role[]>>;

export interface RoleDef {
  id: Role;
  label: string;
  color: string;
  desc: string;
}

export interface PermissionMatrix {
  roles: RoleDef[];
  entities: PermEntity[];
  actions: PermAction[];
  matrix: Matrix;
  defaults: Matrix;
  hasOrgOverrides: boolean;
  canEdit: boolean;
  canEditDefaults: boolean;
}

/** Prototype ROLES constant (L13745) — used for role dots/labels where the API matrix is not loaded. */
export const ROLES: RoleDef[] = [
  { id: "platform_admin", label: "Platform Admin", color: "#dc2626", desc: "Full access across all orgs — ZmartCredential staff only" },
  { id: "org_admin", label: "Org Admin", color: "#f97316", desc: "Full access within own organization" },
  { id: "clerk", label: "Credentialing Clerk", color: "#2563eb", desc: "Day-to-day credentialing work; cannot manage users/billing" },
  { id: "provider", label: "Provider", color: "#059669", desc: "Self-service portal — own profile and docs only" },
  { id: "auditor", label: "Auditor", color: "#6b7280", desc: "Read-only across all data for compliance review" },
];
