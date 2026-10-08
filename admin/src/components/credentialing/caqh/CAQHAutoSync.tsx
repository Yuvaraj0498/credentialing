"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { fmtTs } from "@/lib/utils";
import { useCaqhPerms } from "./perms";
import type { CaqhConfig, CaqhStatusResponse, DayOfWeek, SyncCadence, SyncDeferredResponse, SyncRun } from "@/types/caqh";

export function CAQHAutoSync() {
  const cfg = useAsync(() => api.get<CaqhConfig>("/caqh/config"), []);
  if (cfg.error) return <ErrorState message={cfg.error} onRetry={cfg.reload} />;
  if (cfg.loading || !cfg.data) return <div className="card"><Loading /></div>;
  return <AutoSyncInner config={cfg.data} onSaved={cfg.setData} />;
}

const hourLabel = (h: number) => (h === 0 ? "12:00 AM" : h < 12 ? h + ":00 AM" : h === 12 ? "12:00 PM" : h - 12 + ":00 PM");

function AutoSyncInner({ config: saved, onSaved }: { config: CaqhConfig; onSaved: (c: CaqhConfig) => void }) {
  const toast = useToast();
  const { isAdmin, isWriter } = useCaqhPerms();
  const runs = useAsync(() => api.get<SyncRun[]>("/caqh/sync-runs", { limit: 20 }), []);
  const status = useAsync(() => api.get<CaqhStatusResponse>("/caqh/status"), []);
  const [config, setConfig] = useState({
    enabled: saved.syncEnabled,
    cadence: saved.syncCadence || "weekly",
    dayOfWeek: saved.syncDayOfWeek || "monday",
    hourOfDay: saved.syncHour ?? 6,
    onlyAttested: saved.syncOnlyAttested,
    notifyOnChanges: saved.syncNotifyChanges,
    rateLimit: saved.syncRateLimit || 50,
  });
  const [syncing, setSyncing] = useState<number | "all" | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateError, setRateError] = useState<string | undefined>();
  const [deferredMsg, setDeferredMsg] = useState<string | null>(null);

  const save = async () => {
    if (!Number.isInteger(config.rateLimit) || config.rateLimit < 1 || config.rateLimit > 200) {
      setRateError("Rate limit must be between 1 and 200");
      return;
    }
    setRateError(undefined);
    setSaving(true);
    try {
      const res = await api.put<CaqhConfig>("/caqh/config", {
        syncEnabled: config.enabled,
        syncCadence: config.cadence,
        syncDayOfWeek: config.dayOfWeek,
        syncHour: config.hourOfDay,
        syncOnlyAttested: config.onlyAttested,
        syncNotifyChanges: config.notifyOnChanges,
        syncRateLimit: config.rateLimit,
      });
      onSaved(res);
      toast("Auto-sync settings saved");
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.syncRateLimit) setRateError(e.fieldErrors.syncRateLimit);
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const runSync = async (providerId: number | null) => {
    setSyncing(providerId ?? "all");
    try {
      const res = await api.post<SyncDeferredResponse>("/caqh/sync-runs", providerId != null ? { providerId } : {});
      setDeferredMsg(res.message);
      toast(res.message, "info");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSyncing(null);
    }
  };

  const history = runs.data || [];
  const nextRun = saved.nextRunAt ? new Date(saved.nextRunAt) : null;
  const tracked = (status.data?.items || []).filter((p) => p.caqhId);
  const totalProviders = status.data ? status.data.stats.withCaqh + status.data.stats.withoutCaqh : null;

  return (
    <div>
      {/* Status banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Auto-Sync"
          value={saved.syncEnabled ? "On" : "Off"}
          sub={saved.syncCadence}
          icon={saved.syncEnabled ? "PlayCircle" : "PauseCircle"}
          color={saved.syncEnabled ? "var(--success)" : "var(--ink-light)"}
        />
        <StatCard
          label="Last Sync"
          value={history[0] ? fmtTs(history[0].startedAt).split(",")[0] : "—"}
          sub={history[0] ? history[0].providersUpdated + " updated" : "Never"}
          icon="History"
          color="var(--info)"
        />
        <StatCard
          label="Next Run"
          value={saved.syncEnabled && nextRun ? nextRun.toLocaleString("en-US", { month: "short", day: "numeric" }) : "Paused"}
          sub={saved.syncEnabled && nextRun ? nextRun.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
          icon="Calendar"
          color="var(--accent)"
        />
        <StatCard
          label="Tracked"
          value={status.data ? status.data.stats.withCaqh : "—"}
          sub={totalProviders != null ? "of " + totalProviders + " providers" : ""}
          icon="Database"
          color="var(--ink)"
        />
      </div>

      {/* Configuration */}
      <div className="card mb-4">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-ink">Sync Schedule</h3>
            <p className="text-xs text-ink-light mt-1">Configure how often CAQH data is pulled into your system</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.enabled} disabled={!isAdmin} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
            <span className="text-sm font-medium">{config.enabled ? "Auto-sync enabled" : "Auto-sync paused"}</span>
          </label>
        </div>

        <div className="p-5 space-y-4" style={{ opacity: config.enabled ? 1 : 0.5 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Cadence</label>
              <select value={config.cadence} onChange={(e) => setConfig({ ...config, cadence: e.target.value as SyncCadence })} className="input" disabled={!config.enabled || !isAdmin}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
            </div>
            {config.cadence === "weekly" && (
              <div>
                <label className="label">Day of week</label>
                <select value={config.dayOfWeek} onChange={(e) => setConfig({ ...config, dayOfWeek: e.target.value as DayOfWeek })} className="input" disabled={!config.enabled || !isAdmin}>
                  <option value="sunday">Sunday</option><option value="monday">Monday</option><option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option><option value="thursday">Thursday</option><option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>
            )}
            {config.cadence !== "hourly" && (
              <div>
                <label className="label">Time of day</label>
                <select value={config.hourOfDay} onChange={(e) => setConfig({ ...config, hourOfDay: Number(e.target.value) })} className="input" disabled={!config.enabled || !isAdmin}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Rate limit (requests/min)</label>
              <input type="number" min="1" max="200" value={config.rateLimit} onChange={(e) => setConfig({ ...config, rateLimit: Number(e.target.value) })} className="input font-mono" disabled={!config.enabled || !isAdmin} />
              {rateError ? <div className="field-error">{rateError}</div> : <div className="text-[10px] text-ink-faint mt-1">CAQH limits POs to ~100/min</div>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.onlyAttested} onChange={(e) => setConfig({ ...config, onlyAttested: e.target.checked })} disabled={!config.enabled || !isAdmin} />
              Only sync providers with Complete + Attested CAQH profiles
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.notifyOnChanges} onChange={(e) => setConfig({ ...config, notifyOnChanges: e.target.checked })} disabled={!config.enabled || !isAdmin} />
              Create notification when sync detects changes (license expirations, address updates, etc.)
            </label>
          </div>

          {config.enabled && (
            <div className="p-3 rounded-lg text-xs flex items-start gap-2" style={{ background: "var(--info-soft)", color: "#1e40af" }}>
              <Icon name="Calendar" size={13} className="mt-0.5" />
              <div>
                <strong>Next scheduled run:</strong> {saved.syncEnabled && nextRun ? nextRun.toLocaleString() : "Save the schedule to compute the next run"}<br />
                Will check {config.onlyAttested ? "attested " : ""}providers and pull updates from CAQH ProView.
              </div>
            </div>
          )}

          <DeferredNotice>Live CAQH pulls run in a later phase — the schedule is saved now and sync runs are recorded once the CAQH connection is live.</DeferredNotice>
        </div>

        <div className="p-4 border-t border-line bg-bg-soft flex justify-between items-center flex-wrap gap-2">
          {isWriter ? (
            <button onClick={() => runSync(null)} disabled={syncing === "all"} className="btn btn-secondary">
              {syncing === "all" ? <><span className="loader"></span> Syncing all...</> : <><Icon name="RefreshCw" size={13} /> Run Sync Now</>}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {!isAdmin && <span className="text-xs text-ink-faint">Only organization admins can change the schedule.</span>}
            <button onClick={save} disabled={!isAdmin || saving} className="btn btn-primary">
              {saving ? <span className="loader" style={{ borderTopColor: "white" }}></span> : <Icon name="Save" size={13} />} Save Schedule
            </button>
          </div>
        </div>
      </div>

      {deferredMsg && <DeferredNotice className="mb-4">{deferredMsg}</DeferredNotice>}

      {/* Sync history */}
      <div className="card">
        <div className="p-4 border-b border-line">
          <h3 className="font-display font-semibold text-ink">Sync History</h3>
          <p className="text-xs text-ink-light mt-1">Last {history.length} sync run(s)</p>
        </div>
        {runs.error ? (
          <div className="p-4"><ErrorState message={runs.error} onRetry={runs.reload} /></div>
        ) : runs.loading && !runs.data ? (
          <Loading />
        ) : history.length === 0 ? (
          <EmptyState icon="History" title="No sync runs yet" description="Click 'Run Sync Now' above to do your first sync." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Run At</th><th>Status</th><th>Updated</th><th>Duration</th><th>Changes</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="text-xs text-ink-light">{fmtTs(h.startedAt)}</td>
                    <td><Pill type={h.status === "success" ? "success" : h.status === "partial" ? "warn" : h.status === "running" ? "info" : "danger"}>{h.status}</Pill></td>
                    <td className="font-mono text-xs">{h.providersUpdated}/{h.providersChecked}</td>
                    <td className="font-mono text-xs">{h.durationSec}s</td>
                    <td className="text-xs text-ink-light">{h.changes.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-provider sync */}
      <div className="card mt-4">
        <div className="p-4 border-b border-line">
          <h3 className="font-display font-semibold text-ink">Force Sync Individual Provider</h3>
          <p className="text-xs text-ink-light mt-1">Refresh a single provider&apos;s CAQH data on-demand outside of the schedule</p>
        </div>
        {status.error ? (
          <div className="p-4"><ErrorState message={status.error} onRetry={status.reload} /></div>
        ) : status.loading && !status.data ? (
          <Loading />
        ) : tracked.length === 0 ? (
          <EmptyState icon="Database" title="No providers with a CAQH ID" description="Import a CAQH export or enroll providers in CAQH to sync them." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Provider</th><th>CAQH ID</th><th>Last Synced</th><th className="text-right">Action</th></tr></thead>
              <tbody>
                {tracked.map((p) => (
                  <tr key={p.providerId}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={p.name} size={26} />
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{p.caqhId}</td>
                    <td className="text-xs text-ink-light">{p.lastSynced ? fmtTs(p.lastSynced) : "Never"}</td>
                    <td className="text-right">
                      {isWriter ? (
                        <button onClick={() => runSync(p.providerId)} disabled={syncing === p.providerId} className="btn btn-secondary text-xs">
                          {syncing === p.providerId ? <><span className="loader"></span> Syncing...</> : <><Icon name="RefreshCw" size={11} /> Sync</>}
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
    </div>
  );
}
