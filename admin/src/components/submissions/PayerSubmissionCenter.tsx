"use client";

import { useState } from "react";
import { useToast } from "@/stores/toast";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useShell } from "@/stores/shell";
import { providerFirstName, providerName, usePayers, useProvidersLite } from "@/components/enrollments/shared";
import type { Payer } from "@/types/enrollments";
import { PortalSubmissionModal } from "@/components/modals/PortalSubmissionModal";
import type { CredentialMatrix } from "@/types/payers";
import { SubmissionOutcomeModal } from "@/components/modals/SubmissionOutcomeModal";
import { type PayerSubmission, type PortalLoginResult, type SubmitResponse } from "@/types/submissions";

interface PortalLogin {
  credentialId: number;
  username: string;
  level: "provider" | "organization";
}

interface PortalSession {
  payer: Payer;
  providerId: number;
  login: PortalLogin;
  submission: PayerSubmission | null;
  result: PortalLoginResult | null;
  running: boolean;
  error: string | null;
}

/**
 * Payer Submission Center. The payers enabled for the organization (its Payers module) are listed, each with just its
 * name and "Submit for {provider}" — clickable only when that provider has a portal login stored for the payer. "Submit for {provider}" needs a stored portal
 * login for that payer (the provider's own, else the organization's): it records the submission, opens the payer's
 * portal in a new tab and hands staff the login + provider details; the outcome is recorded afterwards.
 */
export function PayerSubmissionCenter() {
  const { can } = useAuth();
  const toast = useToast();
  const { publish } = useShell();
  const canSubmit = can("create", "payer_submission");
  const canCreds = can("list", "credential_vault");

  const [pickedProvider, setSelectedProvider] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<Set<number>>(new Set());
  const [recording, setRecording] = useState<PayerSubmission | null>(null);
  const [session, setSession] = useState<PortalSession | null>(null);

  const providers = useProvidersLite();
  const payersQ = usePayers(true);
  const matrix = useAsync<CredentialMatrix>(canCreds ? () => api.get("/payer-credentials/matrix") : null, [canCreds]);

  // Nothing is pre-selected: the user chooses the provider first.
  const selectedProvider = pickedProvider;
  const provider = providers.data?.find((p) => p.id === selectedProvider);
  const provCreds = matrix.data?.providers.find((p) => p.providerId === selectedProvider)?.credentials || [];
  const payers = payersQ.data || [];

  /** The organization's login for a payer, whoever it is assigned to. */
  const orgLoginFor = (payerId: number) => matrix.data?.orgLevel.find((c) => c.payerId === payerId && c.username);

  /** The login a submission will use: the provider's own, else the organization's when it is assigned to this provider. */
  const loginFor = (payerId: number): PortalLogin | null => {
    const own = provCreds.find((c) => c.payerId === payerId && c.username);
    if (own) return { credentialId: own.credentialId, username: own.username, level: "provider" };
    const org = orgLoginFor(payerId);
    if (org && selectedProvider != null && (org.providerIds || []).includes(selectedProvider)) return { credentialId: org.credentialId, username: org.username, level: "organization" };
    return null;
  };

  /** Runs the server-side portal sign-in for a submission and stores the result in the open session. */
  const signIn = async (submissionId: number) => {
    setSession((s) => (s ? { ...s, running: true, error: null } : s));
    try {
      const result = await api.post<PortalLoginResult>("/payer-submissions/" + submissionId + "/portal-login");
      setSession((s) => (s ? { ...s, running: false, result, submission: result.submission } : s));
    } catch (e) {
      setSession((s) => (s ? { ...s, running: false, error: errorMessage(e) } : s));
    } finally {
      publish("enrollments");
    }
  };

  // For now "Submit for …" just opens the payer's portal in a new tab; the automated workflow below is kept
  // for later (see submitAutomated).
  const submit = (payer: Payer) => {
    const url = payer.portalUrl;
    if (!url) {
      toast("No portal address is set for " + payer.name, "error");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the automated portal sign-in, pending the workflow decision
  const submitAutomated = async (payer: Payer) => {
    const login = loginFor(payer.id);
    if (!selectedProvider || !login) return;
    setSubmitting((s) => new Set(s).add(payer.id));
    setSession({ payer, providerId: selectedProvider, login, submission: null, result: null, running: true, error: null });
    try {
      const res = await api.post<SubmitResponse>("/payer-submissions", { providerId: selectedProvider, payerIds: [payer.id] });
      const submission = res.submissions[0];
      setSession((s) => (s ? { ...s, submission } : s));
      await signIn(submission.id);
    } catch (e) {
      setSession((s) => (s ? { ...s, running: false, error: errorMessage(e) } : s));
    } finally {
      setSubmitting((s) => {
        const n = new Set(s);
        n.delete(payer.id);
        return n;
      });
    }
  };

  const credsLoaded = !canCreds || !!matrix.data;

  return (
    <div>
      <PageHeader title="Payer Submission Center" subtitle="Submit credentialing applications to payers via API, portal, or manual channel" />

      {/* Provider picker */}
      <div className="card card-pad mb-4">
        <label className="label">Provider to submit for</label>
        <select
          value={selectedProvider ?? ""}
          onChange={(e) => setSelectedProvider(e.target.value ? Number(e.target.value) : null)}
          className="input w-full"
          disabled={providers.loading}
        >
          {providers.loading && <option value="">Loading providers…</option>}
          {!providers.loading && !(providers.data || []).length && <option value="">No providers</option>}
          {!providers.loading && (providers.data || []).length > 0 && <option value="">— Choose a provider —</option>}
          {(providers.data || []).map((p) => (
            <option key={p.id} value={p.id}>
              {providerName(p)} — NPI {p.npi || "—"}
            </option>
          ))}
        </select>
        {providers.error && <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>{providers.error}</div>}
        {matrix.error && <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>Could not load portal logins: {matrix.error}</div>}
      </div>

      {/* Payer grid */}
      {payersQ.error ? (
        <ErrorState message={payersQ.error} onRetry={payersQ.reload} />
      ) : payersQ.loading ? (
        <Loading />
      ) : payers.length === 0 ? (
        <div className="card">
          <EmptyState icon="CreditCard" title="No active payers" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {payers.map((payer) => {
            const login = loginFor(payer.id);
            const busy = submitting.has(payer.id);
            // usable only for a chosen provider who has a portal login stored for this payer
            const ready = !!selectedProvider && credsLoaded && (!!login || !canCreds);
            const reason = !selectedProvider ? "Choose a provider first" : !ready ? "No portal login is stored for this provider and payer" : "";
            return (
              <div key={payer.id} className="card">
                <div className="p-3 flex items-center gap-2">
                  <div className="w-3 h-8 rounded" style={{ background: payer.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{payer.name}</div>
                    <div className="text-[10px] text-ink-light truncate">{payer.payerType || payer.category}</div>
                  </div>
                </div>
                {canSubmit && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => ready && submit(payer)}
                      disabled={busy || !ready}
                      title={reason || undefined}
                      className="btn btn-primary text-xs w-full"
                      style={!ready ? { cursor: "not-allowed" } : undefined}
                    >
                      {busy ? (
                        <>
                          <span className="loader"></span> Signing in...
                        </>
                      ) : (
                        <>
                          <Icon name={ready ? "Send" : "Lock"} size={11} /> Submit{provider ? " for " + providerFirstName(provider) : ""}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {session && (
        <PortalSubmissionModal
          payer={session.payer}
          providerId={session.providerId}
          username={session.login.username}
          credentialId={session.login.credentialId}
          submission={session.submission}
          result={session.result}
          running={session.running}
          error={session.error}
          onRetry={() => session.submission && signIn(session.submission.id)}
          onRecordOutcome={() => {
            setRecording(session.submission);
            setSession(null);
          }}
          onClose={() => !session.running && setSession(null)}
        />
      )}
      {recording && (
        <SubmissionOutcomeModal
          submission={recording}
          onSaved={() => {
            setRecording(null);
                  publish("enrollments");
          }}
          onClose={() => setRecording(null)}
        />
      )}
    </div>
  );
}
