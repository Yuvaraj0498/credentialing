# Operations module API

Tasks, notifications, chat, email reminders, credentialing hub (hospitals, privileges, expiration alerts, sanctions) and CAQH.
Everything is under `/api`, uses the JWT, and is scoped to the effective org (platform_admin sends `X-Org-Id`).
Dates are `"YYYY-MM-DD"` and datetimes are `"YYYY-MM-DDTHH:mm:ss[.SSS]"` (server-local, no zone). Errors use the standard `{status, error, message, fieldErrors}` shape.

**Roles.** "staff" means every role except `provider`. "writer" means `platform_admin | org_admin | clerk`. Auditors are read-only unless a row says otherwise.

**Deferred integrations.** SMTP/SMS delivery, live CAQH/aggregator calls and OIG/SAM/NPPES lookups are deferred. Endpoints that depend on them return `integration: "deferred"` plus a human message. Emails and reminders are written to logs with `status: "queued"`.

---

## 1. Tasks (permission entity `task`: list/read = admin, clerk, auditor; create/update/delete = admin, clerk)

```ts
type TaskRow = {
  id: number; title: string; description: string | null;
  priority: "low" | "medium" | "high" | "urgent"; status: "open" | "in_progress" | "done";
  dueDate: string | null; overdue: boolean;            // dueDate < today && status != done
  providerId: number | null; providerName: string | null;
  assigneeUserId: number | null; assigneeName: string | null;
  createdBy: number | null; createdByName: string | null;
  completedAt: string | null; createdAt: string; updatedAt: string;
};
type TaskRequest = { title: string /*req, ≤255*/; description?: string | null; priority?: "low"|"medium"|"high"|"urgent" /*default medium*/;
  dueDate?: string | null; providerId?: number | null; assigneeUserId?: number | null /*staff user of org*/ };
```

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/tasks?status=&priority=&providerId=&assigneeId=&q=` | – | `{items: TaskRow[], counts: {open, inProgress, done, all, overdue}}` | `status` = open \| in_progress \| done \| all (omit for all). `counts` ignore the `status` filter but apply all the other filters, so they can drive the tab badges. `q` matches title, description and provider name. Undone tasks come first, then newest. |
| POST | `/tasks` | `TaskRequest` | `201 TaskRow` | Creates with status `open`. Adds the notification "New task: {title}", body "Due MMM d, yyyy" or "No due date". It goes to the assignee if one is set and is not the creator; otherwise it is an org broadcast. |
| PUT | `/tasks/{id}` | `TaskRequest` | `TaskRow` | Full replace of the editable fields. Status is unchanged. |
| PATCH | `/tasks/{id}/status` | `{status: "open"\|"in_progress"\|"done"}` | `TaskRow` | `done` sets `completedAt`; any other status clears it. |
| DELETE | `/tasks/{id}` | – | 204 | |

The assignee picker uses the users endpoint (users module).

## 2. Notifications (any authenticated user with an org)

```ts
type NotificationRow = { id: number; title: string; body: string | null; icon: string /*lucide name*/; color: string /*CSS var*/;
  read: boolean; broadcast: boolean /*org-wide row*/; createdAt: string };
```

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/notifications?filter=all\|unread` | `{items: NotificationRow[], total: number, unread: number}` | Newest first. Staff see org broadcasts plus their own rows. Provider users see only rows addressed to them. |
| GET | `/notifications/unread-count` | `{count: number}` | For the bell badge. |
| PATCH | `/notifications/{id}/read` | `NotificationRow` | |
| POST | `/notifications/read-all` | `{updated: number}` | |
| DELETE | `/notifications/{id}` | 204 | Auditors cannot delete broadcasts. |

Known limitation: a broadcast row has one shared `read` flag, so if one staff member marks it read, it is read for the whole org.

## 3. Chat (staff only)

Conversation ids are `ch_<channelId>` for channels and `dm_<minUserId>__<maxUserId>` for DMs. Poll `/chat/state` about every 10s, and poll the open conversation with `?after=<createdAt of the last message>` about every 3–5s.

```ts
type LastMessage = { authorId: number; authorName: string; body: string /*≤140 chars + "…"*/; createdAt: string };
type ChannelItem = { id: number; conversationId: string; name: string; description: string | null; icon: string;
  unread: number; lastMessageAt: string | null; lastMessage: LastMessage | null };
type DirectMessageItem = { userId: number; displayName: string; username: string; role: string; title: string | null;
  conversationId: string; unread: number; lastMessageAt: string | null; lastMessage: LastMessage | null };
type ChatMessageItem = { id: number; conversationId: string; authorId: number; authorName: string; body: string; createdAt: string };
```

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/chat/state` | – | `{currentUserId, channels: ChannelItem[], directMessages: DirectMessageItem[], totalUnread}` | `directMessages` has one entry for every other active, non-provider user of the org, sorted by name. Unread counts messages by others newer than your last read. |
| GET | `/chat/conversations/{cid}/messages?after=ISO` | – | `ChatMessageItem[]` ascending | Without `after` it returns the latest 500. Returns 404 if the caller cannot access the conversation. |
| POST | `/chat/conversations/{cid}/messages` | `{body: string /*1..4000*/}` | `201 ChatMessageItem` | The body is trimmed. Sending also marks the conversation read. |
| PUT | `/chat/conversations/{cid}/read` | – | 204 | Call it when a conversation is opened. |
| DELETE | `/chat/messages/{id}` | – | 204 | Hard delete. Allowed for the author, or for org_admin/platform_admin (channels only). |
| POST | `/chat/channels` | `{name: string /*≤80*/, description?: string /*≤255*/}` | `201 ChannelItem` | Writers only. The name is normalized: lowercase, then every `[^a-z0-9_-]` becomes `-`. Returns 409 if the name already exists. |

## 4. Email reminders (reads: staff; writes: writer)

```ts
type ReminderRow = { providerId: number; name: string; email: string | null; locationId: number | null; locationName: string | null;
  providerStatus: string; missing: number /*missing|expired docs (by status or past expiry), excl. na*/; total: number /*non-na docs*/;
  missingCritical: number; expiringSoon: number /*approved docs expiring ≤60d*/;
  status: "missing_all" | "has_missing" | "complete"; statusLabel: "Missing Documents" | "Has Missing" | "Complete";
  lastSentAt: string | null /*latest email_log row*/; scheduleId: number | null; cadence: "daily"|"weekly"|"biweekly"|"monthly"|null /*newest active schedule*/ };
type TemplateItem = { id: number; type: "missing_docs"|"expiring"|"incomplete"; name: string; subject: string; body: string /*plain text with {{vars}}*/;
  system: boolean; variables: string[] };
type ScheduleItem = { id: number; reminderType: "missing_docs"|"expiring"|"incomplete"; templateId: number | null; templateName: string | null;
  cadence: "daily"|"weekly"|"biweekly"|"monthly"; active: boolean; nextRunAt: string | null; lastSentAt: string | null; createdAt: string;
  providerCount: number; providers: {id: number; name: string; email: string | null}[] };
type EmailLogItem = { id: number; providerId: number | null; providerName: string | null; scheduleId: number | null; toEmail: string;
  subject: string; status: "queued"|"sent"|"failed"|"bounced"; createdAt: string };
```

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/email/reminders?tab=all\|missing\|active\|complete\|expiring&q=` | – | `{items: ReminderRow[], counts: {all, missing, active, complete}}` | `q` matches name or email. Sorted by name. |
| GET | `/email/templates` | – | `TemplateItem[]` | Org templates come first, then system templates. |
| POST | `/email/templates/{id}/preview` | `{providerId?: number}` (body optional) | `{subject, body, providerId, toEmail}` | Fills in the variables from the provider. Without a provider it uses sample data ("Jane"). `pin`, `upload_link` and `link_expires` are placeholders, because the magic link is created at send time. Render `body` with `white-space: pre-wrap`. |
| GET | `/email/schedules` | – | `ScheduleItem[]` | Newest first. |
| POST | `/email/schedules` | `{reminderType, templateId?: number, cadence, providerIds: number[] /*≥1*/}` | `201 ScheduleItem` | If `templateId` is omitted, the first template of `reminderType` is used. `nextRunAt` is the next 08:00. |
| PATCH | `/email/schedules/{id}` | `{active: boolean}` | `ScheduleItem` | Pausing clears `nextRunAt`. Resuming recomputes it. |
| DELETE | `/email/schedules/{id}` | – | 204 | |
| POST | `/email/schedules/{id}/send-now` | – | `{queued, skipped, integration: "deferred", message}` | Writes one `queued` email_log row per provider that has an email and something relevant: missing docs for `missing_docs`, expiring docs for `expiring`, always for `incomplete`. Updates `lastSentAt` and `nextRunAt`. |
| GET | `/email/log?providerId=&page=0&size=25` | – | `PageResponse<EmailLogItem>` | Newest first. Max size is 200. |

## 5. Credentialing hub (reads: staff; writes: writer)

### Hospitals
`type HospitalItem = { id: number; name: string; city: string | null; state: string | null; active: boolean }`
`type HospitalRequest = { name: string /*req ≤200*/; city?: string; state?: string /*2 letters or ""*/; active?: boolean }`

| Method | Path | Response |
|---|---|---|
| GET | `/hospitals` | `HospitalItem[]` (by name) |
| POST | `/hospitals` | `201 HospitalItem` |
| PUT | `/hospitals/{id}` | `HospitalItem` |
| DELETE | `/hospitals/{id}` | 204 (also deletes that hospital's privilege records) |

### Privileges
```ts
type PrivilegeStatus = "none" | "requested" | "pending" | "granted" | "denied";
type PrivilegeItemStatus = { privilegeItemId: number; name: string; sortOrder: number; status: PrivilegeStatus;
  requestedAt: string | null; decidedAt: string | null };
```
| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/privileges?providerId=&hospitalId=` (both required) | – | `{providerId, providerName, specialty, hospitalId, hospitalName, categoryCode, categoryName, items: PrivilegeItemStatus[]}` | The category comes from the provider's specialty: "interventional" → interventional, "electro" → electrophysiology, "pediatric" → pediatrics, anything else → cardiology. |
| PUT | `/privileges` | `{providerId, hospitalId, privilegeItemId, status: PrivilegeStatus}` | `PrivilegeItemStatus` | Upserts the row. `none` deletes it. `granted` and `denied` set `decidedAt` to today. A new row gets `requestedAt` = today. Show `denied` as "Denied", not "Pending" as the prototype did. |
| GET | `/privileges/summary?providerId=&hospitalId=` | – | `{providerId, providerName, hospitalId, hospitalName, requested, pending, granted, denied, total}[]` | |

### Expiration alerts
```ts
type ExpirationAlertSettings = { enabled: boolean; criticalDays: number /*1-30*/; warningDays: number /*1-90*/; infoDays: number /*30-180*/;
  notifyEmail: boolean; notifyDashboard: boolean; cadence: "daily"|"weekly"|"hourly"; docTypes: string[] /*document_type codes that expire*/ };
type ExpirationItem = { providerId: number; providerName: string; providerEmail: string | null; docType: string; docLabel: string;
  expiresAt: string; daysLeft: number /*negative = expired*/; tier: "expired"|"critical"|"warning"|"info";
  source: "document" | "provider_profile" };
```
| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/settings/expiration-alerts` | – | `ExpirationAlertSettings` | Creates the default row if it is missing (7/30/90, daily, 7 doc types). |
| PUT | `/settings/expiration-alerts` | `ExpirationAlertSettings` | same | Writers only. Requires critical < warning < info. Every doc type must be one that expires. |
| GET | `/alerts/expirations?tier=all\|expired\|critical\|warning\|info` | – | `{enabled, settings, stats: {expired, critical, warning, info}, items: ExpirationItem[]}` | When `enabled` is false, items is empty. Only monitored doc types are included. Items come from provider documents (any status except missing/na, so expired ones are included) plus the provider's `licenseExpires` (medical_license) and `deaExpires` (dea) when there is no dated document. Sorted by daysLeft. Take the stat labels from `settings`. |
| POST | `/alerts/expirations/notify` | `{providerId, docType}` | `{queued: 1, integration: "deferred", message}` | Writes a queued email_log row and an org notification. Returns 400 if the provider has no email, 404 if there is no expiry on file. |

### Sanctions monitoring
```ts
type SourceCheck = { status: "pending"|"clear"|"flagged"|"error"; message: string | null; checkedAt: string } | null;
type SanctionsRow = { providerId: number; name: string; npi: string | null;
  checks: { npi: SourceCheck; oig: SourceCheck; sam: SourceCheck; state_license: SourceCheck };   // latest per source
  lastChecked: string | null; nextDue: string | null /*lastChecked + intervalDays*/; daysUntilDue: number | null;
  status: "clear" | "flagged" | "never"; dueSoon: boolean /*0..10 days*/; overdue: boolean; flags: string[] };
```
| Method | Path | Response |
|---|---|---|
| GET | `/sanctions/monitoring?q=` (name or NPI) | `{intervalDays, stats: {total, clear, flagged, never, dueSoon, overdue}, items: SanctionsRow[]}` |
| POST | `/sanctions/run-all` (writer) | `{integration: "deferred", message: "Automatic OIG / SAM / NPPES monitoring will be available in a later phase."}` |

## 6. CAQH (reads: staff; writes: writer unless noted)

```ts
type CaqhConfig = { path: "direct"|"aggregator"|"csv"; directUsername: string|null; directOrgId: string|null;
  directEnvironment: "production"|"sandbox"|null; hasDirectPassword: boolean;
  aggregatorVendor: "certifyos"|"andros"|"verifiable"|"medallion"|null; aggregatorBaseUrl: string|null; hasAggregatorKey: boolean;
  syncEnabled: boolean; syncCadence: "hourly"|"daily"|"weekly"|"monthly"; syncDayOfWeek: "sunday"|...|"saturday"; syncHour: number /*0-23*/;
  syncOnlyAttested: boolean; syncNotifyChanges: boolean; syncRateLimit: number /*1-200 per min*/;
  nextRunAt: string | null /*null when sync disabled*/; updatedAt: string | null };
type CaqhProviderStatus = { providerId: number; name: string; npi: string|null; caqhId: string|null; lastAttested: string|null;
  nextAttestationDue: string|null /*lastAttested+120d*/; daysLeft: number|null; lastSynced: string|null; attestationStatus: string|null;
  status: "ok" | "due_soon" /*≤20d*/ | "overdue" | "not_enrolled" | "unknown" /*has CAQH ID, no attestation date*/ };
type RuleItem = { id: number; name: string; daysBefore: number; channel: "email"|"email+sms"|"email+sms+call"|"email+manager";
  template: "friendly"|"standard"|"urgent"|"final"|"escalation"; enabled: boolean; lastTriggeredAt: string|null; sentCount: number };
type ReminderLogItem = { id: number; ruleId: number|null; ruleName: string|null; providerId: number; providerName: string|null;
  channel: string; template: string; dueDate: string|null; status: "queued"|"sent"|"failed"|"dry_run"; triggeredBy: string; sentAt: string };
```

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/caqh/config` | – | `CaqhConfig` | Secrets are never returned. |
| PUT | `/caqh/config` | Partial `CaqhConfig` fields, plus `directPassword?: string`, `aggregatorApiKey?: string` | `CaqhConfig` | **org_admin/platform_admin only.** Null or omitted fields stay unchanged, so the Setup tab sends only connection fields and the Auto-Sync tab sends only `sync*` fields. A secret sent as `""` is cleared. Secrets are encrypted at rest. `aggregatorBaseUrl` must start with `https://`. |
| POST | `/caqh/config/test` | – | `{integration: "deferred", configured: boolean, path, message}` | |
| GET | `/caqh/status` | – | `{stats: {withCaqh, withoutCaqh, attestSoon, overdue, unknown}, items: CaqhProviderStatus[]}` | |
| PATCH | `/caqh/providers/{providerId}` | `{caqhId?: string /*"" clears*/, lastAttested?: string /*not future*/, attestationStatus?: string}` | `CaqhProviderStatus` | Manual enroll or attestation entry. Setting `lastAttested` without a status sets the status to "attested". |
| GET | `/caqh/sync-runs?limit=20` | – | `{id, triggerType, status: "success"\|"partial"\|"failed"\|"running", providersChecked, providersUpdated, changes: string[], durationSec, startedAt}[]` | |
| POST | `/caqh/sync-runs` | `{providerId?: number}` (optional) | `{integration: "deferred", message, providerId}` | Used for Sync now, Sync all and the per-row Sync. No run is recorded. |
| GET | `/caqh/attestations?maxDays=45` | – | `{stats: {expired, urgent /*≤7d*/, warning /*8-14d*/, upcoming /*15-30d*/, missingAttestationDate}, items: {providerId, name, email, caqhId, lastAttested, dueDate, daysUntilDue, status: "expired"\|"urgent"\|"critical"\|"warning"\|"info"\|"ok"}[]}` | Items are providers with a CAQH ID and an attestation date, filtered to `daysUntilDue ≤ maxDays` and sorted ascending. Stats cover everyone. Status thresholds: <0 expired, ≤1 urgent, ≤7 critical, ≤14 warning, ≤30 info. |
| GET | `/caqh/attestation-rules` | – | `RuleItem[]` (by daysBefore desc) | |
| POST | `/caqh/attestation-rules` | `{name /*≤100*/, daysBefore /*-90..365*/, channel, template, enabled?}` | `201 RuleItem` | Returns 409 on a duplicate name. |
| PUT | `/caqh/attestation-rules/{id}` | same | `RuleItem` | |
| PATCH | `/caqh/attestation-rules/{id}/enabled` | `{enabled: boolean}` | `RuleItem` | |
| DELETE | `/caqh/attestation-rules/{id}` | – | 204 | **org_admin/platform_admin only.** |
| POST | `/caqh/attestation-rules/run?dryRun=true\|false` | – | `{dryRun, rulesEvaluated, remindersQueued, matches: {ruleId, ruleName, providerId, providerName, daysLeft, dueDate, channel, template, alreadySent}[], integration: "deferred"}` | Evaluates the enabled rules. A rule matches when `daysLeft == daysBefore`, or, for a negative `daysBefore`, when `daysLeft ≤ daysBefore`. A dry run (any staff) writes nothing. With `dryRun=false` (writer) it writes `queued` log rows, skipping rule+provider+dueDate combinations already logged, bumps the rule's `sentCount`/`lastTriggeredAt`, and adds an org notification. |
| POST | `/caqh/attestation-reminders` | `{providerId, template, channel}` | `201 ReminderLogItem` | "Send now". Writes a `queued` log row. |
| GET | `/caqh/attestation-reminders/log` | – | `ReminderLogItem[]` (latest 50) | |
