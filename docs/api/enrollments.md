# Enrollments module API

All endpoints are under `/api`, need a JWT, and are scoped to the current org (platform_admin sends `X-Org-Id`). Dates are `"YYYY-MM-DD"` and datetimes are `"YYYY-MM-DDTHH:mm:ss"`. Errors use `{status, error, message, fieldErrors, timestamp, path}`.

"perm X:a" means the role_permission matrix check. The default matrix is:
- enrollment: list = PA, OA, C, A; read = PA, OA, C, P, A; create/update = PA, OA, C; delete = PA, OA.
- payer: list/read = everyone; create/update = PA, OA; delete = PA.
- credential_vault: PA, OA, C, P (auditor is denied).
- payer_submission: create = PA, OA, C; list/read = PA, OA, C, A.

"staff" means every role except provider.

Common types:
```ts
type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };
type EnrollmentStatus = 'draft'|'in_progress'|'submitted'|'approved'|'needs_attention'|'on_hold'|'terminated';
type ApplicationType = 'initial'|'recred'|'update'|'terminate';
type Deferred = { integration: 'deferred'; message: string };
```

## Payers (global catalog)
```ts
type PayerForm = { id: number; payerId: number; code: string; label: string; description: string|null; sortOrder: number };
type Payer = { id: number; code: string; name: string; fullName: string|null; category: string; payerType: string|null;
  color: string /*#hex*/; appForm: string|null; integration: 'caqh'|'availity'|'pecos'|'portal';
  apiSupport: 'full'|'partial'|'portal'|'manual'; caqhParticipating: boolean; portalUrl: string|null;
  avgTatDays: number|null; pricingCategory: 'medicare'|'medicaid'|'commercial'|null; pricingMult: number;
  recredCycleMonths: number; sortOrder: number; active: boolean; forms: PayerForm[]; createdAt: string; updatedAt: string };
type PayerRequest = { code: string /*^[a-z0-9_]+$*/; name: string; fullName?: string; category: string; payerType?: string;
  color?: string; appForm?: string; integration?: ...; apiSupport?: ...; caqhParticipating?: boolean; portalUrl?: string;
  avgTatDays?: number; pricingCategory?: ...; pricingMult?: number /*0.10-9.99, default 1*/; recredCycleMonths?: number /*1-120, default 24*/;
  sortOrder?: number; active?: boolean /*default true*/ };
type PayerOverviewItem = { payer: Payer; enrolledProviders: number /*distinct providers approved*/; inProgress: number /*in_progress+submitted*/;
  avgTatDays: number|null; avgTatComputed: boolean /*false = payer.avgTatDays fallback*/; orgCredentialSaved: boolean };
```
| Method | Path | Notes |
|---|---|---|
| GET | `/payers?activeOnly=false` | `Payer[]` sorted by sortOrder. perm payer:list |
| GET | `/payers/overview?activeOnly=true` | `PayerOverviewItem[]` for the current org (PayersView). Staff, perm payer:list |
| GET | `/payers/{id}` | `Payer`. perm payer:read |
| GET | `/payers/{id}/forms` | `PayerForm[]`. perm payer:read |
| POST | `/payers` | body `PayerRequest` → 201 `Payer`. perm payer:create. 409 if the code already exists |
| PUT | `/payers/{id}` | body `PayerRequest` → `Payer`. perm payer:update |
| DELETE | `/payers/{id}` | 204. perm payer:delete. **409** if enrollments or submissions reference it; the message suggests deactivating instead (PUT with `active:false`) |

## Enrollments
```ts
type Enrollment = { id: number; providerId: number; providerName: string; providerNpi: string|null;
  payerId: number; payerName: string; payerColor: string; practiceId: number|null; practiceName: string|null;
  formId: number|null; formLabel: string|null; applicationType: ApplicationType; status: EnrollmentStatus;
  submittedDate: string|null; effectiveDate: string|null; tatDays: number|null /*effective-submitted, when both set*/;
  notes: string|null; assignedUserId: number|null; assignedUserName: string|null;
  fileCount: number; eventCount: number; lastActivityAt: string|null /*latest event*/; createdAt: string; updatedAt: string };
type EnrollmentFile = { id: number; enrollmentId: number; name: string; fileType: 'welcome_letter'|'application_form'|'contract'|'other';
  mimeType: string|null; sizeBytes: number|null; hasFile: boolean /*false for seed rows without content*/;
  uploadedAt: string; uploadedBy: number|null; uploadedByName: string|null };
type EnrollmentEvent = { id: number; enrollmentId: number; type: string; occurredAt: string; actorUserId: number|null;
  actorLabel: string|null; note: string|null; confirmationNumber: string|null };
// event types: created, status_change, submitted, approved, terminated, note, follow_up, resubmitted,
//   recredential_started, submission_queued, submission_update (+ seed/legacy: docs_collected, ack, welcome, denied)
type EnrollmentDetail = { enrollment: Enrollment; files: EnrollmentFile[]; events: EnrollmentEvent[] /*newest first*/ };
type EnrollmentSummary = { total: number; byStatus: Record<EnrollmentStatus, number> /*all 7 keys*/; approved: number;
  active: number /*in_progress+submitted*/; avgTatDays: number|null };
type EnrollmentRequest = { providerId: number; payerId: number; status?: EnrollmentStatus /*default draft*/;
  applicationType?: ApplicationType /*default initial*/; practiceId?: number /*default: provider's practice*/; formId?: number /*must belong to payer*/;
  submittedDate?: string|null; effectiveDate?: string|null /*>= submittedDate*/; notes?: string; assignedUserId?: number /*staff user*/ };
type EnrollmentPatch = { status?; submittedDate?; effectiveDate?; assignedUserId?; notes?;
  clearSubmittedDate?: boolean; clearEffectiveDate?: boolean; clearAssignedUser?: boolean }; // null = unchanged
```
| Method | Path | Notes |
|---|---|---|
| GET | `/enrollments?q=&status=&providerId=&payerId=&page=0&size=50&sort=createdAt,desc` | `Page<Enrollment>`. `q` searches provider name, payer name/fullName, practice and NPI. `status=all` or omitted means no filter. Sort fields: providerName, payerName, practiceName, status, submittedDate, effectiveDate, tatDays, createdAt, updatedAt (append `,asc` or `,desc`). size ≤ 500. Staff, perm enrollment:list |
| GET | `/enrollments/summary?providerId=` | `EnrollmentSummary` (optionally for one provider, used by the ProviderEnrollments tabs). Staff, perm enrollment:list |
| GET | `/enrollments/{id}` | `EnrollmentDetail`. perm enrollment:read; provider users only see their own |
| POST | `/enrollments` | body `EnrollmentRequest` → 201 `Enrollment`, plus a `created` event. **409** if the provider already has a non-terminated `initial` enrollment with that payer. 400 if the payer is inactive. Staff, perm enrollment:create |
| PUT | `/enrollments/{id}` | body `EnrollmentRequest` (full replace) → `Enrollment`. A status change adds an event (`submitted` / `approved` / `terminated`, otherwise `status_change`). Approved or needs_attention also sends an org notification. tatDays is always recomputed, so clearing a date clears it. Staff, perm enrollment:update |
| PATCH | `/enrollments/{id}` | body `EnrollmentPatch` → `Enrollment` (inline "click to add"). Same rules as PUT |
| DELETE | `/enrollments/{id}` | 204 (also deletes the files). Staff, perm enrollment:delete |
| GET | `/enrollments/{id}/events` | `EnrollmentEvent[]` newest first. perm enrollment:read (provider: own) |
| POST | `/enrollments/{id}/events` | body `{type:'note'|'follow_up'; note: string}` → 201 `EnrollmentEvent`. Staff, perm enrollment:update |
| POST | `/enrollments/{id}/resubmit` | optional body `{note?: string}` → `Enrollment` (status becomes in_progress, plus a `resubmitted` event). Staff, perm enrollment:update |
| POST | `/enrollments/{id}/recredential` | → 201 `Enrollment`: a new `recred`/`draft` enrollment, with a `created` event on the new row and `recredential_started` on the source. 400 unless the source is approved. 409 if a recred is already open. Staff, perm enrollment:create |
| POST | `/enrollments/{id}/files` | multipart: `file` (pdf/png/jpg/jpeg/gif/webp/tif/tiff/doc/docx/xls/xlsx/csv/txt/heic, ≤25MB) and `fileType` (default other) → 201 `EnrollmentFile`. Staff, perm enrollment:update |
| GET | `/enrollment-files/{fileId}/download` | Binary attachment. 404 if the row has no stored content. perm enrollment:read (provider: own) |
| DELETE | `/enrollment-files/{fileId}` | 204. Staff, perm enrollment:update |

Provider users list their own enrollments through `/api/me/enrollments` (providers module).

## Payer application wizard & form mapping (Admin › Payer Applications)
```ts
type PayerApplicationRequest = { applicationType: ApplicationType; payerId: number; formId?: number|null /*null = "default" form*/; providerIds: number[] /*1..500*/ };
type PayerApplicationResponse = { created: Enrollment[] /*status draft, formId set*/;
  skipped: { providerId: number; providerName: string; existingEnrollmentId: number; reason: string }[] /*initial only: an open initial already exists*/ };
type FormMapping = { enrollmentId: number|null; applicationType: ApplicationType|null;
  payer: { id; code; name; fullName; color }; form: { id: number|null; code: string /*'default' when no form*/; label: string; description: string|null; usesDefaultTemplate: boolean };
  provider: { id; fullName; npi; specialty; caqhId }; practice: { id; name }|null; location: { id; name }|null;
  sections: { name: string; completion: string /*"7/9" filled/total*/; filled: number; total: number;
    fields: { fieldId: number; label: string; value: string|null; confidence: 'high'|'medium'|'low' /*'low' when value is null*/;
      configuredConfidence: 'high'|'medium'|'low'; mapsTo: string /*e.g. provider.npi*/ }[] }[];
  stats: { total: number; high: number; medium: number; low: number; completePct: number /*round((high+medium)/total*100)*/ };
  generatedAt: string };
```
| Method | Path | Notes |
|---|---|---|
| POST | `/payer-applications` | body `PayerApplicationRequest` → 201 `PayerApplicationResponse`. Staff, perm enrollment:create. Then open the mapping for `created[i].id` |
| GET | `/enrollments/{id}/form-mapping` | `FormMapping` for that enrollment's payer, form and provider. perm enrollment:read (provider: own) |
| GET | `/payer-forms/{formId}/mapping?providerId=` | `FormMapping` without an enrollment |
| GET | `/payers/{payerId}/form-mapping?providerId=&formId=` | Same; formId is optional (default template) |

Mapping rules: the form's own `payer_form_field` rows are used, otherwise the default template (form_id NULL). Values are resolved from the provider, the practice (enrollment practice, else the provider's practice) and the location (provider location, else the practice's Primary/first active location). Paths include `provider.fullName`, `location.cityStateZip`, and any other entity property. Location fax doesn't exist, so it is always null.

## Payer portal credentials (encrypted server-side)
```ts
type PayerCredential = { id: number; providerId: number|null /*null = org-level*/; payerId: number; payerName: string; payerColor: string;
  username: string; portalUrl: string|null; payerProviderId: string|null; groupTin: string|null; notes: string|null;
  hasPassword: boolean; lastTestAt: string|null; lastTestOk: boolean|null; updatedBy: number|null; createdAt: string; updatedAt: string };
type PayerCredentialRequest = { username: string; password?: string /*required on create; blank on update keeps the stored one; ≤500*/;
  portalUrl?: string; payerProviderId?: string /*≤60*/; groupTin?: string /*≤20*/; notes?: string /*≤1000*/ };
type CredentialMeta = { credentialId: number; payerId: number; username: string; hasPassword: boolean; updatedAt: string };
type CredentialMatrix = { payers: { id; code; name; color; portalUrl; apiSupport; caqhParticipating }[] /*active payers*/;
  orgLevel: CredentialMeta[]; providers: { providerId: number; providerName: string; npi: string|null; credentials: CredentialMeta[] }[] /*all org providers*/;
  providerCount: number /*providers with ≥1 login*/; credentialCount: number /*provider-level logins*/ };
```
| Method | Path | Notes |
|---|---|---|
| GET | `/payer-credentials` | Org-level `PayerCredential[]`. Staff, perm credential_vault:list |
| PUT | `/payer-credentials/{payerId}` | Upsert the org-level login → `PayerCredential`. Staff, perm credential_vault:create/update. Audited |
| DELETE | `/payer-credentials/{payerId}` | 204. Staff, perm credential_vault:delete. Audited |
| POST | `/payer-credentials/{payerId}/test` | `Deferred` ("Portal connection testing will be available in a later phase.") |
| GET | `/payer-credentials/matrix` | `CredentialMatrix` (PayersView provider context, PayerSubmissionCenter). Staff |
| POST | `/payer-credentials/{credentialId}/reveal` | `{credentialId, providerId, payerId, username, password: string|null}`. Allowed for platform_admin, org_admin, clerk, or the owning provider. Writes an audit_log row |
| GET | `/providers/{providerId}/payer-credentials` | `PayerCredential[]` for that provider ("My Payer Logins" uses the provider user's own providerId). perm credential_vault:list; provider: own only |
| PUT | `/providers/{providerId}/payer-credentials/{payerId}` | Upsert → `PayerCredential`. Provider: own only; auditor 403. Audited |
| DELETE | `/providers/{providerId}/payer-credentials/{payerId}` | 204. Audited |

## Zero-knowledge credential vault (PayerCredentialVault)
The browser encrypts the whole vault JSON (PBKDF2-SHA256 250k + AES-GCM, `base64(salt16|iv12|ct)`). The server stores only that ciphertext, one blob per org.

| Method | Path | Notes |
|---|---|---|
| GET | `/credential-vault` | `{exists: boolean; ciphertext: string|null; updatedAt: string|null; updatedBy: number|null}`. Staff, perm credential_vault:read |
| PUT | `/credential-vault` | body `{ciphertext: string /*base64, ≤1 MB*/}` → same shape as GET. Staff, perm credential_vault:create/update. Audited |
| DELETE | `/credential-vault` | 204 (reset/forgot passphrase). org_admin and platform_admin only. Audited |

## Payer submissions (PayerSubmissionCenter) — automated submission DEFERRED
```ts
type PayerSubmission = { id: number; providerId: number; providerName: string; payerId: number; payerName: string; payerColor: string;
  enrollmentId: number|null /*latest open (not approved/terminated) enrollment for provider+payer*/;
  method: 'api'|'portal'|'manual'|'fax'; status: 'queued'|'submitted'|'accepted'|'rejected'|'failed';
  confirmationNumber: string|null; message: string|null; documentCount: number /*provider's approved documents*/;
  submittedBy: number|null; submittedByName: string|null; submittedAt: string };
```
| Method | Path | Notes |
|---|---|---|
| POST | `/payer-submissions` | body `{providerId: number; payerIds: number[]; method?: 'api'|'portal'|'manual'|'fax'}` → **202** `{integration:'deferred', message, submissions: PayerSubmission[]}`. Every row gets status `queued` and the message "Queued — automated payer submission will be available in a later phase". The default method follows payer.apiSupport (full/partial → api, portal → portal, manual → manual). Adds a `submission_queued` event to the linked enrollment. perm payer_submission:create |
| GET | `/payer-submissions?providerId=&payerId=&status=&page=0&size=20` | `Page<PayerSubmission>`, newest first. perm payer_submission:list |
| PATCH | `/payer-submissions/{id}` | body `{status: 'submitted'|'accepted'|'rejected'|'failed'; confirmationNumber?: string; message?: string}` → `PayerSubmission`. Roles: platform_admin, org_admin, clerk. With a linked enrollment, `submitted` moves it from draft/in_progress/needs_attention/on_hold to submitted (submittedDate = today if empty) and adds a `submitted` event with the confirmation number. Other statuses add a `submission_update` event |

## CAQH payer authorizations (CAQHPayerAuthorization)
```ts
type CaqhAuthItem = { payerId: number; payerCode: string; payerName: string; color: string; portalUrl: string|null;
  authorized: boolean; authorizedAt: string|null; revokedAt: string|null; lastDataPull: string|null };
type CaqhAuthList = { providerId: number; providerName: string; caqhId: string|null; caqhLastAttested: string|null;
  caqhAttestationStatus: string|null; authorizedCount: number; capableCount: number;
  items: CaqhAuthItem[] /*active CAQH-participating payers*/; nonCaqhPayers: { payerId; payerName; color; portalUrl }[] };
```
| Method | Path | Notes |
|---|---|---|
| GET | `/providers/{providerId}/caqh-authorizations` | `CaqhAuthList`. Any role; provider: own only |
| PUT | `/providers/{providerId}/caqh-authorizations/{payerId}` | body `{authorized: boolean}` → `CaqhAuthItem`. Authorizing sets authorizedAt=now and clears revokedAt. Revoking keeps authorizedAt and sets revokedAt=now. 400 if the payer is not CAQH-participating. Roles: platform_admin, org_admin, clerk, or the own provider |
| POST | `/providers/{providerId}/caqh-authorizations/authorize-all` | → `CaqhAuthList` (every capable payer authorized, revokedAt cleared) |
| GET | `/caqh-authorizations/summary` | `{providerId, providerName, npi, caqhId, authorizedCount, capableCount}[]`. Staff |

Only the database side is live. Pushing to CAQH ProView and filling lastDataPull is a deferred integration.

## Re-credentialing schedule
| Method | Path | Notes |
|---|---|---|
| GET | `/recredentialing/schedule?window=all|overdue|30|60|90` | `{today: string; window: string; counts: {all, overdue, due30, due60, due90, future} /*tier-exclusive*/; items: Item[]}`. Staff, perm enrollment:list |

`Item = { enrollmentId; providerId; providerName; providerNpi; payerId; payerName; payerColor; effectiveDate; cycleMonths; dueDate /*effective + payer.recredCycleMonths*/; daysUntil /*negative = overdue*/; bucket: 'overdue'|'30'|'60'|'90'|'future'; openRecredEnrollmentId: number|null }`

There is one item per provider+payer (its latest approved enrollment with an effectiveDate), sorted by daysUntil. Windows are cumulative: `60` returns overdue, 30 and 60. "Start Recred" calls `POST /enrollments/{enrollmentId}/recredential`. Disable the button when `openRecredEnrollmentId` is set.

## Roster reconciliation
| Method | Path | Notes |
|---|---|---|
| POST | `/payers/{payerId}/rosters` | body `{fileName?: string; entries: {npi?: string /*10 digits or empty*/; firstName?; lastName?; specialty?}[] /*1..20000*/}` (the client parses the CSV) → 201 `{uploadId, payerId, fileName, rowCount, uploadedAt}`. Roles: platform_admin, org_admin, clerk |
| GET | `/payers/{payerId}/roster-reconciliation` | See the shape below. Staff |
| POST | `/roster-entries/{entryId}/termination-request` | → `{entryId, actionStatus: 'termination_requested', taskId}`. Creates a high-priority task due in 7 days and an org notification. 409 if already requested. Roles: platform_admin, org_admin, clerk |

```ts
type RosterReconciliation = { payerId; payerName; payerColor; uploadId: number|null; fileName: string|null; rowCount: number|null;
  uploadedAt: string|null /*null = no upload yet → prompt for upload*/; ourApprovedCount: number;
  matched: { providerId; providerName; npi; specialty; enrollmentId; entryId }[];
  missingFromPayer: { providerId; providerName; npi; specialty; enrollmentId }[];   // ours approved, not on roster → "Resubmit" = POST /enrollments/{enrollmentId}/resubmit
  notOurs: { entryId; npi; firstName; lastName; specialty; actionStatus: 'none'|'termination_requested'; providerId: number|null;
    reason: 'not_our_provider'|'not_approved' }[];
  integration: 'deferred'|null; message: string|null /*set when no upload exists*/ };
```
Entries match on NPI, or on first+last name when the entry has no NPI. Fetching rosters live from payers is deferred.
