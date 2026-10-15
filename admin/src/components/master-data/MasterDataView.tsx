"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { StateSelect } from "@/components/AddressFields";
import { useFitRows } from "@/lib/useFitRows";

const ROW_H = 50;
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { BorderTabs } from "@/components/BorderTabs";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { invalidateMasterList, type MasterListKey } from "@/lib/masterLists";
import { matchesSearch } from "@/lib/search";
import { cleanSearch } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/stores/toast";

interface ItemRow {
  /** the item's id (document types: their code) */
  id: string;
  code: string | null;
  value: string;
  sortOrder: number;
  active: boolean;
  /** true = every organization sees it */
  everyone: boolean;
  addedBy: string;
  canEdit: boolean;
  /** document types */
  mandatory?: boolean | null;
  expires?: boolean | null;
  builtIn?: boolean;
  /** "Everyone" or the organization that sees it */
  visibleTo?: string;
  /** cities: their state code */
  state?: string | null;
}

const TABS: { id: MasterListKey; label: string; icon: string; singular: string; hint: string }[] = [
  { id: "specialty", label: "Specialty", icon: "Stethoscope", singular: "Specialty", hint: "Specialty dropdown when adding a provider (manual and secure link). \"Other\" is always offered last." },
  { id: "suffix", label: "Suffix", icon: "BadgeCheck", singular: "Suffix", hint: "Suffix / credential dropdown when adding a provider (MD, DO, NP…)." },
  { id: "payer_category", label: "Payer Category", icon: "CreditCard", singular: "Payer Category", hint: "Category dropdown when adding or editing a payer." },
  { id: "location_type", label: "Location Type", icon: "MapPin", singular: "Location Type", hint: "Type dropdown when adding or editing a location." },
  { id: "org_type", label: "Organization Type", icon: "Building", singular: "Organization Type", hint: "Organization type dropdown when creating an organization or signing up." },
  { id: "document_type", label: "Document Type", icon: "FileText", singular: "Document Type", hint: "Documents listed for each provider (My Documents, the provider page, Request Documents)." },
  { id: "state", label: "State", icon: "Map", singular: "State", hint: "State dropdowns (addresses, license state, organizations, locations)." },
  { id: "city", label: "City", icon: "MapPinned", singular: "City", hint: "City dropdowns: the cities of the chosen state." },
];

/** lists where an organization admin's additions are for everyone (the others: their organization only) */
export const SHARED_LISTS: MasterListKey[] = ["specialty", "suffix"];

/** Master Data: the lists behind the dropdowns, one tab per list (super admin and organization admins). */
export function MasterDataView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id || "specialty") as MasterListKey;
  return (
    <div>
      <PageHeader title="Master Data" subtitle="The options of the dropdowns used across the app. Add your own and switch off the ones you don't use." />
      <BorderTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        value={tab}
        onChange={(t) => router.replace(pathname + (t === "specialty" ? "" : "?tab=" + t), { scroll: false })}
      />
      {/* keyed by tab: each tab has its own search and list */}
      <MasterList key={tab} listKey={tab} />
    </div>
  );
}

function MasterList({ listKey }: { listKey: MasterListKey }) {
  const toast = useToast();
  const { user } = useAuth();
  const meta = TABS.find((t) => t.id === listKey)!;
  const superAdmin = user?.role === "platform_admin";
  const items = useAsync<ItemRow[]>(() => api.get<ItemRow[]>("/master-lists/" + listKey + "/items"), [listKey]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [editing, setEditing] = useState<ItemRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ItemRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const all = useMemo(() => items.data || [], [items.data]);
  const list = useMemo(() => {
    const inState = stateFilter ? all.filter((i) => i.state === stateFilter) : all;
    return search.trim() ? inState.filter((i) => matchesSearch(search, i.value, i.addedBy, i.state, i.code)) : inState;
  }, [all, search, stateFilter]);
  // as many rows as fit the window; the rest on the next pages
  const tableRef = useRef<HTMLDivElement>(null);
  // the real height of a row (it differs per tab, e.g. Document Type rows are taller), measured on the page
  const [rowH, setRowH] = useState(ROW_H);
  useEffect(() => {
    const box = tableRef.current;
    if (!box) return;
    const measure = () => {
      const rows = [...box.querySelectorAll("tbody tr")] as HTMLElement[];
      if (!rows.length) return;
      const h = Math.max(...rows.map((r) => r.offsetHeight));
      setRowH((cur) => (Math.abs(cur - h) > 1 ? h : cur));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  // header + pagination + card borders + the page's bottom padding
  const size = useFitRows(tableRef, rowH, 128);
  const [pageWanted, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  // fewer pages after a search / a bigger window: stay on the last one
  const page = Math.min(pageWanted, totalPages - 1);
  const pageItems = list.slice(page * size, page * size + size);
  // who sees what this user adds
  const addsForEveryone = superAdmin || SHARED_LISTS.includes(listKey);
  const isDocs = listKey === "document_type";
  const isCities = listKey === "city";

  const changed = () => {
    invalidateMasterList(listKey);
    items.reload();
  };

  const toggleActive = async (i: ItemRow) => {
    setBusy(i.id);
    try {
      await api.put("/master-lists/" + listKey + "/items/" + encodeURIComponent(i.id), { active: !i.active });
      toast(i.value + (i.active ? " switched off" : " switched on"));
      changed();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy("__delete__");
    try {
      await api.delete("/master-lists/" + listKey + "/items/" + encodeURIComponent(deleting.id));
      toast(deleting.value + " deleted");
      setDeleting(null);
      changed();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="relative flex-1 min-w-0">
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => { setSearch(cleanSearch(e.target.value)); setPage(0); }} placeholder={"Search " + meta.label.toLowerCase() + "…"} className="input" style={{ paddingLeft: 32 }} aria-label="Search" />
        </div>
        {isCities && (
          <div className="shrink-0" style={{ width: 220 }}>
            <StateSelect
              value={stateFilter}
              onChange={(v) => {
                setStateFilter(v);
                setPage(0);
              }}
              placeholder="All states"
              ariaLabel="Filter by state"
            />
          </div>
        )}
        <button className="btn btn-primary shrink-0" onClick={() => setEditing("new")}>
          <Icon name="Plus" size={14} /> Add {meta.singular}
        </button>
      </div>
      <div className="text-xs text-ink-faint mb-3">{meta.hint}</div>
      {/* measured from here (always on the page): how many rows fit the window */}
      <div ref={tableRef}>
      <AsyncBoundary loading={items.loading && !items.data} error={items.error} onRetry={items.reload}>
        <div className="card overflow-hidden">
          {list.length === 0 ? (
            <EmptyState icon="List" title={all.length ? "No matches" : "No items yet"} description={all.length ? "Try another search." : "Add the first " + meta.singular.toLowerCase() + "."} />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {listKey === "state" && <th>Code</th>}
                    {isCities && <th>State</th>}
                    {isDocs && <th>Mandatory</th>}
                    {isDocs && <th>Expiration Date</th>}
                    <th>Visible To</th>
                    <th>Added By</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((i) => (
                    <tr key={i.id} style={{ height: rowH }}>
                      <td className="font-medium">
                        {i.value}
                        {i.code && !isDocs && listKey !== "state" && <div className="text-[10px] text-ink-faint font-mono font-normal">{i.code}</div>}
                      </td>
                      {listKey === "state" && <td className="font-mono text-xs">{i.code}</td>}
                      {isCities && <td className="font-mono text-xs">{i.state}</td>}
                      {isDocs && <td className="text-xs">{i.mandatory ? <span className="font-semibold text-ink">Yes</span> : <span className="text-ink-faint">No</span>}</td>}
                      {isDocs && <td className="text-xs">{i.expires ? "Asked on upload" : <span className="text-ink-faint">No</span>}</td>}
                      <td className="text-xs">{i.everyone ? "Everyone" : superAdmin ? i.visibleTo || "One organization" : "Your organization"}</td>
                      <td className="text-xs text-ink-light">{i.addedBy}</td>
                      <td>
                        <Pill type={i.active ? "success" : "neutral"}>{i.active ? "Active" : "Inactive"}</Pill>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {i.canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="btn btn-ghost text-xs"
                              onClick={() => toggleActive(i)}
                              disabled={busy !== null}
                              title={i.active ? "Switch off (hidden from the dropdown)" : "Switch on"}
                              aria-label={(i.active ? "Switch off " : "Switch on ") + i.value}
                            >
                              {busy === i.id ? <span className="loader" style={{ width: 11, height: 11 }} /> : <Icon name={i.active ? "ToggleRight" : "ToggleLeft"} size={16} style={{ color: i.active ? "var(--success)" : "var(--ink-faint)" }} />}
                            </button>
                            <button className="btn-ghost p-1" onClick={() => setEditing(i)} title="Edit" aria-label={"Edit " + i.value}>
                              <Icon name="Pencil" size={13} />
                            </button>
                            <button className="btn-ghost p-1 hover:text-red-600" onClick={() => setDeleting(i)} title="Delete" aria-label={"Delete " + i.value}>
                              <Icon name="Trash2" size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-faint inline-flex items-center gap-1" title="Only the one who added it can change it">
                            <Icon name="Lock" size={11} /> Read only
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {list.length > 0 && <div className="border-t border-line"><Pagination page={page} totalPages={totalPages} totalElements={list.length} size={size} onChange={setPage} /></div>}
        </div>
      </AsyncBoundary>
      </div>
      {editing && (
        <ItemModal
          listKey={listKey}
          singular={meta.singular}
          item={editing === "new" ? null : editing}
          defaultState={stateFilter}
          forEveryone={editing === "new" ? addsForEveryone : editing.everyone}
          onClose={() => setEditing(null)}
          onSaved={(name, isNew) => {
            setEditing(null);
            toast(name + (isNew ? " added" : " updated"));
            changed();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={"Delete " + meta.singular.toLowerCase() + "?"}
          message={
            isDocs ? (
              <>&quot;{deleting.value}&quot; is no longer listed for the providers. Files already uploaded for it stay.</>
            ) : (
              <>&quot;{deleting.value}&quot; is removed from the dropdown. Records that already use it keep their value.</>
            )
          }
          busy={busy === "__delete__"}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export function ItemModal({
  listKey,
  singular,
  item,
  forEveryone,
  onClose,
  onSaved,
  defaultState = "",
}: {
  listKey: MasterListKey;
  singular: string;
  item: ItemRow | null;
  /** cities: the state chosen in the filter */
  defaultState?: string;
  forEveryone: boolean;
  onClose: () => void;
  onSaved: (name: string, isNew: boolean) => void;
}) {
  const [value, setValue] = useState(item?.value || "");
  const isDocs = listKey === "document_type";
  const [mandatory, setMandatory] = useState(!!item?.mandatory);
  const isState = listKey === "state";
  const isCity = listKey === "city";
  const [code, setCode] = useState(item?.code || "");
  const [cityState, setCityState] = useState(item?.state || defaultState);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [expires, setExpires] = useState(!!item?.expires);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const max = { specialty: 120, suffix: 10, payer_category: 40, location_type: 30, org_type: 100, document_type: 100, state: 40, city: 100 }[listKey];

  const save = async () => {
    const v = value.trim().replace(/\s+/g, " ");
    if (!v) return setError("Required");
    if (isState && !item && !/^[A-Za-z]{2}$/.test(code.trim())) return setFieldErr({ code: "Enter the 2-letter code" });
    if (isCity && !cityState) return setFieldErr({ state: "Required" });
    if (listKey === "specialty" && v.toLowerCase() === "other") return setError("\"Other\" is always offered — choose another name");
    setBusy(true);
    try {
      const body = isDocs ? { value: v, mandatory, expires } : isState ? { value: v, code: code.trim().toUpperCase() } : isCity ? { value: v, state: cityState } : { value: v };
      if (item) await api.put("/master-lists/" + listKey + "/items/" + encodeURIComponent(item.id), body);
      else await api.post("/master-lists/" + listKey + "/items", body);
      onSaved(v, !item);
    } catch (err) {
      if (err instanceof ApiError && (err.fieldErrors.code || err.fieldErrors.state)) setFieldErr(err.fieldErrors);
      else setError(err instanceof ApiError && err.fieldErrors.value ? err.fieldErrors.value : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={(item ? "Edit " : "Add ") + singular} onClose={busy ? undefined : onClose} maxWidth={460}>
      <div className="space-y-3">
        {isCity && (
          <Field label="State *" error={fieldErr.state}>
            <StateSelect
              value={cityState}
              onChange={(v) => {
                setCityState(v);
                setFieldErr({});
              }}
              invalid={!!fieldErr.state}
            />
          </Field>
        )}
        <Field label={isCity ? "City Name *" : isState ? "State Name *" : "Name *"} error={error}>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="input"
            maxLength={max}
            autoFocus
            aria-label="Name"
          />
        </Field>
        {isState && (
          <Field label="Code *" error={fieldErr.code} hint={item ? "The code can't be changed" : "2 letters, e.g. TX"}>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase());
                setFieldErr({});
              }}
              className="input font-mono"
              maxLength={2}
              disabled={!!item}
              aria-label="Code"
            />
          </Field>
        )}
        {isDocs && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} aria-label="Mandatory" />
              Mandatory <span className="text-xs text-ink-faint">— counts toward the requirements</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={expires} onChange={(e) => setExpires(e.target.checked)} aria-label="Has an expiration date" />
              Has an expiration date <span className="text-xs text-ink-faint">— asked when the file is uploaded</span>
            </label>
          </div>
        )}
        <div className="text-xs text-ink-light flex items-center gap-1.5">
          <Icon name={forEveryone ? "Globe" : "Building2"} size={12} />
          {isDocs
            ? forEveryone
              ? "Listed for the providers of every organization."
              : "Listed for your organization's providers only."
            : forEveryone
              ? "Every organization sees this option."
              : "Only your organization sees this option."}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <span className="loader" /> : <Icon name={item ? "Save" : "Plus"} size={13} />} {item ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
