// CAQH payer authorization types (docs/api/enrollments.md › CAQH payer authorizations).

export interface CaqhAuthItem {
  payerId: number;
  payerCode: string;
  payerName: string;
  color: string;
  portalUrl: string | null;
  authorized: boolean;
  authorizedAt: string | null;
  revokedAt: string | null;
  lastDataPull: string | null;
}

export interface CaqhAuthList {
  providerId: number;
  providerName: string;
  caqhId: string | null;
  caqhLastAttested: string | null;
  caqhAttestationStatus: string | null;
  authorizedCount: number;
  capableCount: number;
  items: CaqhAuthItem[];
  nonCaqhPayers: { payerId: number; payerName: string; color: string; portalUrl: string | null }[];
}
