"use client";

import { useState } from "react";
import Link from "next/link";
import { AsyncBoundary } from "@/components/AsyncState";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { useShell, useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { fmtDate, fmtTs, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { EditTaskModal } from "@/components/modals/EditTaskModal";
import type { TaskListResponse, TaskRow, TaskStatus } from "@/types/tasks";

type Filter = "open" | "in_progress" | "done" | "all";

export function TasksView() {
  const { can } = useAuth();
  const { openCreateTask, publish } = useShell();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);

  const canCreate = can("create", "task");
  const canUpdate = can("update", "task");
  const canDelete = can("delete", "task");

  const { data, loading, error, reload } = useAsync(
    () => api.get<TaskListResponse>("/tasks", { status: filter, priority, q }),
    [filter, priority, q]
  );
  useTopic("tasks", reload);

  const counts = data?.counts ?? { open: 0, inProgress: 0, done: 0, all: 0, overdue: 0 };
  const tasks = data?.items ?? [];

  // publish() re-runs our own useTopic reload and refreshes the sidebar counters.
  const changed = () => publish("tasks");

  const setStatus = async (t: TaskRow, status: TaskStatus) => {
    setPending(t.id);
    try {
      await api.patch(`/tasks/${t.id}/status`, { status });
      if (status === "done") toast("Task completed");
      else toast("Task updated");
      changed();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setPending(null);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/tasks/${deleting.id}`);
      toast("Task deleted");
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
        title="Tasks"
        subtitle={"You have " + counts.open + " open task(s)"}
        actions={canCreate && <button onClick={() => openCreateTask()} className="btn btn-primary"><Icon name="Plus" size={14} /> Create Task</button>}
      />
      <div className="flex gap-1 border-b border-line mb-4 overflow-x-auto">
        {([
          { id: "open", label: "Open", count: counts.open },
          { id: "in_progress", label: "In Progress", count: counts.inProgress },
          { id: "done", label: "Done", count: counts.done },
          { id: "all", label: "All", count: counts.all },
        ] as { id: Filter; label: string; count: number }[]).map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
                  className={"px-4 py-2 text-sm font-medium relative whitespace-nowrap " + (filter === t.id ? "text-accent" : "text-ink-light hover:text-ink")}>
            {t.label} <span className="text-ink-faint ml-1">{t.count}</span>
            {filter === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }}></div>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search tasks or providers..." className="input input-sm" style={{ paddingLeft: 32 }} />
        </div>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input input-sm" style={{ width: 150 }}>
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {counts.overdue > 0 && <span className="text-xs text-danger font-semibold"><Icon name="AlertCircle" size={11} className="inline" /> {counts.overdue} overdue</span>}
      </div>

      <AsyncBoundary loading={loading && !data} error={error} onRetry={reload}>
        {tasks.length === 0 ? (
          <EmptyState icon="CheckSquare" title="No tasks here" description={q || priority ? "No tasks match your filters." : "Create a task to track work that needs follow-up."} />
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const overdue = t.overdue;
              const busy = pending === t.id;
              return (
                <div key={t.id} className="card card-pad flex items-start gap-3" style={busy ? { opacity: 0.6 } : {}}>
                  <button onClick={() => canUpdate && !busy && setStatus(t, t.status === "done" ? "open" : "done")}
                          disabled={!canUpdate || busy}
                          aria-label={t.status === "done" ? "Mark open" : "Mark done"}
                          className={"w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center flex-shrink-0 " + (t.status === "done" ? "bg-success border-success" : "border-line-strong")}>
                    {t.status === "done" && <Icon name="Check" size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={"font-medium " + (t.status === "done" ? "text-ink-faint line-through" : "text-ink")}>{t.title}</div>
                    {t.description && <div className="text-xs text-ink-light mt-1">{t.description}</div>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-ink-faint flex-wrap">
                      <Pill type={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warn" : "neutral"}>{t.priority}</Pill>
                      {t.dueDate && <span className={overdue ? "text-danger font-semibold" : ""}><Icon name="Calendar" size={11} className="inline" /> {fmtDate(t.dueDate)} {overdue && "(overdue)"}</span>}
                      {t.providerId && t.providerName && (
                        <Link href={`/providers/${t.providerId}`} className="hover:text-ink"><Icon name="User" size={11} className="inline" /> {t.providerName}</Link>
                      )}
                      {t.assigneeName && <span><Icon name="UserCheck" size={11} className="inline" /> {t.assigneeName}</span>}
                      <span>{fmtTs(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {t.status !== "done" && canUpdate && (
                      <select value={t.status} disabled={busy} onChange={(e) => setStatus(t, e.target.value as TaskStatus)} className="input" style={{ width: 130 }}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    )}
                    {canUpdate && (
                      <button onClick={() => setEditing(t)} className="btn btn-ghost" style={{ padding: 6 }} title="Edit task" aria-label="Edit task">
                        <Icon name="Edit2" size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleting(t)} className="btn btn-ghost text-ink-faint hover:text-danger" style={{ padding: 6 }} title="Delete task" aria-label="Delete task">
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AsyncBoundary>

      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} onSaved={changed} />}
      {deleting && (
        <ConfirmDialog
          title="Delete task?"
          message={<>&ldquo;{deleting.title}&rdquo; will be permanently deleted.</>}
          busy={deleteBusy}
          onConfirm={doDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
