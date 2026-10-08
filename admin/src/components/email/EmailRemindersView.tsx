"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { daysBetween, todayISO, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import { EmailHistoryModal } from "@/components/modals/EmailHistoryModal";
import { EmailPreviewModal } from "@/components/modals/EmailPreviewModal";
import { EmailRemindersWizard } from "./EmailRemindersWizard";
import { ReminderSchedules } from "./ReminderSchedules";
import { CADENCE_LABEL, type ReminderListResponse, type ReminderRow, type ScheduleItem } from "@/types/email";

type Tab = "all" | "missing" | "active" | "complete";

const lastSentLabel = (iso: string | null) => {
  if (!iso) return "—";
  const days = daysBetween(iso.slice(0, 10), todayISO());
  if (days <= 0) return "Today";
  return days + (days === 1 ? " day" : " days");
};

export function EmailRemindersView() {
  const me = useUser();
  const canWrite = me.role === "platform_admin" || me.role === "org_admin" || me.role === "clerk";
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [showWizard, setShowWizard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<ReminderRow | null>(null);

  const reminders = useAsync(() => api.get<ReminderListResponse>("/email/reminders", { tab, q }), [tab, q]);
  const schedules = useAsync(() => api.get<ScheduleItem[]>("/email/schedules"), []);

  const counts = reminders.data?.counts ?? { all: 0, missing: 0, active: 0, complete: 0 };
  const filtered = reminders.data?.items ?? [];

  const refreshAll = () => {
    reminders.reload();
    schedules.reload();
  };

  return (
    <div>
      <PageHeader
        title="Email Reminders"
        subtitle="Click on a row to see email history for that provider"
        actions={
          <>
            <button onClick={() => setShowPreview(true)} className="btn btn-secondary"><Icon name="Eye" size={14} /> Preview Email</button>
            {canWrite && <button onClick={() => setShowWizard(true)} className="btn btn-primary"><Icon name="Plus" size={14} /> Set Up Reminders</button>}
          </>
        }
      />

      <div className="flex items-center gap-1 border-b border-line mb-4 overflow-x-auto">
        {([
          { id: "all", label: "All Reminders", count: counts.all },
          { id: "missing", label: "Missing Documents", count: counts.missing },
          { id: "active", label: "Active Cadence", count: counts.active },
          { id: "complete", label: "Complete", count: counts.complete },
        ] as { id: Tab; label: string; count: number }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className={"px-4 py-2 text-sm font-medium relative whitespace-nowrap " + (tab === t.id ? "text-accent" : "text-ink-light hover:text-ink")}>
            {t.label} <span className="text-ink-faint ml-1">{t.count}</span>
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }}></div>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative" style={{ width: 280, maxWidth: "100%" }}>
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search by provider..." className="input" style={{ paddingLeft: 32, width: "100%" }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <AsyncBoundary loading={reminders.loading && !reminders.data} error={reminders.error} onRetry={reminders.reload}>
          {filtered.length === 0 ? (
            <EmptyState icon="Mail" title="No reminders match" description="Try a different tab or search term." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Provider ↑</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Missing</th>
                    <th>Last Sent</th>
                    <th>Cadence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.providerId} onClick={() => setHistory(r)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={r.name} size={28} />
                          <span className="font-medium text-accent">{r.name}</span>
                        </div>
                      </td>
                      <td className="text-ink-light text-xs">{r.email || "—"}</td>
                      <td className="text-ink-light text-xs">{r.locationName || "—"}</td>
                      <td><Pill type={r.status === "complete" ? "success" : r.status === "missing_all" ? "danger" : "warn"}>{r.statusLabel}</Pill></td>
                      <td className="text-ink-light text-xs"><span className={r.missing > 0 ? "text-danger font-semibold" : ""}>{r.missing}/{r.total}</span></td>
                      <td className="text-ink-light text-xs">{lastSentLabel(r.lastSentAt)}</td>
                      <td>{r.cadence ? <Pill type="info">{CADENCE_LABEL[r.cadence]}</Pill> : <span className="text-ink-faint text-xs">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>

      <ReminderSchedules schedules={schedules} canWrite={canWrite} onChanged={refreshAll} />

      {showWizard && <EmailRemindersWizard onClose={() => setShowWizard(false)} onCreated={refreshAll} />}
      {showPreview && <EmailPreviewModal onClose={() => setShowPreview(false)} />}
      {history && <EmailHistoryModal providerId={history.providerId} name={history.name} onClose={() => setHistory(null)} />}
    </div>
  );
}
