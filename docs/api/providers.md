# providers API (providers, documents, secure links, activity, PSV, letters, provider portal)

All endpoints require a JWT except `/api/public/**`. Tenant = caller's org (platform_admin: `X-Org-Id` header). Dates are ISO strings (`"2026-05-19"`, datetimes `"2026-05-19T08:00:00"`). Errors: `{status, error, message, fieldErrors, timestamp, path}` — `fieldErrors` maps request field -> message (show under the form field).
"Staff" = platform_admin, org_admin, clerk, auditor. "Writers" = platform_admin, org_admin, clerk. Permission checks use the role matrix (`provider:*`, `document:*`) — read the caller's permissions from `GET /api/auth/me`.

Enums:
- `ProviderStatus = 'draft'|'in_progress'|'active'|'on_hold'|'terminated'` (label draft = "Pending")
- `DocStatus = 'approved'|'missing'|'expired'|'pending_review'|'na'`
- `DocType` = document_type code: `diploma, medical_license, dea, malpractice, cv, board_cert, w9, gov_id, csr_license, cme, claim_history, clia, collaborative, ecfmg`
- `ProviderSource = 'manual'|'caqh'|'invite'|'self_signup'`

## Shared types
```ts
type DocProgress = { approved: number; required: number /* non-N/A docs */; missingCritical: number /* critical docs missing|expired */ };
type EnrollmentCounts = { total: number; approved: number };
type DocumentRow = {
  id: number; providerId: number; docType: DocType; label: string; critical: boolean;
  expires: boolean;            // document type has an expiration
  sortOrder: number | null; status: DocStatus;
  fileName: string | null; mimeType: string | null; sizeBytes: number | null;
  originalRelativePath: string | null;   // folder sync
  expiresAt: string | null; daysUntilExpiry: number | null /* negative = past */;
  uploadedAt: string | null; hasFile: boolean;
};
type ProviderDetail = {
  id: number; firstName: string; lastName: string; suffix: string | null; specialty: string | null;
  practitionerType: string | null; taxonomyCode: string | null; gender: string | null; ethnicity: string | null;
  dateOfBirth: string | null; npi: string | null; email: string | null; phone: string | null;
  licenseNumber: string | null; licenseState: string | null; licenseExpires: string | null;
  deaNumber: string | null; deaExpires: string | null; boardCert: string | null; malpracticeCarrier: string | null;
  caqhId: string | null; caqhUsername: string | null; caqhLastAttested: string | null; caqhLastSynced: string | null;
  caqhAttestationStatus: string | null;
  clientId: number | null; clientName: string | null; practiceId: number | null; practiceName: string | null;
  locationId: number | null; locationName: string | null;
  status: ProviderStatus; telemed: boolean; source: ProviderSource; dateAdded: string; selfSignup: boolean;
  createdAt: string; updatedAt: string;
  documentProgress: DocProgress; enrollments: EnrollmentCounts;
  documents: DocumentRow[];   // all 14 checklist rows, sorted
};
```

---

## Providers

### GET /api/providers — `provider:list` (staff)
Query: `q?` (matches "first last", specialty, email — case-insensitive; npi / caqhId substring), `status?` (ProviderStatus or `all`), `practiceId?`, `locationId?`, `clientId?`, `unassigned?=true` (no location), `page=0`, `size=25` (max 200), `sort=lastName,asc` (fields: `lastName|name|firstName|specialty|status|npi|dateAdded|createdAt|email`, dir `asc|desc`; 400 for others).
```ts
PageResponse<{
  id: number; firstName: string; lastName: string; suffix: string | null; specialty: string | null;
  status: ProviderStatus; email: string | null; phone: string | null; npi: string | null; caqhId: string | null;
  clientId: number | null; practiceId: number | null; practiceName: string | null;
  locationId: number | null; locationName: string | null;
  telemed: boolean; source: ProviderSource; dateAdded: string;
  documents: DocProgress; enrollments: EnrollmentCounts;
}>   // { content, page, size, totalElements, totalPages }
```

### GET /api/providers/all-lite — `provider:list`
`{ id: number; name: string; npi: string | null; specialty: string | null; status: ProviderStatus; locationId: number | null }[]` (sorted by last name, no paging).

### GET /api/providers/assignment-summary — `provider:list`
```ts
{ total: number; assigned: number; unassigned: number; locations: number;
  byLocation: { locationId: number; locationName: string; legalName: string | null; practiceId: number | null; count: number }[] }  // every org location, incl. count 0
```

### GET /api/providers/{id} — `provider:read` (staff; provider user only own id) → `ProviderDetail`

### POST /api/providers — `provider:create` → 201 `ProviderDetail`
```ts
{ firstName: string /* required, ≤80 */; lastName: string /* required, ≤80 */; suffix?: string; specialty?: string;
  npi?: string /* 10 digits or empty */; email?: string; phone?: string; licenseNumber?: string;
  licenseState?: string /* 2 letters */; licenseExpires?: string;
  practitionerType?: string; taxonomyCode?: string; gender?: string; dateOfBirth?: string;
  deaNumber?: string; deaExpires?: string; boardCert?: string; malpracticeCarrier?: string; caqhId?: string /* digits */;
  clientId?: number; practiceId?: number; locationId?: number; telemed?: boolean }
```
Server sets status `draft`, source `manual`, dateAdded today, creates the 14-row document checklist (missing; ecfmg `na`). 409 if NPI already exists in the org. Hierarchy rules as in PUT.

### PUT /api/providers/{id} — `provider:update` → `ProviderDetail` (ProviderEditModal)
```ts
{ firstName: string; lastName: string; suffix: string | null; npi: string /* required, 10 digits ("10 digits required") */;
  caqhId: string | null; specialty: string | null; email: string | null; phone: string | null;
  licenseNumber: string | null; licenseState: string | null; status: ProviderStatus /* required */;
  clientId: number | null; practiceId: number | null; locationId: number | null;
  // optional extended fields: only changed when sent non-null
  licenseExpires?: string; taxonomyCode?: string; deaNumber?: string; deaExpires?: string; boardCert?: string;
  malpracticeCarrier?: string; practitionerType?: string; gender?: string; ethnicity?: string; dateOfBirth?: string; telemed?: boolean }
```
- Core fields (first block) are replaced — send the current value to keep it, null/"" clears it.
- Hierarchy: location must belong to the practice, practice to the client (400 otherwise). Parents are derived from the most specific id given (send only `locationId` and practice + client are filled in).
- 409 if the NPI belongs to another provider in the org.

### PATCH /api/providers/{id}/status — `provider:update`
Body `{ status: ProviderStatus }` → `ProviderDetail`. Adds an org notification when changed.

### PUT /api/providers/{id}/assignment — `provider:update`
Body `{ locationId: number | null }` (null = unassign; practice/client are kept) → `ProviderDetail`. Assigning sets practiceId/clientId from the location.

### POST /api/providers/bulk-assign — `provider:update`
Body `{ providerIds: number[] /* ≥1 */; locationId: number | null }` → `{ updated: number; locationId: number | null; locationName: string | null }`. One transaction; 404 if any id is not in the org.

### DELETE /api/providers/{id} — `provider:delete` (org_admin, platform_admin) → 204
Deletes provider, documents (incl. stored files), enrollments, invites, activity (DB cascade).

### POST /api/providers/import — `provider:create` (CAQH CSV import)
The frontend parses the CSV exactly like the prototype (`parseCaqhCsv` single export / `parseBulkCsv` roster) and posts the rows.
```ts
// request
{ practiceId?: number; locationId?: number;   // optional target for all rows (hierarchy rules as PUT)
  providers: {                                 // 1..1000
    rowIndex?: number;                          // shown back in skipped[]; default = position (1-based)
    caqhId?: string; npi?: string; firstName?: string; middleName?: string; lastName?: string; suffix?: string;
    specialty?: string; taxonomy?: string; dob?: string; gender?: string; email?: string; phone?: string;
    license?: string; licenseState?: string; licenseExpiration?: string; licenseIssued?: string; licenseStatus?: string;
    dea?: string; deaExpiration?: string; malpracticeCarrier?: string; malpracticeExpiration?: string;
    boardCert?: string; boardCertExpiration?: string;
    lastAttestation?: string; attestationStatus?: string; profileStatus?: string; authStatus?: string;
  }[] }
// response
{ created: { id: number; name: string }[];
  skipped: { rowIndex: number; name: string; reason: string }[] }
```
- Per-row validation (row is skipped, not the whole import): "Missing name", "Invalid NPI" (must be 10 digits), "Invalid email", duplicate NPI in the file, "A provider with NPI … already exists".
- Dates: `YYYY-MM-DD` (or `M/D/YYYY`); unparsable dates are ignored.
- Created providers: source `caqh`, status `draft`, checklist created; medical_license / dea / malpractice / board_cert rows are set `approved` (or `expired` when the expiration is past) with `expiresAt` when the CAQH data has the license / DEA / carrier / board cert (no file attached — `hasFile=false`).
- Notification "Provider(s) imported from CAQH".

---

## Documents

### GET /api/providers/{id}/documents — `document:read` (provider: own) → `DocumentRow[]` (all 14 types)

### POST /api/providers/{id}/documents/classify — `document:create` (provider: own)
Body `{ fileNames: string[] }` → `{ fileName: string; docType: DocType | null; label: string | null; confidence: 'filename' }[]`.
Whole-word filename keyword match (AI classification is deferred). `docType: null` = could not guess → user must pick (VerifyClassificationModal).

### POST /api/providers/{id}/documents/upload — `document:create` (provider: own), multipart
Form fields (parallel, same order): `files` (repeat), `docType` (repeat, optional; empty = guess from filename), `expiresAt` (repeat, optional `YYYY-MM-DD` or empty).
```ts
{ uploaded: { fileName: string; docType: DocType; label: string; classification: 'manual'|'filename'; status: DocStatus }[];
  documents: DocumentRow[] }   // full refreshed checklist
```
- 400 if any file's type can't be guessed (message lists the files) or a docType is unknown; nothing is stored then.
- Allowed extensions: pdf png jpg jpeg gif webp tif tiff doc docx xls xlsx csv txt heic; max 25 MB/file, 100 MB/request.
- Status: staff upload → `approved`; provider-user upload → `pending_review`; any upload with past `expiresAt` → `expired`. A new file replaces the previous one of that type.
- Notification "Documents uploaded". AI upload quota is not consumed (AI deferred).

### POST /api/providers/{id}/documents/batch — `document:create` (provider: own), multipart (Folder Sync)
Form fields: `files` (repeat), `relativePaths` (repeat, parallel; e.g. `webkitRelativePath`), `docType` (repeat, optional).
→ `{ fileName: string; relativePath: string | null; docType: DocType | null; label: string | null; status: 'uploaded'|'skipped'; reason: string | null }[]` (same order as files).
Skipped reasons: type not recognised from the name, empty file, disallowed extension, a second file for the same type in this batch. Uploaded files keep `originalRelativePath`.

### PATCH /api/documents/{docId} — `document:update`, staff only
Body `{ status?: DocStatus; expiresAt?: string; clearExpiresAt?: boolean }` → `DocumentRow`.
Approve = `{status:'approved'}`, reject = `{status:'missing'}` (file is kept; use DELETE …/file to remove it) or `'pending_review'`, N/A = `{status:'na'}`. Changing only `expiresAt` on an approved/expired doc recomputes approved/expired.

### GET /api/documents/{docId}/download?inline=false — `document:read` (provider: own)
Streams the file; `Content-Disposition: attachment` (or `inline` with `inline=true` for preview). 404 if no file.

### DELETE /api/documents/{docId}/file — `document:delete` (staff) → `DocumentRow`
Removes the stored file; row becomes `missing` (expiresAt cleared).

---

## Secure upload links (SendLinkModal)

```ts
type InviteResponse = { inviteId: number; providerId: number; providerName: string; email: string;
  pin: string /* 6 digits, show once */; expiresAt: string /* now + 7 days */;
  uploadUrl: string /* "/admin/upload/{token}" — frontend route, prefix with the site origin */;
  emailStatus: 'queued' };
```
### POST /api/providers/{id}/invites — `provider:update` (writers)
Body `{ email: string }` → 201 `InviteResponse`. Revokes older open links of the provider, writes an `email_log` row (status `queued`, subject from the `missing_docs` template with variables filled; SMTP delivery is deferred), notification "Secure link sent".

### POST /api/providers/invite-new — `provider:create` (AddProvider → "Send link")
Body `{ firstName: string; lastName: string; email: string }` (all required) → 201 `InviteResponse`. Creates a draft provider (source `invite`) with checklist, then the invite.

### Public (no JWT) — provider upload page `/admin/upload/{token}`
#### POST /api/public/invites/{token}/verify
Body `{ pin: string /* 6 digits */ }` →
```ts
{ providerName: string; organizationName: string | null; email: string;
  missingDocuments: { docType: DocType; label: string; critical: boolean; expires: boolean; status: DocStatus }[];  // missing|expired
  expiresAt: string }
```
Errors: 404 unknown token; 400 "Incorrect PIN"; 400 expired ("This link has expired…"); 400 replaced by a newer link.
#### POST /api/public/invites/{token}/upload — multipart
Form fields: `pin`, `files` (repeat), `docType` (repeat, required per file), `expiresAt` (repeat, optional).
→ `{ uploaded: { fileName: string; docType: DocType; label: string; expiresAt: string | null }[]; missingDocuments: (same as verify)[] }`.
Uploaded docs get status `pending_review` (staff approve them). Notification "Documents received via secure link".

---

## Activity (provider detail "Activity & Time")

### GET /api/providers/{id}/time-entries — staff
### POST /api/providers/{id}/time-entries — writers → 201
Body `{ startedAt: string /* required */; endedAt?: string; seconds?: number /* ≥0; computed from start/end when omitted */; note?: string /* ≤1000 */ }`
```ts
type TimeEntry = { id: number; providerId: number; userId: number | null; userName: string | null;
  startedAt: string; endedAt: string | null; seconds: number; note: string | null; createdAt: string };
```
GET returns `TimeEntry[]` newest first. User = caller.
### DELETE /api/time-entries/{id} — writers; own entries (org_admin/platform_admin: any) → 204

### GET /api/providers/{id}/follow-ups — staff → `FollowUp[]` (newest first, `task` = null)
### POST /api/providers/{id}/follow-ups — writers → 201 `FollowUp`
Body `{ type: 'phone_call'|'email'|'meeting'|'note'; subject: string /* required ≤255 */; outcome?: string; occurredAt?: string /* default now */; nextDate?: string /* not in the past */ }`
```ts
type FollowUp = { id: number; providerId: number; userId: number | null; userName: string | null;
  type: string; subject: string; outcome: string | null; occurredAt: string; nextDate: string | null; createdAt: string;
  task: { id: number; title: string; dueDate: string; status: 'open'; priority: 'medium' } | null };
```
With `nextDate`, an open task "Follow up: {subject}" due on nextDate (assigned to the caller, linked to the provider) is created and returned in `task` (no immediate reminder notification).

---

## Primary source verification (PSV rows, ExclusionCheckModal, NPILookupModal)
Automatic NPPES / OIG / SAM / state-board lookups are deferred; staff record results manually.
```ts
type Deferred = { integration: 'deferred'; message: string };
type Verification = { id: number; providerId: number; source: 'npi'|'oig'|'sam'|'state_license'; sourceLabel: string;
  status: 'clear'|'flagged'; message: string | null; checkedAt: string; runBy: number | null; runByName: string | null };
```
- `GET /api/providers/{id}/verifications` — staff → `Verification[]` newest first.
- `POST /api/providers/{id}/verifications` — writers. Body `{ source; status: 'clear'|'flagged'; message?: string /* ≤500 */ }` → 201 `Verification`. Flagged → danger notification.
- `POST /api/providers/{id}/verifications/run` — staff → 200 `Deferred` ("Automatic NPPES / OIG / SAM checks will be available in a later phase. Record a manual verification instead.").
- `GET /api/npi/{npi}` — staff; 400 unless 10 digits → 200 `Deferred`.

## Appointment letters (AppointmentLetterModal)
### POST /api/providers/{id}/letters — writers → 201 `Letter`
Body `{ letterType: 'initial'|'recred'|'privileging'; hospitalId?: number /* org hospital */; effectiveDate?: string /* default today */ }`
### GET /api/providers/{id}/letters — staff → `Letter[]` newest first
```ts
type Letter = { id: number; letterType: 'initial'|'recred'|'privileging';
  title: string;              // "Letter of Appointment" | "Re-appointment Letter" | "Privileging Confirmation Letter"
  confirmationText: string;   // "This letter confirms that Erin Rizzo, MD (NPI: …) has been granted initial appointment to the medical staff of {hospital}."
  provider: { id: number; firstName: string; lastName: string; suffix: string | null; npi: string | null;
              specialty: string | null; licenseNumber: string | null; licenseState: string | null };
  organization: { id: number; name: string; address: string | null; city: string | null; state: string | null;
                  zip: string | null; phone: string | null; email: string | null } | null;
  hospital: { id: number; name: string; city: string | null; state: string | null } | null;
  letterDate: string; effectiveDate: string; nextRecredDue: string /* effectiveDate + 24 months */;
  generatedAt: string; generatedBy: number | null; generatedByName: string | null };
```
The frontend renders/prints the letter (prototype layout: title, date, "To Whom It May Concern", confirmationText, Specialty, License (state), Appointment Effective Date, Next Re-credentialing Due, bylaws paragraph with hospital name, "Medical Staff Office / {hospital} / {city}"). When `hospital` is null use the organization name.

---

## Provider portal (role provider only; 403 for others)
- `GET /api/me/provider` → `ProviderDetail` (own record, with `documents` and `documentProgress`). 404 if no provider is linked.
- `PUT /api/me/provider` — body `{ phone: string|null; email: string|null; specialty: string|null; licenseNumber: string|null; licenseState: string|null /* 2 letters */; licenseExpires: string|null }` (all six replaced; send current values to keep) → `ProviderDetail`.
- `GET /api/me/enrollments` → `{ id: number; payerId: number; payerName: string|null; payerColor: string|null; status: EnrollmentStatus; applicationType: string; submittedDate: string|null; effectiveDate: string|null; tatDays: number|null }[]`.
- Documents for the portal: use `GET/POST /api/providers/{ownProviderId}/documents…` (provider users may list, classify, upload, batch and download their own; uploads become `pending_review`). `providerId` comes from `GET /api/auth/me`.
