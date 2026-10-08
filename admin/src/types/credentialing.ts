// Response types for the credentialing hub tabs owned by this file's author:
// sanctions + verifications (operations.md §5, providers.md PSV), recred schedule and enrollment status (enrollments.md).

export interface DeferredResponse {
  integration: "deferred";
  message: string;
}

export type VerificationSource = "npi" | "oig" | "sam" | "state_license";

export interface SourceCheckValue {
  status: "pending" | "clear" | "flagged" | "error";
  message: string | null;
  checkedAt: string;
}
export type SourceCheck = SourceCheckValue | null;

export interface SanctionsRow {
  providerId: number;
  name: string;
  npi: string | null;
  checks: { npi: SourceCheck; oig: SourceCheck; sam: SourceCheck; state_license: SourceCheck };
  lastChecked: string | null;
  nextDue: string | null;
  daysUntilDue: number | null;
  status: "clear" | "flagged" | "never";
  dueSoon: boolean;
  overdue: boolean;
  flags: string[];
}

export interface SanctionsResponse {
  intervalDays: number;
  stats: { total: number; clear: number; flagged: number; never: number; dueSoon: number; overdue: number };
  items: SanctionsRow[];
}

export interface Verification {
  id: number;
  providerId: number;
  source: VerificationSource;
  sourceLabel: string;
  status: "clear" | "flagged";
  message: string | null;
  checkedAt: string;
  runBy: number | null;
  runByName: string | null;
}

export interface ProviderLite {
  id: number;
  name: string;
  npi: string | null;
  specialty: string | null;
  status: string;
  locationId: number | null;
}

// ---- Re-credentialing schedule ----
export type RecredWindow = "all" | "overdue" | "30" | "60" | "90";

export interface RecredItem {
  enrollmentId: number;
  providerId: number;
  providerName: string;
  providerNpi: string | null;
  payerId: number;
  payerName: string;
  payerColor: string;
  effectiveDate: string;
  cycleMonths: number;
  dueDate: string;
  daysUntil: number;
  bucket: "overdue" | "30" | "60" | "90" | "future";
  openRecredEnrollmentId: number | null;
}

export interface RecredScheduleResponse {
  today: string;
  window: string;
  counts: { all: number; overdue: number; due30: number; due60: number; due90: number; future: number };
  items: RecredItem[];
}

// ---- Enrollments ----
export type EnrollmentStatus = "draft" | "in_progress" | "submitted" | "approved" | "needs_attention" | "on_hold" | "terminated";

export interface Enrollment {
  id: number;
  providerId: number;
  providerName: string;
  providerNpi: string | null;
  payerId: number;
  payerName: string;
  payerColor: string;
  practiceId: number | null;
  practiceName: string | null;
  formId: number | null;
  formLabel: string | null;
  applicationType: "initial" | "recred" | "update" | "terminate";
  status: EnrollmentStatus;
  submittedDate: string | null;
  effectiveDate: string | null;
  tatDays: number | null;
  notes: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  fileCount: number;
  eventCount: number;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentEvent {
  id: number;
  enrollmentId: number;
  type: string;
  occurredAt: string;
  actorUserId: number | null;
  actorLabel: string | null;
  note: string | null;
  confirmationNumber: string | null;
}

export interface EnrollmentDetail {
  enrollment: Enrollment;
  files: unknown[];
  events: EnrollmentEvent[];
}

export interface EnrollmentSummary {
  total: number;
  byStatus: Record<EnrollmentStatus, number>;
  approved: number;
  active: number;
  avgTatDays: number | null;
}
