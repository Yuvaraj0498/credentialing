"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { useShell, useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { fmtTs } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { NotificationListResponse, NotificationRow } from "@/types/notifications";

type Filter = "all" | "unread";

export function NotificationsView() {
  const { user } = useAuth();
  const { publish } = useShell();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deleting, setDeleting] = useState<NotificationRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(() => api.get<NotificationListResponse>("/notifications", { filter }), [filter]);
  useTopic("notifications", reload);

  const notifications = data?.items ?? [];
  const unreadCount = data?.unread ?? 0;
  const total = data?.total ?? 0;
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

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount + " unread"}
        actions={unreadCount > 0 && (
          <button onClick={markAll} disabled={markingAll} className="btn btn-secondary">
            {markingAll ? <span className="loader" /> : <Icon name="CheckCheck" size={13} />} Mark all read
          </button>
        )}
      />
      <div className="flex gap-1 border-b border-line mb-4">
        {([
          { id: "all", label: "All", count: total },
          { id: "unread", label: "Unread", count: unreadCount },
        ] as { id: Filter; label: string; count: number }[]).map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
                  className={"px-4 py-2 text-sm font-medium relative " + (filter === t.id ? "text-accent" : "text-ink-light hover:text-ink")}>
            {t.label} <span className="text-ink-faint ml-1">{t.count}</span>
            {filter === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }}></div>}
          </button>
        ))}
      </div>
      <AsyncBoundary loading={loading && !data} error={error} onRetry={reload}>
        {notifications.length === 0 ? (
          <EmptyState icon="Bell" title="No notifications" description="You're all caught up." />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={"card card-pad flex items-start gap-3 " + (!n.read ? "border-l-4" : "")} style={{ ...(!n.read ? { borderLeftColor: "var(--accent)" } : {}), ...(busyId === n.id ? { opacity: 0.6 } : {}) }}>
                <Icon name={n.icon || "Bell"} size={16} style={{ color: n.color || "var(--accent)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={"font-medium " + (!n.read ? "text-ink" : "text-ink-light")}>{n.title}</div>
                    <div className="text-xs text-ink-faint flex-shrink-0">{fmtTs(n.createdAt)}</div>
                  </div>
                  {n.body && <div className="text-sm text-ink-light mt-0.5">{n.body}</div>}
                  <div className="flex gap-2 mt-2">
                    {!n.read && <button onClick={() => markRead(n)} disabled={busyId === n.id} className="text-xs text-accent hover:underline">Mark read</button>}
                    {!(isAuditor && n.broadcast) && <button onClick={() => setDeleting(n)} className="text-xs text-ink-faint hover:text-danger">Delete</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
