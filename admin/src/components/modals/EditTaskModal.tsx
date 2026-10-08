"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useToast } from "@/stores/toast";
import type { ProviderLite, TaskRow } from "@/types/tasks";

/** Edit modal — same fields as CreateTaskModal; PUT /tasks/{id} (full replace, assignee kept). */
export function EditTaskModal({ task, onClose, onSaved }: { task: TaskRow; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [providers, setProviders] = useState<ProviderLite[]>([]);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    priority: task.priority as string,
    dueDate: task.dueDate ?? "",
    providerId: task.providerId ? String(task.providerId) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<ProviderLite[]>("/providers/all-lite").then(setProviders).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.title.trim()) {
      setErrors({ title: "Title is required" });
      return;
    }
    if (form.title.trim().length > 255) {
      setErrors({ title: "Title must be 255 characters or less" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api.put(`/tasks/${task.id}`, {
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
        providerId: form.providerId ? Number(form.providerId) : null,
        assigneeUserId: task.assigneeUserId,
      });
      toast("Task updated");
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit Task" subtitle="Update the task details, priority and due date." onClose={onClose} maxWidth={560}>
      <div className="space-y-3">
        <Field label="Title" error={errors.title}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={"input " + (errors.title ? "input-error" : "")} autoFocus />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority" error={errors.priority}>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Due Date" error={errors.dueDate}>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
          </Field>
        </div>
        <Field label="Related Provider (optional)" error={errors.providerId}>
          <select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} className="input">
            <option value="">— None —</option>
            {task.providerId && !providers.some((p) => p.id === task.providerId) && <option value={task.providerId}>{task.providerName}</option>}
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={save} disabled={!form.title || busy} className="btn btn-primary">
            {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Check" size={13} />} Update
          </button>
        </div>
      </div>
    </Modal>
  );
}
