"use client";

import { useState, type ReactNode } from "react";
import { useEmailCheck } from "@/lib/useEmailCheck";
import { todayISO } from "@/lib/utils";
import { PasswordInput } from "@/components/PasswordInput";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { ApiError, errorMessage } from "@/lib/api";
import { SPECIALTIES, SUFFIXES } from "@/lib/constants";
import { useToast } from "@/stores/toast";
import { digitsOnly, PHONE_RE, phoneDigits } from "@/lib/validation";
import { EDIT_LICENSE_STATES, EMAIL_RE, NPI_RE, PROVIDER_STATUS_OPTIONS, type OrgStructure } from "@/components/providers/shared";
import type { ProviderStatus } from "@/types/providers";

/** Starting values of the provider form (an existing provider, a CAQH profile, or blanks). */
export interface ProviderFormValues {
  firstName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  npi?: string | null;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  licenseExpires?: string | null;
  caqhId?: string | null;
  caqhUsername?: string | null;
  caqhPassword?: string | null;
  pecosAccessGranted?: boolean | null;
  pecosUsername?: string | null;
  status?: string | null;
  clientId?: number | null;
  practiceId?: number | null;
  locationId?: number | null;
}

/** What the form sends (the body of POST /providers, PUT /providers/{id} and the CAQH import "details"). */
export interface ProviderFormPayload {
  firstName: string;
  lastName: string;
  suffix: string;
  npi: string;
  specialty: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpires: string;
  caqhId: string;
  caqhUsername: string;
  /** omitted when editing and left blank (keeps the stored password) */
  caqhPassword?: string;
  pecosAccessGranted: boolean;
  pecosUsername?: string;
  status: ProviderStatus;
  clientId: number | null;
  practiceId: number | null;
  locationId: number | null;
}

const idStr = (v: number | null | undefined) => (v == null ? "" : String(v));
const num = (v: string) => (v ? Number(v) : null);

/**
 * The one provider form used everywhere a provider is added or edited (Add Provider Manually, Organization →
 * Add Provider, Import from CAQH, Edit Provider): the same fields, and every one of them is required.
 * Prototype ProviderEditModal (L14614) layout.
 */
export function ProviderForm({
  org,
  initial,
  hasStoredPassword = false,
  providerId,
  lockCaqhId = false,
  lockPlacement = false,
  submitLabel,
  submitIcon = "Save",
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
  top,
}: {
  org: OrgStructure;
  initial: ProviderFormValues;
  /** editing a provider that already has a CAQH password: the field may stay blank */
  hasStoredPassword?: boolean;
  /** editing: the provider's id (its own email is not a duplicate) */
  providerId?: number;
  /** CAQH import: the CAQH ID comes from the lookup and can't change */
  lockCaqhId?: boolean;
  /** Organization screen: the client / practice / location are fixed */
  lockPlacement?: boolean;
  submitLabel: string;
  submitIcon?: string;
  onSubmit: (payload: ProviderFormPayload) => Promise<void>;
  onCancel: () => void;
  cancelLabel?: string;
  top?: ReactNode;
}) {
  const toast = useToast();
  const { clients, practices, locations } = org;

  // Derive client/practice from the location when they are missing (prototype v24 behaviour).
  const initialLoc = locations.find((l) => l.id === initial.locationId);
  const initialPracticeId = initial.practiceId ?? initialLoc?.practiceId ?? null;
  const initialClientId = initial.clientId ?? practices.find((p) => p.id === initialPracticeId)?.clientId ?? null;

  const [form, setForm] = useState({
    firstName: initial.firstName || "",
    lastName: initial.lastName || "",
    suffix: initial.suffix || "MD",
    npi: (initial.npi || "").replace(/\D/g, "").slice(0, 10),
    specialty: initial.specialty || "",
    email: initial.email || "",
    phone: phoneDigits(initial.phone),
    license: initial.licenseNumber || "",
    licenseState: initial.licenseState || "TX",
    licenseExpires: initial.licenseExpires || "",
    caqhId: initial.caqhId || "",
    caqhUsername: initial.caqhUsername || "",
    caqhPassword: initial.caqhPassword || "",
    pecosAccess: initial.pecosAccessGranted == null ? "" : initial.pecosAccessGranted ? "yes" : "no",
    pecosUsername: initial.pecosUsername || "",
    status: (initial.status || "draft") as string,
    clientId: idStr(initialClientId),
    practiceId: idStr(initialPracticeId),
    locationId: idStr(initial.locationId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const emailTaken = useEmailCheck(form.email, { kind: "provider", id: providerId });
  // Typing in a field clears its message.
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => (er[k] ? { ...er, [k]: "" } : er));
  };

  // Cascading options
  const availablePractices = form.clientId ? practices.filter((p) => String(p.clientId) === form.clientId) : practices;
  const availableLocations = form.practiceId
    ? locations.filter((l) => String(l.practiceId) === form.practiceId)
    : form.clientId
      ? locations.filter((l) => availablePractices.some((p) => p.id === l.practiceId))
      : locations;

  const handleClientChange = (clientId: string) => setForm((f) => ({ ...f, clientId, practiceId: "", locationId: "" }));
  const handlePracticeChange = (practiceId: string) => {
    const parent = practices.find((p) => String(p.id) === practiceId);
    setForm((f) => ({ ...f, practiceId, clientId: parent ? String(parent.clientId) : f.clientId, locationId: "" }));
    setErrors((er) => ({ ...er, practiceId: "" }));
  };
  const handleLocationChange = (locationId: string) => {
    const loc = locations.find((l) => String(l.id) === locationId);
    const practice = loc ? practices.find((p) => p.id === loc.practiceId) : null;
    setForm((f) => ({ ...f, locationId, practiceId: practice ? String(practice.id) : f.practiceId, clientId: practice ? String(practice.clientId) : f.clientId }));
    setErrors((er) => ({ ...er, locationId: "", practiceId: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const req = (k: string, v: string) => {
      if (!v.trim()) e[k] = "Required";
    };
    req("firstName", form.firstName);
    req("lastName", form.lastName);
    req("suffix", form.suffix);
    if (!form.npi) e.npi = "Required";
    else if (!NPI_RE.test(form.npi)) e.npi = "10 digits required";
    if (!form.caqhId) e.caqhId = "Required";
    else if (!/^[0-9]{6,10}$/.test(form.caqhId)) e.caqhId = "6-10 digits";
    req("caqhUsername", form.caqhUsername);
    req("specialty", form.specialty);
    if (!form.email.trim()) e.email = "Required";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "Valid email required";
    else if (emailTaken) e.email = emailTaken;
    if (!form.phone) e.phone = "Required";
    else if (!PHONE_RE.test(form.phone)) e.phone = "Phone must be 10 digits";
    req("license", form.license);
    req("licenseState", form.licenseState);
    req("licenseExpires", form.licenseExpires);
    // expiration dates can't be in the past (an unchanged date of an existing provider is left alone)
    if (form.licenseExpires && form.licenseExpires < todayISO() && form.licenseExpires !== (initial.licenseExpires || "")) e.licenseExpires = "Choose today or a later date";
    req("status", form.status);
    if (!form.caqhPassword && !hasStoredPassword) e.caqhPassword = "Required";
    if (!form.pecosAccess) e.pecosAccess = "Required";
    else if (form.pecosAccess === "yes" && !form.pecosUsername.trim()) e.pecosUsername = "Required";
    if (!form.practiceId) e.practiceId = "Practice assignment is required";
    if (!form.locationId) e.locationId = "Location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast("Fill in all the required fields", "error");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        suffix: form.suffix,
        npi: form.npi,
        specialty: form.specialty,
        email: form.email.trim(),
        phone: form.phone,
        licenseNumber: form.license.trim(),
        licenseState: form.licenseState,
        licenseExpires: form.licenseExpires,
        caqhId: form.caqhId,
        caqhUsername: form.caqhUsername.trim(),
        caqhPassword: form.caqhPassword || undefined,
        pecosAccessGranted: form.pecosAccess === "yes",
        pecosUsername: form.pecosAccess === "yes" ? form.pecosUsername.trim() : undefined,
        status: form.status as ProviderStatus,
        clientId: num(form.clientId),
        practiceId: num(form.practiceId),
        locationId: num(form.locationId),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = { ...err.fieldErrors };
        if (fe.licenseNumber) fe.license = fe.licenseNumber;
        // a 409 without a field (duplicate NPI) is shown under NPI
        if (err.status === 409 && Object.keys(fe).length === 0) fe.npi = err.message;
        setErrors(fe);
      }
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const stateOptions = form.licenseState && !EDIT_LICENSE_STATES.includes(form.licenseState) ? [form.licenseState, ...EDIT_LICENSE_STATES] : EDIT_LICENSE_STATES;
  const specialtyOptions = form.specialty && !SPECIALTIES.includes(form.specialty) ? [form.specialty, ...SPECIALTIES] : SPECIALTIES;
  const suffixOptions = form.suffix && !SUFFIXES.includes(form.suffix) ? [form.suffix, ...SUFFIXES] : SUFFIXES;
  const selectedLoc = form.locationId ? locations.find((l) => String(l.id) === form.locationId) : null;
  const err = (k: string) => errors[k];

  return (
    <div className="space-y-3">
      {top}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="First Name *" error={err("firstName")}>
          <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" maxLength={80} />
        </Field>
        <Field label="Last Name *" error={err("lastName")}>
          <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" maxLength={80} />
        </Field>
        <Field label="Suffix *" error={err("suffix")}>
          <select value={form.suffix} onChange={(e) => set("suffix", e.target.value)} className="input">
            {suffixOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="NPI *" error={err("npi")}>
          <input value={form.npi} onChange={(e) => set("npi", e.target.value.replace(/\D/g, "").slice(0, 10))} className="input font-mono" placeholder="10 digits" inputMode="numeric" />
        </Field>
        <Field label="CAQH ID *" error={err("caqhId")}>
          <input
            value={form.caqhId}
            onChange={(e) => set("caqhId", e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="input font-mono"
            placeholder="8 digits"
            inputMode="numeric"
            disabled={lockCaqhId}
          />
        </Field>
        <Field label="CAQH Username *" error={err("caqhUsername")}>
          <input value={form.caqhUsername} onChange={(e) => set("caqhUsername", e.target.value.replace(/\s/g, ""))} className="input font-mono" maxLength={100} autoComplete="off" />
        </Field>
      </div>
      <Field label="Specialty *" error={err("specialty")}>
        <select value={form.specialty} onChange={(e) => set("specialty", e.target.value)} className="input">
          <option value="">— Select —</option>
          {specialtyOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Email *" error={err("email") || emailTaken}>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" />
        </Field>
        <Field label="Phone *" error={err("phone")}>
          <input value={form.phone} onChange={(e) => set("phone", digitsOnly(e.target.value, 10))} className="input font-mono" inputMode="numeric" placeholder="10 digits" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Field label="License # *" error={err("license")}>
          <input value={form.license} onChange={(e) => set("license", e.target.value)} className="input font-mono" maxLength={40} />
        </Field>
        <Field label="License State *" error={err("licenseState")}>
          <select value={form.licenseState} onChange={(e) => set("licenseState", e.target.value)} className="input">
            {stateOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="License Expires *" error={err("licenseExpires")}>
          <input type="date" min={todayISO()} value={form.licenseExpires} onChange={(e) => set("licenseExpires", e.target.value)} className="input" />
        </Field>
        <Field label="Status *" error={err("status")}>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
            {PROVIDER_STATUS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field
          label={hasStoredPassword ? "CAQH Password" : "CAQH Password *"}
          error={err("caqhPassword")}
          hint={hasStoredPassword ? "Leave blank to keep the saved password" : undefined}
        >
          <PasswordInput
            value={form.caqhPassword}
            onChange={(e) => set("caqhPassword", e.target.value)}
            className="input font-mono"
            maxLength={200}
            autoComplete="new-password"
            placeholder={hasStoredPassword ? "••••••••" : ""}
          />
        </Field>
        <Field label="PECOS Access Granted *" error={err("pecosAccess")}>
          <select value={form.pecosAccess} onChange={(e) => set("pecosAccess", e.target.value)} className="input">
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label={form.pecosAccess === "yes" ? "PECOS User Name *" : "PECOS User Name"} error={err("pecosUsername")}>
          <input
            value={form.pecosUsername}
            onChange={(e) => set("pecosUsername", e.target.value.replace(/\s/g, ""))}
            className="input font-mono"
            maxLength={100}
            disabled={form.pecosAccess !== "yes"}
            autoComplete="off"
          />
        </Field>
      </div>
      <div className="pt-3 mt-3 border-t border-line">
        <div className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
          <Icon name="Building2" size={13} className="text-accent" />
          Organization Assignment
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Client (Organization)" error={err("clientId")}>
            <select value={form.clientId} onChange={(e) => handleClientChange(e.target.value)} className="input" disabled={lockPlacement}>
              <option value="">— None —</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name}</option>
              ))}
            </select>
          </Field>
          <Field
            label={
              <>
                Practice * {form.clientId && availablePractices.length === 0 && <span className="text-xs text-ink-faint">(no practices in this client)</span>}
              </>
            }
            error={err("practiceId")}
          >
            <select
              value={form.practiceId}
              onChange={(e) => handlePracticeChange(e.target.value)}
              className="input"
              disabled={lockPlacement || availablePractices.length === 0}
              style={errors.practiceId ? { borderColor: "var(--danger)" } : {}}
            >
              <option value="">— Select a practice —</option>
              {availablePractices.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                  {pr.taxId ? " (TIN " + pr.taxId + ")" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              <>
                Location *{" "}
                {form.practiceId && availableLocations.length === 0 && (
                  <span className="text-xs" style={{ color: "#a16207" }}>
                    ⚠ No locations under this practice. Add one from Organization → &quot;+ Add Client / Practice / Location&quot;
                  </span>
                )}
              </>
            }
            error={err("locationId")}
          >
            <select
              value={form.locationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="input"
              disabled={lockPlacement || availableLocations.length === 0}
              style={errors.locationId ? { borderColor: "var(--danger)" } : {}}
            >
              <option value="">— Select a location —</option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} — {loc.address ? loc.address.split(",")[0] : ""}
                </option>
              ))}
            </select>
          </Field>
          {selectedLoc && (
            <div className="p-2 rounded text-[11px]" style={{ background: "var(--bg-soft)" }}>
              <div className="flex items-center gap-1 text-ink-light">
                <Icon name="MapPin" size={10} />
                <span>{selectedLoc.legalName || "—"}</span>
                {selectedLoc.npi && <span className="font-mono">· NPI {selectedLoc.npi}</span>}
              </div>
              <div className="text-ink-faint mt-0.5">{[selectedLoc.address, selectedLoc.city, selectedLoc.state].filter(Boolean).join(", ")}</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-line">
        <button onClick={onCancel} className="btn btn-secondary" disabled={busy}>
          {cancelLabel}
        </button>
        <button onClick={submit} className="btn btn-primary" disabled={busy}>
          {busy ? <span className="loader" /> : <Icon name={submitIcon} size={13} />} {submitLabel}
        </button>
      </div>
    </div>
  );
}
