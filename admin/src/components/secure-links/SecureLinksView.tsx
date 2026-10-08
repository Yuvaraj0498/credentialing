"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate, cleanSearch } from "@/lib/utils";
import { useTopic } from "@/stores/shell";
import { useToast } from "@/stores/toast";
import type { SecureLinkItem, SecureLinkStatus } from "@/types/providers";

type Filter = "all" | "pending" | "accessed" | "submitted" | "expired" | "locked";

const STATUS_PILL: Record<SecureLinkStatus, { label: string; type: string }> = {
  pending: { label: "Pending", type: "warn" },
  accessed: { label: "Accessed", type: "info" },
  submitted: { label: "Submitted", type: "success" },
  expired: { label: "Expired", type: "danger" },
  locked: { label: "Locked", type: "danger" },
  replaced: { label: "Replaced", type: "neutral" },
};

const portalUrl = (l: SecureLinkItem) => (typeof window !== "undefined" ? window.location.origin : "") + l.uploadUrl;

/** Prototype v2 SecureLinksView — secure links sent to providers, their status, PIN and portal URL. */
export function SecureLinksView() {
  const toast = useToast();
  const links = useAsync<SecureLinkItem[]>(() => api.get<SecureLinkItem[]>("/secure-links"), []);
  useTopic("providers", links.reload);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<SecureLinkItem | null>(null);
  const [busy, setBusy] = useState(false);
  const all = useMemo(() => links.data || [], [links.data]);

  const counts = useMemo(() => {
    const c = (s: SecureLinkStatus) => all.filter((l) => l.status === s).length;
    return { all: all.length, pending: c("pending"), accessed: c("accessed"), submitted: c("submitted"), expired: c("expired"), locked: c("locked") };
  }, [all]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? all : all.filter((l) => l.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.providerName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || ("#" + l.id).includes(q));
    }
    return list;
  }, [all, filter, search]);

  const copyUrl = (l: SecureLinkItem) => {
    navigator.clipboard?.writeText(portalUrl(l)).then(
      () => toast("Portal URL copied"),
      () => toast("Could not copy the URL", "error")
    );
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete("/secure-links/" + deleting.id);
      links.setData(all.filter((l) => l.id !== deleting.id));
      toast("Secure link deleted");
      setDeleting(null);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Secure Links" subtitle={all.length + " secure link(s) sent to providers. Monitor status and copy portal URLs."} />

      <AsyncBoundary loading={links.loading} error={links.error} onRetry={links.reload}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatCard label="Total" value={counts.all} icon="Link" color="var(--accent)" />
          <StatCard label="Pending" value={counts.pending} icon="Clock" color="var(--warn)" />
          <StatCard label="Accessed" value={counts.accessed} icon="Eye" color="var(--info)" />
          <StatCard label="Submitted" value={counts.submitted} icon="CheckCircle2" color="var(--success)" />
          <StatCard
            label="Expired"
            value={counts.expired + counts.locked}
            sub={counts.locked ? counts.locked + " locked (PIN attempts)" : undefined}
            icon="AlertCircle"
            color="var(--danger)"
            emphasize={counts.expired + counts.locked > 0}
          />
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
            <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search by name, email, or link #..." className="input" style={{ paddingLeft: 32 }} />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="input" style={{ width: 190 }}>
            <option value="all">All ({counts.all})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="accessed">Accessed ({counts.accessed})</option>
            <option value="submitted">Submitted ({counts.submitted})</option>
            <option value="expired">Expired ({counts.expired})</option>
            <option value="locked">Locked ({counts.locked})</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon="Link"
              title="No secure links"
              description={all.length === 0 ? "Send a secure link to a provider via + Add Provider → Send Link" : "No links match this filter"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Email</th>
                    <th>PIN</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const pill = STATUS_PILL[l.status];
                    const usable = l.status === "pending" || l.status === "accessed";
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={l.providerName} size={26} />
                            <div>
                              <Link href={"/providers/" + l.providerId} className="text-sm font-medium hover:underline">{l.providerName}</Link>
                              <div className="text-[10px] text-ink-faint font-mono">Link #{l.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs text-ink-light">{l.email}</td>
                        <td className="font-mono text-sm font-semibold tracking-widest">{l.pin}</td>
                        <td>
                          <Pill type={pill.type}>{pill.label}</Pill>
                          {l.attempts > 0 && l.status !== "submitted" && (
                            <div className="text-[10px] text-ink-faint mt-0.5">{l.attempts}/{l.maxAttempts} wrong PIN</div>
                          )}
                        </td>
                        <td className="text-xs text-ink-light">{fmtDate(l.createdAt)}</td>
                        <td className="text-xs text-ink-light">{fmtDate(l.expiresAt)}</td>
                        <td className="text-right whitespace-nowrap">
                          <button onClick={() => copyUrl(l)} className="btn btn-ghost text-xs" title="Copy portal URL" disabled={!usable}>
                            <Icon name="Copy" size={11} />
                          </button>
                          <a href={l.uploadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-xs" title="Open portal">
                            <Icon name="ExternalLink" size={11} />
                          </a>
                          <button onClick={() => setDeleting(l)} className="btn-ghost p-1" title="Delete" aria-label="Delete secure link">
                            <Icon name="Trash2" size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-4 p-3 rounded text-xs text-ink-light" style={{ background: "var(--bg-soft)" }}>
            <Icon name="Info" size={11} className="inline mr-1" />
            Each link opens the provider portal at <span className="font-mono">/admin/upload/&lt;token&gt;</span>; the provider needs the 6-digit PIN. Links expire after 7 days and lock
            after 5 wrong PINs — send a new link from the provider&apos;s page to replace one. Click <Icon name="ExternalLink" size={9} className="inline" /> to test the flow yourself.
          </div>
        )}
      </AsyncBoundary>

      {deleting && (
        <ConfirmDialog
          title="Delete secure link?"
          message={"The portal URL sent to " + deleting.email + " will stop working."}
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
