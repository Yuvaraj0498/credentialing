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
}

export interface UserCreate {
  displayName: string;
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  title?: string;
  phone?: string;
  providerId?: number | null;
  disabled?: boolean;
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
