"use client";

import { useEffect, useState } from "react";
import { api, getSelectedOrgId, setSelectedOrgId } from "@/lib/api";

interface OrgOption {
  id: number;
  name: string;
}

/** Platform admins choose which organization (tenant) they are working in. Sent as X-Org-Id. */
export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    api
      .get<OrgOption[]>("/admin/organizations")
      .then((list) => {
        setOrgs(list);
        const current = getSelectedOrgId();
        if (current && list.some((o) => String(o.id) === current)) setSelected(current);
        else if (list.length) {
          setSelected(String(list[0].id));
          setSelectedOrgId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  if (orgs.length === 0) return null;
  return (
    <div className="px-4 pb-2">
      <label className="label">Organization</label>
      <select
        className="input input-sm"
        value={selected}
        onChange={(e) => {
          setSelectedOrgId(e.target.value);
          // full reload so every page refetches for the new tenant
          window.location.reload();
        }}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
