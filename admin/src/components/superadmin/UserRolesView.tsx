"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/utils";
import { useToast } from "@/stores/toast";
import type { UserRoleItem } from "./types";

const NAME_RE = /^[A-Za-z][A-Za-z0-9 &/().,'-]*$/;

/** What users with a role can open (the role's permissions). */
export const ACCESS_LEVELS: { id: UserRoleItem["accessLevel"]; label: string; desc: string }[] = [
  { id: "org_admin", label: "Admin", desc: "All modules, including users and settings" },
  { id: "clerk", label: "Staff", desc: "Day-to-day credentialing work" },
  { id: "auditor", label: "Read-only", desc: "View only" },
  { id: "provider", label: "Provider", desc: "Provider portal login (linked to a provider)" },
];
const accessLabel = (id: string) => ACCESS_LEVELS.find((a) => a.id === id)?.label || id;

/** Super admin → User Roles: add, rename and delete role names. Org admins pick one in Users → Add user. */
export function UserRolesView() {
  const toast = useToast();
  const roles = useAsync<UserRoleItem[]>(() => api.get<UserRoleItem[]>("/user-roles"), []);
  const [editing, setEditing] = useState<UserRoleItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserRoleItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const list = roles.data || [];

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete("/user-roles/" + deleting.id);
      toast("Role deleted");
      setDeleting(null);
      roles.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="User Roles"
        subtitle="Role names admins can give their users (Users → Add user → Role)."
        actions={
          <button onClick={() => setEditing("new")} className="btn btn-primary">
            <Icon name="Plus" size={14} /> Add Role
          </button>
        }
      />
      <div className="card overflow-hidden">
        <AsyncBoundary loading={roles.loading && !roles.data} error={roles.error} onRetry={roles.reload}>
          {list.length === 0 ? (
            <EmptyState icon="BadgeCheck" title="No roles yet" description="Add the first role name." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th>Access Level</th>
                    <th className="text-right">Users</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-ink">{r.name}</td>
                      <td className="text-xs">{accessLabel(r.accessLevel)}</td>
                      <td className="text-right font-mono text-xs">{r.userCount}</td>
                      <td className="text-xs text-ink-light">{fmtDate(r.createdAt)}</td>
                      <td className="text-xs text-ink-light">{fmtDate(r.updatedAt)}</td>
                      <td className="text-right whitespace-nowrap">
                        <button onClick={() => setEditing(r)} className="btn btn-ghost text-xs" aria-label={"Edit " + r.name}>
                          <Icon name="Pencil" size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleting(r)}
                          className="btn btn-ghost text-xs"
                          style={{ color: r.userCount ? "var(--ink-faint)" : "var(--danger)" }}
                          disabled={r.userCount > 0}
                          title={r.userCount ? "Assigned to " + r.userCount + " user(s)" : "Delete"}
                          aria-label={"Delete " + r.name}
                        >
                          <Icon name="Trash2" size={12} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>

      {editing && (
        <RoleModal
          role={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            roles.reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete role"
          message={<>Delete the role <strong>{deleting.name}</strong>?</>}
          busy={deleteBusy}
          onConfirm={doDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function RoleModal({ role, onClose, onSaved }: { role: UserRoleItem | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(role?.name || "");
  const [access, setAccess] = useState<string>(role?.accessLevel || "");
  const [accessError, setAccessError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = name.trim().replace(/\s+/g, " ");
    if (!v) return setError("Role name is required");
    if (v.length < 2) return setError("At least 2 characters");
    if (v.length > 80) return setError("At most 80 characters");
    if (!NAME_RE.test(v)) return setError("Start with a letter; letters, digits, spaces and & / ( ) . , ' - only");
    if (!access) return setAccessError("Choose an access level");
    setBusy(true);
    try {
      if (role) await api.put("/user-roles/" + role.id, { name: v, accessLevel: access });
      else await api.post("/user-roles", { name: v, accessLevel: access });
      toast(role ? "Role updated" : "Role added");
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.fieldErrors.name ? e.fieldErrors.name : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={role ? "Edit Role" : "Add Role"} onClose={onClose} maxWidth={440}>
      <div className="space-y-3">
        <Field label="Role Name" required error={error}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value.replace(/^\s+/, ""));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="input"
            maxLength={80}
            autoFocus
            placeholder="e.g. Credentialing Specialist"
          />
        </Field>
        <Field label="Access Level" required error={accessError} hint={ACCESS_LEVELS.find((a) => a.id === access)?.desc || "What users with this role can open"}>
          <select
            value={access}
            onChange={(e) => {
              setAccess(e.target.value);
              setAccessError("");
            }}
            className="input"
          >
            <option value="">— Select —</option>
            {ACCESS_LEVELS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loader" /> : <Icon name="Save" size={13} />} {role ? "Update" : "Add Role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
