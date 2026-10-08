"use client";

import { useState } from "react";
import { DeferredNotice } from "@/components/AlertBox";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { ReminderType, TemplateItem, TemplatePreview } from "@/types/email";
import { REMINDER_TYPE_LABEL } from "@/types/email";
import type { ProviderLite } from "@/types/tasks";

const HEADLINE_COLOR: Record<ReminderType, string> = { missing_docs: "#991b1b", expiring: "#a16207", incomplete: "#1e40af" };

/**
 * Renders POST /email/templates/{id}/preview inside the prototype's email design.
 * Without a provider the server uses sample data ("Jane").
 */
export function EmailPreviewModal({
  onClose,
  templateId: initialTemplateId,
  reminderType,
  providerId: initialProviderId,
}: {
  onClose: () => void;
  templateId?: number | null;
  reminderType?: ReminderType;
  providerId?: number | null;
}) {
  const templates = useAsync(() => api.get<TemplateItem[]>("/email/templates"), []);
  const providers = useAsync(() => api.get<ProviderLite[]>("/providers/all-lite"), []);
  const [chosenId, setTemplateId] = useState<number | null>(initialTemplateId ?? null);
  const [providerId, setProviderId] = useState<string>(initialProviderId ? String(initialProviderId) : "");

  // Default to the first template of the requested type (or the first template).
  const fallback = templates.data?.find((t) => !reminderType || t.type === reminderType) || templates.data?.[0];
  const templateId = chosenId ?? fallback?.id ?? null;

  const preview = useAsync<TemplatePreview | null>(
    templateId == null ? null : () => api.post<TemplatePreview>(`/email/templates/${templateId}/preview`, providerId ? { providerId: Number(providerId) } : {}),
    [templateId, providerId]
  );

  const template = templates.data?.find((t) => t.id === templateId);
  const headlineColor = template ? HEADLINE_COLOR[template.type] : "#991b1b";

  return (
    <Modal title="Email Preview" subtitle="This is what the email will look like when sent to providers." onClose={onClose} maxWidth={620}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Template</label>
          <select className="input" value={templateId ?? ""} onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)} disabled={templates.loading}>
            {templates.loading && <option value="">Loading…</option>}
            {(templates.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {REMINDER_TYPE_LABEL[t.type]}{t.system ? " (system)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Preview as provider</label>
          <select className="input" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">Sample provider (Jane)</option>
            {(providers.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {templates.error ? (
        <ErrorState message={templates.error} onRetry={templates.reload} />
      ) : !templates.loading && !templates.data?.length ? (
        <div className="card p-6 text-center text-sm text-ink-light">No email templates are available yet.</div>
      ) : preview.error ? (
        <ErrorState message={preview.error} onRetry={preview.reload} />
      ) : preview.loading || !preview.data ? (
        <div className="card"><Loading label="Rendering preview…" /></div>
      ) : (
        <div className="card overflow-hidden">
          {/* Email header */}
          <div className="p-5 border-b border-line">
            <div className="atano-logo text-2xl mb-5"><span className="a-mark">▲</span>ZmartCredential</div>
            {preview.data.toEmail && <div className="text-xs text-ink-faint mb-2">To: {preview.data.toEmail}</div>}
            <h2 className="font-display text-2xl font-bold mb-3" style={{ color: headlineColor }}>{preview.data.subject}</h2>
            <div className="text-sm text-ink mb-3" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{preview.data.body}</div>
            <button className="btn w-full mt-4" style={{ background: "#3b82f6", color: "white", padding: "12px", cursor: "default" }} type="button" tabIndex={-1}>
              Upload Your Documents Now
            </button>
            <p className="text-xs text-ink-light mt-4">If the link has expired by the time you access it, please contact ZmartCredential Billing Solutions and we will send you a new one.</p>
          </div>
        </div>
      )}
      <DeferredNotice className="mt-3">
        The secure upload link, PIN and expiry date are generated for each provider when the email is sent.
      </DeferredNotice>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn btn-secondary">Close</button>
      </div>
    </Modal>
  );
}
