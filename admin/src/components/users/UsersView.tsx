"use client";

import { useState } from "react";
import { useEmailCheck } from "@/lib/useEmailCheck";
import { cleanSearch } from "@/lib/utils";
import { AccessDenied } from "@/components/AlertBox";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth, useUser } from "@/stores/auth";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@/types";
import { ROLES } from "@/types/permissions";
import type { ProviderLite, User, UserCreate, UserUpdate } from "@/types/users";
import { ProviderForm } from "@/components/providers/ProviderForm";
import { useOrgStructure } from "@/components/providers/shared";

export function UsersView() {
  const authUser = useUser();
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const q = useDebounced(search.trim());

  const canList = can("list", "user");
  const usersQ = useAsync<User[]>(canList ? () => api.get<User[]>("/users", { q }) : null, [q, canList]);
  // the "All Roles" filter lists the super admin's User Roles
  const roleList = useAsync<{ id: number; name: string; accessLevel: string }[]>(canList ? () => api.get<{ id: number; name: string; accessLevel: string }[]>("/user-roles") : null, [canList]);
  const filterRole = (roleList.data || []).find((r) => String(r.id) === roleFilter);
  const matchesRole = (u: User) =>
    u.userRoleId != null
      ? String(u.userRoleId) === roleFilter
      : !!filterRole && (filterRole.accessLevel === u.role || ((u.role as string) === "admin" && filterRole.accessLevel === "org_admin"));
  const users = { ...usersQ, data: usersQ.data ? (roleFilter === "all" ? usersQ.data : usersQ.data.filter(matchesRole)) : usersQ.data };
  // Unfiltered list for the header counts.
  const all = useAsync<User[]>(canList ? () => api.get<User[]>("/users") : null, [canList]);

  if (!canList) return <AccessDenied action="list" entity="users" role={ROLE_LABEL[authUser.role] || authUser.role} />;

  const reload = () => {
    users.reload();
    all.reload();
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete("/users/" + pendingDelete.id);
      toast("User deleted");
      setPendingDelete(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleting(false);
    }
  };

  const allUsers = all.data || [];
  const filtered = users.data || [];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={
          all.data
            ? allUsers.length + " total · " + allUsers.filter((u) => u.role === "provider").length + " providers · " + allUsers.filter((u) => u.role !== "provider").length + " staff"
            : "Loading…"
        }
        actions={
          can("create", "user") && (
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
              <Icon name="UserPlus" size={13} /> Add User
            </button>
          )
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs" style={{ minWidth: 200 }}>
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search name, email, username..." className="input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input" style={{ width: 200 }}>
          <option value="all">All Roles</option>
          {(roleList.data || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : (
        <div className="card overflow-hidden">
          {users.loading && !users.data ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <EmptyState icon="Users" title="No users match" />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const roleObj = ROLES.find((r) => r.id === u.role) || ROLES.find((r) => r.id === "org_admin")!;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={u.displayName || u.username} size={28} />
                            <div>
                              <div className="text-sm font-medium">{u.displayName || u.username}</div>
                              {u.title && <div className="text-[10px] text-ink-light">{u.title}</div>}
                              {u.role === "provider" && u.providerName && <div className="text-[10px] text-ink-faint">Linked: {u.providerName}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{u.username}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: roleObj.color }}></div>
                            <span className="text-xs">{u.userRoleName || roleObj.label}</span>
                          </div>
                          {u.userRoleName && <div className="text-[10px] text-ink-faint ml-3.5">{roleObj.label}</div>}
                        </td>
                        <td className="text-xs text-ink-light">{u.email || "—"}</td>
                        <td>
                          <Pill type={u.disabled ? "danger" : "success"}>{u.disabled ? "Disabled" : "Active"}</Pill>
                        </td>
                        <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                          {can("update", "user") && (
                            <button onClick={() => { setEditing(u); setShowForm(true); }} className="btn btn-ghost text-xs">
                              <Icon name="Edit" size={11} /> Edit
                            </button>
                          )}
                          {can("delete", "user") && u.id !== authUser.id && (
                            <button onClick={() => setPendingDelete(u)} className="btn-ghost p-1 hover:text-danger" title="Delete user">
                              <Icon name="Trash2" size={11} />
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
      )}

      {showForm && (
        <UserFormModal
          user={editing}
          isSelf={!!editing && editing.id === authUser.id}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            reload();
          }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete user"
          message={"Delete user " + pendingDelete.displayName + "? This cannot be undone."}
          busy={deleting}
          onConfirm={doDelete}
          onClose={() => !deleting && setPendingDelete(null)}
        />
      )}
    </div>
  );
}

interface UserForm {
  displayName: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  userRoleId: string;
  title: string;
  phone: string;
  providerId: string;
  disabled: boolean;
}

export function UserFormModal({ user, isSelf, onSaved, onClose }: { user: User | null; isSelf: boolean; onSaved: () => void; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<UserForm>(
    user
      ? {
          displayName: user.displayName || "",
          username: user.username,
          email: user.email || "",
          password: "",
          role: user.role,
          userRoleId: user.userRoleId ? String(user.userRoleId) : "",
          title: user.title || "",
          phone: user.phone || "",
          providerId: user.providerId ? String(user.providerId) : "",
          disabled: user.disabled,
        }
      : { displayName: "", username: "", email: "", password: "", role: "clerk", userRoleId: "", title: "", phone: "", providerId: "", disabled: false }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  // role names managed by the super admin (User Roles)
  const userRoles = useAsync<{ id: number; name: string; accessLevel: Role; active: boolean }[]>(() => api.get<{ id: number; name: string; accessLevel: Role; active: boolean }[]>("/user-roles"), []);
  // the chosen role decides the access level (set per role by the super admin)
  const chosenRole = (userRoles.data || []).find((r) => String(r.id) === form.userRoleId);
  const access: Role | undefined = chosenRole?.accessLevel;
  const providers = useAsync<ProviderLite[]>(access === "provider" ? () => api.get<ProviderLite[]>("/providers/all-lite") : null, [access === "provider"]);
  // Add User with a provider role: the provider is added with every Add Provider Manually field + their sign-in
  const newProvider = !user && access === "provider";
  const org = useOrgStructure(newProvider);

  const emailTaken = useEmailCheck(
    form.email,
    { kind: "user", id: user?.id, providerId: access === "provider" && form.providerId ? Number(form.providerId) : undefined, orgAdmin: access === "org_admin" },
    !newProvider
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.displayName.trim()) e.displayName = "Required";
    if (!user) {
      if (!form.username.trim()) e.username = "Required";
      else if (!/^[A-Za-z0-9._@+-]{3,150}$/.test(form.username.trim())) e.username = "3-150 characters: letters, digits and . _ @ + -";
    }
    if (!form.email || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Valid email required";
    else if (emailTaken) e.email = emailTaken;
    if (!user && (!form.password || form.password.length < 8)) e.password = "8+ characters";
    if (user && form.password && form.password.length < 8) e.password = "8+ characters";
    if (!form.role) e.role = "Required";
    if (!form.userRoleId) e.userRoleId = "Choose a role";
    if (access === "provider" && !form.providerId) e.providerId = "Select the provider this login belongs to";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setFormError("");
    const common = {
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      role: access || form.role,
      userRoleId: Number(form.userRoleId),
      title: form.title.trim() || undefined,
      phone: form.phone.trim() || undefined,
      providerId: access === "provider" && form.providerId ? Number(form.providerId) : null,
      disabled: form.disabled,
    };
    try {
      if (user) {
        const body: UserUpdate = { ...common, password: form.password || null };
        await api.put("/users/" + user.id, body);
        toast("User updated");
      } else {
        const body: UserCreate = { ...common, username: form.username.trim(), password: form.password };
        await api.post("/users", body);
        toast("User created");
      }
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const roleSelect = (
    <select value={form.userRoleId} onChange={(e) => { setForm({ ...form, userRoleId: e.target.value }); setErrors((er) => ({ ...er, userRoleId: "" })); }} className="input" disabled={userRoles.loading || isSelf} title={isSelf ? "You cannot change your own role" : undefined}>
      <option value="">{userRoles.loading ? "Loading roles…" : "— Select role —"}</option>
      {(userRoles.data || []).filter((r) => r.active !== false || r.id === user?.userRoleId).map((r) => <option key={r.id} value={r.id}>{r.name}{r.active === false ? " (disabled)" : ""}</option>)}
    </select>
  );
  if (newProvider) {
    return (
      <Modal title="Add User" subtitle="Provider login — enter the provider's details, every field is required." onClose={onClose} maxWidth={720}>
        {org.error ? (
          <div className="field-error">{org.error}</div>
        ) : !org.data ? (
          <Loading compact />
        ) : (
          <ProviderForm
            org={org.data}
            initial={{ email: form.email }}
            withLogin
            submitLabel="Create User"
            onCancel={onClose}
            top={
              <div className="pb-3 mb-1 border-b border-line">
                <Field label="Role *" error={errors.userRoleId}>{roleSelect}</Field>
              </div>
            }
            onSubmit={async ({ username, password, ...provider }) => {
              await api.post("/users/with-provider", { username, password, userRoleId: Number(form.userRoleId), provider });
              toast("Provider and sign-in created");
              onSaved();
            }}
          />
        )}
      </Modal>
    );
  }

  return (
    <Modal title={user ? "Edit User" : "Add User"} onClose={onClose} maxWidth={520}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Display Name *" error={errors.displayName}>
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input" />
          </Field>
          <Field label="Title" error={errors.title}>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. Credentialing Specialist" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username *" error={errors.username}>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input font-mono" disabled={!!user} autoComplete="off" />
          </Field>
          <Field label="Role *" error={errors.userRoleId}>
            {roleSelect}
            {userRoles.error && <div className="field-error">{userRoles.error}</div>}
          </Field>
        </div>
        {access === "provider" && (
          <Field label="Linked Provider *" error={errors.providerId}>
            <select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} className="input" disabled={providers.loading}>
              <option value="">{providers.loading ? "Loading providers…" : "— Select provider —"}</option>
              {(providers.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.npi ? " · NPI " + p.npi : ""}
                </option>
              ))}
            </select>
            {providers.error && <div className="field-error">{providers.error}</div>}
          </Field>
        )}
        <Field label="Email *" error={errors.email || emailTaken}>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        </Field>
        <Field label={user ? "New Password" : "Password *"} error={errors.password} hint={user ? "Leave blank to keep the current password" : undefined}>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>
        {access !== "provider" && (
          <label className="flex items-center gap-2 text-sm" style={isSelf ? { opacity: 0.6 } : undefined}>
            <input type="checkbox" checked={form.disabled} disabled={isSelf} onChange={(e) => setForm({ ...form, disabled: e.target.checked })} />
            Disabled (user cannot sign in)
          </label>
          )}
        {formError && (
          <div className="px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "var(--danger-soft)", color: "#991b1b", fontSize: 13 }}>
            <Icon name="AlertCircle" size={14} /> {formError}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={submit} className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Save" size={13} />} {user ? "Update" : "Create User"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
