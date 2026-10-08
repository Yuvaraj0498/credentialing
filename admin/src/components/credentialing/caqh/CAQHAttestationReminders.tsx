"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { fmtDate, fmtTs } from "@/lib/utils";
import { useShell } from "@/stores/shell";
import { useCaqhPerms } from "./perms";
import { RuleEditorModal } from "@/components/modals/RuleEditorModal";
import type { AttestationItem, AttestationsResponse, ReminderLogItem, RuleChannel, RuleDraft, RuleItem, RuleRunResult, RuleTemplate } from "@/types/caqh";

const NEW_RULE: RuleDraft = { id: null, name: "", daysBefore: 21, channel: "email", template: "standard", enabled: true };

/** Default template/channel for a manual "Send Now", based on days left. */
function sendDefaults(a: AttestationItem): { template: RuleTemplate; channel: RuleChannel } {
  if (a.daysUntilDue < 0) return { template: "escalation", channel: "email+manager" };
  if (a.daysUntilDue <= 1) return { template: "final", channel: "email" };
  if (a.daysUntilDue <= 7) return { template: "urgent", channel: "email" };
  if (a.daysUntilDue <= 14) return { template: "standard", channel: "email" };
  return { template: "friendly", channel: "email" };
}

export function CAQHAttestationReminders() {
  const toast = useToast();
  const { refreshCounters, publish } = useShell();
  const { isAdmin, isWriter } = useCaqhPerms();
  const rulesQ = useAsync(() => api.get<RuleItem[]>("/caqh/attestation-rules"), []);
  const attestQ = useAsync(() => api.get<AttestationsResponse>("/caqh/attestations", { maxDays: 45 }), []);
  const [editingRule, setEditingRule] = useState<RuleDraft | null>(null);
  const [deleting, setDeleting] = useState<RuleItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [runResult, setRunResult] = useState<RuleRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState<number | null>(null);

  const rules = rulesQ.data || [];
  const stats = attestQ.data?.stats;
  const upcoming = attestQ.data?.items || [];

  const toggleRule = async (r: RuleItem) => {
    setToggling(r.id);
    try {
      const updated = await api.patch<RuleItem>("/caqh/attestation-rules/" + r.id + "/enabled", { enabled: !r.enabled });
      rulesQ.setData((prev) => (prev || []).map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setToggling(null);
    }
  };

  const deleteRule = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete("/caqh/attestation-rules/" + deleting.id);
      toast("Rule deleted");
      setDeleting(null);
      rulesQ.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const testRunRules = async () => {
    setTesting(true);
    try {
      const res = await api.post<RuleRunResult>("/caqh/attestation-rules/run", undefined, { dryRun: true });
      toast("Evaluated " + res.rulesEvaluated + " rule(s) · " + res.matches.length + " reminder(s) would fire");
      setRunResult(res);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setTesting(false);
    }
  };

  const runRulesNow = async () => {
    setRunning(true);
    try {
      const res = await api.post<RuleRunResult>("/caqh/attestation-rules/run", undefined, { dryRun: false });
      toast(
        "Evaluated " + res.rulesEvaluated + " rule(s) · " +
          (res.integration === "smtp"
            ? res.remindersSent + " reminder email(s) sent" + (res.remindersFailed ? " · " + res.remindersFailed + " failed" : "")
            : res.remindersQueued + " reminder(s) recorded"),
        res.remindersFailed ? "warn" : "success",
      );
      setRunResult(null);
      rulesQ.reload();
      if (res.remindersQueued > 0) {
        refreshCounters();
        publish("notifications");
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setRunning(false);
    }
  };

  const sendNow = async (a: AttestationItem) => {
    setSending(a.providerId);
    try {
      const row = await api.post<ReminderLogItem>("/caqh/attestation-reminders", { providerId: a.providerId, ...sendDefaults(a) });
      if (row.status === "sent") toast("Attestation reminder emailed to " + a.name, "success");
      else if (row.status === "failed") toast("The reminder to " + a.name + " could not be emailed" + (a.email ? "" : " — no email address on file"), "error");
      else toast("Attestation reminder recorded for " + a.name + " (email sending is switched off)", "info");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSending(null);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Expired Attestations" value={stats ? stats.expired : "—"} sub="Need re-attest now" icon="XCircle" color="var(--danger)" emphasize={!!stats && stats.expired > 0} />
        <StatCard label="Urgent (≤7d)" value={stats ? stats.urgent : "—"} sub="Reminder firing" icon="AlertTriangle" color="var(--danger)" emphasize={!!stats && stats.urgent > 0} />
        <StatCard label="Warning (≤14d)" value={stats ? stats.warning : "—"} sub="Two-week notice" icon="Clock" color="var(--warn)" />
        <StatCard label="Upcoming (≤30d)" value={stats ? stats.upcoming : "—"} sub="Heads-up sent" icon="Bell" color="var(--info)" />
      </div>

      <DeferredNotice className="mb-4">
        Reminders are <strong>emailed</strong> to the provider (the &ldquo;manager&rdquo; channel also emails your organization admins) and recorded in the send log. Enabled rules also run automatically every day at 08:00. SMS and phone calls are not connected, so those channels send the email only.
      </DeferredNotice>

      {/* Rules engine */}
      <div className="card mb-4">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-ink">Reminder Rules</h3>
            <p className="text-xs text-ink-light mt-1">Define when and how providers are reminded about CAQH re-attestation (every 120 days)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={testRunRules} disabled={testing} className="btn btn-secondary">
              {testing ? <span className="loader"></span> : <Icon name="Play" size={13} />} Test Run Rules
            </button>
            {isWriter && (
              <button onClick={() => setEditingRule({ ...NEW_RULE })} className="btn btn-primary">
                <Icon name="Plus" size={13} /> Add Rule
              </button>
            )}
          </div>
        </div>
        {rulesQ.error ? (
          <div className="p-4"><ErrorState message={rulesQ.error} onRetry={rulesQ.reload} /></div>
        ) : rulesQ.loading && !rulesQ.data ? (
          <Loading />
        ) : rules.length === 0 ? (
          <EmptyState icon="Bell" title="No rules configured" description="Add at least one rule to start sending automated attestation reminders." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th></th><th>Rule</th><th>Trigger</th><th>Channel</th><th>Template</th><th>Last Fired</th><th>Sent</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className={!r.enabled ? "opacity-50" : ""}>
                    <td>
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={r.enabled} disabled={!isWriter || toggling === r.id} onChange={() => toggleRule(r)} />
                      </label>
                    </td>
                    <td className="font-medium">{r.name}</td>
                    <td className="font-mono text-xs">
                      {r.daysBefore > 0 ? r.daysBefore + " days before due" : r.daysBefore === 0 ? "On due date" : Math.abs(r.daysBefore) + " day(s) after expiry"}
                    </td>
                    <td className="text-xs">
                      {r.channel.split("+").map((ch, i) => (
                        <span key={i} className="mr-1"><Pill type="info">{ch}</Pill></span>
                      ))}
                    </td>
                    <td><Pill type="neutral">{r.template}</Pill></td>
                    <td className="text-xs text-ink-light">{r.lastTriggeredAt ? fmtTs(r.lastTriggeredAt) : "Never"}</td>
                    <td className="font-mono text-xs">{r.sentCount}</td>
                    <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                      {isWriter && (
                        <button
                          onClick={() => setEditingRule({ id: r.id, name: r.name, daysBefore: r.daysBefore, channel: r.channel, template: r.template, enabled: r.enabled })}
                          className="btn btn-ghost text-xs"
                        >
                          <Icon name="Edit" size={11} /> Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleting(r)} className="btn-ghost p-1 hover:text-danger" aria-label="Delete rule"><Icon name="Trash2" size={11} /></button>
                      )}
                      {!isWriter && <span className="text-xs text-ink-faint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming attestations */}
      <div className="card">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-ink">Upcoming Re-Attestations</h3>
            <p className="text-xs text-ink-light mt-1">Providers whose 120-day CAQH attestation is due. Reminder rules fire automatically.</p>
          </div>
          <button onClick={() => setShowLog(true)} className="btn btn-secondary text-xs"><Icon name="History" size={11} /> View Send Log</button>
        </div>
        {attestQ.error ? (
          <div className="p-4"><ErrorState message={attestQ.error} onRetry={attestQ.reload} /></div>
        ) : attestQ.loading && !attestQ.data ? (
          <Loading />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon="CalendarCheck"
            title="No attestations due in the next 45 days"
            description={stats && stats.missingAttestationDate > 0 ? stats.missingAttestationDate + " provider(s) with a CAQH ID have no attestation date on file." : undefined}
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Provider</th><th>CAQH ID</th><th>Last Attested</th><th>Due</th><th>Days</th><th>Status</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {upcoming.map((a) => (
                  <tr key={a.providerId}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={a.name} size={26} />
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-[10px] text-ink-faint">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{a.caqhId}</td>
                    <td className="text-xs text-ink-light">{fmtDate(a.lastAttested)}</td>
                    <td className="text-xs">{fmtDate(a.dueDate)}</td>
                    <td className="font-mono text-xs">{a.daysUntilDue < 0 ? Math.abs(a.daysUntilDue) + "d overdue" : a.daysUntilDue + " days"}</td>
                    <td>
                      <Pill type={a.status === "expired" ? "danger" : a.status === "urgent" || a.status === "critical" ? "danger" : a.status === "warning" ? "warn" : "info"}>
                        {a.status === "expired" ? "Expired" : a.status === "urgent" ? "Urgent" : a.status === "critical" ? "Critical" : a.status === "warning" ? "Warning" : "Upcoming"}
                      </Pill>
                    </td>
                    <td className="text-right">
                      {isWriter ? (
                        <button onClick={() => sendNow(a)} disabled={sending === a.providerId} className="btn btn-primary text-xs">
                          {sending === a.providerId ? <span className="loader" style={{ borderTopColor: "white" }}></span> : <Icon name="Send" size={11} />} Send Now
                        </button>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rule editor modal */}
      {editingRule && (
        <RuleEditorModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSaved={() => {
            setEditingRule(null);
            rulesQ.reload();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete reminder rule"
          message={<>Delete the rule <strong>{deleting.name}</strong>? Reminders already in the send log are kept.</>}
          busy={deleteBusy}
          onConfirm={deleteRule}
          onClose={() => setDeleting(null)}
        />
      )}

      {/* Test run results */}
      {runResult && (
        <Modal
          title="Rule Test Run"
          subtitle={"Evaluated " + runResult.rulesEvaluated + " rule(s) · " + runResult.matches.length + " reminder(s) would fire"}
          onClose={() => setRunResult(null)}
          maxWidth={680}
        >
          {runResult.matches.length === 0 ? (
            <EmptyState icon="BellOff" title="No reminders would fire today" description="No provider's attestation due date matches an enabled rule's trigger." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runResult.matches.map((m, i) => (
                <div key={i} className="p-3 rounded-lg border border-line text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon name="Send" size={11} className="text-accent" />
                    <span>
                      <strong>{m.providerName}</strong> — {m.ruleName} ({m.channel})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-light" style={{ whiteSpace: "nowrap" }}>
                    {m.daysLeft < 0 ? Math.abs(m.daysLeft) + "d overdue" : m.daysLeft + " days"} · due {fmtDate(m.dueDate)}
                    {m.alreadySent && <Pill type="neutral">already sent</Pill>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DeferredNotice className="mt-4">Running the rules emails each matching provider once per due date and records it in the send log. SMS and phone calls are not connected.</DeferredNotice>
          <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-line">
            <button onClick={() => setRunResult(null)} className="btn btn-secondary" disabled={running}>Close</button>
            {isWriter && (
              <button onClick={runRulesNow} disabled={running || runResult.matches.filter((m) => !m.alreadySent).length === 0} className="btn btn-primary">
                {running ? <span className="loader" style={{ borderTopColor: "white" }}></span> : <Icon name="Play" size={13} />} Run Rules
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Send log modal */}
      {showLog && <SendLogModal onClose={() => setShowLog(false)} />}
    </div>
  );
}

function SendLogModal({ onClose }: { onClose: () => void }) {
  const { data, loading, error, reload } = useAsync(() => api.get<ReminderLogItem[]>("/caqh/attestation-reminders/log"), []);
  const log = data || [];
  return (
    <Modal title="Reminder Send Log" subtitle="Last 50 reminders sent by the automation" onClose={onClose} maxWidth={680}>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : log.length === 0 ? (
        <EmptyState icon="History" title="No reminders sent yet" description="Reminders sent by the rules or 'Send Now' appear here." />
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {log.map((l) => (
            <div key={l.id} className="p-3 rounded-lg border border-line text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon name="Send" size={11} className="text-accent" />
                <span>
                  <strong>{l.providerName || "Provider #" + l.providerId}</strong> — {l.ruleName || "Manual send"} ({l.channel})
                </span>
              </div>
              <div className="flex items-center gap-2 text-ink-light" style={{ whiteSpace: "nowrap" }}>
                <Pill type={l.status === "sent" ? "success" : l.status === "failed" ? "danger" : l.status === "queued" ? "info" : "neutral"}>{l.status}</Pill>
                {fmtTs(l.sentAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
