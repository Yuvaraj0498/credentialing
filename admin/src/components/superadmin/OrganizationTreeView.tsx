"use client";

import { useRef, useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useFitRows } from "@/lib/useFitRows";
import { cleanSearch } from "@/lib/utils";
import type { Location, OrgTree, TreeClient, TreePractice } from "@/types/organization";
import { Breadcrumbs } from "./Breadcrumbs";
import type { AdminSummary } from "./types";

const ROW_H = 58;
const plural = (n: number, word: string) => n + " " + word + (n === 1 ? "" : "s");

/** Super admin → Organizations → one organization: its clients → practices → locations, read-only. */
export function OrganizationTreeView({ orgId }: { orgId: number }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const tree = useAsync<OrgTree>(() => api.get<OrgTree>("/org-tree", { q }, { orgId }), [orgId, q]);
  const admins = useAsync<AdminSummary[]>(() => api.get<AdminSummary[]>("/platform/admins"), []);
  const admin = (admins.data || []).find((a) => a.orgId === orgId);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const size = useFitRows(listRef, ROW_H, 90);

  const data = tree.data;
  const orgName = data?.organization?.name || admin?.orgName || "Organization";
  const searching = q.length > 0;
  const isOpen = (key: string) => searching || open.has(key);
  const toggle = (key: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  // top-level rows: clients, then locations without a practice (one group)
  const clients = data?.clients || [];
  const groups: ({ kind: "client"; client: TreeClient } | { kind: "unassigned"; locations: Location[] })[] = clients.map((c) => ({ kind: "client" as const, client: c }));
  if (data && data.unassignedLocations.length) groups.push({ kind: "unassigned", locations: data.unassignedLocations });
  const totalPages = Math.max(1, Math.ceil(groups.length / size));
  const current = Math.min(page, totalPages - 1);
  const pageGroups = groups.slice(current * size, current * size + size);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Organizations", href: "/organizations" }, { label: orgName }]} />
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink truncate">{orgName}</h1>
          <p className="text-sm text-ink-light mt-0.5">
            {admin ? "Org admin: " + admin.name + " · " + admin.email : " "}
          </p>
        </div>
        {data && (
          <div className="flex gap-4 text-xs text-ink-light">
            <span><strong className="text-ink">{data.totals.clients}</strong> clients</span>
            <span><strong className="text-ink">{data.totals.practices}</strong> practices</span>
            <span><strong className="text-ink">{data.totals.locations}</strong> locations</span>
            <span><strong className="text-ink">{data.totals.providers}</strong> providers</span>
          </div>
        )}
      </div>
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(cleanSearch(e.target.value));
            setPage(0);
          }}
          placeholder="Search client, practice, location, city..."
          className="input"
          style={{ paddingLeft: 32 }}
          aria-label="Search organization structure"
        />
      </div>
      <div className="card overflow-hidden" ref={listRef}>
        <AsyncBoundary loading={tree.loading && !tree.data} error={tree.error} onRetry={tree.reload}>
          {pageGroups.length === 0 ? (
            <div className="text-center text-sm text-ink-light py-8">{searching ? "Nothing matches “" + q + "”" : "This organization has no clients yet"}</div>
          ) : (
            <div className="divide-y divide-line">
              {pageGroups.map((g) =>
                g.kind === "client" ? (
                  <ClientNode key={"c" + g.client.id} client={g.client} isOpen={isOpen} toggle={toggle} />
                ) : (
                  <div key="unassigned">
                    <Row
                      depth={0}
                      icon="MapPin"
                      title="Locations without a practice"
                      subtitle={plural(g.locations.length, "location")}
                      open={isOpen("u")}
                      onToggle={() => toggle("u")}
                    />
                    {isOpen("u") && g.locations.map((l) => <LocationNode key={l.id} location={l} depth={1} />)}
                  </div>
                )
              )}
            </div>
          )}
          <Pagination page={current} totalPages={totalPages} totalElements={groups.length} size={size} onChange={setPage} />
        </AsyncBoundary>
      </div>
    </div>
  );
}

function ClientNode({ client, isOpen, toggle }: { client: TreeClient; isOpen: (k: string) => boolean; toggle: (k: string) => void }) {
  const key = "c" + client.id;
  return (
    <div>
      <Row depth={0} icon="Building" title={client.name} subtitle={plural(client.practiceCount, "practice") + " · " + plural(client.providerCount, "provider")} open={isOpen(key)} onToggle={() => toggle(key)} />
      {isOpen(key) &&
        (client.practices.length === 0 ? (
          <div className="text-xs text-ink-faint py-2" style={{ paddingLeft: 52 }}>No practices</div>
        ) : (
          client.practices.map((p) => <PracticeNode key={p.id} practice={p} isOpen={isOpen} toggle={toggle} />)
        ))}
    </div>
  );
}

function PracticeNode({ practice, isOpen, toggle }: { practice: TreePractice; isOpen: (k: string) => boolean; toggle: (k: string) => void }) {
  const key = "p" + practice.id;
  return (
    <div>
      <Row
        depth={1}
        icon="Briefcase"
        accent
        title={practice.name}
        subtitle={(practice.taxId ? "Tax ID: " + practice.taxId + " · " : "") + plural(practice.locationCount, "location") + " · " + plural(practice.providerCount, "provider")}
        open={isOpen(key)}
        onToggle={() => toggle(key)}
      />
      {isOpen(key) &&
        (practice.locations.length === 0 ? (
          <div className="text-xs text-ink-faint py-2" style={{ paddingLeft: 84 }}>No locations</div>
        ) : (
          practice.locations.map((l) => <LocationNode key={l.id} location={l} depth={2} />)
        ))}
    </div>
  );
}

function LocationNode({ location, depth }: { location: Location; depth: number }) {
  const where = [location.city, location.state].filter(Boolean).join(", ");
  return <Row depth={depth} icon="MapPin" title={location.name} subtitle={(where ? where + " · " : "") + plural(location.providerCount, "provider")} />;
}

function Row({ depth, icon, title, subtitle, open, onToggle, accent }: { depth: number; icon: string; title: string; subtitle: string; open?: boolean; onToggle?: () => void; accent?: boolean }) {
  const expandable = !!onToggle;
  return (
    <div
      className={"flex items-center gap-3 py-2.5 pr-4 " + (expandable ? "cursor-pointer hover:bg-soft" : "")}
      style={{ paddingLeft: 16 + depth * 32 }}
      onClick={onToggle}
      role={expandable ? "button" : undefined}
      aria-expanded={expandable ? !!open : undefined}
    >
      <span className="w-4 flex-shrink-0 text-ink-faint">{expandable && <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} />}</span>
      <Icon name={icon} size={16} className={accent ? "text-success" : "text-ink-light"} />
      <div className="min-w-0">
        <div className={"text-sm font-semibold truncate " + (accent ? "text-accent" : "text-ink")}>{title}</div>
        <div className="text-xs text-ink-light truncate">{subtitle}</div>
      </div>
    </div>
  );
}
