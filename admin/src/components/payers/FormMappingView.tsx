"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfidenceDot } from "@/components/Pill";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { providerName, saveBlob, useProvidersLite } from "@/components/enrollments/shared";
import { mappingHref } from "./PayerApplicationsView";
import type { FormMapping } from "@/types/payers";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Port of the prototype FormMappingView (L2732), driven by the server-side form-mapping endpoint. */
export function FormMappingView({
  payerId,
  formId,
  providerId,
  enrollmentId,
}: {
  payerId: number | null;
  formId: number | null;
  providerId: number | null;
  enrollmentId: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [showMaps, setShowMaps] = useState<Set<number>>(new Set());
  const needsProvider = !enrollmentId && !providerId;

  const mapping = useAsync<FormMapping>(
    enrollmentId
      ? () => api.get("/enrollments/" + enrollmentId + "/form-mapping")
      : payerId && providerId
        ? () => api.get("/payers/" + payerId + "/form-mapping", { providerId, formId })
        : null,
    [enrollmentId, payerId, providerId, formId]
  );
  const providers = useProvidersLite(needsProvider);

  const back = () => router.push("/payer-applications");

  const crumbs = (
    <div className="flex items-center gap-1 text-xs text-ink-light mb-4">
      <Link href="/payer-applications" className="hover:text-ink">
        Admin
      </Link>
      <Icon name="ChevronRight" size={12} className="text-ink-faint" />
      <Link href="/payer-applications" className="hover:text-ink">
        Payer Applications
      </Link>
    </div>
  );

  if (!enrollmentId && !payerId) {
    return (
      <div>
        {crumbs}
        <ErrorState message="No payer selected. Start from the Payer Applications wizard." onRetry={back} />
      </div>
    );
  }

  if (needsProvider) {
    return (
      <div>
        {crumbs}
        <div className="card card-pad" style={{ maxWidth: 480, margin: "0 auto" }}>
          <h3 className="font-display text-lg font-semibold text-ink mb-1">Choose a provider</h3>
          <p className="text-xs text-ink-light mb-3">The form is auto-filled from the provider, practice and location records.</p>
          {providers.error ? (
            <ErrorState message={providers.error} onRetry={providers.reload} />
          ) : (
            <select
              className="input"
              defaultValue=""
              disabled={providers.loading}
              onChange={(e) => e.target.value && router.replace(mappingHref({ payerId: payerId!, formId, providerId: Number(e.target.value) }))}
            >
              <option value="">{providers.loading ? "Loading providers…" : "— Select —"}</option>
              {(providers.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {providerName(p)} — NPI {p.npi || "—"}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  if (mapping.error)
    return (
      <div>
        {crumbs}
        <ErrorState message={mapping.error} onRetry={mapping.reload} />
      </div>
    );
  if (!mapping.data)
    return (
      <div>
        {crumbs}
        <Loading />
      </div>
    );

  const m = mapping.data;
  const allFields = m.sections.flatMap((s) => s.fields.map((f) => ({ ...f, section: s.name })));
  const { high: sure, medium: uncertain, low: missing, completePct: complete } = m.stats;
  const providerLine = m.provider ? m.provider.fullName + (m.provider.npi ? " · NPI " + m.provider.npi : "") : null;

  const exportJson = () => {
    const json = JSON.stringify(
      {
        payer: m.payer.name,
        form: m.form.label,
        provider: m.provider ? m.provider.fullName : null,
        providerNpi: m.provider?.npi || null,
        enrollmentId: m.enrollmentId,
        stats: m.stats,
        mappedFields: allFields.map((f) => ({ section: f.section, label: f.label, value: f.value, confidence: f.confidence, mapsTo: f.mapsTo })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    );
    saveBlob(json, "application/json", (m.payer.name + "_" + m.form.label + ".json").replace(/\s+/g, "_"));
  };

  const exportPdf = () => {
    const html =
      "<h1>" + esc(m.payer.name) + " — " + esc(m.form.label) + "</h1>" +
      (providerLine ? "<p><strong>Provider:</strong> " + esc(providerLine) + "</p>" : "") +
      (m.practice ? "<p><strong>Practice:</strong> " + esc(m.practice.name) + "</p>" : "") +
      "<p><strong>Generated:</strong> " + esc(new Date().toLocaleString()) + " &middot; " + esc(complete) + "% complete</p>" +
      m.sections
        .map(
          (s) =>
            "<h3 style='margin-top:18px'>" + esc(s.name) + " <small style='color:#64748b'>(" + esc(s.completion) + ")</small></h3>" +
            "<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><thead><tr><th align='left'>Field</th><th align='left'>Value</th><th align='left'>Confidence</th></tr></thead><tbody>" +
            s.fields.map((f) => "<tr><td>" + esc(f.label) + "</td><td>" + esc(f.value || "—") + "</td><td>" + esc(f.confidence) + "</td></tr>").join("") +
            "</tbody></table>"
        )
        .join("");
    const w = window.open("", "_blank");
    if (!w) {
      toast("Allow pop-ups to download the PDF", "error");
      return;
    }
    w.document.write(
      "<html><head><title>" + esc(m.payer.name + " " + m.form.label) + "</title><style>body{font-family:system-ui,sans-serif;font-size:12px;color:#0f172a;padding:24px}th{background:#f1f3f7}</style></head><body>" +
        html +
        "</body></html>"
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const toggleMaps = (i: number) =>
    setShowMaps((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div>
      {crumbs}

      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={back} className="btn btn-ghost">
              <Icon name="ChevronLeft" size={14} /> Back
            </button>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">{m.form.label}</h2>
              <p className="text-xs text-ink-light">
                {m.payer.name}
                {providerLine ? " · " + providerLine : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportJson} className="btn btn-secondary">
              <Icon name="Braces" size={13} /> JSON
            </button>
            <button onClick={exportPdf} className="btn btn-primary">
              <Icon name="Download" size={13} /> Download PDF
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between p-4 border-b border-line gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <ConfidenceDot level="high" /> {sure} sure
            </span>
            <span className="flex items-center gap-1.5">
              <ConfidenceDot level="medium" /> {uncertain} uncertain
            </span>
            <span className="flex items-center gap-1.5">
              <ConfidenceDot level="low" /> {missing} missing
            </span>
          </div>
          <div className="text-sm font-semibold text-ink">{complete}% complete</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-soft-2">
          {/* Form preview (rendered from the resolved mapping) */}
          <div className="bg-paper p-4">
            <div className="bg-soft border border-line rounded-lg p-6 overflow-hidden" style={{ minHeight: 700 }}>
              <div className="bg-paper rounded shadow-sm p-5 max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-4 border-b border-line pb-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-center" style={{ background: m.payer.color, fontSize: 11, lineHeight: 1.1 }}>
                    {m.payer.name}
                  </div>
                  <div className="text-xs text-ink-light">
                    FROM <span className="font-semibold text-ink">{m.payer.fullName || m.payer.name}</span>
                  </div>
                </div>
                <div className="text-center text-sm font-bold mb-1">{m.form.label}</div>
                <div className="text-xs text-center text-ink-light mb-4">{m.form.description || "Please complete this form in its entirety to ensure accurate set-up."}</div>
                {m.sections.map((s, si) => (
                  <div key={si}>
                    <div className="font-semibold text-xs text-ink mb-1 mt-3">{s.name}</div>
                    <div className="text-xs space-y-1">
                      {s.fields.map((f) => (
                        <div key={f.fieldId}>
                          {f.label}: {f.value ? <span className="underline">{f.value}</span> : <span className="text-ink-faint">________</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Field mappings */}
          <div className="bg-paper p-4 overflow-y-auto" style={{ maxHeight: 800 }}>
            {m.sections.map((section, si) => (
              <div key={si} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider">{section.name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-ink-light">{section.completion}</span>
                    <button className="text-accent flex items-center gap-1 hover:underline" onClick={() => toggleMaps(si)}>
                      <Icon name="GitMerge" size={11} /> Mappings
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {section.fields.map((f) => (
                    <div key={f.fieldId + "_" + m.generatedAt}>
                      <label className="text-xs font-medium text-ink mb-1 flex items-center gap-1">
                        {f.label}
                        <ConfidenceDot level={f.confidence} />
                      </label>
                      <input
                        defaultValue={f.value || ""}
                        placeholder={f.value ? "" : "Maps to: " + f.mapsTo}
                        className="input"
                        style={{
                          borderColor: f.confidence === "high" ? "var(--success)" : f.confidence === "medium" ? "var(--warn)" : "var(--border)",
                          background: f.value ? "var(--bg)" : "var(--warn-soft)",
                          fontStyle: f.value ? "normal" : "italic",
                          color: f.value ? "var(--ink)" : "var(--ink-light)",
                        }}
                      />
                      {showMaps.has(si) && <div className="text-[10px] font-mono text-ink-faint mt-1">→ {f.mapsTo}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
