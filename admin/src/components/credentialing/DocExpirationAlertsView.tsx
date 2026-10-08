"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useUser } from "@/stores/auth";
import { fmtDate, todayISO } from "@/lib/utils";
import {
  isWriterRole,
  type AlertCadence,
  type ExpirationAlertSettings,
  type ExpirationAlertsResponse,
  type ExpirationItem,
  type ExpirationNotifyResponse,
} from "@/types/credentialing-ops";

// Prototype DOC_TYPES filtered to the ones that expire (same order/labels as the prototype).
const EXPIRING_DOC_TYPES: { id: string; label: string }[] = [
  { id: "medical_license", label: "Medical License" },
  { id: "dea", label: "DEA Certificate" },
  { id: "malpractice", label: "Malpractice Insurance" },
  { id: "board_cert", label: "Board Certification" },
  { id: "gov_id", label: "Government Issued ID" },
  { id: "csr_license", label: "CSR License" },
  { id: "clia", label: "CLIA" },
];

// Port of the prototype exportCSV helper (L3836).
const exportCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

type FieldErrors = Record<string, string>;

function validate(c: ExpirationAlertSettings): FieldErrors {
  const errs: FieldErrors = {};
  const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
  if (!intIn(c.criticalDays, 1, 30)) errs.criticalDays = "Must be between 1 and 30 days";
  if (!intIn(c.warningDays, 1, 90)) errs.warningDays = "Must be between 1 and 90 days";
  if (!intIn(c.infoDays, 30, 180)) errs.infoDays = "Must be between 30 and 180 days";
  if (!errs.criticalDays && !errs.warningDays && c.criticalDays >= c.warningDays) errs.warningDays = "Must be greater than the critical threshold";
  if (!errs.warningDays && !errs.infoDays && c.warningDays >= c.infoDays) errs.infoDays = "Must be greater than the warning threshold";
  return errs;
}

const tierPill = (t: ExpirationItem["tier"]) => (t === "expired" ? "danger" : t === "critical" ? "danger" : t === "warning" ? "warn" : "info");

export function DocExpirationAlertsView() {
  const toast = useToast();
  const user = useUser();
  const canWrite = isWriterRole(user.role);

  const settingsQ = useAsync(() => api.get<ExpirationAlertSettings>("/settings/expiration-alerts"), []);
  const alertsQ = useAsync(() => api.get<ExpirationAlertsResponse>("/alerts/expirations", { tier: "all" }), []);

  const [draft, setDraft] = useState<ExpirationAlertSettings | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);

  const saved = settingsQ.data;
  const config = draft ?? saved ?? null;
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (patch: Partial<ExpirationAlertSettings>) => {
    if (!config) return;
    setDraft({ ...config, ...patch });
    const keys = Object.keys(patch);
    if (keys.some((k) => errors[k])) {
      const next = { ...errors };
      keys.forEach((k) => delete next[k]);
      setErrors(next);
    }
  };

  const save = async () => {
    if (!config) return;
    const errs = validate(config);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api.put<ExpirationAlertSettings>("/settings/expiration-alerts", config);
      settingsQ.setData(res);
      setDraft(null);
      toast("Alert settings saved");
      alertsQ.reload();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const notify = async (e: ExpirationItem) => {
    const key = e.providerId + ":" + e.docType;
    setNotifying(key);
    try {
      const res = await api.post<ExpirationNotifyResponse>("/alerts/expirations/notify", { providerId: e.providerId, docType: e.docType });
      toast(res.message || "Notice sent to " + e.providerName, res.integration === "smtp" ? "success" : res.integration === "failed" ? "error" : "info");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setNotifying(null);
    }
  };

  const data = alertsQ.data;
  const expirations = data?.items ?? [];
  const stats = data?.stats ?? { expired: 0, critical: 0, warning: 0, info: 0 };
  const th = data?.settings ?? saved;

  const exportRows = () => {
    const headers = ["Provider", "Document", "Expires", "Days Remaining", "Status"];
    const rows = expirations.map((e) => [e.providerName, e.docLabel, e.expiresAt, e.daysLeft, e.tier]);
    exportCSV("expiration-alerts-" + todayISO() + ".csv", headers, rows);
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Expired" value={stats.expired} sub="Need renewal" icon="XCircle" color="var(--danger)" emphasize={stats.expired > 0} />
        <StatCard label={"Critical (≤" + (th?.criticalDays ?? 7) + "d)"} value={stats.critical} sub="Act today" icon="AlertTriangle" color="var(--danger)" emphasize={stats.critical > 0} />
        <StatCard label={"Warning (≤" + (th?.warningDays ?? 30) + "d)"} value={stats.warning} sub="Renew soon" icon="Clock" color="var(--warn)" />
        <StatCard label={"Heads-up (≤" + (th?.infoDays ?? 90) + "d)"} value={stats.info} sub="Watch list" icon="Bell" color="var(--info)" />
      </div>

      {/* Config card */}
      <div className="card mb-4">
        {settingsQ.error ? (
          <div className="p-4">
            <ErrorState message={settingsQ.error} onRetry={settingsQ.reload} />
          </div>
        ) : !config ? (
          <Loading label="Loading alert configuration…" />
        ) : (
          <>
            <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-semibold text-ink">Alert Configuration</h3>
                <p className="text-xs text-ink-light mt-1">Configure when and how the system alerts you about document expirations</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.enabled} disabled={!canWrite} onChange={(e) => update({ enabled: e.target.checked })} />
                <span className="text-sm font-medium">{config.enabled ? "Alerts enabled" : "Alerts disabled"}</span>
              </label>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Critical threshold (days before expiry)" error={errors.criticalDays}>
                <input type="number" min="1" max="30" value={config.criticalDays} disabled={!canWrite}
                       onChange={(e) => update({ criticalDays: Number(e.target.value) })}
                       className="input" />
                {!errors.criticalDays && <div className="text-[10px] text-ink-faint mt-1">Triggers red alert + email</div>}
              </Field>
              <Field label="Warning threshold" error={errors.warningDays}>
                <input type="number" min="1" max="90" value={config.warningDays} disabled={!canWrite}
                       onChange={(e) => update({ warningDays: Number(e.target.value) })}
                       className="input" />
                {!errors.warningDays && <div className="text-[10px] text-ink-faint mt-1">Triggers yellow alert</div>}
              </Field>
              <Field label="Heads-up threshold" error={errors.infoDays}>
                <input type="number" min="30" max="180" value={config.infoDays} disabled={!canWrite}
                       onChange={(e) => update({ infoDays: Number(e.target.value) })}
                       className="input" />
                {!errors.infoDays && <div className="text-[10px] text-ink-faint mt-1">Appears in watch list</div>}
              </Field>
            </div>
            <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Notification channels</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={config.notifyEmail} disabled={!canWrite} onChange={(e) => update({ notifyEmail: e.target.checked })} />
                    Email alerts to credentialing team
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={config.notifyDashboard} disabled={!canWrite} onChange={(e) => update({ notifyDashboard: e.target.checked })} />
                    Dashboard banner + notification badge
                  </label>
                </div>
              </div>
              <Field label="Check cadence" error={errors.cadence}>
                <select value={config.cadence} disabled={!canWrite} onChange={(e) => update({ cadence: e.target.value as AlertCadence })} className="input">
                  <option value="daily">Daily at 8:00 AM</option>
                  <option value="weekly">Weekly (Mondays)</option>
                  <option value="hourly">Hourly (recommended)</option>
                </select>
              </Field>
            </div>
            <div className="p-5 pt-0">
              <Field label="Document types to monitor" error={errors.docTypes}>
                <div className="flex flex-wrap gap-2">
                  {EXPIRING_DOC_TYPES.map((d) => {
                    const isOn = config.docTypes.includes(d.id);
                    return (
                      <button key={d.id} type="button" disabled={!canWrite} onClick={() => {
                        update({ docTypes: isOn ? config.docTypes.filter((x) => x !== d.id) : [...config.docTypes, d.id] });
                      }} className={"px-3 py-1 rounded-full text-xs font-medium transition-colors " + (isOn ? "bg-accent text-white" : "bg-soft-2 text-ink-light hover:bg-soft")}>
                        {isOn && <Icon name="Check" size={10} className="inline mr-1" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            {canWrite && (
              <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">
                {dirty && (
                  <button type="button" className="btn btn-ghost text-xs" disabled={saving} onClick={() => { setDraft(null); setErrors({}); }}>
                    Discard changes
                  </button>
                )}
                <button type="button" className="btn btn-primary" disabled={saving || !dirty} onClick={save}>
                  {saving ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Save" size={13} />} Save Settings
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Active alerts */}
      <div className="card">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display font-semibold text-ink">Active Alerts</h3>
            <p className="text-xs text-ink-light mt-1">{expirations.length} document(s) expiring or expired</p>
          </div>
          <button onClick={exportRows} disabled={expirations.length === 0} className="btn btn-secondary text-xs"><Icon name="Download" size={11} /> Export CSV</button>
        </div>
        {alertsQ.error ? (
          <div className="p-4">
            <ErrorState message={alertsQ.error} onRetry={alertsQ.reload} />
          </div>
        ) : alertsQ.loading && !data ? (
          <Loading />
        ) : data && !data.enabled ? (
          <EmptyState icon="BellOff" title="Alerts disabled" description="Expiration alerts are turned off. Enable alerts in the configuration above to see expiring documents." />
        ) : expirations.length === 0 ? (
          <EmptyState icon="CheckCircle2" title="All documents current" description="Nothing expiring within your configured thresholds." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Provider</th><th>Document</th><th>Expires</th><th>Days</th><th>Severity</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {expirations.map((e) => {
                  const key = e.providerId + ":" + e.docType;
                  return (
                    <tr key={key + ":" + e.source}>
                      <td>
                        <Link href={"/providers/" + e.providerId} className="flex items-center gap-2 hover:underline">
                          <Avatar name={e.providerName} size={26} />
                          <span className="font-medium">{e.providerName}</span>
                        </Link>
                      </td>
                      <td>{e.docLabel}</td>
                      <td className="text-xs text-ink-light">{fmtDate(e.expiresAt)}</td>
                      <td>
                        <Pill type={tierPill(e.tier)}>
                          {e.daysLeft < 0 ? Math.abs(e.daysLeft) + "d ago" : e.daysLeft + " days"}
                        </Pill>
                      </td>
                      <td>
                        <Pill type={tierPill(e.tier)}>
                          {e.tier === "expired" ? "Expired" : e.tier === "critical" ? "Critical" : e.tier === "warning" ? "Warning" : "Heads-up"}
                        </Pill>
                      </td>
                      <td className="text-right">
                        {canWrite && (
                          <button onClick={() => notify(e)} disabled={notifying === key} className="btn btn-primary text-xs">
                            {notifying === key ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Mail" size={11} />} Notify Provider
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
