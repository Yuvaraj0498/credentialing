export type Role = "platform_admin" | "org_admin" | "clerk" | "provider" | "auditor";
export type PermAction = "create" | "read" | "update" | "delete" | "list";
export type PermEntity =
  | "provider" | "enrollment" | "user" | "location" | "payer"
  | "document" | "task" | "billing" | "credential_vault" | "payer_submission";

export interface Me {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  title: string | null;
  role: Role;
  orgId: number | null;
  orgName: string | null;
  providerId: number | null;
  permissions: Record<string, PermAction[]>;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  user: Me;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Counters {
  openTasks: number;
  unreadNotifications: number;
  outstandingInvoices: number;
  unreadChat: number;
}

/** Response shape of endpoints whose external integration is scheduled for a later phase. */
export interface DeferredResponse {
  integration: "deferred";
  message: string;
}
