"use client";

import { Fragment, useState } from "react";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useAuth, useUser } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ROLE_LABEL } from "@/lib/constants";
import type { Matrix, PermissionMatrix } from "@/types/permissions";

const clone = (m: Matrix): Matrix => JSON.parse(JSON.stringify(m));

export function PermissionsView() {
  const user = useUser();
  const { reload: reloadMe } = useAuth();
  const toast = useToast();
  const perms = useAsync<PermissionMatrix>(() => api.get<PermissionMatrix>("/permissions"), []);
  const [local, setLocal] = useState<Matrix | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"" | "org" | "defaults">("");

  // Reset the editable copy whenever a fresh matrix arrives from the API.
  const [seen, setSeen] = useState<PermissionMatrix | undefined>(undefined);
  if (perms.data && perms.data !== seen) {
    setSeen(perms.data);
    setLocal(clone(perms.data.matrix));
    setDirty(false);
  }

  if (perms.error) return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can do with each entity. Changes apply immediately across the app." />
      <ErrorState message={perms.error} onRetry={perms.reload} />
    </div>
  );
  if (!perms.data || !local) return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can do with each entity. Changes apply immediately across the app." />
      <Loading />
    </div>
  );

  const { roles, entities, actions, canEdit, canEditDefaults, hasOrgOverrides } = perms.data;
  const canEditMatrix = canEdit;

  const toggle = (entity: string, action: string, role: string) => {
    if (!canEditMatrix || role === "platform_admin") return;
    const next = clone(local);
    next[entity] = next[entity] || {};
    const current = next[entity][action] || [];
    next[entity][action] = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setLocal(next);
    setDirty(true);
  };

  const save = async () => {
    setSaving("org");
    try {
      const res = await api.put<PermissionMatrix>("/permissions", { matrix: local });
      perms.setData(res);
      setDirty(false);
      toast("Permission matrix saved — effective immediately");
      reloadMe().catch(() => {});
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving("");
    }
  };

  const saveDefaults = async () => {
    setSaving("defaults");
    try {
      const res = await api.put<PermissionMatrix>("/admin/permissions/defaults", { matrix: local });
      perms.setData(res);
      setDirty(false);
      toast("Global default permissions saved");
      reloadMe().catch(() => {});
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving("");
    }
  };

  const reset = () => {
    setLocal(clone(perms.data!.defaults));
    setDirty(true);
    toast("Reset to defaults — click Save to apply");
  };

  const busyLoader = <span className="loader" style={{ borderTopColor: "white" }} />;

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define what each role can do with each entity. Changes apply immediately across the app."
        actions={
          canEditMatrix && (
            <>
              <button onClick={reset} className="btn btn-secondary" disabled={!!saving}><Icon name="RotateCcw" size={13} /> Reset to Defaults</button>
              {canEditDefaults && (
                <button onClick={saveDefaults} disabled={!dirty || !!saving} className="btn btn-secondary" title="Save this matrix as the global default for every organization">
                  {saving === "defaults" ? <span className="loader" /> : <Icon name="Globe" size={13} />} Save as Global Defaults
                </button>
              )}
              <button onClick={save} disabled={!dirty || !!saving} className="btn btn-primary">
                {saving === "org" ? busyLoader : <Icon name="Save" size={13} />} Save Matrix
              </button>
            </>
          )
        }
      />

      {!canEditMatrix && (
        <div className="card card-pad mb-4" style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}>
          <div className="flex items-center gap-2 text-xs">
            <Icon name="Lock" size={14} style={{ color: "#a16207" }} />
            <span>Your role ({ROLE_LABEL[user.role] || user.role}) can view this page but not edit the matrix. Only Platform Admin and Org Admin can edit permissions.</span>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="card card-pad mb-4">
        <h3 className="font-semibold text-sm text-ink mb-3">Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {roles.map((r) => (
            <div key={r.id} className="p-2 rounded-lg border border-line">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: r.color }}></div>
                <span className="font-semibold text-xs">{r.label}</span>
              </div>
              <div className="text-[10px] text-ink-light">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-ink">Permission Matrix</h3>
            {hasOrgOverrides ? <Pill type="accent">Customized for this organization</Pill> : <Pill type="neutral">Using defaults</Pill>}
          </div>
          <p className="text-xs text-ink-light mt-1">Click a cell to toggle. Green = allowed, grey = denied. Super Admin always has full access. A new role starts with every permission off.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-paper z-10">Entity</th>
                <th>Action</th>
                {roles.map((r) => (
                  <th key={r.id} className="text-center" style={{ minWidth: 100 }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: r.color }}></div>
                      <span className="text-[10px]">{r.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <Fragment key={entity}>
                  {actions.map((action, aIdx) => (
                    <tr key={entity + "_" + action}>
                      {aIdx === 0 && (
                        <td rowSpan={actions.length} className="sticky left-0 bg-paper font-semibold capitalize border-r border-line" style={{ verticalAlign: "top", paddingTop: 12 }}>
                          {entity.replace(/_/g, " ")}
                        </td>
                      )}
                      <td className="text-xs capitalize font-mono">{action}</td>
                      {roles.map((r) => {
                        const locked = r.id === "platform_admin";
                        const isAllowed = locked || (local[entity]?.[action] || []).includes(r.id);
                        const editable = canEditMatrix && !locked;
                        return (
                          <td key={r.id} className="text-center">
                            <button
                              onClick={() => toggle(entity, action, r.id)}
                              disabled={!editable}
                              title={locked ? "Platform admins always have access" : undefined}
                              aria-label={(isAllowed ? "Allowed" : "Denied") + ": " + r.label + " " + action + " " + entity}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors mx-auto"
                              style={{
                                background: isAllowed ? "var(--success)" : "var(--bg-soft-2)",
                                cursor: editable ? "pointer" : "not-allowed",
                                opacity: editable ? 1 : 0.6,
                              }}
                            >
                              <Icon name={isAllowed ? "Check" : "X"} size={12} style={{ color: isAllowed ? "white" : "var(--ink-faint)" }} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
