"use client";

import { Fragment, useState } from "react";
import { cleanSearch } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AlertBox } from "@/components/AlertBox";
import { Avatar } from "@/components/Avatar";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/stores/toast";
import { useShell } from "@/stores/shell";
import { providerLastFirst, providerName, usePayers, useProvidersLite } from "@/components/enrollments/shared";
import type { ApplicationType, Payer, PayerApplicationResponse } from "@/types/payers";

interface FormChoice {
  id: number | null;
  key: string;
  label: string;
  desc: string;
}

const APP_TYPES: { id: ApplicationType; label: string; desc: string; icon: string }[] = [
  { id: "initial", label: "Initial Enrollment", desc: "New provider, new payer relationship", icon: "FilePlus" },
  { id: "recred", label: "Re-credentialing", desc: "Refresh an existing enrollment", icon: "RefreshCw" },
  { id: "update", label: "Demographic Update", desc: "Update existing provider info", icon: "Edit" },
  { id: "terminate", label: "Termination", desc: "End a payer relationship", icon: "XCircle" },
];

export function mappingHref(params: { payerId: number; formId: number | null; providerId: number; enrollmentId?: number | null }) {
  const sp = new URLSearchParams({ payerId: String(params.payerId), providerId: String(params.providerId) });
  if (params.formId != null) sp.set("formId", String(params.formId));
  if (params.enrollmentId != null) sp.set("enrollmentId", String(params.enrollmentId));
  return "/payer-applications/mapping?" + sp.toString();
}

const formsFor = (p: Payer): FormChoice[] =>
  p.forms && p.forms.length
    ? [...p.forms].sort((a, b) => a.sortOrder - b.sortOrder).map((f) => ({ id: f.id, key: String(f.id), label: f.label, desc: f.description || "" }))
    : [{ id: null, key: "default", label: p.appForm || "Standard Application", desc: "Default form" }];

/** Port of the prototype PayerApplicationsView (L2539) — the wizard now persists draft enrollments. */
export function PayerApplicationsView() {
  const router = useRouter();
  const toast = useToast();
  const { publish } = useShell();
  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState<ApplicationType | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormChoice | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);
  const [payerSearch, setPayerSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [result, setResult] = useState<{ res: PayerApplicationResponse; payer: Payer; form: FormChoice } | null>(null);

  const payers = usePayers(true);
  const providers = useProvidersLite();

  const filteredPayers = (payers.data || []).filter((p) => p.name.toLowerCase().includes(payerSearch.toLowerCase()));
  const filteredProviders = (providers.data || []).filter((p) => providerName(p).toLowerCase().includes(providerSearch.toLowerCase()));

  const reset = () => {
    setStep(1);
    setAppType(null);
    setSelectedPayer(null);
    setSelectedForm(null);
    setSelectedProviders([]);
    setStartError(null);
  };

  const startApp = async () => {
    if (!selectedForm || !selectedPayer || !appType) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await api.post<PayerApplicationResponse>("/payer-applications", {
        applicationType: appType,
        payerId: selectedPayer.id,
        formId: selectedForm.id,
        providerIds: selectedProviders,
      });
      publish("enrollments");
      if (res.created.length) toast("Created " + res.created.length + " application(s)");
      if (res.created.length === 1 && res.skipped.length === 0) {
        const e = res.created[0];
        router.push(mappingHref({ payerId: e.payerId, formId: e.formId, providerId: e.providerId, enrollmentId: e.id }));
        return;
      }
      setResult({ res, payer: selectedPayer, form: selectedForm });
      reset();
    } catch (e) {
      setStartError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Payer Applications" breadcrumb={[{ label: "Admin" }, { label: "Payer Applications" }]} />

      {result && <ResultPanel result={result} onDismiss={() => setResult(null)} onOpen={(href) => router.push(href)} />}

      <div className="card card-pad" style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {[
            { n: 1, label: "Application Type" },
            { n: 2, label: "Choose Payer" },
            { n: 3, label: "Choose Form" },
            { n: 4, label: "Choose Providers" },
          ].map((s, i, arr) => (
            <Fragment key={s.n}>
              <div
                className={
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium " + (step === s.n ? "bg-accent-soft text-accent" : step > s.n ? "text-success" : "text-ink-faint")
                }
              >
                <div
                  className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold " + (step === s.n ? "bg-accent text-white" : step > s.n ? "bg-success-soft" : "bg-soft-2")}
                  style={step > s.n ? { background: "var(--success-soft)", color: "var(--success)" } : {}}
                >
                  {step > s.n ? <Icon name="Check" size={10} /> : s.n}
                </div>
                <span>{s.label}</span>
              </div>
              {i < arr.length - 1 && <Icon name="ChevronRight" size={11} className="text-ink-faint" />}
            </Fragment>
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <div>
            <h3 className="font-display text-xl font-semibold text-ink mb-1">Application Type</h3>
            <p className="text-sm text-ink-light mb-4">What kind of application are you submitting?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_TYPES.map((t) => (
                <button key={t.id} onClick={() => setAppType(t.id)} className={"card card-pad text-left transition-all " + (appType === t.id ? "border-accent bg-accent-soft" : "card-hover")}>
                  <Icon name={t.icon} size={20} className="text-accent mb-3" />
                  <div className="font-semibold text-ink">{t.label}</div>
                  <div className="text-xs text-ink-light mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-display text-xl font-semibold text-ink mb-1">Choose Payer</h3>
            <p className="text-sm text-ink-light mb-4">Which insurance payer is this application for?</p>
            <div className="relative mb-3">
              <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
              <input value={payerSearch} onChange={(e) => setPayerSearch(cleanSearch(e.target.value))} placeholder="Search payers..." className="input" style={{ paddingLeft: 32 }} />
            </div>
            {payers.error ? (
              <ErrorState message={payers.error} onRetry={payers.reload} />
            ) : payers.loading ? (
              <Loading />
            ) : filteredPayers.length === 0 ? (
              <div className="text-sm text-ink-faint text-center py-6">No payers match</div>
            ) : (
              <div className="space-y-2">
                {filteredPayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (selectedPayer?.id !== p.id) setSelectedForm(null);
                      setSelectedPayer(p);
                    }}
                    className={"w-full flex items-center gap-3 p-3 rounded-lg border transition-all " + (selectedPayer?.id === p.id ? "border-accent bg-accent-soft" : "border-line hover:border-accent")}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-soft-2">
                      <Icon name="CreditCard" size={16} className="text-ink-light" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-ink">{p.name}</div>
                    </div>
                    {selectedPayer?.id === p.id && <Icon name="CheckCircle2" size={16} className="text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && selectedPayer && (
          <div>
            <h3 className="font-display text-xl font-semibold text-ink mb-1">Choose Form</h3>
            <p className="text-sm text-ink-light mb-4">Pick the application form for {selectedPayer.name}.</p>
            <div className="space-y-2">
              {formsFor(selectedPayer).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedForm(f)}
                  className={"w-full text-left p-4 rounded-lg border transition-all " + (selectedForm?.key === f.key ? "border-accent bg-accent-soft" : "border-line hover:border-accent")}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="FileText" size={16} className="text-ink-light" />
                    <div className="flex-1">
                      <div className="font-medium text-ink">{f.label}</div>
                      <div className="text-xs text-ink-light mt-0.5">{f.desc}</div>
                    </div>
                    {selectedForm?.key === f.key && <Icon name="CheckCircle2" size={16} className="text-accent" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="font-display text-xl font-semibold text-ink mb-1">Choose Providers</h3>
            <p className="text-sm text-ink-light mb-4">Select which providers to include in this application.</p>
            <div className="relative mb-3">
              <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
              <input value={providerSearch} onChange={(e) => setProviderSearch(cleanSearch(e.target.value))} placeholder="Search providers..." className="input" style={{ paddingLeft: 32 }} />
              {selectedProviders.length > 0 && (
                <div className="absolute right-3 top-2 text-xs text-accent font-medium">
                  <button onClick={() => setSelectedProviders([])} className="hover:underline mr-2">
                    Deselect all
                  </button>
                  {selectedProviders.length} selected
                </div>
              )}
            </div>
            {providers.error ? (
              <ErrorState message={providers.error} onRetry={providers.reload} />
            ) : providers.loading ? (
              <Loading />
            ) : filteredProviders.length === 0 ? (
              <div className="text-sm text-ink-faint text-center py-6">No providers match</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProviders.map((p) => {
                  const isSelected = selectedProviders.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProviders((s) => (isSelected ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                      className={"w-full flex items-center gap-3 p-3 rounded-lg border transition-all " + (isSelected ? "border-accent bg-accent-soft" : "border-line hover:border-accent")}
                    >
                      <div className={"w-5 h-5 rounded flex items-center justify-center flex-shrink-0 " + (isSelected ? "bg-accent" : "border border-line-strong bg-paper")}>
                        {isSelected && <Icon name="Check" size={12} className="text-white" />}
                      </div>
                      <Avatar name={providerName(p)} size={32} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-ink">{providerLastFirst(p)}</div>
                        <div className="text-xs text-ink-light">{p.specialty || "—"}</div>
                      </div>
                      <span className="text-xs font-mono text-ink-light">NPI: {p.npi || "—"}</span>
                      {p.caqhId && (
                        <Pill type="accent">
                          <Icon name="Database" size={9} /> CAQH
                        </Pill>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {startError && (
          <div className="mt-4">
            <AlertBox>{startError}</AlertBox>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-line">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || starting} className="btn btn-ghost">
            <Icon name="ChevronLeft" size={14} /> Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !appType) || (step === 2 && !selectedPayer) || (step === 3 && !selectedForm)}
              className="btn btn-primary"
            >
              Continue <Icon name="ArrowRight" size={14} />
            </button>
          ) : (
            <button onClick={startApp} disabled={selectedProviders.length === 0 || starting} className="btn btn-primary">
              {starting ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Zap" size={14} />} Start Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onDismiss,
  onOpen,
}: {
  result: { res: PayerApplicationResponse; payer: Payer; form: FormChoice };
  onDismiss: () => void;
  onOpen: (href: string) => void;
}) {
  const { res, payer, form } = result;
  return (
    <div className="card mb-4" style={{ maxWidth: 800, margin: "0 auto 16px" }}>
      <div className="p-4 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-ink">
            {res.created.length} application(s) started · {payer.name}
          </h3>
          <p className="text-xs text-ink-light mt-1">{form.label}</p>
        </div>
        <button onClick={onDismiss} className="btn-ghost p-1" aria-label="Dismiss">
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="p-2">
        {res.created.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg">
            <Avatar name={e.providerName} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{e.providerName}</div>
              <div className="text-[10px] text-ink-faint">Draft enrollment created</div>
            </div>
            <button className="btn btn-secondary text-xs" onClick={() => onOpen(mappingHref({ payerId: e.payerId, formId: e.formId, providerId: e.providerId, enrollmentId: e.id }))}>
              <Icon name="GitMerge" size={11} /> Open mapping
            </button>
          </div>
        ))}
        {res.skipped.map((s) => (
          <div key={s.providerId} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--warn-soft)" }}>
            <Icon name="AlertTriangle" size={14} style={{ color: "#a16207" }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.providerName}</div>
              <div className="text-[10px]" style={{ color: "#854d0e" }}>
                Skipped — {s.reason}
              </div>
            </div>
            <button
              className="btn btn-secondary text-xs"
              onClick={() => onOpen(mappingHref({ payerId: payer.id, formId: form.id, providerId: s.providerId, enrollmentId: s.existingEnrollmentId }))}
            >
              <Icon name="GitMerge" size={11} /> Open mapping
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
