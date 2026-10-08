// Response types for GET /api/dashboard/summary (docs/api/billing-reports.md).

export interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  providersInCredentialing: number;
  activeEnrollments: number;
  approvedEnrollments: number;
  needsAttentionEnrollments: number;
  avgTatDays: number | null;
  openTasks: number;
  missingDocuments: number;
  docsExpiringWithin90Days: number;
}

export interface DashboardPayerCount {
  payerId: number;
  payerCode: string;
  payerName: string;
  color: string;
  approved: number;
  inProgress: number;
  submitted: number;
  total: number;
}

export interface DashboardPayerTat {
  payerId: number;
  payerName: string;
  color: string;
  avgTatDays: number | null;
  count: number;
  benchmarkTatDays: number | null;
}

export interface DashboardExpiration {
  providerId: number;
  providerName: string;
  docType: string;
  docLabel: string;
  expiresAt: string;
  daysLeft: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  docs: { total: number; approved: number; missing: number; expired: number; pendingReview: number };
  enrollmentsByStatus: Record<string, number>;
  enrollmentsByPayer: DashboardPayerCount[];
  payerTat: DashboardPayerTat[];
  upcomingExpirationsTotal: number;
  upcomingExpirations: DashboardExpiration[];
}
