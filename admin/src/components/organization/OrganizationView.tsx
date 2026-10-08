"use client";

import { Fragment, useMemo, useState } from "react";
import { cleanSearch } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccessDenied } from "@/components/AlertBox";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { isOrgAdmin, useAuth, useUser } from "@/stores/auth";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useShell } from "@/stores/shell";
import { ROLE_LABEL } from "@/lib/constants";
import type { PageResponse } from "@/types";
import { AddOrganizationModal, EditClientModal, EditLocationModal, EditOrganizationModal, EditPracticeModal } from "@/components/modals/OrgModals";
import { AddProviderModal } from "@/components/modals/AddProviderModal";
import { providerStatusPillKey, type Client, type DeleteResult, type Location, type LocationProviderRow, type OrgTree, type Practice, type TreeClient, type TreePractice } from "@/types/organization";

type PendingDelete =
  | { kind: "client"; id: number; name: string; providers: number }
  | { kind: "practice"; id: number; name: string; providers: number }
  | { kind: "location"; id: number; name: string; providers: number };

const PROVIDER_PAGE_SIZE = 25;

export function OrganizationView() {
  const user = useUser();
  const { can } = useAuth();
  const toast = useToast();
  const { publish } = useShell();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedLocationId = params.get("location") ? Number(params.get("location")) : null;

  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState(false);
  const [editClient, setEditClient] = useState<TreeClient | null>(null);
  const [editPractice, setEditPractice] = useState<{ practice: TreePractice | Practice; clientName: string | null } | null>(null);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [providerPage, setProviderPage] = useState(0);
  // Prototype v2: a client or practice can be selected as well (details on the right).
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);
  const [addPreset, setAddPreset] = useState<{ type: "practice" | "location"; parentId: number } | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);

  const canRead = can("read", "location");
  const canCreate = can("create", "location");
  const canUpdate = can("update", "location");
  const canDelete = can("delete", "location");

  const tree = useAsync<OrgTree>(canRead ? () => api.get<OrgTree>("/org-tree", { q }) : null, [q, canRead]);
  const clients = useAsync<Client[]>(canRead && can("list", "location") ? () => api.get<Client[]>("/clients") : null, [canRead]);
  const practices = useAsync<Practice[]>(canRead && can("list", "location") ? () => api.get<Practice[]>("/practices") : null, [canRead]);
  const location = useAsync<Location>(selectedLocationId && canRead ? () => api.get<Location>("/locations/" + selectedLocationId) : null, [selectedLocationId, canRead]);
  const locationProviders = useAsync<PageResponse<LocationProviderRow>>(
    selectedLocationId ? () => api.get<PageResponse<LocationProviderRow>>("/providers", { locationId: selectedLocationId, page: providerPage, size: PROVIDER_PAGE_SIZE, sort: "lastName,asc" }) : null,
    [selectedLocationId, providerPage]
  );

  // Expand every client on first load (the prototype expanded its seed clients), and everything while searching.
  const allNodeIds = useMemo(() => {
    const all = new Set<string>();
    tree.data?.clients.forEach((c) => {
      all.add("c" + c.id);
      c.practices.forEach((p) => all.add("p" + p.id));
    });
    if (tree.data?.unassignedLocations.length) all.add("unassigned");
    return all;
  }, [tree.data]);

  // Adjust expansion when new tree / location data arrives (render-time state adjustment, no effect).
  const [seenTree, setSeenTree] = useState<OrgTree | undefined>(undefined);
  if (tree.data && tree.data !== seenTree) {
    setSeenTree(tree.data);
    if (q) setExpanded(new Set(allNodeIds));
  }

  // Make sure the selected location's branch is open.
  const [seenLocation, setSeenLocation] = useState<Location | undefined>(undefined);
  if (location.data && location.data !== seenLocation) {
    const loc = location.data;
    setSeenLocation(loc);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (loc.clientId) next.add("c" + loc.clientId);
      if (loc.practiceId) next.add("p" + loc.practiceId);
      else next.add("unassigned");
      return next;
    });
  }

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  const expandAll = () => setExpanded(new Set(allNodeIds));
  const collapseAll = () => setExpanded(new Set());

  const selectLocation = (id: number | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id == null) sp.delete("location");
    else sp.set("location", String(id));
    setProviderPage(0);
    if (id != null) {
      setSelectedClientId(null);
      setSelectedPracticeId(null);
    }
    router.replace(pathname + (sp.toString() ? "?" + sp.toString() : ""), { scroll: false });
  };
  const selectClient = (id: number) => {
    setSelectedClientId(id);
    setSelectedPracticeId(null);
    if (selectedLocationId) selectLocation(null);
  };
  const selectPractice = (id: number) => {
    setSelectedPracticeId(id);
    setSelectedClientId(null);
    if (selectedLocationId) selectLocation(null);
  };


  const reloadAll = () => {
    tree.reload();
    clients.reload();
    practices.reload();
    if (selectedLocationId) {
      location.reload();
      locationProviders.reload();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const path = pendingDelete.kind === "client" ? "/clients/" : pendingDelete.kind === "practice" ? "/practices/" : "/locations/";
      await api.delete<DeleteResult>(path + pendingDelete.id);
      toast(pendingDelete.kind === "client" ? "Client deleted" : pendingDelete.kind === "practice" ? "Practice deleted" : "Location deleted");
      if (pendingDelete.kind === "location" && pendingDelete.id === selectedLocationId) selectLocation(null);
      setPendingDelete(null);
      publish("providers");
      reloadAll();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleting(false);
    }
  };

  if (!canRead) return <AccessDenied action="view" entity="the organization" role={ROLE_LABEL[user.role] || user.role} />;

  const data = tree.data;
  const totals = data?.totals;
  const selectedLocation = location.data && location.data.id === selectedLocationId ? location.data : null;
  // One loader for the whole page: while the tree, the open location or its providers are loading,
  // the page is blurred under a single spinner (no separate loaders in each panel).
  const pageLoading =
    (tree.loading && !tree.data) ||
    (!!selectedLocationId && !selectedLocation && !location.error) ||
    (!!selectedLocation && locationProviders.loading && !locationProviders.data && !locationProviders.error);
  const selectedPractice: TreePractice | Practice | null = selectedLocation?.practiceId
    ? data?.clients.flatMap((c) => c.practices).find((p) => p.id === selectedLocation.practiceId) || practices.data?.find((p) => p.id === selectedLocation.practiceId) || null
    : null;
  const explicitPractice = !selectedLocationId && selectedPracticeId ? data?.clients.flatMap((c) => c.practices).find((p) => p.id === selectedPracticeId) || null : null;
  const explicitClient = !selectedLocationId && selectedClientId ? data?.clients.find((c) => c.id === selectedClientId) || null : null;
  const explicitPracticeClient = explicitPractice ? data?.clients.find((c) => c.id === explicitPractice.clientId) || null : null;

  const deleteMessage = (d: PendingDelete) => {
    if (d.kind === "client")
      return d.providers > 0
        ? "Delete client \"" + d.name + "\"? " + d.providers + " provider(s) are linked and will be unassigned."
        : "Delete client \"" + d.name + "\"? This will also delete all its practices.";
    if (d.kind === "practice")
      return d.providers > 0 ? "Delete practice \"" + d.name + "\"? " + d.providers + " provider(s) are linked and will be unassigned from this practice." : "Delete practice \"" + d.name + "\"?";
    return d.providers > 0 ? "Delete location \"" + d.name + "\"? " + d.providers + " provider(s) are at this location and will be unassigned." : "Delete location \"" + d.name + "\"?";
  };

  const iconBtn = (title: string, icon: string, onClick: () => void) => (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }
      }}
      className="p-1 rounded hover:bg-soft-2 cursor-pointer inline-flex"
      title={title}
    >
      <Icon name={icon} size={12} className="text-ink-light" />
    </span>
  );

  const renderLocation = (loc: Location) => {
    const isSelected = selectedLocationId === loc.id;
    return (
      <div key={loc.id} className="flex items-center ml-4">
        <button onClick={() => selectLocation(loc.id)} className={"flex-1 min-w-0 flex items-center gap-2 px-2 py-2 rounded text-left " + (isSelected ? "bg-accent-soft" : "hover:bg-soft")}>
          <Icon name="MapPin" size={12} style={{ color: isSelected ? "var(--accent)" : "var(--ink-faint)" }} />
          <div className="flex-1 min-w-0">
            <div className={"text-sm " + (isSelected ? "font-semibold text-accent" : "font-medium text-ink")}>{loc.name}</div>
            <div className="text-[10px] text-ink-light">
              {loc.providerCount} providers{!loc.active ? " · Inactive" : ""}
            </div>
          </div>
          {canUpdate && iconBtn("Edit location", "Pencil", () => setEditLocation(loc))}
          {canDelete && iconBtn("Delete location", "Trash2", () => setPendingDelete({ kind: "location", id: loc.id, name: loc.name, providers: loc.providerCount }))}
        </button>
      </div>
    );
  };

  return (
    <div className="relative" aria-busy={pageLoading}>
      {pageLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
          <Loading compact label="Loading organization" />
        </div>
      )}
      <PageHeader
        title={data ? data.organization.name + "'s Organization" : "Organization"}
        subtitle="Manage your clients, practices, locations, and providers"
        actions={
          <Fragment>
            {isOrgAdmin(user) && data && (
              <button onClick={() => setEditOrg(true)} className="btn btn-secondary"><Icon name="Pencil" size={13} /> Edit Organization</button>
            )}
            {canCreate && (
              <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Icon name="Plus" size={13} /> Add Client / Practice / Location</button>
            )}
          </Fragment>
        }
      />

      <div className="flex items-center gap-4 mb-4 text-sm text-ink-light flex-wrap">
        <span className="flex items-center gap-1.5"><Icon name="Building" size={13} /> {totals?.clients ?? "—"} clients</span>
        <span className="flex items-center gap-1.5"><Icon name="Briefcase" size={13} /> {totals?.practices ?? "—"} practices</span>
        <span className="flex items-center gap-1.5"><Icon name="MapPin" size={13} /> {totals?.locations ?? "—"} locations</span>
        <span className="flex items-center gap-1.5"><Icon name="Users" size={13} /> {totals?.providers ?? "—"} providers</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree on left */}
        <div className="lg:col-span-2 card" style={{ minHeight: 600 }}>
          <div className="p-3 border-b border-line">
            <div className="relative mb-2">
              <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
              <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search..." className="input" style={{ paddingLeft: 32 }} />
            </div>
            <div className="flex gap-2">
              <button onClick={expandAll} className="btn btn-secondary flex-1" style={{ fontSize: 12 }}>Expand All</button>
              <button onClick={collapseAll} className="btn btn-secondary flex-1" style={{ fontSize: 12 }}>Collapse All</button>
              {canCreate && (
                <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ fontSize: 12 }}><Icon name="Plus" size={12} /> Add</button>
              )}
            </div>
          </div>
          <div className="p-2 overflow-y-auto" style={{ maxHeight: 600 }}>
            {tree.error ? (
              <ErrorState message={tree.error} onRetry={tree.reload} />
            ) : tree.loading && !data ? (
              <div style={{ minHeight: 400 }} />
            ) : data && data.clients.length === 0 && data.unassignedLocations.length === 0 ? (
              <EmptyState
                icon={q ? "SearchX" : "Building"}
                title={q ? "No matches" : "No clients yet"}
                description={q ? "No client, practice or location matches \"" + q + "\"." : "Add your first client, then its practices and locations."}
              />
            ) : (
              data && (
                <>
                  {data.clients.map((client) => {
                    const cExp = expanded.has("c" + client.id);
                    return (
                      <div key={client.id} className="mb-1">
                        <button
                          onClick={() => {
                            toggle("c" + client.id);
                            selectClient(client.id);
                          }}
                          className={"w-full flex items-center gap-2 px-2 py-2 rounded text-left " + (explicitClient?.id === client.id ? "bg-accent-soft" : "hover:bg-soft")}
                        >
                          <Icon name={cExp ? "ChevronDown" : "ChevronRight"} size={14} className="text-ink-faint" />
                          <Icon name="Building" size={14} className="text-ink-light" />
                          <div className="flex-1">
                            <div className={"text-sm font-medium " + (explicitClient?.id === client.id ? "text-accent" : "text-ink")}>{client.name}</div>
                            <div className="text-[10px] text-ink-light">{client.practiceCount} practices</div>
                          </div>
                          {canUpdate && iconBtn("Edit client", "Pencil", () => setEditClient(client))}
                          {canDelete && iconBtn("Delete client", "Trash2", () => setPendingDelete({ kind: "client", id: client.id, name: client.name, providers: client.providerCount }))}
                        </button>
                        {cExp &&
                          client.practices.map((practice) => {
                            const pExp = expanded.has("p" + practice.id);
                            return (
                              <div key={practice.id} className="ml-4">
                                <button
                                  onClick={() => {
                                    toggle("p" + practice.id);
                                    selectPractice(practice.id);
                                  }}
                                  className={"w-full flex items-center gap-2 px-2 py-2 rounded text-left " + (explicitPractice?.id === practice.id ? "bg-accent-soft" : "hover:bg-soft")}
                                >
                                  <Icon name={pExp ? "ChevronDown" : "ChevronRight"} size={14} className="text-ink-faint" />
                                  <Icon name="Briefcase" size={13} style={{ color: "#10b981" }} />
                                  <div className="flex-1">
                                    <div className={"text-sm font-medium " + (explicitPractice?.id === practice.id ? "text-accent" : "text-ink")}>{practice.name}</div>
                                    <div className="text-[10px] text-ink-light">Tax ID: {practice.taxId || "—"}</div>
                                    <div className="text-[10px] text-ink-light">
                                      {practice.locationCount} locations · {practice.providerCount} providers
                                    </div>
                                  </div>
                                  {canUpdate && iconBtn("Edit practice", "Pencil", () => setEditPractice({ practice, clientName: client.name }))}
                                  {canDelete && iconBtn("Delete practice", "Trash2", () => setPendingDelete({ kind: "practice", id: practice.id, name: practice.name, providers: practice.providerCount }))}
                                </button>
                                {pExp && practice.locations.map(renderLocation)}
                                {pExp && practice.locations.length === 0 && <div className="ml-10 py-1 text-[11px] text-ink-faint">No locations</div>}
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                  {data.unassignedLocations.length > 0 && (
                    <div className="mb-1">
                      <button onClick={() => toggle("unassigned")} className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-soft text-left">
                        <Icon name={expanded.has("unassigned") ? "ChevronDown" : "ChevronRight"} size={14} className="text-ink-faint" />
                        <Icon name="MapPinned" size={14} className="text-ink-light" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-ink">Locations without a practice</div>
                          <div className="text-[10px] text-ink-light">{data.unassignedLocations.length} locations</div>
                        </div>
                      </button>
                      {expanded.has("unassigned") && data.unassignedLocations.map(renderLocation)}
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>

        {/* Detail on right */}
        <div className="lg:col-span-3 card">
          {!selectedLocationId ? (
            <SelectionDetail
              client={explicitClient}
              practice={explicitPractice}
              practiceClient={explicitPracticeClient}
              canCreate={canCreate}
              canUpdate={canUpdate}
              onSelectClient={selectClient}
              onSelectPractice={(id) => {
                setExpanded((prev) => new Set(prev).add("p" + id));
                selectPractice(id);
              }}
              onSelectLocation={selectLocation}
              onEditClient={setEditClient}
              onEditPractice={(practice, clientName) => setEditPractice({ practice, clientName })}
              onAddPractice={(clientId) => setAddPreset({ type: "practice", parentId: clientId })}
              onAddLocation={(practiceId) => setAddPreset({ type: "location", parentId: practiceId })}
            />
          ) : location.error ? (
            <div className="p-5">
              <ErrorState message={location.error} onRetry={location.reload} />
            </div>
          ) : !selectedLocation ? (
            <div style={{ minHeight: 400 }} />
          ) : (
            <div>
              {/* Breadcrumb */}
              <div className="px-5 pt-4 pb-3 border-b border-line">
                <div className="flex items-center gap-1 text-xs text-ink-light mb-2 flex-wrap">
                  {/* Breadcrumb links open the client / practice panel */}
                  {selectedLocation.clientId ? (
                    <button
                      onClick={() => {
                        const id = selectedLocation.clientId!;
                        setExpanded((prev) => new Set(prev).add("c" + id));
                        selectClient(id);
                      }}
                      className="hover:text-accent hover:underline"
                      title="Open client"
                    >
                      {selectedLocation.clientName || "Client"}
                    </button>
                  ) : (
                    <span>No client</span>
                  )}
                  <Icon name="ChevronRight" size={11} className="text-ink-faint" />
                  {selectedLocation.practiceId ? (
                    <button
                      onClick={() => {
                        const id = selectedLocation.practiceId!;
                        setExpanded((prev) => {
                          const next = new Set(prev).add("p" + id);
                          if (selectedLocation.clientId) next.add("c" + selectedLocation.clientId);
                          return next;
                        });
                        selectPractice(id);
                      }}
                      className="hover:text-accent hover:underline"
                      title="Open practice"
                    >
                      {selectedLocation.practiceName || "Practice"}
                    </button>
                  ) : (
                    <span>No practice</span>
                  )}
                  <Icon name="ChevronRight" size={11} className="text-ink-faint" />
                  <span className="text-ink font-medium">{selectedLocation.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Building" size={16} className="text-ink-light" />
                  <h2 className="font-display text-xl font-semibold">{selectedLocation.clientName || selectedLocation.name}</h2>
                </div>
              </div>

              {/* Practice + Location grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-soft-2 border-b border-line">
                <div className="bg-paper p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Practice</div>
                    {canUpdate && selectedPractice && (
                      <button onClick={() => setEditPractice({ practice: selectedPractice, clientName: selectedLocation.clientName })} className="text-ink-faint hover:text-accent" title="Edit practice">
                        <Icon name="Pencil" size={13} />
                      </button>
                    )}
                  </div>
                  {selectedPractice ? (
                    <>
                      <div className="font-display font-semibold text-ink mb-2">{selectedPractice.name}</div>
                      <div className="space-y-1 text-xs text-ink-light">
                        <div><span className="text-ink-faint">Tax ID:</span> {selectedPractice.taxId || "—"}</div>
                        <div><span className="text-ink-faint">Address:</span> {selectedPractice.address || "—"}</div>
                        <div><span className="text-ink-faint">Phone:</span> {selectedPractice.phone || "—"}</div>
                        <div><span className="text-ink-faint">Email:</span> {selectedPractice.email || "—"}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-ink-light">This location is not linked to a practice.</div>
                  )}
                </div>

                <div className="bg-paper p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Location</div>
                    <div className="flex gap-1">
                      {canUpdate && (
                        <button onClick={() => setEditLocation(selectedLocation)} className="text-ink-faint hover:text-accent p-1" title="Edit location"><Icon name="Pencil" size={13} /></button>
                      )}
                    </div>
                  </div>
                  <div className="font-display font-semibold text-ink mb-2">{selectedLocation.name}</div>
                  <div className="space-y-1 text-xs text-ink-light">
                    <div><span className="text-ink-faint">Legal Name:</span> {selectedLocation.legalName || "—"}</div>
                    <div><span className="text-ink-faint">NPI:</span> {selectedLocation.npi || "—"}</div>
                    <div>
                      <span className="text-ink-faint">Address:</span>{" "}
                      {[selectedLocation.address, selectedLocation.city, [selectedLocation.state, selectedLocation.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                    </div>
                    {selectedLocation.phone && <div><span className="text-ink-faint">Phone:</span> {selectedLocation.phone}</div>}
                  </div>
                </div>
              </div>

              {/* Providers at this location */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-ink">Providers</div>
                  {can("create", "provider") && (
                    <button onClick={() => setAddingProvider(true)} className="btn btn-primary" style={{ fontSize: 11, padding: "4px 8px" }}>
                      <Icon name="Plus" size={11} /> Add Provider
                    </button>
                  )}
                </div>
                {locationProviders.error ? (
                  <ErrorState message={locationProviders.error} onRetry={locationProviders.reload} />
                ) : locationProviders.loading && !locationProviders.data ? (
                  <div style={{ minHeight: 160 }} />
                ) : !locationProviders.data || locationProviders.data.content.length === 0 ? (
                  <EmptyState icon="UserX" title="No providers at this location" description="Use “Add Provider” to add one directly to this location." />
                ) : (
                  <>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Specialty</th>
                            <th>NPI</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationProviders.data.content.map((p) => (
                            <tr key={p.id} className="cursor-pointer" onClick={() => router.push("/providers/" + p.id)}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <Avatar name={p.firstName + " " + p.lastName} size={28} />
                                  <span className="font-medium">
                                    {p.firstName} {p.lastName}
                                    {p.suffix ? ", " + p.suffix : ""}
                                  </span>
                                </div>
                              </td>
                              <td><StatusPill status={providerStatusPillKey(p.status)} /></td>
                              <td className="text-ink-light">{p.specialty}</td>
                              <td className="font-mono text-xs text-ink-light">{p.npi}</td>
                              <td className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    className="btn-ghost p-1"
                                    title="Open provider"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push("/providers/" + p.id);
                                    }}
                                  >
                                    <Icon name="Pencil" size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={locationProviders.data.page}
                      totalPages={locationProviders.data.totalPages}
                      totalElements={locationProviders.data.totalElements}
                      size={locationProviders.data.size}
                      onChange={setProviderPage}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddOrganizationModal
          clients={clients.data || data?.clients || []}
          practices={practices.data || []}
          onClose={() => setShowAdd(false)}
          onSaved={reloadAll}
        />
      )}
      {addPreset && (
        <AddOrganizationModal
          clients={clients.data || data?.clients || []}
          practices={practices.data || []}
          initialType={addPreset.type}
          initialParentId={addPreset.parentId}
          onClose={() => setAddPreset(null)}
          onSaved={reloadAll}
        />
      )}
      {addingProvider && selectedLocation && (
        <AddProviderModal
          placement={{
            clientId: selectedLocation.clientId,
            practiceId: selectedLocation.practiceId,
            locationId: selectedLocation.id,
            label: [selectedLocation.clientName, selectedLocation.practiceName, selectedLocation.name].filter(Boolean).join(" › "),
          }}
          onClose={() => setAddingProvider(false)}
          onCreated={() => {
            setAddingProvider(false);
            publish("providers");
            reloadAll();
          }}
        />
      )}
      {editOrg && data &&<EditOrganizationModal org={data.organization} onClose={() => setEditOrg(false)} onSaved={reloadAll} />}
      {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} onSaved={reloadAll} />}
      {editPractice && <EditPracticeModal practice={editPractice.practice} parentClientName={editPractice.clientName} onClose={() => setEditPractice(null)} onSaved={reloadAll} />}
      {editLocation && <EditLocationModal location={editLocation} onClose={() => setEditLocation(null)} onSaved={reloadAll} />}
      {pendingDelete && (
        <ConfirmDialog
          title={"Delete " + pendingDelete.kind}
          message={deleteMessage(pendingDelete)}
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => !deleting && setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** Prototype v2 right panel when a client or practice (not a location) is selected. */
function SelectionDetail({
  client,
  practice,
  practiceClient,
  canCreate,
  canUpdate,
  onSelectClient,
  onSelectPractice,
  onSelectLocation,
  onEditClient,
  onEditPractice,
  onAddPractice,
  onAddLocation,
}: {
  client: TreeClient | null;
  practice: TreePractice | null;
  practiceClient: TreeClient | null;
  canCreate: boolean;
  canUpdate: boolean;
  onSelectClient: (id: number) => void;
  onSelectPractice: (id: number) => void;
  onSelectLocation: (id: number) => void;
  onEditClient: (c: TreeClient) => void;
  onEditPractice: (p: TreePractice, clientName: string | null) => void;
  onAddPractice: (clientId: number) => void;
  onAddLocation: (practiceId: number) => void;
}) {
  const smallBtn = { fontSize: 11, padding: "4px 8px" };

  if (practice) {
    return (
      <div className="p-5">
        {/* Breadcrumb: client link back to the client panel */}
        <div className="flex items-center gap-1 text-xs text-ink-light mb-3 flex-wrap">
          {practiceClient ? (
            <button onClick={() => onSelectClient(practiceClient.id)} className="hover:text-accent hover:underline" title="Open client">
              {practiceClient.name}
            </button>
          ) : (
            <span>No client</span>
          )}
          <Icon name="ChevronRight" size={11} className="text-ink-faint" />
          <span className="text-ink font-medium">{practice.name}</span>
        </div>
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-line">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#10b98120" }}>
            <Icon name="Briefcase" size={22} style={{ color: "#10b981" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-ink-light uppercase font-semibold tracking-wider">Practice</div>
            <h3 className="font-display font-bold text-xl text-ink">{practice.name}</h3>
            <div className="text-xs text-ink-light mt-1">
              {practiceClient && (
                <button className="text-accent hover:underline" onClick={() => onSelectClient(practiceClient.id)}>{practiceClient.name}</button>
              )}
              {practice.taxId && (
                <>
                  {" "}· Tax ID: <span className="font-mono">{practice.taxId}</span>
                </>
              )}
            </div>
          </div>
          {canUpdate && (
            <button onClick={() => onEditPractice(practice, practiceClient?.name || null)} className="btn btn-secondary"><Icon name="Pencil" size={12} /> Edit</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card card-pad text-center">
            <Icon name="MapPin" size={16} className="mx-auto mb-1" style={{ color: "var(--info)" }} />
            <div className="font-display text-2xl font-bold text-ink">{practice.locationCount}</div>
            <div className="text-[10px] text-ink-light">Locations</div>
          </div>
          <div className="card card-pad text-center">
            <Icon name="Users" size={16} className="mx-auto mb-1" style={{ color: "var(--success)" }} />
            <div className="font-display text-2xl font-bold text-ink">{practice.providerCount}</div>
            <div className="text-[10px] text-ink-light">Providers</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-ink">Locations</div>
          {canCreate && (
            <button onClick={() => onAddLocation(practice.id)} className="btn btn-primary" style={smallBtn}><Icon name="Plus" size={11} /> Add Location</button>
          )}
        </div>
        {practice.locations.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-faint">
            <Icon name="MapPin" size={20} className="mx-auto mb-2 text-ink-faint" />
            No locations yet. Use &quot;+ Add Location&quot; to create one.
          </div>
        ) : (
          <div className="space-y-1.5">
            {practice.locations.map((loc) => (
              <button key={loc.id} onClick={() => onSelectLocation(loc.id)} className="w-full flex items-center gap-2 p-2.5 rounded border border-line hover:border-accent text-left">
                <Icon name="MapPin" size={14} style={{ color: "var(--info)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{loc.name}</div>
                  <div className="text-[10px] text-ink-light">{loc.address || "No address"}</div>
                </div>
                <Icon name="ChevronRight" size={14} className="text-ink-faint" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (client) {
    const locationTotal = client.practices.reduce((s, p) => s + p.locationCount, 0);
    return (
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-line">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-soft)" }}>
            <Icon name="Building" size={22} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-ink-light uppercase font-semibold tracking-wider">Client</div>
            <h3 className="font-display font-bold text-xl text-ink">{client.name}</h3>
            <div className="text-xs text-ink-light mt-1">
              {client.practices.length} practices · {locationTotal} locations
            </div>
          </div>
          {canUpdate && (
            <button onClick={() => onEditClient(client)} className="btn btn-secondary"><Icon name="Pencil" size={12} /> Edit</button>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-ink">Practices</div>
          {canCreate && (
            <button onClick={() => onAddPractice(client.id)} className="btn btn-primary" style={smallBtn}><Icon name="Plus" size={11} /> Add Practice</button>
          )}
        </div>
        {client.practices.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-faint">
            <Icon name="Briefcase" size={20} className="mx-auto mb-2 text-ink-faint" />
            No practices yet. Use &quot;+ Add Practice&quot; to create one.
          </div>
        ) : (
          <div className="space-y-1.5">
            {client.practices.map((pr) => (
              <button key={pr.id} onClick={() => onSelectPractice(pr.id)} className="w-full flex items-center gap-2 p-2.5 rounded border border-line hover:border-accent text-left">
                <Icon name="Briefcase" size={14} style={{ color: "#10b981" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{pr.name}</div>
                  <div className="text-[10px] text-ink-light">
                    {pr.taxId ? "Tax ID: " + pr.taxId : "No Tax ID"} · {pr.locationCount} locations
                  </div>
                </div>
                <Icon name="ChevronRight" size={14} className="text-ink-faint" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 text-center">
      <Icon name="MousePointerClick" size={32} className="mx-auto text-ink-faint mb-3" />
      <div className="font-display font-bold text-ink text-xl">Nothing selected</div>
      <div className="text-sm text-ink-light mt-2">Click a client, practice, or location on the left to view its details.</div>
    </div>
  );
}
