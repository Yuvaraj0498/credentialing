// Response types for /api/billing/*, /api/pricing/* and /api/providers/{id}/billing (docs/api/billing-reports.md).

export type InvoiceStatus = "draft" | "due" | "overdue" | "paid" | "void";
export type ServiceType = "new" | "recred";
export type PricingCategory = "medicare" | "medicaid" | "commercial";
export type Region = "northeast" | "south" | "midwest" | "west";

export interface InvoiceSummary {
  id: number;
  number: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paidDate: string | null;
  paidMethodLabel: string | null;
  subtotal: number;
  tax: number;
  total: number;
  lineCount: number;
}

export interface Subscription {
  packageId: string;
  packageName: string;
  color: string | null;
  colorSoft: string | null;
  basePrice: number | null;
  perProvider: number | null;
  providerCount: number;
  monthlyTotal: number;
  status: "active" | "past_due" | "canceled" | "trialing";
  startedAt: string;
  nextRenewalDate: string;
  providerCap: number | null;
  payerCap: number | null;
  aiUploadsPerMonth: number | null;
  primarySupport: string | null;
  activeProviders: number;
}

export interface BillingOverviewData {
  subscription: Subscription | null;
  usage: { aiUploadsThisMonth: number; aiUploadsLimit: number | null };
  providers: { active: number; cap: number | null };
  outstanding: { count: number; amount: number };
  paidThisYear: number;
  totalBilled: number;
  totalPaid: number;
  invoiceCount: number;
  paidCount: number;
  year: number;
  spendByMonth: { month: number; label: string; amount: number }[];
  recentInvoices: InvoiceSummary[];
}

export interface BillingPackage {
  id: string;
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
  features: string[];
  notIncluded: string[];
  current: boolean;
}

export interface Party {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email: string | null;
  phone: string | null;
}

export interface InvoiceLine {
  id: number;
  lineType: "subscription" | "service";
  description: string | null;
  packageId: string | null;
  packageName: string | null;
  basePrice: number | null;
  perProvider: number | null;
  providerCount: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  providerId: number | null;
  providerName: string | null;
  payerId: number | null;
  payerName: string | null;
  payerCategory: PricingCategory | null;
  stateCode: string | null;
  serviceType: ServiceType | null;
  amount: number;
}

export interface InvoiceDetailData {
  invoice: InvoiceSummary;
  paymentMethodId: number | null;
  from: Party;
  billTo: Party;
  lines: InvoiceLine[];
}

export interface PayInvoiceResponse {
  integration: "deferred";
  message: string;
  invoiceId: number;
  status: InvoiceStatus;
}

export interface PaymentMethod {
  id: number;
  brand: "Visa" | "Mastercard" | "Amex" | "Discover" | "Card";
  last4: string;
  exp: string;
  billingName: string;
  billingZip: string | null;
  isDefault: boolean;
  expired: boolean;
  createdAt: string;
}

export interface PricingState {
  code: string;
  name: string;
  mult: number;
  region: Region;
}

export interface PricingPayer {
  id: number;
  code: string;
  name: string;
  color: string;
  pricingCategory: PricingCategory;
  pricingMult: number;
}

export interface PricingMatrix {
  serviceType: ServiceType;
  payers: PricingPayer[];
  rows: { code: string; name: string; region: Region; mult: number; prices: { payerId: number; price: number }[]; minPrice: number | null; maxPrice: number | null }[];
  totalStates: number;
}

export interface ProviderBilling {
  providerId: number;
  stateCode: string;
  services: {
    lineId: number;
    invoiceId: number;
    invoiceNumber: string;
    date: string;
    invoiceStatus: InvoiceStatus;
    payerId: number | null;
    payerName: string | null;
    payerCategory: PricingCategory | null;
    stateCode: string | null;
    serviceType: ServiceType;
    amount: number;
  }[];
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  estimatedItems: {
    enrollmentId: number;
    payerId: number;
    payerName: string | null;
    payerColor: string | null;
    payerCategory: PricingCategory | null;
    enrollmentStatus: string;
    submittedDate: string | null;
    serviceType: ServiceType;
    amount: number;
  }[];
  estimatedUpcoming: number;
}
