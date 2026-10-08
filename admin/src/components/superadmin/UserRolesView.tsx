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
import { useToast } from "@/stores/toast";
import type { UserRoleItem } from "./types";

const NAME_RE = /^[A-Za-z][A-Za-z0-9 &/().,'-]*$/;



/** Super admin → User Roles: add, rename and delete role names. Org admins pick one in Users → Add user. */
export function UserRolesView() {
  const toast = useToast();
  const roles = useAsync<UserRoleItem[]>(() => api.get<UserRoleItem[]>("/user-roles"), []);
  const [editing, setEditing] = useState<UserRoleItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserRoleItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const list = roles.data || [];

  const toggleActive = async (r: UserRoleItem) => {
    setToggling(r.id);
    try {
      await api.patch("/user-roles/" + r.id + "/active", { active: !r.active });
      toast(r.active ? r.name + " disabled — its users can no longer sign in" : r.name + " enabled");
      roles.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setToggling(null);
    }
  };

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
        subtitle="Role names admins give their users (Users → Add user → Role). What each role can do is set in Permissions."
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
                    <th className="text-right">Users</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-ink">{r.name}</td>
                      <td className="text-right font-mono text-xs">{r.userCount}</td>
                      <td className="text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={r.active}
                            aria-label={(r.active ? "Disable " : "Enable ") + r.name}
                            title={r.active ? "Enabled — click to disable (its users cannot sign in)" : "Disabled — click to enable"}
                            onClick={() => toggleActive(r)}
                            disabled={toggling === r.id}
                            style={{
                              width: 36,
                              height: 20,
                              borderRadius: 999,
                              position: "relative",
                              background: r.active ? "var(--success, #059669)" : "var(--line-strong, #cbd5e1)",
                              transition: "background .15s",
                              opacity: toggling === r.id ? 0.6 : 1,
                              cursor: toggling === r.id ? "wait" : "pointer",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: 2,
                                left: r.active ? 18 : 2,
                                width: 16,
                                height: 16,
                                borderRadius: 999,
                                background: "white",
                                boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                                transition: "left .15s",
                              }}
                            />
                          </button>
                          <span className="text-xs" style={{ color: r.active ? "var(--success, #059669)" : "var(--ink-faint)", minWidth: 52, textAlign: "left" }}>
                            {r.active ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </td>
                      <td className="text-center whitespace-nowrap">
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = name.trim().replace(/\s+/g, " ");
    if (!v) return setError("Role name is required");
    if (v.length < 2) return setError("At least 2 characters");
    if (v.length > 80) return setError("At most 80 characters");
    if (!NAME_RE.test(v)) return setError("Start with a letter; letters, digits, spaces and & / ( ) . , ' - only");
    setBusy(true);
    try {
      if (role) await api.put("/user-roles/" + role.id, { name: v });
      else await api.post("/user-roles", { name: v });
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
