// Response types for /api/reports/* (docs/api/billing-reports.md).

export type ProviderStatus = "draft" | "in_progress" | "active" | "on_hold" | "terminated";
export type StatusKey = "approved" | "draft" | "on_hold" | "terminated" | "in_progress";
export type DocStatus = "approved" | "missing" | "expired" | "pending_review" | "na";

export interface DocCollection {
  docType: string;
  label: string;
  critical: boolean;
  approved: number;
  total: number;
  percent: number;
}

export interface ProviderCredentialingReportData {
  totalProviders: number;
  providersByStatus: Record<string, number>;
  totalMissing: number;
  expirationBuckets: { expired: number; lt30: number; d30to60: number; d61to90: number };
  avgTatDays: number | null;
  completedCount: number;
  inProgressCount: number;
  tatTrend: { month: string; label: string; avgTatDays: number | null; count: number }[];
  collectionByDocType: DocCollection[];
  providers: {
    providerId: number;
    name: string;
    specialty: string | null;
    status: ProviderStatus;
    statusKey: StatusKey;
    docsApproved: number;
    docsTotal: number;
    docsMissing: number;
    docsExpired: number;
    docsPendingReview: number;
    percent: number;
  }[];
}

export interface RosterRow {
  providerId: number;
  firstName: string;
  lastName: string;
  suffix: string | null;
  name: string;
  specialty: string | null;
  status: ProviderStatus;
  statusKey: StatusKey;
  docsApproved: number;
  docsTotal: number;
  email: string | null;
  npi: string | null;
  caqhId: string | null;
  locationId: number | null;
  locationName: string | null;
  practiceId: number | null;
  practiceName: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseExpires: string | null;
  deaExpires: string | null;
  dateAdded: string | null;
}

export interface DocumentStatusReport {
  totals: { approved: number; missing: number; expired: number; pendingReview: number; na: number };
  byDocType: { docType: string; label: string; approved: number; total: number }[];
  docTypes: { docType: string; label: string; critical: boolean }[];
  providers: { providerId: number; name: string; statuses: Record<string, DocStatus> }[];
}

export interface PayerEnrollmentReportData {
  total: number;
  byStatus: Record<string, number>;
  inProgress: number;
  submitted: number;
  approved: number;
  needsAttention: number;
  avgTatDays: number | null;
  tatSampleSize: number;
  byPayer: {
    payerId: number;
    payerCode: string;
    payerName: string;
    color: string;
    total: number;
    draft: number;
    inProgress: number;
    submitted: number;
    approved: number;
    needsAttention: number;
    onHold: number;
    terminated: number;
    avgTatDays: number | null;
    benchmarkTatDays: number | null;
  }[];
  monthlyTrend: { month: string; label: string; submitted: number; approved: number }[];
}

export type ReappointmentStatus = "overdue" | "due_soon" | "current" | "not_scheduled";

export interface ReappointmentReport {
  overdue: number;
  dueSoon: number;
  current: number;
  notScheduled: number;
  rows: {
    providerId: number;
    name: string;
    specialty: string | null;
    lastCredentialed: string | null;
    nextReappointment: string | null;
    daysLeft: number | null;
    status: ReappointmentStatus;
    statusLabel: string;
  }[];
}
