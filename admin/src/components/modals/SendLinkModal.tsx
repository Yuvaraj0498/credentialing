"use client";

import { useState } from "react";
import { useEmailCheck } from "@/lib/useEmailCheck";
import { AlertBox, DeferredNotice } from "@/components/AlertBox";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { OrgAssignmentFields, assignmentPayload, type OrgAssignment, placementAssignment } from "@/components/OrgAssignmentFields";
import { ApiError, api, errorMessage } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { useToast } from "@/stores/toast";
import { EMAIL_RE } from "@/components/providers/shared";
import type { InviteResponse } from "@/types/providers";

/**
 * Prototype SendLinkModal (L1634).
 * - Without `provider`: AddProvider → "Send Link to Provider" → POST /providers/invite-new (creates a draft provider).
 * - With `provider`: Provider detail "Send Link" → POST /providers/{id}/invites.
 * Prototype v2: the provider is assigned to a client / practice (required) / location before the link is sent.
 */
export function SendLinkModal({
  provider,
  onClose,
  onBack,
  onSent,
  placement,
}: {
  /** Organization screen: the new provider goes under this client / practice / location (pre-filled). */
  placement?: { clientId: number | null; practiceId: number | null; locationId: number | null };
  provider?: { id: number; firstName: string; lastName: string; email: string | null; clientId?: number | null; practiceId?: number | null; locationId?: number | null };
  onClose: () => void;
  onBack?: () => void;
  onSent: (invite: InviteResponse) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ firstName: provider?.firstName || "", lastName: provider?.lastName || "", email: provider?.email || "", caqhId: "" });
  const emailTaken = useEmailCheck(form.email, { kind: "provider", id: provider?.id });
  const [assignment, setAssignment] = useState<OrgAssignment>(
    !provider && placement
      ? placementAssignment(placement)
      : {
          clientId: provider?.clientId ? String(provider.clientId) : "",
          practiceId: provider?.practiceId ? String(provider.practiceId) : "",
          locationId: provider?.locationId ? String(provider.locationId) : "",
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSend = async () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "Valid email required";
    else if (emailTaken) e.email = emailTaken;
    if (!assignment.practiceId) e.practiceId = "Pick a practice to continue";
    if (!provider) {
      if (!assignment.locationId) e.locationId = "Pick a location to continue";
      if (form.caqhId && !/^[0-9]{6,10}$/.test(form.caqhId)) e.caqhId = "6-10 digits";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = provider
        ? await api.post<InviteResponse>("/providers/" + provider.id + "/invites", { email: form.email.trim(), ...assignmentPayload(assignment) })
        : await api.post<InviteResponse>("/providers/invite-new", {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            caqhId: form.caqhId,
            ...assignmentPayload(assignment),
          });
      setSent(res);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const back = onBack || onClose;

  if (sent) {
    const link = (typeof window !== "undefined" ? window.location.origin : "") + sent.uploadUrl;
    const emailed = sent.emailStatus === "sent";
    const failed = sent.emailStatus === "failed";
    return (
      <Modal
        title={failed ? "Secure Link Created" : "Secure Link Sent"}
        subtitle={emailed ? "The provider has been emailed their secure link and PIN." : "Share the link and PIN below with the provider."} onClose={() => onSent(sent)} maxWidth={520}>
        <div className="space-y-4 mt-2">
          <div className="card-pad rounded-lg" style={{ background: failed ? "var(--warn-soft)" : "var(--success-soft)", border: "1px solid " + (failed ? "var(--warn)" : "var(--success)") }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon name={failed ? "MailWarning" : "MailCheck"} size={18} style={{ color: failed ? "#a16207" : "var(--success)" }} />
              <div className="font-semibold text-ink">
                {emailed ? "Email sent to " + sent.email : failed ? "Email could not be sent to " + sent.email : "Email queued for " + sent.email}
              </div>
            </div>
            <div className="text-xs text-ink-light mb-3">The provider will use this PIN to access the upload portal:</div>
            <div className="bg-paper rounded-lg p-4 text-center border border-line">
              <div className="text-[10px] font-medium text-ink-faint uppercase tracking-wider mb-2">Secure Access PIN</div>
              <div className="font-display text-4xl font-bold text-ink tracking-widest">{sent.pin}</div>
            </div>
            <div className="text-xs text-ink-light mt-3 text-center">Link expires: {fmtDate(sent.expiresAt)}</div>
            <div className="flex items-center gap-2 mt-3">
              <input readOnly value={link} className="input input-sm font-mono" style={{ fontSize: 11 }} onFocus={(e) => e.target.select()} aria-label="Secure upload link" />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={() => {
                  navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});
                }}
              >
                <Icon name={copied ? "Check" : "Copy"} size={11} /> {copied ? "Copied" : "Copy"}
              </button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: 11, padding: "5px 10px" }} title="Open the provider portal">
                <Icon name="ExternalLink" size={11} />
              </a>
            </div>
          </div>
          {failed && (
            <AlertBox type="warn">
              <span>
                The mail server refused the message{sent.emailError ? ": " + sent.emailError : "."} Share the link and PIN with the provider directly, or send the link again later.
              </span>
            </AlertBox>
          )}
          {sent.emailStatus === "queued" && (
            <DeferredNotice>
              Email sending is switched off on this server, so the message was only recorded in the email log. Share the link and PIN with the provider directly. The PIN is shown only once.
            </DeferredNotice>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button onClick={() => onSent(sent)} className="btn btn-primary">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Send Secure Link to Provider"
      subtitle="They'll complete their own profile and upload documents."
      onClose={onClose}
      showBack={!!onBack}
      onBack={onBack}
      maxWidth={520}
    >
      <div className="space-y-3 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" error={errors.firstName}>
            <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" disabled={!!provider} />
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" disabled={!!provider} />
          </Field>
        </div>
        <Field label="Email Address" error={errors.email || emailTaken}>
          <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" className="input" placeholder="provider@example.com" />
        </Field>
        {!provider && (
          <Field label="CAQH ID" error={errors.caqhId}>
            <input value={form.caqhId} onChange={(e) => set("caqhId", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} className="input font-mono" placeholder="8 digits" inputMode="numeric" />
          </Field>
        )}
        <OrgAssignmentFields
          value={assignment}
          onChange={(a) => {
            setAssignment(a);
            setErrors((er) => ({ ...er, practiceId: "", locationId: "" }));
          }}
          error={errors.practiceId}
          locationRequired={!provider}
          locationError={errors.locationId}
        />
        <div className="px-3 py-3 rounded-lg" style={{ background: "var(--info-soft)" }}>
          <div className="flex items-start gap-2 text-xs text-ink">
            <Icon name="Shield" size={14} style={{ color: "var(--info)", marginTop: 1 }} />
            <div>
              <div className="font-semibold mb-1">What the provider receives:</div>
              <ul className="space-y-1 text-ink-light">
                <li>· A secure link to a personal upload portal</li>
                <li>· A 6-digit PIN required to access the portal</li>
                <li>· A list of required documents and a profile form</li>
                <li>· Link expires after 7 days (auto-renewable)</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={back} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={busy || !form.firstName || !form.lastName || !form.email || !assignment.practiceId}
            title={!assignment.practiceId ? "Pick a practice to continue" : ""}
            className="btn btn-primary"
          >
            {busy ? (
              <>
                <span className="loader" /> Sending...
              </>
            ) : (
              <>
                Send Secure Link <Icon name="Send" size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
