"use client";

import { useState } from "react";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { usePayers } from "@/components/enrollments/shared";
import type { Payer } from "@/types/enrollments";
import { ProviderPayerLoginModal } from "@/components/modals/ProviderPayerLoginModal";
import type { PayerCredential } from "@/types/payers";

interface MyProvider {
  id: number;
  firstName: string;
  lastName: string;
  npi: string | null;
  specialty: string | null;
  status: string | null;
}

/** Port of the prototype ProviderOwnLoginsView (L12731) — provider role's own payer portal logins. */
export function ProviderOwnLoginsView() {
  const user = useUser();
  const pid = user.providerId;
  const [modal, setModal] = useState<{ payer: Payer; has: boolean } | null>(null);

  const provider = useAsync<MyProvider>(pid ? () => api.get("/me/provider") : null, [pid]);
  const creds = useAsync<PayerCredential[]>(pid ? () => api.get("/providers/" + pid + "/payer-credentials") : null, [pid]);
  const payersQ = usePayers(true);

  if (!pid || (provider.error && !provider.data)) {
    if (pid && provider.error && !/not linked|404|not found/i.test(provider.error)) return <ErrorState message={provider.error} onRetry={provider.reload} />;
    return (
      <div>
        <PageHeader title="My Payer Logins" subtitle="Manage your payer portal credentials" />
        <div className="card card-pad text-center" style={{ padding: 60 }}>
          <Icon name="UserX" size={32} className="mx-auto text-ink-faint mb-3" />
          <div className="font-semibold text-ink">Provider record not linked</div>
          <div className="text-sm text-ink-light mt-2">Your user account is not linked to a provider record. Contact your organization administrator.</div>
        </div>
      </div>
    );
  }
  if (provider.loading || !provider.data) return <Loading />;

  const myProvider = provider.data;
  const fullName = myProvider.firstName + " " + myProvider.lastName;
  const payers = payersQ.data || [];
  const myCreds: Record<number, PayerCredential> = {};
  (creds.data || []).forEach((c) => (myCreds[c.payerId] = c));
  const configuredCount = Object.values(myCreds).filter((c) => c?.username).length;

  return (
    <div>
      <PageHeader title="My Payer Logins" subtitle={"Portal credentials for " + fullName} />

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}>
        <div className="flex items-start gap-3">
          <Icon name="Shield" size={18} className="text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <strong>Store once, use everywhere.</strong> Save your username and password for each payer portal here. Your credentialing clerk and submission tools will use these
            when filing applications on your behalf. Passwords are encrypted at rest on the server and every reveal is recorded in the audit log.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Portals Configured" value={configuredCount} sub={"of " + payers.length} icon="KeyRound" color="var(--success)" />
        <StatCard
          label="Portals Not Configured"
          value={Math.max(0, payers.length - configuredCount)}
          sub="Add credentials"
          icon="Lock"
          color="var(--warn)"
          emphasize={payers.length - configuredCount > 0}
        />
        <StatCard label="Your NPI" value={myProvider.npi || "—"} sub={myProvider.specialty || ""} icon="IdCard" color="var(--info)" />
        <StatCard label="Status" value={myProvider.status || "active"} sub="Provider record" icon="UserCheck" color="var(--accent)" />
      </div>

      {payersQ.error || creds.error ? (
        <ErrorState
          message={(payersQ.error || creds.error) as string}
          onRetry={() => {
            payersQ.reload();
            creds.reload();
          }}
        />
      ) : payersQ.loading || creds.loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {payers.map((p) => {
            const cred = myCreds[p.id];
            const has = !!cred?.username;
            return (
              <div key={p.id} className="card card-pad">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: p.color }}>
                    {p.name.slice(0, 2)}
                  </div>
                  <Pill type="neutral">{p.category}</Pill>
                </div>
                <h3 className="font-display font-semibold text-ink">{p.name}</h3>
                <p className="text-xs text-ink-light mb-3">{p.fullName}</p>
                {has && (
                  <div className="mb-3 p-2 rounded text-[11px] font-mono" style={{ background: "var(--bg-soft)" }}>
                    <div className="flex items-center gap-1 text-ink">
                      <Icon name="User" size={10} className="text-ink-faint" />
                      <span className="truncate">{cred.username}</span>
                    </div>
                    {cred.updatedAt && <div className="text-[9px] text-ink-faint mt-0.5">Updated {new Date(cred.updatedAt).toLocaleDateString()}</div>}
                  </div>
                )}
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <div className="text-xs">
                    {has ? (
                      <span className="flex items-center gap-1 text-success">
                        <Icon name="CheckCircle2" size={11} /> Saved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-ink-faint">
                        <Icon name="Lock" size={11} /> Not configured
                      </span>
                    )}
                  </div>
                  <button onClick={() => setModal({ payer: p, has })} className="btn btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>
                    <Icon name="LogIn" size={11} /> {has ? "Edit" : "Add Credentials"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ProviderPayerLoginModal
          providerId={myProvider.id}
          providerName={fullName}
          payer={modal.payer}
          hasExisting={modal.has}
          onSaved={() => {
            setModal(null);
            creds.reload();
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
