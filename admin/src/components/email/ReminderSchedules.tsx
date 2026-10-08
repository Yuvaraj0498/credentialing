"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { ConfirmDialog } from "@/components/Modal";
import { AlertBox, DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { fmtTs } from "@/lib/utils";
import type { AsyncState } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { CADENCE_LABEL, REMINDER_TYPE_LABEL, type ScheduleItem, type SendNowResponse } from "@/types/email";

/** Reminder schedules list: send now / pause / resume / delete. */
export function ReminderSchedules({ schedules, canWrite, onChanged }: { schedules: AsyncState<ScheduleItem[]>; canWrite: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ScheduleItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [sendResult, setSendResult] = useState<SendNowResponse | null>(null);

  const sendNow = async (s: ScheduleItem) => {
    setBusyId(s.id);
    try {
      const res = await api.post<SendNowResponse>(`/email/schedules/${s.id}/send-now`);
      setSendResult(res);
      const skipped = res.skipped ? " · " + res.skipped + " skipped" : "";
      if (res.integration === "deferred") toast(res.queued + " reminder(s) recorded" + skipped, "info");
      else toast(res.sent + " email(s) sent" + (res.failed ? " · " + res.failed + " failed" : "") + skipped, res.failed ? "warn" : "success");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (s: ScheduleItem) => {
    setBusyId(s.id);
    try {
      await api.patch(`/email/schedules/${s.id}`, { active: !s.active });
      toast(s.active ? "Reminder schedule paused" : "Reminder schedule resumed");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/email/schedules/${deleting.id}`);
      toast("Reminder schedule deleted");
      setDeleting(null);
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const list = schedules.data ?? [];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="CalendarClock" size={16} className="text-accent" />
        <h2 className="font-display text-lg font-semibold text-ink">Reminder Schedules</h2>
        <Pill type="neutral">{list.length}</Pill>
      </div>

      {sendResult &&
        (sendResult.integration === "deferred" ? (
          <DeferredNotice className="mb-3">
            <strong>
              {sendResult.queued} reminder(s) recorded{sendResult.skipped ? `, ${sendResult.skipped} skipped` : ""}.
            </strong>{" "}
            {sendResult.message}
          </DeferredNotice>
        ) : (
          <div className="mb-3">
            <AlertBox type={sendResult.failed ? "warn" : sendResult.sent ? "success" : "info"}>
              <strong>
                {sendResult.sent} email(s) sent{sendResult.failed ? `, ${sendResult.failed} failed` : ""}
                {sendResult.skipped ? `, ${sendResult.skipped} skipped (no email address or nothing to remind about)` : ""}.
              </strong>{" "}
              {sendResult.failed ? sendResult.message : "Active schedules also send automatically on their cadence."}
            </AlertBox>
          </div>
        ))}

      <div className="card overflow-hidden">
        <AsyncBoundary loading={schedules.loading && !schedules.data} error={schedules.error} onRetry={schedules.reload}>
          {list.length === 0 ? (
            <EmptyState icon="CalendarClock" title="No reminder schedules yet" description="Use “Set Up Reminders” to start sending automatic reminders to providers." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reminder</th>
                    <th>Template</th>
                    <th>Providers</th>
                    <th>Cadence</th>
                    <th>Next Run</th>
                    <th>Last Sent</th>
                    <th>Status</th>
                    {canWrite && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const busy = busyId === s.id;
                    return (
                      <tr key={s.id} style={busy ? { opacity: 0.6 } : {}}>
                        <td className="font-medium text-ink text-sm">{REMINDER_TYPE_LABEL[s.reminderType] || s.reminderType}</td>
                        <td className="text-ink-light text-xs">{s.templateName || "—"}</td>
                        <td className="text-ink-light text-xs">
                          <span title={s.providers.map((p) => p.name).join(", ")}>
                            {s.providerCount} provider{s.providerCount === 1 ? "" : "s"}
                            {s.providers.length > 0 && <span className="text-ink-faint"> · {s.providers.slice(0, 2).map((p) => p.name).join(", ")}{s.providers.length > 2 ? "…" : ""}</span>}
                          </span>
                        </td>
                        <td><Pill type="info">{CADENCE_LABEL[s.cadence] || s.cadence}</Pill></td>
                        <td className="text-ink-light text-xs whitespace-nowrap">{s.active && s.nextRunAt ? fmtTs(s.nextRunAt) : "—"}</td>
                        <td className="text-ink-light text-xs whitespace-nowrap">{s.lastSentAt ? fmtTs(s.lastSentAt) : "—"}</td>
                        <td>{s.active ? <Pill type="success">Active</Pill> : <Pill type="neutral">Paused</Pill>}</td>
                        {canWrite && (
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => sendNow(s)} disabled={busy} className="btn btn-secondary text-xs" style={{ padding: "4px 10px" }}>
                                <Icon name="Send" size={11} /> Send now
                              </button>
                              <button onClick={() => toggle(s)} disabled={busy} className="btn btn-ghost" style={{ padding: 6 }} title={s.active ? "Pause" : "Resume"} aria-label={s.active ? "Pause" : "Resume"}>
                                <Icon name={s.active ? "PauseCircle" : "PlayCircle"} size={14} />
                              </button>
                              <button onClick={() => setDeleting(s)} disabled={busy} className="btn btn-ghost text-ink-faint hover:text-danger" style={{ padding: 6 }} title="Delete" aria-label="Delete schedule">
                                <Icon name="Trash2" size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete reminder schedule?"
          message={<>The {REMINDER_TYPE_LABEL[deleting.reminderType]} reminder for {deleting.providerCount} provider(s) will stop and be deleted.</>}
          busy={deleteBusy}
          onConfirm={doDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
