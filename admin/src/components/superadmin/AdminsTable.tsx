"use client";

import { Pill } from "@/components/Pill";
import { fmtDate } from "@/lib/utils";
import type { AdminSummary } from "./types";

/** The admins (one per organization account) created by the super admin. */
export function AdminsTable({ admins }: { admins: AdminSummary[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Admin</th>
            <th>Email</th>
            <th>Organization</th>
            <th>Plan</th>
            <th className="text-right">Users</th>
            <th className="text-right">Providers</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.userId}>
              <td className="font-medium text-ink">{a.name}</td>
              <td className="text-xs text-ink-light">{a.email}</td>
              <td className="text-sm">{a.orgName || "—"}</td>
              <td className="text-xs">{a.planName || "—"}</td>
              <td className="text-right font-mono text-xs">{a.userCount}</td>
              <td className="text-right font-mono text-xs">{a.providerCount}</td>
              <td>
                {a.disabled ? <Pill type="neutral">Disabled</Pill> : a.orgStatus === "suspended" ? <Pill type="danger">Suspended</Pill> : <Pill type="success">Active</Pill>}
              </td>
              <td className="text-xs text-ink-light">{fmtDate(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
