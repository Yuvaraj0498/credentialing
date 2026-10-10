"use client";

import { useRef, useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { PayerLogo } from "@/components/payers/PayerLogo";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { matchesSearch } from "@/lib/search";
import { cleanSearch } from "@/lib/utils";
import { useToast } from "@/stores/toast";
import type { Payer } from "@/types/enrollments";

const CATEGORIES = ["Commercial", "Federal", "State Medicaid", "Medicaid MCO", "Behavioral Health"];
const INTEGRATIONS: { value: string; label: string }[] = [
  { value: "caqh", label: "CAQH" },
  { value: "availity", label: "Availity" },
  { value: "pecos", label: "PECOS" },
  { value: "portal", label: "Portal" },
];
const integrationLabel = (v: string) => INTEGRATIONS.find((i) => i.value === v)?.label || v;
const MAX_IMAGE_BYTES = 500 * 1024;

/** Super admin → Payers: every payer as a card on one page; add one with the popup, edit with the pencil on its card. */
export function PayersAdminView() {
  const payers = useAsync<Payer[]>(() => api.get<Payer[]>("/platform/payers"), []);
  const [editing, setEditing] = useState<Payer | "new" | null>(null);
  const [search, setSearch] = useState("");

  const all = payers.data || [];
  const shown = all.filter((p) => matchesSearch(search, p.name, p.fullName, p.category, integrationLabel(p.integration), p.appForm));

  return (
    <div>
      <PageHeader
        title="Payers"
        subtitle={payers.data ? (search.trim() ? shown.length + " of " + all.length + " payer(s)" : all.length + " payer(s)") : "Loading…"}
        actions={
          <button onClick={() => setEditing("new")} className="btn btn-primary">
            <Icon name="Plus" size={14} /> Add Payer
          </button>
        }
      />
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(cleanSearch(e.target.value))}
          placeholder="Search payer, insurance company, category, integration, form..."
          className="input"
          style={{ paddingLeft: 32 }}
          aria-label="Search payers"
        />
      </div>
      <div>
        <AsyncBoundary loading={payers.loading && !payers.data} error={payers.error} onRetry={payers.reload}>
          {shown.length === 0 ? (
            <div className="card card-pad text-center text-sm text-ink-light py-10">
              {all.length === 0 ? "No payers yet — click “Add Payer”." : "No payers match “" + search.trim() + "”"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {shown.map((p) => (
                <div key={p.id} className="card card-pad">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <PayerLogo name={p.name} color={p.color} logo={p.logo} />
                    <div className="flex items-center gap-1">
                      <Pill type="neutral">{p.category}</Pill>
                      <button onClick={() => setEditing(p)} className="btn-ghost p-1.5 rounded-md text-ink-light hover:text-accent" title={"Edit " + p.name} aria-label={"Edit " + p.name}>
                        <Icon name="Pencil" size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-ink truncate" title={p.name}>{p.name}</h3>
                  <p className="text-xs text-ink-light mb-3 truncate" title={p.fullName || ""}>{p.fullName || "—"}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Avg TAT</span>
                      <span className="font-mono font-semibold">{p.avgTatDays != null ? p.avgTatDays + "d" : "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Integration</span>
                      <span className="font-mono uppercase">{integrationLabel(p.integration)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Form</span>
                      <span className="text-right truncate" title={p.appForm || ""}>{p.appForm || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Portal</span>
                      {p.portalAvailable && p.portalUrl ? (
                        <a href={p.portalUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate" title={p.portalUrl}>
                          Login page
                        </a>
                      ) : (
                        <span>{p.portalAvailable ? "Available" : "Not available"}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsyncBoundary>
      </div>

      {editing && (
        <PayerModal
          payer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            payers.reload();
          }}
        />
      )}
    </div>
  );
}

interface PayerForm {
  name: string;
  fullName: string;
  category: string;
  avgTatDays: string;
  integration: string;
  appForm: string;
  portalAvailable: boolean;
  portalUrl: string;
  logo: string;
}

const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

function PayerModal({ payer, onClose, onSaved }: { payer: Payer | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<PayerForm>({
    name: payer?.name || "",
    fullName: payer?.fullName || "",
    category: payer?.category || "",
    avgTatDays: payer?.avgTatDays != null ? String(payer.avgTatDays) : "",
    integration: payer?.integration || "",
    appForm: payer?.appForm || "",
    portalAvailable: payer ? payer.portalAvailable : false,
    portalUrl: payer?.portalUrl || "",
    logo: payer?.logo || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof PayerForm>(k: K, v: PayerForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };
  const categories = form.category && !CATEGORIES.includes(form.category) ? [form.category, ...CATEGORIES] : CATEGORIES;

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setErrors((e) => ({ ...e, logo: "Choose a PNG, JPG, WEBP or SVG image" }));
    if (file.size > MAX_IMAGE_BYTES) return setErrors((e) => ({ ...e, logo: "The image must be 500 KB or smaller" }));
    const reader = new FileReader();
    reader.onload = () => set("logo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Payer name is required";
    if (!form.fullName.trim()) e.fullName = "Insurance company name is required";
    if (!form.category) e.category = "Payer category is required";
    const tat = Number(form.avgTatDays);
    if (!form.avgTatDays) e.avgTatDays = "Avg TAT is required";
    else if (!Number.isInteger(tat) || tat < 1 || tat > 365) e.avgTatDays = "1-365 days";
    if (!form.integration) e.integration = "Integration is required";
    if (!form.appForm.trim()) e.appForm = "Form is required";
    const url = form.portalUrl.trim();
    if (form.portalAvailable && !url) e.portalUrl = "Portal login URL is required when a portal is available";
    else if (url && !URL_RE.test(url)) e.portalUrl = "Enter a full address starting with https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    const body = {
      name: form.name.trim(),
      fullName: form.fullName.trim(),
      category: form.category,
      avgTatDays: Number(form.avgTatDays),
      integration: form.integration,
      appForm: form.appForm.trim(),
      portalAvailable: form.portalAvailable,
      portalUrl: form.portalUrl.trim() || null,
      logo: form.logo || null,
    };
    try {
      if (payer) await api.put("/platform/payers/" + payer.id, body);
      else await api.post("/platform/payers", body);
      toast(payer ? "Payer updated" : "Payer added");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={payer ? "Edit Payer" : "Add Payer"} onClose={busy ? undefined : onClose} maxWidth={620}>
      <div className="space-y-3">
        <Field label="Payer Image" error={errors.logo} hint="Optional — without an image the payer name's letters are shown.">
          <div className="flex items-center gap-3">
            <PayerLogo name={form.name || "?"} color={payer?.color} logo={form.logo} size={56} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary" disabled={busy}>
              <Icon name="Upload" size={13} /> {form.logo ? "Change image" : "Choose image"}
            </button>
            {form.logo && (
              <button type="button" onClick={() => set("logo", "")} className="btn btn-ghost text-xs" disabled={busy}>
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                pickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Payer Name" required error={errors.name}>
            <input value={form.name} onChange={(e) => set("name", e.target.value.replace(/^\s+/, ""))} className={"input" + (errors.name ? " input-error" : "")} maxLength={120} placeholder="e.g. BCBS TX" />
          </Field>
          <Field label="Payer Category" required error={errors.category}>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={"input" + (errors.category ? " input-error" : "")}>
              <option value="">— Select category —</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Insurance Company Name" required error={errors.fullName}>
            <input value={form.fullName} onChange={(e) => set("fullName", e.target.value.replace(/^\s+/, ""))} className={"input" + (errors.fullName ? " input-error" : "")} maxLength={200} placeholder="e.g. Blue Cross Blue Shield of Texas" />
          </Field>
          <Field label="Portal Login URL" required={form.portalAvailable} error={errors.portalUrl}>
            <input
              value={form.portalUrl}
              onChange={(e) => set("portalUrl", e.target.value.replace(/\s/g, ""))}
              className={"input font-mono" + (errors.portalUrl ? " input-error" : "")}
              maxLength={500}
              placeholder="https://provider.payer.com/login"
              inputMode="url"
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Avg TAT (days)" required error={errors.avgTatDays}>
            <input value={form.avgTatDays} onChange={(e) => set("avgTatDays", e.target.value.replace(/\D/g, "").slice(0, 3))} className={"input font-mono" + (errors.avgTatDays ? " input-error" : "")} inputMode="numeric" placeholder="e.g. 49" />
          </Field>
          <Field label="Integration" required error={errors.integration}>
            <select value={form.integration} onChange={(e) => set("integration", e.target.value)} className={"input" + (errors.integration ? " input-error" : "")}>
              <option value="">— Select integration —</option>
              {INTEGRATIONS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Form" required error={errors.appForm}>
          <input value={form.appForm} onChange={(e) => set("appForm", e.target.value.replace(/^\s+/, ""))} className={"input" + (errors.appForm ? " input-error" : "")} maxLength={150} placeholder="e.g. Ambetter Provider Set-up Form" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.portalAvailable}
            onChange={(e) => {
              set("portalAvailable", e.target.checked);
              if (!e.target.checked) setErrors((er) => ({ ...er, portalUrl: "" }));
            }}
          />{" "}
          Is portal available
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Save" size={13} />} {payer ? "Update" : "Add Payer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
