/** Super admin API shapes (GET /platform/summary, /platform/admins, /user-roles). */
export interface AdminSummary {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  orgId: number;
  orgName: string | null;
  orgStatus: string | null;
  planName: string | null;
  providerCount: number;
  userCount: number;
  disabled: boolean;
  createdAt: string;
}

export interface PlatformSummary {
  organizations: number;
  admins: number;
  users: number;
  providers: number;
  userRoles: number;
  recentAdmins: AdminSummary[];
}

export interface UserRoleItem {
  id: number;
  name: string;
  accessLevel: "org_admin" | "clerk" | "auditor" | "provider";
  /** Users with a disabled role cannot sign in. */
  active: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
  /** The Administrator role (Create Admin) or the Provider role (Providers module): cannot be deleted or disabled. */
  builtIn: boolean;
}
