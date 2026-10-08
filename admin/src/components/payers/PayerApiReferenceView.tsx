"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { PayerDetailModal } from "@/components/modals/PayerDetailModal";
import { api } from "@/lib/api";
import { SUBMISSION_METHOD_INFO } from "@/lib/constants";
import { useAsync } from "@/lib/hooks";
import type { Payer } from "@/types/payers";

/** Prototype v2 PayerApiReferenceView — which payers support direct APIs vs portals, CAQH rosters and PECOS. */
export function PayerApiReferenceView() {
  const payers = useAsync<Payer[]>(() => api.get<Payer[]>("/payers", { activeOnly: true }), []);
  const [selected, setSelected] = useState<Payer | null>(null);
  const list = payers.data || [];
  const methodCounts: Record<string, number> = {};
  list.forEach((p) => {
    methodCounts[p.submissionMethod] = (methodCounts[p.submissionMethod] || 0) + 1;
  });

  return (
    <div>
      <PageHeader title="Payer API Reference" subtitle="Honest, up-to-date view of which payers support direct APIs vs portals, CAQH rosters, and PECOS." />

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}>
        <div className="flex items-start gap-3">
          <Icon name="Info" size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--info)" }} />
          <div className="text-xs text-ink">
            <strong>Reality check:</strong> Direct provider-enrollment APIs are rare in US healthcare. Most payers rely on:
            <ul className="mt-2 space-y-1 list-disc list-inside text-ink-light">
              <li><strong>CAQH ProView</strong> — provider data source of truth; payers pull via roster download</li>
              <li><strong>Availity</strong> — clearinghouse used by Anthem BCBS plans, Humana, Centene (Superior, Ambetter, WellCare), others</li>
              <li><strong>PECOS</strong> — Medicare&apos;s web-only enrollment system (CMS-855 forms)</li>
              <li><strong>State Medicaid portals</strong> — 50+ different systems, mostly manual</li>
              <li><strong>Payer-specific portals</strong> — CignaForHCP, Aetna Provider Portal, UHC Provider Portal, etc.</li>
            </ul>
            <div className="mt-2">
              A handful offer <strong>developer APIs</strong> (UHC/Optum, Humana), but these are mostly for claims/eligibility/directory data, not enrollment submission.
              Enrollment itself typically requires a vendor relationship and signed agreement.
            </div>
          </div>
        </div>
      </div>

      <AsyncBoundary loading={payers.loading} error={payers.error} onRetry={payers.reload}>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          {Object.entries(SUBMISSION_METHOD_INFO).map(([key, info]) => (
            <div key={key} className="card card-pad text-center">
              <Icon name={info.icon} size={18} className="mx-auto mb-1" style={{ color: info.color }} />
              <div className="font-display text-xl font-bold text-ink">{methodCounts[key] || 0}</div>
              <div className="text-[10px] font-semibold text-ink">{info.label}</div>
            </div>
          ))}
        </div>

        <div className="card card-pad mb-4">
          <h3 className="font-semibold text-sm text-ink mb-3">Submission Method Reference</h3>
          <div className="space-y-3">
            {Object.entries(SUBMISSION_METHOD_INFO).map(([key, info]) => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${info.color} 13%, transparent)` }}>
                  <Icon name={info.icon} size={14} style={{ color: info.color }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-ink">{info.label}</div>
                  <div className="text-xs text-ink-light mt-0.5">{info.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-4 border-b border-line">
            <h3 className="font-semibold text-sm text-ink">Your Payers</h3>
            <p className="text-xs text-ink-light mt-1">Click any row for full details, API docs, and submission method notes.</p>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Payer</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>API?</th>
                  <th>Vendor / Portal</th>
                  <th>Avg TAT</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const info = SUBMISSION_METHOD_INFO[p.submissionMethod];
                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]" style={{ background: p.color }}>
                            {p.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-[10px] text-ink-light">{p.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs">{p.category}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Icon name={info?.icon || "HelpCircle"} size={11} style={{ color: info?.color }} />
                          <span className="text-xs">{info?.label || p.submissionMethod}</span>
                        </div>
                      </td>
                      <td>{p.apiAvailable ? <Pill type="success">Yes</Pill> : <Pill type="neutral">No</Pill>}</td>
                      <td className="text-xs text-ink-light max-w-xs truncate">{p.apiVendor || "—"}</td>
                      <td className="font-mono text-xs">{p.avgTatDays != null ? p.avgTatDays + "d" : "—"}</td>
                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(p);
                          }}
                          className="btn btn-ghost text-xs"
                        >
                          <Icon name="Eye" size={11} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AsyncBoundary>

      {selected && <PayerDetailModal payer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
