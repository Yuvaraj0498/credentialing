# billing-reports API (dashboard, reports, billing, pricing, sidebar counters)

All endpoints require a JWT. Tenant = caller's org (platform_admin: `X-Org-Id` header). Dates are ISO strings (`"2026-05-19"`, datetimes `"2026-05-19T08:00:00"`), money is a JSON number with 2 decimals. Errors: `{status, error, message, fieldErrors, timestamp, path}`.
"Staff" = platform_admin, org_admin, clerk, auditor (provider gets 403).
CSV endpoints return `text/csv; charset=UTF-8` (UTF-8 BOM) with `Content-Disposition: attachment; filename="..."`.

Shared enums:
- `EnrollmentStatus = 'draft'|'in_progress'|'submitted'|'approved'|'needs_attention'|'on_hold'|'terminated'`
- `ProviderStatus = 'draft'|'in_progress'|'active'|'on_hold'|'terminated'`; `StatusKey` (for StatusPill) = active→`approved`, draft→`draft`, on_hold→`on_hold`, terminated→`terminated`, other→`in_progress`
- `DocStatus = 'approved'|'missing'|'expired'|'pending_review'|'na'`
- `InvoiceStatus = 'draft'|'due'|'overdue'|'paid'|'void'` (`overdue` is computed: stored `due` with dueDate < today)
- `ServiceType = 'new'|'recred'`; `PricingCategory = 'medicare'|'medicaid'|'commercial'`; `Region = 'northeast'|'south'|'midwest'|'west'`

TAT (turnaround days) of an enrollment = stored `tat_days`, else days(submittedDate → effectiveDate); unknown → excluded from averages.

---

## Sidebar

### GET /api/me/counters — any authenticated user
```ts
{ openTasks: number; unreadNotifications: number; outstandingInvoices: number; unreadChat: number }
```
- openTasks: org tasks with status `open`. outstandingInvoices: invoices with status != `paid` (0 unless role is platform_admin/org_admin/auditor).
- unreadChat: messages by others in channels (`ch_*`) and in DMs that include the user, newer than the user's read mark.
- provider users: only `unreadNotifications` is non-zero.

## Dashboard

### GET /api/dashboard/summary — staff
```ts
{
  stats: {
    totalProviders: number; activeProviders: number;
    providersInCredentialing: number;      // provider status draft|in_progress
    activeEnrollments: number;             // in_progress + submitted
    approvedEnrollments: number; needsAttentionEnrollments: number;
    avgTatDays: number | null;             // all enrollments with a known TAT
    openTasks: number; missingDocuments: number;
    docsExpiringWithin90Days: number;      // = upcomingExpirationsTotal
  };
  docs: { total: number; approved: number; missing: number; expired: number; pendingReview: number }; // 'na' excluded
  enrollmentsByStatus: Record<EnrollmentStatus, number>;   // only statuses present
  enrollmentsByPayer: { payerId: number; payerCode: string; payerName: string; color: string;
                        approved: number; inProgress: number; submitted: number; total: number }[]; // payers with ≥1 enrollment, total desc
  payerTat: { payerId: number; payerName: string; color: string; avgTatDays: number | null; count: number;
              benchmarkTatDays: number | null }[];  // count = enrollments with known TAT; sorted count desc
  upcomingExpirationsTotal: number;
  upcomingExpirations: { providerId: number; providerName: string; docType: string; docLabel: string;
                         expiresAt: string; daysLeft: number }[];  // approved docs expiring ≤90 days incl. already expired (daysLeft<0); daysLeft asc; max 8
}
```
Pill rule (frontend): daysLeft ≤ 0 → danger "Expired |n|d ago"; 1–30 warn; else info. Stat card sub-label: `${approvedEnrollments} approved`.

## Reports (all staff)

### GET /api/reports/provider-credentialing
```ts
{
  totalProviders: number; providersByStatus: Record<ProviderStatus, number>;
  totalMissing: number;                                   // docs with status 'missing'
  expirationBuckets: { expired: number; lt30: number; d30to60: number; d61to90: number }; // non-na docs with expiresAt
  avgTatDays: number | null;                              // approved enrollments
  completedCount: number;                                 // approved enrollments with known TAT
  inProgressCount: number;                                // in_progress + submitted
  tatTrend: { month: string /*YYYY-MM*/; label: string /*'Jan'*/; avgTatDays: number | null; count: number }[]; // last 12 months by effectiveDate, oldest first
  collectionByDocType: DocCollection[];                   // all document types
  providers: { providerId: number; name: string; specialty: string | null; status: ProviderStatus; statusKey: StatusKey;
               docsApproved: number; docsTotal: number /*non-na*/; docsMissing: number; docsExpired: number;
               docsPendingReview: number; percent: number /*0-100*/ }[];
}
type DocCollection = { docType: string; label: string; critical: boolean; approved: number; total: number /*providers where not na*/; percent: number };
```

### GET /api/reports/document-collection
`DocCollection[]` (replaces the prototype's DOC_COLLECTION_REPORT).

### GET /api/reports/provider-roster?q=&page=0&size=25&sort=name,asc
q matches "first last" name, NPI, specialty. sort field ∈ `name|specialty|status|docs|email|npi|caqh|location|practice|license|deaExpires|dateAdded`, dir `asc|desc` (400 on unknown). size ≤ 500.
```ts
PageResponse<{
  providerId: number; firstName: string; lastName: string; suffix: string | null; name: string;
  specialty: string | null; status: ProviderStatus; statusKey: StatusKey;
  docsApproved: number; docsTotal: number;
  email: string | null; npi: string | null; caqhId: string | null;
  locationId: number | null; locationName: string | null; practiceId: number | null; practiceName: string | null;
  licenseNumber: string | null; licenseState: string | null; licenseExpires: string | null;
  deaExpires: string | null; dateAdded: string | null;
}>   // { content, page, size, totalElements, totalPages }
```

### GET /api/reports/provider-roster/export.csv?columns=&q=&sort=
`columns` = comma list of the column ids above (default all 12, in order). `docs` expands to "Documents Met","Documents Total". File `provider-roster-YYYY-MM-DD.csv`.

### GET /api/reports/document-status?q=
Feeds both the "Checklist" sub-tab and DocumentStatusGrid.
```ts
{
  totals: { approved: number; missing: number; expired: number; pendingReview: number; na: number };
  byDocType: { docType: string; label: string; approved: number; total: number }[];
  docTypes: { docType: string; label: string; critical: boolean }[];      // column order
  providers: { providerId: number; name: string; statuses: Record<string /*docType*/, DocStatus> }[]; // missing row ⇒ 'missing'
}
```

### GET /api/reports/payer-enrollment
```ts
{
  total: number; byStatus: Record<EnrollmentStatus, number>;
  inProgress: number; submitted: number; approved: number; needsAttention: number;
  avgTatDays: number | null; tatSampleSize: number;       // approved enrollments only
  byPayer: { payerId: number; payerCode: string; payerName: string; color: string; total: number; draft: number;
             inProgress: number; submitted: number; approved: number; needsAttention: number; onHold: number;
             terminated: number; avgTatDays: number | null /*approved*/; benchmarkTatDays: number | null }[]; // total desc
  monthlyTrend: { month: string /*YYYY-MM*/; label: string; submitted: number /*by submittedDate*/;
                  approved: number /*approved, by effectiveDate*/ }[];  // last 12 months, oldest first
}
```
Label the needs_attention card "Needs Attention" (not "Denied").

### GET /api/reports/reappointments?q=
```ts
{
  overdue: number; dueSoon: number; current: number; notScheduled: number;
  rows: { providerId: number; name: string; specialty: string | null; lastCredentialed: string | null /*dateAdded*/;
          nextReappointment: string | null /*+730 days*/; daysLeft: number | null;
          status: 'overdue'|'due_soon'|'current'|'not_scheduled'; statusLabel: 'Overdue'|'Due Soon'|'Current'|'Not scheduled' }[];
}  // rows sorted daysLeft asc, nulls last. due_soon = 0..89 days.
```
Staff Performance / Analytics tabs: no endpoints (placeholders).

## Billing

Roles: read = platform_admin, org_admin, auditor; write = platform_admin, org_admin. clerk/provider → 403 (except `/api/providers/{id}/billing`, which clerk may read).

```ts
type InvoiceSummary = { id: number; number: string; invoiceDate: string; dueDate: string; status: InvoiceStatus;
  paidDate: string | null; paidMethodLabel: string | null /*'Visa •••• 4242'*/; subtotal: number; tax: number;
  total: number; lineCount: number };
type Subscription = { packageId: string; packageName: string; color: string | null; colorSoft: string | null;
  basePrice: number | null; perProvider: number | null; providerCount: number;
  monthlyTotal: number /*basePrice + perProvider × providerCount*/; status: 'active'|'past_due'|'canceled'|'trialing';
  startedAt: string; nextRenewalDate: string; providerCap: number | null; payerCap: number | null;
  aiUploadsPerMonth: number | null; primarySupport: string | null;
  activeProviders: number /*org providers whose status != terminated*/ };   // null cap = unlimited (show ∞)
```

### GET /api/billing/overview — read
```ts
{
  subscription: Subscription | null;
  usage: { aiUploadsThisMonth: number; aiUploadsLimit: number | null };
  providers: { active: number; cap: number | null };
  outstanding: { count: number; amount: number };          // status != paid (void excluded)
  paidThisYear: number;                                     // paid invoices with paidDate in current year
  totalBilled: number; totalPaid: number; invoiceCount: number; paidCount: number;   // void excluded
  year: number;
  spendByMonth: { month: number /*1-12*/; label: string /*'Jan'*/; amount: number }[];  // 12 entries, invoice totals by invoiceDate month, current year
  recentInvoices: InvoiceSummary[];                         // newest 3
}
```

### GET /api/billing/packages — any authenticated user
```ts
{ id: string /*'starter'|'professional'|'enterprise'*/; name: string; basePrice: number; perProvider: number;
  color: string; colorSoft: string; recommended: boolean; providerCap: number | null; payerCap: number | null;
  aiUploadsPerMonth: number | null; primarySupport: string | null; features: string[]; notIncluded: string[];
  current: boolean }[]
```

### GET /api/billing/subscription — read → `Subscription` (404 if the org has none)

### PUT /api/billing/subscription — write
Body `{ packageId: string; providerCount: number /*1..100000*/ }` → `Subscription`.
409 when providerCount > plan cap, when active providers > plan cap, or when distinct enrolled payers > payer cap (message explains). Changing package resets `startedAt`; `nextRenewalDate` kept if in the future, else today+1 month. Audit-logged + org notification. No proration (Stripe phase).

### GET /api/billing/invoices?status=&page=0&size=20 — read
`status` ∈ `all|draft|due|overdue|paid|void` (effective status). → `PageResponse<InvoiceSummary>` (newest first).

### GET /api/billing/invoices/export.csv?status= — read
Headers `Invoice #,Date,Due Date,Status,Amount,Paid Date`; file `invoices-YYYY-MM-DD.csv`.

### GET /api/billing/invoices/{id} — read
```ts
{
  invoice: InvoiceSummary; paymentMethodId: number | null;
  from:   Party;   // { name:'ZmartCredential, Inc.', address:'123 Main St', city:'Houston', state:'TX', zip:'77001', email:null, phone:null }
  billTo: Party;   // the tenant organization (name, address, city, state, zip, email, phone)
  lines: { id: number; lineType: 'subscription'|'service'; description: string | null;
           packageId: string | null; packageName: string | null; basePrice: number | null; perProvider: number | null;
           providerCount: number | null; periodStart: string | null; periodEnd: string | null;
           providerId: number | null; providerName: string | null; payerId: number | null; payerName: string | null;
           payerCategory: PricingCategory | null; stateCode: string | null; serviceType: ServiceType | null;
           amount: number }[];   // amounts are snapshots — never recompute
}
type Party = { name: string; address: string | null; city: string | null; state: string | null; zip: string | null; email: string | null; phone: string | null };
```

### POST /api/billing/invoices/{id}/pay — write
Body `{ paymentMethodId?: number }`. Card processing is deferred: always 200
`{ integration: 'deferred'; message: 'Online card payments will be available in a later phase. Your invoice remains due.'; invoiceId: number; status: InvoiceStatus }` and nothing changes. 404 unknown invoice/method, 409 already paid/void. Show the message as an info toast.

### POST /api/admin/invoices/{id}/mark-paid — platform_admin only (any org; no X-Org-Id needed)
Body (optional) `{ paymentMethodId?: number; paidDate?: string /*not future, default today*/ }` → `InvoiceSummary`.
Uses the given method (must belong to the invoice's org) or the org's default card; label `"<Brand> •••• <last4>"` or `"Manual payment"`. 409 if already paid/void. Audit-logged + org notification.

### Payment methods (card metadata only; PAN/CVC are never sent)
```ts
type PaymentMethod = { id: number; brand: 'Visa'|'Mastercard'|'Amex'|'Discover'|'Card'; last4: string; exp: string /*MM/YY*/;
  billingName: string; billingZip: string | null; isDefault: boolean; expired: boolean; createdAt: string };
```
- `GET /api/billing/payment-methods` — read → `PaymentMethod[]` (default first).
- `POST /api/billing/payment-methods` — write. Body `{ brand; last4 /*4 digits*/; exp /*MM/YY*/; billingName; billingZip /*5 digits*/ }` → 201 `PaymentMethod`. First card becomes default. 400 "Card is expired" when MM/YY is before the current month (current year computed). Field messages: "Invalid expiration (MM/YY)", "Cardholder name required", "Invalid ZIP", "Last 4 must be exactly 4 digits". Frontend detects brand from the number (^4 Visa, ^5[1-5] Mastercard, ^3[47] Amex, ^6 Discover, else Card) and sends only last4.
- `PATCH /api/billing/payment-methods/{id}/default` — write → `PaymentMethod[]`.
- `DELETE /api/billing/payment-methods/{id}` — write → 204. 409 when invoices are open (status not paid/void) and the card is the only one or the default (message tells the user what to do). Deleting the default otherwise promotes the oldest remaining card.

### GET /api/providers/{id}/billing — platform_admin, org_admin, auditor, clerk
```ts
{
  providerId: number; stateCode: string;          // provider.licenseState → location.state → 'TX'
  services: { lineId: number; invoiceId: number; invoiceNumber: string; date: string /*invoice date*/;
              invoiceStatus: InvoiceStatus; payerId: number | null; payerName: string | null;
              payerCategory: PricingCategory | null; stateCode: string | null; serviceType: ServiceType; amount: number }[]; // newest first
  totalBilled: number; totalPaid: number /*lines on paid invoices*/; totalOutstanding: number;
  estimatedItems: { enrollmentId: number; payerId: number; payerName: string | null; payerColor: string | null;
                    payerCategory: PricingCategory | null; enrollmentStatus: EnrollmentStatus; submittedDate: string | null;
                    serviceType: ServiceType; amount: number }[];  // non-terminated enrollments not yet on an invoice line (same payer + service type), priced with the formula
  estimatedUpcoming: number;
}
```

## Pricing

price = roundTo5(base[payer.pricingCategory][serviceType] × state.mult × payer.pricingMult); unknown state → TX; payer without pricing category → 0 (excluded from matrix).
Reads: staff. Writes: platform_admin.

- `GET /api/pricing/states` → `{ code: string; name: string; mult: number; region: Region }[]` (by code).
- `GET /api/pricing/base-rates` → `{ category: PricingCategory; serviceType: ServiceType; amount: number }[]`.
- `GET /api/pricing/payers` → `PricingPayer[]` = `{ id: number; code: string; name: string; color: string; pricingCategory: PricingCategory; pricingMult: number }[]` (active payers with a category, sort order).
- `GET /api/pricing/matrix?serviceType=new&region=&q=` (region `all` or Region; q matches state code/name) →
  `{ serviceType: ServiceType; payers: PricingPayer[]; rows: { code: string; name: string; region: Region; mult: number; prices: { payerId: number; price: number }[] /*same order as payers*/; minPrice: number | null; maxPrice: number | null }[]; totalStates: number }`
- `GET /api/pricing/quote?state=MA&payerId=1&serviceType=new` (`payerId` may be the numeric id or payer code e.g. `bcbs_tx`) →
  `{ requestedState: string | null; stateCode: string; stateFallback: boolean; payerId: number; payerName: string; category: PricingCategory | null; serviceType: ServiceType; baseRate: number | null; stateMult: number; payerMult: number; price: number }`
- `GET /api/pricing/matrix/export.csv?serviceType=` — headers `State Code,State Name,State Mult,<Payer> (New)...,<Payer> (Recred)...` (only one service type when given); file `pricing-matrix-YYYY-MM-DD.csv`.
- `PUT /api/admin/pricing/states/{code}` body `{ mult: number /*0.10–9.99, 2 decimals*/ }` → state DTO.
- `PUT /api/admin/pricing/base-rates/{category}/{serviceType}` body `{ amount: number /*≥0*/ }` → base-rate DTO.
