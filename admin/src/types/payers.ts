// Types for payers, payer portal credentials, payer applications and form mapping (docs/api/enrollments.md).
import type { ApiSupport, ApplicationType, Enrollment, Payer } from "./enrollments";

export type { Payer, PayerForm, ApiSupport, ApplicationType } from "./enrollments";

export interface PayerOverviewItem {
  payer: Payer;
  enrolledProviders: number;
  inProgress: number;
  avgTatDays: number | null;
  avgTatComputed: boolean;
  orgCredentialSaved: boolean;
}

export interface PayerCredential {
  id: number;
  providerId: number | null;
  payerId: number;
  payerName: string;
  payerColor: string;
  username: string;
  portalUrl: string | null;
  payerProviderId: string | null;
  groupTin: string | null;
  notes: string | null;
  hasPassword: boolean;
  /** org-level login: the providers who use it (empty for a provider's own login) */
  providerIds: number[];
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayerCredentialRequest {
  username: string;
  password?: string;
  portalUrl?: string;
  payerProviderId?: string;
  groupTin?: string;
  notes?: string;
  /** required for an org-level login: the providers who use it */
  providerIds?: number[];
}

export interface CredentialMeta {
  credentialId: number;
  payerId: number;
  username: string;
  hasPassword: boolean;
  updatedAt: string;
  providerIds: number[];
}

export interface MatrixPayer {
  id: number;
  code: string;
  name: string;
  color: string;
  portalUrl: string | null;
  apiSupport: ApiSupport;
  caqhParticipating: boolean;
}

export interface CredentialMatrix {
  payers: MatrixPayer[];
  orgLevel: CredentialMeta[];
  providers: { providerId: number; providerName: string; npi: string | null; credentials: CredentialMeta[] }[];
  providerCount: number;
  credentialCount: number;
}

export interface RevealResponse {
  credentialId: number;
  providerId: number | null;
  payerId: number;
  username: string;
  password: string | null;
  /** the login's own portal address, else the payer's */
  portalUrl: string | null;
  payerProviderId: string | null;
  groupTin: string | null;
}

export interface PayerApplicationRequest {
  applicationType: ApplicationType;
  payerId: number;
  formId?: number | null;
  providerIds: number[];
}

export interface PayerApplicationResponse {
  created: Enrollment[];
  skipped: { providerId: number; providerName: string; existingEnrollmentId: number; reason: string }[];
}

export type Confidence = "high" | "medium" | "low";

export interface FormMappingField {
  fieldId: number;
  label: string;
  value: string | null;
  confidence: Confidence;
  configuredConfidence: Confidence;
  mapsTo: string;
}

export interface FormMapping {
  enrollmentId: number | null;
  applicationType: ApplicationType | null;
  payer: { id: number; code: string; name: string; fullName: string | null; color: string };
  form: { id: number | null; code: string; label: string; description: string | null; usesDefaultTemplate: boolean };
  provider: { id: number; fullName: string; npi: string | null; specialty: string | null; caqhId: string | null };
  practice: { id: number; name: string } | null;
  location: { id: number; name: string } | null;
  sections: { name: string; completion: string; filled: number; total: number; fields: FormMappingField[] }[];
  stats: { total: number; high: number; medium: number; low: number; completePct: number };
  generatedAt: string;
}
