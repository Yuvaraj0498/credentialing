"use client";

import { StatCard } from "@/components/StatCard";
import { BarChart } from "@/components/Charts";
import type { DocumentStatusReport } from "@/types/reports";

export function DocumentStatusGrid({ data }: { data: DocumentStatusReport }) {
  const { totals } = data;
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Approved" value={totals.approved} sub="Documents on file" icon="CheckCircle2" color="var(--success)" />
        <StatCard label="Missing" value={totals.missing} sub="Need upload" icon="FileX" color="var(--danger)" emphasize />
        <StatCard label="Expired" value={totals.expired} sub="Need renewal" icon="AlertTriangle" color="var(--danger)" />
        <StatCard label="Pending" value={totals.pendingReview || 0} sub="In review" icon="Clock" color="var(--warn)" />
      </div>
      <div className="card card-pad">
        <h4 className="font-semibold mb-3">Document Status by Type</h4>
        {data.byDocType.length === 0 ? (
          <div className="text-xs text-ink-faint py-6 text-center">No document types configured.</div>
        ) : (
          <BarChart
            data={data.byDocType.slice(0, 8).map((dt) => ({ label: dt.label.slice(0, 6), value: dt.approved }))}
            color="var(--accent)"
          />
        )}
      </div>
    </div>
  );
}
