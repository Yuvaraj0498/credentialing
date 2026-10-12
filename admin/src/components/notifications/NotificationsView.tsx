"use client";

import { useEffect, useRef, useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { ConfirmDialog } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { useShell, useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { matchesSearch } from "@/lib/search";
import { cleanSearch, fmtTs } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { NotificationListResponse, NotificationRow } from "@/types/notifications";

/** "just now", "5 min ago", "3 h ago", "2 days ago", else the date. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return fmtTs(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return min + " min ago";
  const h = Math.floor(min / 60);
  if (h < 24) return h + " h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + (d === 1 ? " day ago" : " days ago");
  return fmtTs(iso);
}

/** A colour with transparency, for the tinted icon circle (accepts #rgb / #rrggbb, else a CSS colour). */
function tint(color: string | null | undefined, alpha: number): string {
  const c = color || "";
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (!m) return "var(--accent-soft, rgba(249,115,22,.12))";
  const hex = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Notifications: unread and read side by side. */
export function NotificationsView() {
  const { user } = useAuth();
  const { publish } = useShell();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deleting, setDeleting] = useState<NotificationRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState("");
  // the two columns always reach the bottom of the window (whatever the zoom / header height)
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [colHeight, setColHeight] = useState<number | null>(null);
  const fitBoard = () => {
    const el = boardRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    setColHeight(Math.max(320, Math.floor(window.innerHeight - top - 24)));
  };
  useEffect(() => {
    window.addEventListener("resize", fitBoard);
    return () => window.removeEventListener("resize", fitBoard);
  }, []);
  // measured as soon as the board is shown (it appears once the notifications are loaded)
  const setBoard = (el: HTMLDivElement | null) => {
    boardRef.current = el;
    if (el) requestAnimationFrame(fitBoard);
  };

  const { data, loading, error, reload } = useAsync(() => api.get<NotificationListResponse>("/notifications", { filter: "all" }), []);
  useTopic("notifications", reload);

  const all = (data?.items ?? []).filter((n) => matchesSearch(search, n.title, n.body));
  const unread = all.filter((n) => !n.read);
  const read = all.filter((n) => n.read);
  const unreadCount = data?.unread ?? 0;
  const isAuditor = user?.role === "auditor";

  // publish() re-runs our own reload via useTopic and refreshes the sidebar badge.
  const changed = () => publish("notifications");

  const markRead = async (n: NotificationRow) => {
    setBusyId(n.id);
    try {
      await api.patch(`/notifications/${n.id}/read`);
      changed();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      const res = await api.post<{ updated: number }>("/notifications/read-all");
      toast(res.updated + " notification(s) marked read");
      changed();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/notifications/${deleting.id}`);
      toast("Notification deleted");
      setDeleting(null);
      changed();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const card = (n: NotificationRow) => (
    <div
      key={n.id}
      className="group relative rounded-xl border p-3.5 flex items-start gap-3 transition-shadow hover:shadow-md"
      style={{
        background: n.read ? "var(--paper)" : "linear-gradient(135deg, var(--paper) 0%, " + tint(n.color, 0.06) + " 100%)",
        borderColor: n.read ? "var(--line)" : tint(n.color, 0.35),
        opacity: busyId === n.id ? 0.6 : 1,
      }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tint(n.color, n.read ? 0.08 : 0.16) }}>
        <Icon name={n.icon || "Bell"} size={16} style={{ color: n.color || "var(--accent)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={"text-sm leading-snug " + (n.read ? "text-ink-light font-medium" : "text-ink font-semibold")}>{n.title}</div>
          {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: n.color || "var(--accent)" }} aria-label="Unread" />}
        </div>
        {n.body && <div className="text-xs text-ink-light mt-1 leading-relaxed">{n.body}</div>}
        <div className="flex items-center gap-3 mt-2.5">
          <span className="text-[11px] text-ink-faint inline-flex items-center gap-1" title={fmtTs(n.createdAt)}>
            <Icon name="Clock" size={11} /> {timeAgo(n.createdAt)}
          </span>
          {n.broadcast && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "var(--bg-soft-2)", color: "var(--ink-light)" }}>
              Everyone
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {!n.read && (
              <button
                onClick={() => markRead(n)}
                disabled={busyId === n.id}
                className="btn btn-ghost text-[11px] px-2 py-1"
                style={{ color: "var(--accent)" }}
                aria-label={"Mark read: " + n.title}
              >
                <Icon name="Check" size={12} /> Mark read
              </button>
            )}
            {!(isAuditor && n.broadcast) && (
              <button onClick={() => setDeleting(n)} className="btn btn-ghost p-1.5 text-ink-faint hover:text-danger" title="Delete" aria-label={"Delete: " + n.title}>
                <Icon name="Trash2" size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const column = (title: string, icon: string, color: string, items: NotificationRow[], empty: { title: string; text: string }, action?: React.ReactNode) => (
    <section className="card flex flex-col min-h-0" style={{ overflow: "hidden", height: colHeight ?? "calc(100vh - 230px)", minHeight: 320 }}>
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-line" style={{ background: tint(color, 0.05) }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tint(color, 0.15) }}>
          <Icon name={icon} size={15} style={{ color }} />
        </div>
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        <span className="text-xs font-mono font-semibold rounded-full px-2 py-0.5" style={{ background: tint(color, 0.15), color }}>{items.length}</span>
        <div className="ml-auto">{action}</div>
      </header>
      <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: tint(color, 0.1) }}>
              <Icon name={icon} size={20} style={{ color }} />
            </div>
            <div className="text-sm font-medium text-ink">{empty.title}</div>
            <div className="text-xs text-ink-faint mt-0.5">{empty.text}</div>
          </div>
        ) : (
          items.map(card)
        )}
      </div>
    </section>
  );

  return (
    <div>
      <PageHeader title="Notifications" subtitle={unreadCount > 0 ? unreadCount + " unread · " + (data?.total ?? 0) + " in total" : "You're all caught up"} />
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search notifications..." className="input" style={{ paddingLeft: 32 }} aria-label="Search notifications" />
      </div>
      <AsyncBoundary loading={loading && !data} error={error} onRetry={reload}>
        <div ref={setBoard} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {column(
            "Unread",
            "BellRing",
            "#f97316",
            unread,
            { title: "No unread notifications", text: search ? "Nothing matches your search." : "You're all caught up." },
            unread.length > 0 && !search ? (
              <button onClick={markAll} disabled={markingAll} className="btn btn-secondary text-xs" style={{ padding: "5px 10px" }}>
                {markingAll ? <span className="loader" /> : <Icon name="CheckCheck" size={12} />} Mark all read
              </button>
            ) : undefined
          )}
          {column("Read", "MailOpen", "#059669", read, { title: "No read notifications", text: search ? "Nothing matches your search." : "Notifications you've read show here." })}
        </div>
      </AsyncBoundary>

      {deleting && (
        <ConfirmDialog
          title="Delete notification?"
          message={<>&ldquo;{deleting.title}&rdquo; will be removed{deleting.broadcast ? " for everyone in your organization" : ""}.</>}
          busy={deleteBusy}
          onConfirm={doDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
