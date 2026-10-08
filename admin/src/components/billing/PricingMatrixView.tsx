"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { fmtMoney, todayISO, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { PricingMatrix, PricingState, ServiceType } from "@/types/billing";

type RegionFilter = "all" | "northeast" | "south" | "midwest" | "west";

export function PricingMatrixView() {
  const toast = useToast();
  const [selectedState, setSelectedState] = useState("TX");
  const [serviceType, setServiceType] = useState<ServiceType>("new");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [region, setRegion] = useState<RegionFilter>("all");
  const [exporting, setExporting] = useState(false);

  // Full matrices (both service types) feed the selected-state detail cards.
  const full = useAsync(
    () =>
      Promise.all([
        api.get<PricingState[]>("/pricing/states"),
        api.get<PricingMatrix>("/pricing/matrix", { serviceType: "new" }),
        api.get<PricingMatrix>("/pricing/matrix", { serviceType: "recred" }),
      ]),
    []
  );
  // Filtered matrix for the table (server-side region/search filter).
  const table = useAsync(() => api.get<PricingMatrix>("/pricing/matrix", { serviceType, region, q }), [serviceType, region, q]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.download("/pricing/matrix/export.csv", undefined, "pricing-matrix-" + todayISO() + ".csv");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setExporting(false);
    }
  };

  if (full.error && !full.data) return <ErrorState message={full.error} onRetry={full.reload} />;
  if (!full.data) return <Loading />;

  const [states, newMatrix, recredMatrix] = full.data;
  const current = serviceType === "new" ? newMatrix : recredMatrix;
  const other = serviceType === "new" ? recredMatrix : newMatrix;
  const payers = current.payers;
  const currentState = states.find((s) => s.code === selectedState) || states[0];
  const currentRow = current.rows.find((r) => r.code === currentState?.code);
  const otherRow = other.rows.find((r) => r.code === currentState?.code);
  const priceOf = (row: typeof currentRow, payerId: number) => row?.prices.find((p) => p.payerId === payerId)?.price ?? 0;
  const stateColumnPrices = payers.map((p) => priceOf(currentRow, p.id));
  const minPrice = currentRow?.minPrice ?? (stateColumnPrices.length ? Math.min(...stateColumnPrices) : 0);
  const maxPrice = currentRow?.maxPrice ?? (stateColumnPrices.length ? Math.max(...stateColumnPrices) : 0);
  const totalStates = current.totalStates || states.length;

  return (
    <div>
      {/* Top — selected state detail + payer cards */}
      <div className="card card-pad mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Credentialing Service Rates</h3>
            <p className="text-xs text-ink-light mt-0.5">Per-state, per-payer pricing for new credentialing and re-credentialing. Billed in addition to your monthly subscription.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-ink-light">State:</label>
            <select value={currentState?.code || ""} onChange={(e) => setSelectedState(e.target.value)} className="input" style={{ width: 200 }}>
              {states.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
            <div className="flex border border-line rounded-md p-0.5 ml-2">
              <button onClick={() => setServiceType("new")} className={"px-3 py-1 rounded text-xs font-medium " + (serviceType === "new" ? "bg-accent text-white" : "text-ink-light")}>New Cred</button>
              <button onClick={() => setServiceType("recred")} className={"px-3 py-1 rounded text-xs font-medium " + (serviceType === "recred" ? "bg-accent text-white" : "text-ink-light")}>Recred</button>
            </div>
          </div>
        </div>

        {/* Header strip with state info */}
        {currentState && (
          <div className="flex items-center gap-4 p-3 rounded-lg mb-4" style={{ background: "var(--bg-soft)" }}>
            <div className="w-10 h-10 rounded flex items-center justify-center text-white font-display font-bold text-lg" style={{ background: "var(--accent)" }}>
              {currentState.code}
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-ink">{currentState.name}</div>
              <div className="text-xs text-ink-light">Cost-of-credentialing multiplier: <span className="font-mono font-semibold">{Number(currentState.mult).toFixed(2)}×</span> baseline</div>
            </div>
            <div className="text-right text-xs">
              <div className="text-ink-light">{serviceType === "new" ? "New Credentialing" : "Re-credentialing"}</div>
              <div className="font-mono text-ink"><span className="font-semibold">{fmtMoney(minPrice)}</span> – <span className="font-semibold">{fmtMoney(maxPrice)}</span></div>
            </div>
          </div>
        )}

        {/* Payer cards for the selected state */}
        {payers.length === 0 ? (
          <EmptyState icon="DollarSign" title="No priced payers" description="No active payers have a pricing category yet." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {payers.map((p) => {
              const price = priceOf(currentRow, p.id);
              const altPrice = priceOf(otherRow, p.id);
              const isHighest = price === maxPrice;
              const isLowest = price === minPrice;
              return (
                <div key={p.id} className="card card-hover relative overflow-hidden" style={isHighest ? { borderColor: "var(--accent)" } : {}}>
                  <div className="h-1" style={{ background: p.color }}></div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-ink">{p.name}</div>
                      {isHighest && <Pill type="accent">Highest</Pill>}
                      {isLowest && <Pill type="success">Lowest</Pill>}
                    </div>
                    <div className="font-display text-2xl font-bold text-ink">{fmtMoney(price)}</div>
                    <div className="text-[10px] text-ink-faint capitalize mt-0.5">{p.pricingCategory} · {serviceType === "new" ? "New" : "Recred"}</div>
                    <div className="text-[10px] text-ink-light mt-2 pt-2 border-t border-line">
                      {serviceType === "new" ? "Recred" : "New"}: <span className="font-mono">{fmtMoney(altPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All-states matrix table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-display font-semibold text-ink">All {totalStates} States × {payers.length} Payers — {serviceType === "new" ? "New Credentialing" : "Re-credentialing"}</h4>
            <p className="text-xs text-ink-light mt-1">Showing {table.data ? table.data.rows.length : "…"} of {totalStates} states. Click a row to view that state&apos;s per-payer detail above.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Icon name="Search" size={13} className="absolute" style={{ left: 10, top: 9, color: "var(--ink-faint)" }} />
              <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search state..." className="input" style={{ paddingLeft: 30, width: 180, fontSize: 12 }} />
            </div>
            <select value={region} onChange={(e) => setRegion(e.target.value as RegionFilter)} className="input" style={{ width: 130, fontSize: 12 }}>
              <option value="all">All Regions</option>
              <option value="northeast">Northeast</option>
              <option value="south">South</option>
              <option value="midwest">Midwest</option>
              <option value="west">West</option>
            </select>
            <button onClick={handleExport} disabled={exporting} className="btn btn-secondary">
              {exporting ? <span className="loader" /> : <Icon name="Download" size={12} />} Export CSV
            </button>
          </div>
        </div>
        {table.error && !table.data ? (
          <div className="p-4"><ErrorState message={table.error} onRetry={table.reload} /></div>
        ) : !table.data ? (
          <Loading />
        ) : table.data.rows.length === 0 ? (
          <EmptyState icon="Search" title="No states match" description="Try a different search or region." />
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: 600, opacity: table.loading ? 0.6 : 1 }}>
            <table>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "var(--bg-soft)", zIndex: 2, minWidth: 140 }}>State</th>
                  <th>Mult</th>
                  {table.data.payers.map((p) => (
                    <th key={p.id}>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }}></span>
                        {p.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.data.rows.map((s) => {
                  const isSelected = s.code === currentState?.code;
                  return (
                    <tr key={s.code} className={"cursor-pointer " + (isSelected ? "bg-accent-soft" : "")} onClick={() => setSelectedState(s.code)}>
                      <td style={{ position: "sticky", left: 0, background: isSelected ? "var(--accent-soft)" : "var(--bg)", zIndex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span className={"font-mono font-semibold text-xs px-1.5 py-0.5 rounded " + (isSelected ? "bg-accent text-white" : "bg-soft-2 text-ink")}>{s.code}</span>
                          <span className="text-ink">{s.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-light">{Number(s.mult).toFixed(2)}×</td>
                      {s.prices.map((p) => (
                        <td key={p.payerId} className="font-mono text-xs">{fmtMoney(p.price)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footnote */}
      <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--info-soft)" }}>
        <div className="flex items-start gap-2 text-xs text-ink">
          <Icon name="Info" size={13} className="text-info flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">How prices are calculated: </span>
            Base rate (by payer category) × State multiplier × Payer multiplier (vs. category baseline), rounded to nearest $5. Each provider × payer combination generates one line item on your monthly invoice when a new credentialing or re-credentialing is initiated.
          </div>
        </div>
      </div>
    </div>
  );
}
