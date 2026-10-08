import { api } from "@/lib/api";
import { US_STATES } from "@/lib/constants";

/** GET /api/public/packages row. */
export interface Package {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  perProvider: number;
  color: string;
  colorSoft: string;
  recommended: boolean;
  providerCap: number | null;
  payerCap: number | null;
  aiUploadsPerMonth: number | null;
  primarySupport: string | null;
  sortOrder: number;
  features: string[];
  notIncluded: string[];
}

export interface StateOption {
  code: string;
  name: string;
}

export const loadPackages = () => api.get<Package[]>("/public/packages");
export const loadStates = () => api.get<StateOption[]>("/public/states");

/** Used while /public/states is loading or unavailable. */
export const FALLBACK_STATES: StateOption[] = US_STATES.map((code) => ({ code, name: code }));

/** prototype calcSubscriptionTotal (L4815) */
export const calcSubscriptionTotal = (pkg: Package | undefined, n: number) => (pkg ? pkg.basePrice + pkg.perProvider * n : 0);

/** No cap (null) or the prototype's 999 sentinel = unlimited. */
export const isUnlimited = (cap: number | null) => cap == null || cap >= 999;
export const overCap = (pkg: Package, n: number) => !isUnlimited(pkg.providerCap) && n > (pkg.providerCap as number);

/** Detects the card brand from the number prefix (defaults to Visa like the prototype). */
export function detectCardBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, "");
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "Mastercard";
  if (/^(6011|65|64[4-9]|622)/.test(n)) return "Discover";
  if (/^4/.test(n)) return "Visa";
  return "Visa";
}

export const EMAIL_RE = /^[^@]+@[^@]+\.[^@]+$/;
