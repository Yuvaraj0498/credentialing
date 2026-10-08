// Payer submission types (docs/api/enrollments.md › Payer submissions).

export type SubmissionMethod = "api" | "portal" | "manual" | "fax";
/** in_progress: portal opened, staff are completing the application there */
export type SubmissionStatus = "queued" | "in_progress" | "submitted" | "accepted" | "rejected" | "failed";

export interface PayerSubmission {
  id: number;
  providerId: number;
  providerName: string;
  payerId: number;
  payerName: string;
  payerColor: string;
  enrollmentId: number | null;
  method: SubmissionMethod;
  status: SubmissionStatus;
  confirmationNumber: string | null;
  message: string | null;
  documentCount: number;
  submittedBy: number | null;
  submittedByName: string | null;
  submittedAt: string;
}

export interface SubmitResponse {
  integration: "portal" | "deferred";
  message: string;
  submissions: PayerSubmission[];
}

export interface SubmissionOutcome {
  status: Exclude<SubmissionStatus, "queued" | "in_progress">;
  confirmationNumber?: string;
  message?: string;
}

export const SUBMISSION_PILL: Record<SubmissionStatus, string> = {
  queued: "warn",
  in_progress: "accent",
  submitted: "info",
  accepted: "success",
  rejected: "danger",
  failed: "danger",
};

/** POST /payer-submissions/{id}/portal-login — automatic sign-in to the payer portal. */
export type PortalLoginOutcome = "logged_in" | "login_failed" | "mfa_required" | "captcha" | "no_login_form" | "error";

export interface PortalLoginResult {
  outcome: PortalLoginOutcome;
  message: string;
  portalUrl: string | null;
  finalUrl: string | null;
  pageTitle: string | null;
  pageText: string | null;
  /** PNG, base64 */
  screenshot: string | null;
  durationMs: number;
  username: string;
  loginLevel: "provider" | "organization";
  submission: PayerSubmission;
}
