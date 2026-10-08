// Response/request types for the credentialing-ops screens
// (expiration alerts, privileging, appointment letters, roster reconciliation).

import type { Role } from "@/types";

export const WRITER_ROLES: Role[] = ["platform_admin", "org_admin", "clerk"];
export const isWriterRole = (role: Role | undefined | null) => !!role && WRITER_ROLES.includes(role);

// ---------- Expiration alerts ----------
export type AlertCadence = "daily" | "weekly" | "hourly";
export type ExpirationTier = "expired" | "critical" | "warning" | "info";

export interface ExpirationAlertSettings {
  enabled: boolean;
  criticalDays: number;
  warningDays: number;
  infoDays: number;
  notifyEmail: boolean;
  notifyDashboard: boolean;
  cadence: AlertCadence;
  docTypes: string[];
}

export interface ExpirationItem {
  providerId: number;
  providerName: string;
  providerEmail: string | null;
  docType: string;
  docLabel: string;
  expiresAt: string;
  daysLeft: number;
  tier: ExpirationTier;
  source: "document" | "provider_profile";
}

export interface ExpirationAlertsResponse {
  enabled: boolean;
  settings: ExpirationAlertSettings;
  stats: { expired: number; critical: number; warning: number; info: number };
  items: ExpirationItem[];
}

export interface ExpirationNotifyResponse {
  queued: number;
  /** smtp = emailed, failed = the mail server refused it, deferred = email sending is switched off */
  integration: "smtp" | "failed" | "deferred";
  message: string;
}

// ---------- Hospitals / privileges ----------
export interface HospitalItem {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  active: boolean;
}

export type PrivilegeStatus = "none" | "requested" | "pending" | "granted" | "denied";

export interface PrivilegeItemStatus {
  privilegeItemId: number;
  name: string;
  sortOrder: number;
  status: PrivilegeStatus;
  requestedAt: string | null;
  decidedAt: string | null;
}

export interface PrivilegesResponse {
  providerId: number;
  providerName: string;
  specialty: string | null;
  hospitalId: number;
  hospitalName: string;
  categoryCode: string;
  categoryName: string;
  items: PrivilegeItemStatus[];
}

export interface ProviderLite {
  id: number;
  name: string;
  npi: string | null;
  specialty: string | null;
  status: string;
  locationId: number | null;
}

// ---------- Appointment letters ----------
export type LetterType = "initial" | "recred" | "privileging";

export interface Letter {
  id: number;
  letterType: LetterType;
  title: string;
  confirmationText: string;
  provider: {
    id: number;
    firstName: string;
    lastName: string;
    suffix: string | null;
    npi: string | null;
    specialty: string | null;
    licenseNumber: string | null;
    licenseState: string | null;
  };
  organization: {
    id: number;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  hospital: { id: number; name: string; city: string | null; state: string | null } | null;
  letterDate: string;
  effectiveDate: string;
  nextRecredDue: string;
  generatedAt: string;
  generatedBy: number | null;
  generatedByName: string | null;
}

// ---------- Payers / roster reconciliation ----------
export interface PayerLite {
  id: number;
  code: string;
  name: string;
  fullName: string | null;
  color: string;
  active: boolean;
}

export interface RosterMatched {
  providerId: number;
  providerName: string;
  npi: string | null;
  specialty: string | null;
  enrollmentId: number;
  entryId: number;
}

export interface RosterMissing {
  providerId: number;
  providerName: string;
  npi: string | null;
  specialty: string | null;
  enrollmentId: number;
}

export interface RosterNotOurs {
  entryId: number;
  npi: string | null;
  firstName: string | null;
  lastName: string | null;
  specialty: string | null;
  actionStatus: "none" | "termination_requested";
  providerId: number | null;
  reason: "not_our_provider" | "not_approved";
}

export interface RosterReconciliation {
  payerId: number;
  payerName: string;
  payerColor: string;
  uploadId: number | null;
  fileName: string | null;
  rowCount: number | null;
  uploadedAt: string | null;
  ourApprovedCount: number;
  matched: RosterMatched[];
  missingFromPayer: RosterMissing[];
  notOurs: RosterNotOurs[];
  integration: "deferred" | null;
  message: string | null;
}

export interface RosterEntryInput {
  npi?: string;
  firstName?: string;
  lastName?: string;
  specialty?: string;
}

export interface RosterUploadResponse {
  uploadId: number;
  payerId: number;
  fileName: string;
  rowCount: number;
  uploadedAt: string;
}

export interface TerminationRequestResponse {
  entryId: number;
  actionStatus: "termination_requested";
  taskId: number;
}
