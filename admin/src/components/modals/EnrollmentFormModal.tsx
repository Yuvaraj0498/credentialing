"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { Field } from "@/components/Field";
import { AlertBox } from "@/components/AlertBox";
import { Loading } from "@/components/AsyncState";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useToast } from "@/stores/toast";
import { useAsync } from "@/lib/hooks";
import { fetchProvidersLite, providerName, STATUS_OPTIONS } from "@/components/enrollments/shared";
import type { Enrollment, EnrollmentRequest, EnrollmentStatus, Payer } from "@/types/enrollments";

interface FormState {
  providerId: string;
  payerId: string;
  status: EnrollmentStatus;
  submittedDate: string;
  effectiveDate: string;
  notes: string;
}

/**
 * Port of the prototype EnrollmentFormModal (create / edit).
 * Saves through POST/PUT /enrollments and returns the saved row.
 */
export function EnrollmentFormModal({
  enrollment,
  defaultProviderId,
  onSaved,
  onClose,
}: {
  enrollment: Enrollment | null;
  /** Prefills (and keeps) the provider when starting from a provider record. */
  defaultProviderId?: number;
  onSaved: (e: Enrollment) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() =>
    enrollment
      ? {
          providerId: String(enrollment.providerId),
          payerId: String(enrollment.payerId),
          status: enrollment.status,
          submittedDate: enrollment.submittedDate || "",
          effectiveDate: enrollment.effectiveDate || "",
          notes: enrollment.notes || "",
        }
      : { providerId: defaultProviderId ? String(defaultProviderId) : "", payerId: "", status: "draft", submittedDate: "", effectiveDate: "", notes: "" }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const providers = useAsync(fetchProvidersLite, []);
  const payers = useAsync(() => api.get<Payer[]>("/payers", { activeOnly: false }), []);
  const payerOptions = (payers.data || []).filter((p) => p.active || String(p.id) === form.payerId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.providerId) e.providerId = "Required";
    if (!form.payerId) e.payerId = "Required";
    if (!form.status) e.status = "Required";
    if (form.submittedDate && form.effectiveDate && form.effectiveDate < form.submittedDate) e.effectiveDate = "Effective date must be on or after the submitted date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    const body: EnrollmentRequest = {
      providerId: Number(form.providerId),
      payerId: Number(form.payerId),
      status: form.status,
      submittedDate: form.submittedDate || null,
      effectiveDate: form.effectiveDate || null,
      notes: form.notes || undefined,
    };
    if (enrollment) {
      // PUT is a full replace: keep the fields this form doesn't edit.
      body.applicationType = enrollment.applicationType;
      if (enrollment.practiceId != null && Number(form.providerId) === enrollment.providerId) body.practiceId = enrollment.practiceId;
      if (enrollment.formId != null && Number(form.payerId) === enrollment.payerId) body.formId = enrollment.formId;
      if (enrollment.assignedUserId != null) body.assignedUserId = enrollment.assignedUserId;
    }
    try {
      const saved = enrollment ? await api.put<Enrollment>("/enrollments/" + enrollment.id, body) : await api.post<Enrollment>("/enrollments", body);
      toast(enrollment ? "Enrollment updated" : "Enrollment created");
      onSaved(saved);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const loadingLists = providers.loading || payers.loading;

  return (
    <Modal title={enrollment ? "Edit Enrollment" : "New Enrollment"} onClose={onClose} maxWidth={520}>
      {loadingLists ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {(providers.error || payers.error) && <AlertBox>{providers.error || payers.error}</AlertBox>}
          <Field label="Provider *" error={errors.providerId}>
            <select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} className="input" disabled={!!defaultProviderId && !enrollment}>
              <option value="">— Select —</option>
              {(providers.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {providerName(p)} — NPI {p.npi || "—"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payer *" error={errors.payerId}>
            <select value={form.payerId} onChange={(e) => setForm({ ...form, payerId: e.target.value })} className="input">
              <option value="">— Select —</option>
              {payerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status *" error={errors.status}>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EnrollmentStatus })} className="input">
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Submitted Date" error={errors.submittedDate}>
              <input type="date" value={form.submittedDate || ""} onChange={(e) => setForm({ ...form, submittedDate: e.target.value })} className="input" />
            </Field>
            <Field label="Effective Date" error={errors.effectiveDate}>
              <input type="date" value={form.effectiveDate || ""} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes}>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} />
          </Field>
          {formError && <AlertBox>{formError}</AlertBox>}
          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Save" size={13} />} {enrollment ? "Update" : "Create Enrollment"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
