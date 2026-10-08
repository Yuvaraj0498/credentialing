"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useShell } from "@/stores/shell";
import { providerFirstName, providerName, usePayers, useProvidersLite } from "@/components/enrollments/shared";
import type { ApiSupport, Payer } from "@/types/enrollments";
import { PayerPortalLoginModal } from "@/components/modals/PayerPortalLoginModal";
import { ProviderPayerLoginModal } from "@/components/modals/ProviderPayerLoginModal";
import { PortalSubmissionModal } from "@/components/modals/PortalSubmissionModal";
import type { CredentialMatrix, PayerCredential } from "@/types/payers";
import { SubmissionOutcomeModal } from "@/components/modals/SubmissionOutcomeModal";
import { type PayerSubmission, type PortalLoginResult, type SubmitResponse } from "@/types/submissions";

const methodConfig: Record<ApiSupport, { label: string; color: string; icon: string; desc: string }> = {
  full: { label: "API", color: "var(--success)", icon: "Zap", desc: "Developer API available — enrollment still completed in the payer portal" },
  partial: { label: "API (partial)", color: "var(--info)", icon: "Zap", desc: "Some workflows via API; enrollment completed in the payer portal" },
  portal: { label: "Portal", color: "var(--warn)", icon: "Globe", desc: "Web form submission via provider portal" },
  manual: { label: "Manual", color: "var(--danger)", icon: "FileText", desc: "PDF via email or fax — slowest" },
};
const methodPill = (a: ApiSupport) => (a === "full" ? "success" : a === "partial" ? "info" : a === "manual" ? "danger" : "warn");


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
 * Payer Submission Center (prototype v3). Every active payer is listed. "Submit for {provider}" needs a stored portal
 * login for that payer (the provider's own, else the organization's): it records the submission, opens the payer's
 * portal in a new tab and hands staff the login + provider details; the outcome is recorded afterwards.
 */
export function PayerSubmissionCenter() {
  const { can } = useAuth();
  const { publish } = useShell();
  const canSubmit = can("create", "payer_submission");
  const canCreds = can("list", "credential_vault");
  const canEditCreds = can("update", "credential_vault") || can("create", "credential_vault");

  const [pickedProvider, setSelectedProvider] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<Set<number>>(new Set());
  const [recording, setRecording] = useState<PayerSubmission | null>(null);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [orgModal, setOrgModal] = useState<Payer | null>(null);
  const [provModal, setProvModal] = useState<Payer | null>(null);

  const providers = useProvidersLite();
  const payersQ = usePayers(true);
  const matrix = useAsync<CredentialMatrix>(canCreds ? () => api.get("/payer-credentials/matrix") : null, [canCreds]);
  const orgCreds = useAsync<PayerCredential[]>(canCreds ? () => api.get("/payer-credentials") : null, [canCreds]);

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

  const reloadCreds = () => {
    matrix.reload();
    orgCreds.reload();
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

  const submit = async (payer: Payer) => {
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

      <div className="card card-pad mb-4" style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}>
        <div className="flex items-start gap-3">
          <Icon name="AlertTriangle" size={18} style={{ color: "#a16207" }} className="flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <strong>The reality of payer submission APIs:</strong> Most private payers do not offer public credentialing APIs. Realistic breakdown: <strong>UHC</strong> has
            partial API support for enrollment workflows (limited partner access). <strong>BCBS</strong>, <strong>Aetna</strong>, <strong>Anthem</strong> support submission via{" "}
            <strong>Availity clearinghouse</strong>. All others use their <strong>provider portals</strong> (web forms) or accept faxed/emailed PDF applications. This tool models
            each channel honestly.
          </div>
        </div>
      </div>

      {/* Provider picker */}
      <div className="card card-pad mb-4">
        <label className="label">Provider to submit for</label>
        <select
          value={selectedProvider ?? ""}
          onChange={(e) => setSelectedProvider(e.target.value ? Number(e.target.value) : null)}
          className="input"
          style={{ maxWidth: 400 }}
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
            const method = methodConfig[payer.apiSupport] || methodConfig.portal;
            const login = loginFor(payer.id);
            const orgLogin = orgLoginFor(payer.id);
            const unassigned = !login && !!orgLogin;
            const busy = submitting.has(payer.id);
            const blockedReason = !selectedProvider
              ? "Pick a provider first"
              : !canCreds
                ? "You do not have access to portal logins"
                : !login
                  ? "Add the payer's portal login first"
                  : "";
            // Submit is offered only for a provider who can use a stored login.
            const showSubmit = canSubmit && !!selectedProvider && (!!login || !canCreds || !credsLoaded);
            return (
              <div key={payer.id} className="card">
                <div className="p-3 border-b border-line flex items-center gap-2">
                  <div className="w-3 h-8 rounded" style={{ background: payer.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{payer.name}</div>
                    <div className="text-[10px] text-ink-light truncate">{payer.payerType || payer.category}</div>
                  </div>
                  <Pill type={methodPill(payer.apiSupport)}>
                    <Icon name={method.icon} size={9} /> {method.label}
                  </Pill>
                </div>
                <div className="p-3">
                  <div className="text-xs text-ink-light mb-3" style={{ minHeight: 30 }}>
                    {method.desc}
                  </div>
                  {canCreds && credsLoaded &&
                    (!selectedProvider && orgLogin ? (
                      // No provider chosen yet: show the payer's stored login and who uses it.
                      <div className="mb-2 p-2 rounded text-[10px] flex items-center justify-between gap-2" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                        <span className="min-w-0 truncate">
                          <Icon name="KeyRound" size={9} className="inline mr-1" />
                          <span className="font-mono">{orgLogin.username}</span>
                          <span className="text-ink-light">
                            {" "}
                            · used by {(orgLogin.providerIds || []).length} provider{(orgLogin.providerIds || []).length === 1 ? "" : "s"}
                          </span>
                        </span>
                        {canEditCreds && (
                          <button onClick={() => setOrgModal(payer)} className="text-accent hover:underline flex-shrink-0">
                            edit
                          </button>
                        )}
                      </div>
                    ) : login ? (
                      <div className="mb-2 p-2 rounded text-[10px] flex items-center justify-between gap-2" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                        <span className="min-w-0 truncate">
                          <Icon name="KeyRound" size={9} className="inline mr-1" />
                          <span className="font-mono">{login.username}</span>
                          <span className="text-ink-light"> · {login.level === "provider" ? "provider login" : "organization login"}</span>
                        </span>
                        {canEditCreds && (
                          <button onClick={() => (login.level === "provider" ? setProvModal(payer) : setOrgModal(payer))} className="text-accent hover:underline flex-shrink-0">
                            edit
                          </button>
                        )}
                      </div>
                    ) : unassigned ? (
                      <div className="mb-2 p-2 rounded text-[10px] flex items-center justify-between gap-2" style={{ background: "var(--warn-soft)", color: "#a16207" }}>
                        <span className="min-w-0">
                          <Icon name="Lock" size={9} className="inline mr-1" />
                          No login for {provider ? providerFirstName(provider) : "this provider"}
                        </span>
                        {canEditCreds && (
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setOrgModal(payer)} className="hover:underline" title="Let this provider use the organization's shared login">
                              Assign shared
                            </button>
                            <button onClick={() => setProvModal(payer)} className="font-semibold hover:underline">
                              Add
                            </button>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mb-2 p-2 rounded text-[10px] flex items-center justify-between" style={{ background: "var(--warn-soft)", color: "#a16207" }}>
                        <span>
                          <Icon name="Lock" size={9} className="inline mr-1" />
                          No portal login stored
                        </span>
                        {canEditCreds && (
                          // Same as the Payers page: a chosen provider gets their own login; otherwise the organization login.
                          <button onClick={() => (selectedProvider ? setProvModal(payer) : setOrgModal(payer))} className="font-semibold hover:underline">
                            Add
                          </button>
                        )}
                      </div>
                    ))}
                  {showSubmit && (
                    <button onClick={() => submit(payer)} disabled={busy || !!blockedReason || !credsLoaded} title={blockedReason} className="btn btn-primary text-xs w-full">
                      {busy ? (
                        <>
                          <span className="loader"></span> Signing in...
                        </>
                      ) : (
                        <>
                          <Icon name={login ? "Send" : "Lock"} size={11} /> Submit {provider ? "for " + providerFirstName(provider) : ""}
                        </>
                      )}
                    </button>
                  )}
                  <div className="mt-2 text-[10px] flex items-center justify-between text-ink-faint">
                    {payer.portalUrl ? (
                      <a href={payer.portalUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        <Icon name="ExternalLink" size={9} /> Open portal
                      </a>
                    ) : (
                      <span>No portal address</span>
                    )}
                    <span>CAQH: {payer.caqhParticipating ? "✓" : "—"}</span>
                  </div>
                </div>
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
      {orgModal && (
        <PayerPortalLoginModal
          payer={orgModal}
          existing={(orgCreds.data || []).find((c) => c.payerId === orgModal.id && c.providerId == null) || null}
          canEdit={canEditCreds}
          canDelete={can("delete", "credential_vault")}
          onSaved={() => {
            setOrgModal(null);
            reloadCreds();
          }}
          onClose={() => setOrgModal(null)}
          presetProviderId={selectedProvider}
        />
      )}
      {provModal && provider && (
        <ProviderPayerLoginModal
          providerId={provider.id}
          providerName={providerName(provider)}
          payer={provModal}
          hasExisting
          onSaved={() => {
            setProvModal(null);
            reloadCreds();
          }}
          onClose={() => setProvModal(null)}
        />
      )}
    </div>
  );
}
