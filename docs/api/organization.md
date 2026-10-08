# Organization module API

All endpoints except `/api/public/**` require `Authorization: Bearer <jwt>`. Platform admins choose the tenant with the `X-Org-Id` header. Errors use the standard shape `{status, error, message, fieldErrors, timestamp, path}`. `fieldErrors` keys are the request field names, so you can show each message under its form field.

Roles: `platform_admin | org_admin | clerk | provider | auditor`. "staff" means any role except `provider`. In the tables below, "perm X.Y" means the `role_permission` matrix (entity X, action Y) for the caller's org decides access. Platform admin always passes.

## Shared types

```ts
type LocationType = "Primary" | "Satellite" | "Hospital" | "Admin Office";

interface Organization {
  id: number; name: string; orgType: string | null; taxId: string | null; website: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  phone: string | null; email: string | null; status: "active" | "suspended";
  selfSignup: boolean; createdAt: string; // ISO datetime
}

interface Location {
  id: number; practiceId: number | null; practiceName: string | null;
  clientId: number | null; clientName: string | null;
  name: string; legalName: string | null; npi: string | null; locationType: LocationType;
  address: string | null; city: string | null; state: string | null; zip: string | null; phone: string | null;
  lat: number | null; lng: number | null;            // null = no coordinates (no default Harvard MA coords)
  active: boolean; testData: boolean;
  providerCount: number;                             // COUNT(provider.location_id = id)
  createdAt: string; updatedAt: string;
}

interface DeleteResult { deleted: true; unassignedProviders: number; detachedLocations: number; }
```

## Organization tree and tenant org

| Method | Path | Roles | Body | Response |
|---|---|---|---|---|
| GET | `/api/org-tree?q=` | staff + perm location.read | – | `OrgTree` |
| GET | `/api/organization` | staff | – | `Organization` |
| PUT | `/api/organization` | platform_admin, org_admin | `OrganizationUpdate` | `Organization` |
| GET | `/api/organization/invite-code` | platform_admin, org_admin | – | `{inviteCode: string}`. Generated on first call if missing. |
| POST | `/api/organization/invite-code/regenerate` | platform_admin, org_admin | – | `{inviteCode: string}`. The old code stops working. |

```ts
interface OrgTree {
  organization: Organization;
  clients: {
    id: number; name: string; practiceCount: number; providerCount: number; // providers with client_id = id
    practices: {
      id: number; clientId: number; name: string; taxId: string | null; address: string | null;
      phone: string | null; email: string | null;
      locationCount: number;      // all locations of the practice (even when q hides some)
      providerCount: number;      // providers with practice_id = id
      locations: Location[];
    }[];
  }[];
  unassignedLocations: Location[];  // locations with practiceId = null
  totals: { clients: number; practices: number; locations: number; providers: number;
            unassignedProviders: number /* no client, practice or location */ };
}
// q (optional): case-insensitive match on client, practice (name/taxId) and location (name/legalName/city/address/npi) names.
// A matching client or practice keeps all of its children. Otherwise only the matching branches are returned.

interface OrganizationUpdate {
  name: string;                 // required, max 200
  orgType?: string | null;      // left unchanged when omitted
  taxId?: string | null;        // "" or 9 digits
  website?: string | null; address?: string | null; city?: string | null;
  state?: string | null;        // "" or 2 uppercase letters
  zip?: string | null;          // "" or 12345 or 12345-6789
  phone?: string | null; email?: string | null;
}
```

## Clients and practices (writes: staff + perm location.create/update/delete)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/clients` | – | `Client[]` (staff + perm location.list) |
| POST | `/api/clients` | `{name: string}` | `Client` (201) |
| PUT | `/api/clients/{id}` | `{name: string}` | `Client` |
| DELETE | `/api/clients/{id}` | – | `DeleteResult` |
| GET | `/api/practices?clientId=` | – | `Practice[]` (staff + perm location.list) |
| POST | `/api/clients/{clientId}/practices` | `PracticeRequest` | `Practice` (201) |
| PUT | `/api/practices/{id}` | `PracticeRequest` | `Practice` |
| DELETE | `/api/practices/{id}` | – | `DeleteResult` |

```ts
interface Client { id: number; name: string; practiceCount: number; providerCount: number; }
interface PracticeRequest {
  name: string;                 // required, max 200
  taxId?: string | null;        // "" or 9 digits (EIN)
  address?: string | null; phone?: string | null; email?: string | null;
  clientId?: number | null;     // ignored on POST. On PUT, moves the practice to another client (its providers' client_id follows).
}
interface Practice { id: number; clientId: number; clientName: string | null; name: string; taxId: string | null;
  address: string | null; phone: string | null; email: string | null; locationCount: number; providerCount: number; }
```
Delete behaviour:
- **Client:** its practices are deleted. Their locations are kept with `practiceId = null` (counted in `detachedLocations`). Providers linked to the client or to its practices get `client_id` and `practice_id` cleared (counted in `unassignedProviders`). Their `location_id` is kept.
- **Practice:** its locations are detached, and providers' `practice_id` is cleared.
- **Location:** providers' `location_id` is cleared.

## Locations (LocationsCrudView, Edit Location, Map modal)

| Method | Path | Roles | Body | Response |
|---|---|---|---|---|
| GET | `/api/locations?q=&active=&practiceId=` | staff + perm location.list | – | `Location[]` sorted by name |
| GET | `/api/locations/{id}` | staff + perm location.read | – | `Location` |
| POST | `/api/locations` | staff + perm location.create | `LocationRequest` | `Location` (201) |
| PUT | `/api/locations/{id}` | staff + perm location.update | `LocationRequest` (full replace) | `Location` |
| DELETE | `/api/locations/{id}` | staff + perm location.delete | – | `DeleteResult` |

```ts
interface LocationRequest {
  name: string;                 // required, max 150
  practiceId?: number | null;   // must belong to the org
  legalName?: string | null;
  npi?: string | null;          // "" or exactly 10 digits
  locationType?: LocationType | "";  // default "Primary"
  address: string;              // required
  city: string;                 // required
  state?: string | null;        // "" or 2 uppercase letters
  zip: string;                  // required, 5 digits
  phone?: string | null;
  lat?: number | null; lng?: number | null;  // geocoding is not done server-side
  active?: boolean;             // default true
}
```
`q` matches name, legalName, city, address, npi and zip. `active=true|false` filters by status.

## Users (perm `user`)

| Method | Path | Roles | Body | Response |
|---|---|---|---|---|
| GET | `/api/users?q=&role=` | staff + perm user.list | – | `User[]` sorted by displayName |
| GET | `/api/users/directory?includeProviders=false` | staff | – | `{id, displayName, role, title}[]` (enabled users of the org; provider accounts only when `includeProviders=true`) |
| GET | `/api/users/{id}` | staff + perm user.read | – | `User` |
| POST | `/api/users` | staff + perm user.create | `UserCreate` | `User` (201) |
| PUT | `/api/users/{id}` | staff + perm user.update | `UserUpdate` | `User` |
| PATCH | `/api/users/{id}/disabled` | staff + perm user.update | `{disabled: boolean}` | `User` |
| DELETE | `/api/users/{id}` | staff + perm user.delete | – | 204 |

```ts
type UserRole = "platform_admin" | "org_admin" | "clerk" | "auditor" | "provider";
interface User {
  id: number; orgId: number | null /* null for platform admins */; username: string; email: string | null;
  firstName: string | null; lastName: string | null; displayName: string; title: string | null; phone: string | null;
  role: UserRole; providerId: number | null; providerName: string | null /* "First Last, MD" */;
  disabled: boolean; selfSignup: boolean; testData: boolean; lastLoginAt: string | null; createdAt: string;
}
interface UserCreate {
  displayName: string;          // required
  firstName?: string; lastName?: string;
  username: string;             // required, 3-150 chars, [A-Za-z0-9._@+-], stored lowercase, globally unique
  email: string;                // required, valid, globally unique (stored lowercase)
  password: string;             // required, min 8 (stored as a bcrypt hash)
  role: UserRole;               // "platform_admin" only when the caller is platform_admin
  title?: string; phone?: string;
  providerId?: number | null;   // required when role = "provider". Must be in the org and not already linked to a login.
  disabled?: boolean;
}
type UserUpdate = Omit<UserCreate, "username" | "password"> & { password?: string | null /* changed only if non-blank, min 8 */ };
```
Rules:
- `role` filter accepts `all` or a role id. Legacy `admin` is treated as `org_admin`.
- Platform-admin accounts appear in the list (and can be read or edited) only when the caller is platform_admin.
- Only platform_admin or org_admin can assign `org_admin`.
- You cannot delete yourself (409), disable yourself, or change your own role (400).
- The org must keep at least one enabled org_admin (409).
- Username cannot be changed.
- Duplicate username or email returns 409.

## Permissions

| Method | Path | Roles | Body | Response |
|---|---|---|---|---|
| GET | `/api/permissions` | staff | – | `PermissionMatrix` |
| PUT | `/api/permissions` | platform_admin, org_admin | `{matrix: Matrix}` | `PermissionMatrix` |
| POST | `/api/permissions/reset` | platform_admin, org_admin | – | `PermissionMatrix` |
| PUT | `/api/admin/permissions/defaults` | platform_admin | `{matrix: Matrix}` | `PermissionMatrix` |

```ts
type Entity = "provider" | "enrollment" | "user" | "location" | "payer" | "document" | "task" | "billing" | "credential_vault" | "payer_submission";
type Action = "create" | "read" | "update" | "delete" | "list";
type Matrix = Record<Entity, Record<Action, UserRole[]>>;   // roles allowed
interface PermissionMatrix {
  roles: { id: UserRole; label: string; color: string; desc: string }[];  // order: platform_admin, org_admin, clerk, provider, auditor
  entities: Entity[]; actions: Action[];
  matrix: Matrix;        // effective for the current org (platform_admin is always listed)
  defaults: Matrix;      // global defaults
  hasOrgOverrides: boolean;
  canEdit: boolean;          // caller may PUT /api/permissions
  canEditDefaults: boolean;  // caller may PUT /api/admin/permissions/defaults
}
```
- **PUT `/api/permissions`:** stores only the cells that differ from the global defaults, as org rows. Entity/action pairs missing from the body keep their current effective value. The `platform_admin` column is ignored, because platform admins always have access.
- **Bad input:** an unknown entity, action or role returns 400.
- **Reset:** deletes all org rows, so the org falls back to the defaults.
- **Defaults:** edits the global rows (org_id NULL).
- **Audit:** every change is written to `audit_log`.
- **When it takes effect:** changes apply to the next request. `GET /api/auth/me` returns the caller's new permissions.

## Platform admin: organizations (platform_admin only)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/admin/organizations` | – | `AdminOrg[]` sorted by name |
| POST | `/api/admin/organizations` | `AdminOrgCreate` | `AdminOrg` (201) |
| PATCH | `/api/admin/organizations/{id}/status` | `{status: "active" \| "suspended"}` | `AdminOrg` |

```ts
interface AdminOrg {
  id: number; name: string; orgType: string | null; city: string | null; state: string | null;
  email: string | null; phone: string | null; status: "active" | "suspended"; selfSignup: boolean;
  inviteCode: string | null; userCount: number; providerCount: number;
  packageCode: string | null; packageName: string | null; subscriptionStatus: string | null; createdAt: string;
}
interface AdminOrgCreate {
  name: string; orgType?: string; taxId?: string /* 9 digits */; website?: string; address?: string; city?: string;
  state?: string; zip?: string /* 5 digits */; phone?: string; email?: string;
  packageCode?: "starter" | "professional" | "enterprise";  // creates an active subscription when given
  estimatedProviders?: number;
  admin?: { firstName: string; lastName: string; email: string; password: string /* min 8 */; title?: string; phone?: string };
}
```
- **Creating an org:** also creates an invite code and the 4 default chat channels (general, credentialing, payers, announcements). If `admin` is given, it creates an org_admin user whose username is the admin's email.
- **Suspending an org:** revokes all refresh tokens of the org's users. From then on, login and refresh return 403 with "Your organization's account is suspended. Contact ZmartCredential support."
- **Switching tenant:** send `X-Org-Id: <id>` on later calls.

## Public (no auth)

| Method | Path | Response |
|---|---|---|
| GET | `/api/public/packages` | `Package[]` (active, sorted) |
| GET | `/api/public/states` | `{code: string, name: string}[]` sorted by code |
| GET | `/api/public/organizations/by-invite-code/{code}` | `{orgName: string}`. Returns 404 if the code is unknown or the org is suspended. The code is case-insensitive. |

```ts
interface Package {
  id: string /* = code, send as plan.packageId */; code: string; name: string;
  basePrice: number; perProvider: number; color: string; colorSoft: string; recommended: boolean;
  providerCap: number | null; payerCap: number | null; aiUploadsPerMonth: number | null; // null = unlimited
  primarySupport: string | null; sortOrder: number;
  features: string[]; notIncluded: string[];
}
```

## Test data (platform_admin, org_admin)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/admin/test-data/summary` | – | `TestDataCounts` (test rows currently in the org) |
| POST | `/api/admin/test-data` | `TestDataRequest` (body optional) | `{created: TestDataCounts; totals: TestDataCounts; testUserPassword: string \| null}` |
| DELETE | `/api/admin/test-data` | – | `TestDataCounts` (rows deleted) |

```ts
interface TestDataRequest {
  providers?: number;              // 1-50, default 15
  enrollmentsPerProvider?: number; // 0-10, capped at the number of active payers. Default: varied 2-6 (prototype)
  locations?: number;              // 0-20, default 5
  users?: number;                  // 0-20, default 7
  tasks?: number;                  // 0-100, default 20
}
interface TestDataCounts { providers: number; enrollments: number; locations: number; users: number; tasks: number; }
```
- **Names and shape:** taken from the prototype's `buildTestData`. Every generated row has `is_test_data = 1` in the current org.
- **Providers:**
  - Each gets a unique, Luhn-valid NPI and the 14-row document checklist.
  - 7 of the checklist documents get random statuses: approved, expired, pending or missing. An expired document's expiry date is in the past.
  - Providers are assigned round-robin to the active test locations.
- **Enrollments:** turnaround (TAT) is never negative.
- **Users:**
  - Usernames look like `clerk.1.o{orgId}`. Emails look like `carla.o{orgId}@test-org.com`.
  - All test users share the password returned in `testUserPassword` ("TestData123!").
  - No platform_admin test user is created.
  - The 7th user is a provider login linked to the first generated provider.
- **Tasks:** assigned to the generated clerks.
- **DELETE:**
  - Deletes in this order: tasks, enrollments, users (never the caller), providers (their documents cascade), then locations.
