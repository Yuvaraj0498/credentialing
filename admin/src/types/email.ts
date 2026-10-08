// Response types for /api/email (docs/api/operations.md §4).

export type ReminderType = "missing_docs" | "expiring" | "incomplete";
export type Cadence = "daily" | "weekly" | "biweekly" | "monthly";

export interface ReminderRow {
  providerId: number;
  name: string;
  email: string | null;
  locationId: number | null;
  locationName: string | null;
  providerStatus: string;
  missing: number;
  total: number;
  missingCritical: number;
  expiringSoon: number;
  status: "missing_all" | "has_missing" | "complete";
  statusLabel: "Missing Documents" | "Has Missing" | "Complete";
  lastSentAt: string | null;
  scheduleId: number | null;
  cadence: Cadence | null;
}

export interface ReminderListResponse {
  items: ReminderRow[];
  counts: { all: number; missing: number; active: number; complete: number };
}

export interface TemplateItem {
  id: number;
  type: ReminderType;
  name: string;
  subject: string;
  body: string;
  system: boolean;
  variables: string[];
}

export interface TemplatePreview {
  subject: string;
  body: string;
  providerId: number | null;
  toEmail: string | null;
}

export interface ScheduleItem {
  id: number;
  reminderType: ReminderType;
  templateId: number | null;
  templateName: string | null;
  cadence: Cadence;
  active: boolean;
  nextRunAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  providerCount: number;
  providers: { id: number; name: string; email: string | null }[];
}

export interface SendNowResponse {
  /** reminders processed (sent, failed, or only recorded when email is off) */
  queued: number;
  skipped: number;
  /** smtp = emails were sent; deferred = email sending is switched off on the server */
  integration: "smtp" | "deferred";
  message: string;
  sent: number;
  failed: number;
}

export interface EmailLogItem {
  id: number;
  providerId: number | null;
  providerName: string | null;
  scheduleId: number | null;
  toEmail: string;
  subject: string;
  status: "queued" | "sent" | "failed" | "bounced";
  createdAt: string;
}

export const CADENCE_LABEL: Record<Cadence, string> = { daily: "Daily", weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly" };

export const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  missing_docs: "Missing Documents",
  expiring: "Expiring Documents",
  incomplete: "Incomplete Profile",
};
