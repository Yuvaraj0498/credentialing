import type { Role } from "@/types";

export interface User {
  id: number;
  orgId: number | null;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  title: string | null;
  phone: string | null;
  role: Role;
  providerId: number | null;
  providerName: string | null;
  disabled: boolean;
  selfSignup: boolean;
  testData: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  /** role name from the super admin's User Roles */
  userRoleId: number | null;
  userRoleName: string | null;
}

export interface UserCreate {
  displayName: string;
  firstName?: string;
  lastName?: string;
  /** optional: the email is the username when left out */
  username?: string;
  email: string;
  password: string;
  role: Role;
  title?: string;
  phone?: string;
  providerId?: number | null;
  disabled?: boolean;
  userRoleId: number;
}

export type UserUpdate = Omit<UserCreate, "username" | "password"> & { password?: string | null };

/** GET /api/providers/all-lite row. */
export interface ProviderLite {
  id: number;
  name: string;
  npi: string | null;
  specialty: string | null;
  status: string;
  locationId: number | null;
}
