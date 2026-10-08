"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { LineChart } from "@/components/Charts";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { PROVIDER_STATUS } from "@/lib/constants";
import { useAsync } from "@/lib/hooks";
import { ProviderRosterSection } from "./ProviderRosterSection";
import type { ProviderCredentialingReportData } from "@/types/reports";

const COLLECTION_PAGE = 6;

export function ProviderCredentialingReport() {
  const { data, loading, error, reload } = useAsync(() => api.get<ProviderCredentialingReportData>("/reports/provider-credentialing"), []);
  useTopic("providers", reload);
  const [collectionPage, setCollectionPage] = useState(0);

  return (
    <div>
      <AsyncBoundary loading={loading && !data} error={data ? null : error} onRetry={reload}>
        {data && <ReportCards data={data} collectionPage={collectionPage} setCollectionPage={setCollectionPage} />}
      </AsyncBoundary>

      {/* Provider Roster with working sub-tabs */}
      <ProviderRosterSection />
    </div>
  );
}

function ReportCards({ data, collectionPage, setCollectionPage }: { data: ProviderCredentialingReportData; collectionPage: number; setCollectionPage: (n: number) => void }) {
  const b = data.expirationBuckets;
  const statusBreakdown = Object.entries(data.providersByStatus)
    .map(([k, v]) => (PROVIDER_STATUS[k]?.label || k.replace(/_/g, " ")) + ": " + v)
    .join("\n");

  const collection = data.collectionByDocType;
  const pageCount = Math.max(1, Math.ceil(collection.length / COLLECTION_PAGE));
  const page = Math.min(collectionPage, pageCount - 1);
  const visible = collection.slice(page * COLLECTION_PAGE, (page + 1) * COLLECTION_PAGE);

  const trend = data.tatTrend.filter((t) => t.avgTatDays != null).map((t) => ({ label: t.label, value: Math.round(t.avgTatDays as number) }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card card-pad" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <div className="text-sm font-semibold text-accent mb-2">Missing Documents</div>
          <div className="font-display text-6xl font-bold text-accent">{data.totalMissing}</div>
          <div className="text-xs text-accent mt-2">Documents required</div>
        </div>
        <div className="card card-pad" title={statusBreakdown || "No providers"}>
          <div className="text-sm font-semibold text-ink mb-2">Total Providers</div>
          <div className="font-display text-6xl font-bold text-ink">{data.totalProviders}</div>
          <div className="text-xs text-ink-light mt-2">Hover for status breakdown</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Document status gauge */}
        <div className="card card-pad">
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Document Status</div>
          <div className="text-sm font-bold text-ink mb-4">DOCUMENT EXPIRATIONS</div>
          <div className="flex items-center justify-center my-6">
            <ExpirationGauge buckets={[b.expired, b.lt30, b.d30to60, b.d61to90]} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }}></span> Expired <span className="font-semibold ml-auto">{b.expired}</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#f97316" }}></span> &lt;30 Days <span className="font-semibold ml-auto">{b.lt30}</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#eab308" }}></span> 30-60 Days <span className="font-semibold ml-auto">{b.d30to60}</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }}></span> 61-90 Days <span className="font-semibold ml-auto">{b.d61to90}</span></div>
          </div>
        </div>

        {/* TAT */}
        <div className="card card-pad">
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Average Turnaround Time</div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-xs text-ink-light">{data.completedCount} completed · {data.inProgressCount} in progress</div>
            <div className="font-display text-4xl font-bold text-ink">
              {data.avgTatDays != null ? Math.round(data.avgTatDays) : "—"} <span className="text-base font-normal">days</span> <Icon name="ArrowUpRight" size={14} className="text-accent inline" />
            </div>
          </div>
          {trend.length >= 2 ? (
            <div className="pt-4 border-t border-line">
              <LineChart data={trend} color="var(--accent)" height={128} />
            </div>
          ) : (
            <>
              <div className="h-32 flex items-end justify-around pt-4 border-t border-line">
                <div className="text-xs text-ink-faint">120d</div>
                <div className="text-xs text-ink-faint">60d</div>
                <div className="text-xs text-ink-faint">0d</div>
              </div>
              <div className="text-xs text-ink-faint text-center mt-2">{trend.length === 1 ? trend[0].label : "Not enough completed enrollments for a trend"}</div>
            </>
          )}
        </div>

        {/* Doc collection */}
        <div className="card card-pad">
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Document Collection</div>
          <div className="text-xs text-ink-light mb-3">Approval rate by checklist item ({collection.length} items)</div>
          {collection.length === 0 ? (
            <div className="text-xs text-ink-faint py-6 text-center">No document types configured.</div>
          ) : (
            <div className="space-y-3">
              {visible.map((c) => (
                <div key={c.docType}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink font-medium">{c.label}</span>
                    <span className="text-ink-light font-mono">{c.approved}/{c.total}</span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: (c.total ? (c.approved / c.total) * 100 : 0) + "%", background: c.approved === 0 ? "var(--danger)" : "var(--accent)" }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-ink-faint text-center mt-3 flex items-center justify-center gap-1">
            <button onClick={() => setCollectionPage(Math.max(0, page - 1))} disabled={page === 0} className="disabled:opacity-30" aria-label="Previous">
              <Icon name="ChevronLeft" size={11} className="inline" />
            </button>
            {page + 1} of {pageCount}
            <button onClick={() => setCollectionPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="disabled:opacity-30" aria-label="Next">
              <Icon name="ChevronRight" size={11} className="inline" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const GAUGE_COLORS = ["#ef4444", "#f97316", "#eab308", "#10b981"];

/** Semicircle gauge (prototype shape) with arc lengths proportional to the expiration buckets. */
function ExpirationGauge({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((s, n) => s + n, 0);
  const point = (f: number) => {
    const a = Math.PI * (1 - f);
    return (100 + 80 * Math.cos(a)).toFixed(2) + " " + (100 - 80 * Math.sin(a)).toFixed(2);
  };
  let cum = 0;
  const arcs = total
    ? buckets.map((n, i) => {
        const from = cum / total;
        cum += n;
        const to = cum / total;
        return n > 0 ? { d: "M " + point(from) + " A 80 80 0 0 1 " + point(to), color: GAUGE_COLORS[i] } : null;
      })
    : [];
  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="#fee2e2" strokeWidth="20" fill="none" strokeLinecap="round" />
      {arcs.map((a, i) => a && <path key={i} d={a.d} stroke={a.color} strokeWidth="20" fill="none" strokeLinecap="round" />)}
    </svg>
  );
}
