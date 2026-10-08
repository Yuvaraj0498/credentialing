"use client";

import { Fragment, useMemo, useState } from "react";
import { cleanSearch } from "@/lib/utils";
import { AlertBox } from "@/components/AlertBox";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { EmailPreviewModal } from "@/components/modals/EmailPreviewModal";
import type { Cadence, ReminderListResponse, ReminderType, ScheduleItem, TemplateItem } from "@/types/email";

export function EmailRemindersWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [whatRemind, setWhatRemind] = useState<ReminderType>("missing_docs");
  const [whoSend, setWhoSend] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipients = useAsync(() => api.get<ReminderListResponse>("/email/reminders", { tab: "all" }), []);
  const templates = useAsync(() => api.get<TemplateItem[]>("/email/templates"), []);

  const typeTemplates = useMemo(() => (templates.data ?? []).filter((t) => t.type === whatRemind), [templates.data, whatRemind]);
  const selectedTemplate = typeTemplates.find((t) => t.id === templateId) || typeTemplates[0];

  const rows = recipients.data?.items ?? [];
  const filteredRows = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.email || "").toLowerCase().includes(search.toLowerCase()));
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((r) => whoSend.includes(r.providerId));

  const toggleAll = () => {
    if (allFilteredSelected) setWhoSend((s) => s.filter((id) => !filteredRows.some((r) => r.providerId === id)));
    else setWhoSend((s) => Array.from(new Set([...s, ...filteredRows.map((r) => r.providerId)])));
  };

  const next = () => {
    setError(null);
    if (step === 2 && whoSend.length === 0) {
      setError("Select at least one provider");
      return;
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post<ScheduleItem>("/email/schedules", {
        reminderType: whatRemind,
        templateId: selectedTemplate?.id,
        cadence,
        providerIds: whoSend,
      });
      toast("Reminders set up for " + whoSend.length + " provider" + (whoSend.length === 1 ? "" : "s"));
      onCreated();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError && Object.keys(e.fieldErrors).length ? Object.values(e.fieldErrors).join(" · ") : errorMessage(e);
      setError(msg);
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal title="Set Up Reminders" subtitle={step === 3 ? "Now, pick the email that will be sent to providers." : null} onClose={onClose} maxWidth={680}>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[
            { n: 1, label: "What to remind about" },
            { n: 2, label: "Who to send to" },
            { n: 3, label: "Pick an email" },
            { n: 4, label: "How often" },
          ].map((s, i, arr) => (
            <Fragment key={s.n}>
              <div className={"flex items-center gap-1.5 text-xs font-medium " + (step === s.n ? "text-accent" : step > s.n ? "text-success" : "text-ink-faint")}>
                <div className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold " + (step === s.n ? "bg-accent text-white" : step > s.n ? "" : "bg-soft-2")} style={step > s.n ? { background: "var(--success-soft)", color: "var(--success)" } : {}}>
                  {step > s.n ? <Icon name="Check" size={10} /> : s.n}
                </div>
                <span>{s.label}</span>
              </div>
              {i < arr.length - 1 && <Icon name="ChevronRight" size={11} className="text-ink-faint" />}
            </Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-2">
            {([
              { id: "missing_docs", icon: "FileX", title: "Missing Documents", desc: "Remind providers about credentialing documents we still need" },
              { id: "expiring", icon: "Clock", title: "Expiring Documents", desc: "Notify providers when their documents are about to expire" },
              { id: "incomplete", icon: "AlertCircle", title: "Incomplete Profile", desc: "Remind providers to complete their profile information" },
            ] as { id: ReminderType; icon: string; title: string; desc: string }[]).map((o) => (
              <button key={o.id} onClick={() => { setWhatRemind(o.id); setTemplateId(null); }}
                      className={"w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left " + (whatRemind === o.id ? "border-accent bg-accent-soft" : "border-line hover:border-accent")}>
                <Icon name={o.icon} size={16} className="text-accent mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-ink">{o.title}</div>
                  <div className="text-xs text-ink-light mt-0.5">{o.desc}</div>
                </div>
                {whatRemind === o.id && <Icon name="CheckCircle2" size={16} className="text-accent" />}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-sm text-ink-light">Select providers to receive these reminders:</p>
              {filteredRows.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-accent hover:underline">{allFilteredSelected ? "Deselect all" : "Select all"}</button>
              )}
            </div>
            <div className="relative mb-2">
              <Icon name="Search" size={13} className="absolute" style={{ left: 10, top: 9, color: "var(--ink-faint)" }} />
              <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search providers..." className="input input-sm" style={{ paddingLeft: 30 }} />
            </div>
            {recipients.error ? (
              <ErrorState message={recipients.error} onRetry={recipients.reload} />
            ) : recipients.loading ? (
              <Loading />
            ) : filteredRows.length === 0 ? (
              <EmptyState icon="Users" title="No providers found" description={search ? "Try a different search term." : "Add providers before setting up reminders."} />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredRows.map((r) => {
                  const isSelected = whoSend.includes(r.providerId);
                  return (
                    <button key={r.providerId} onClick={() => setWhoSend((s) => (isSelected ? s.filter((x) => x !== r.providerId) : [...s, r.providerId]))}
                            className={"w-full flex items-center gap-3 p-3 rounded-lg border " + (isSelected ? "border-accent bg-accent-soft" : "border-line")}>
                      <div className={"w-5 h-5 rounded flex items-center justify-center flex-shrink-0 " + (isSelected ? "bg-accent" : "border border-line-strong bg-paper")}>
                        {isSelected && <Icon name="Check" size={12} className="text-white" />}
                      </div>
                      <Avatar name={r.name} size={28} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-[11px] text-ink-faint truncate">{r.email || "No email on file"}</div>
                      </div>
                      {whatRemind === "missing_docs" && r.missing > 0 && <span className="text-xs text-danger font-semibold">{r.missing} missing</span>}
                      {whatRemind === "expiring" && r.expiringSoon > 0 && <span className="text-xs font-semibold" style={{ color: "#a16207" }}>{r.expiringSoon} expiring</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-ink-light mt-3">{whoSend.length} provider{whoSend.length === 1 ? "" : "s"} selected</div>
          </div>
        )}

        {step === 3 && (
          <div>
            {templates.error ? (
              <ErrorState message={templates.error} onRetry={templates.reload} />
            ) : templates.loading ? (
              <Loading />
            ) : typeTemplates.length === 0 ? (
              <EmptyState icon="Mail" title="No templates for this reminder type" description="The first matching template will be used automatically." />
            ) : (
              typeTemplates.map((t) => {
                const isSel = selectedTemplate?.id === t.id;
                return (
                  <div key={t.id} onClick={() => setTemplateId(t.id)} className={"card p-4 mb-4 bg-soft cursor-pointer " + (isSel ? "border-accent" : "")} style={isSel ? { borderColor: "var(--accent)" } : {}}>
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon name={isSel ? "CheckCircle2" : "Mail"} size={16} className={isSel ? "text-accent" : "text-ink-light"} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink">{t.name}{t.system && <span className="text-[10px] text-ink-faint font-normal ml-1">(system)</span>}</div>
                          <div className="text-xs text-ink-light mt-0.5">
                            Subject: <SubjectWithVars subject={t.subject} />
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setTemplateId(t.id); setShowPreview(true); }} className="btn flex-shrink-0" style={{ background: "#14b8a6", color: "white" }}>
                        <Icon name="Eye" size={13} /> Preview
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            {([
              { id: "daily", label: "Daily", desc: "Send every day until resolved" },
              { id: "weekly", label: "Weekly", desc: "Send once a week" },
              { id: "biweekly", label: "Bi-weekly", desc: "Send every two weeks" },
              { id: "monthly", label: "Monthly", desc: "Send once a month" },
            ] as { id: Cadence; label: string; desc: string }[]).map((o) => (
              <button key={o.id} onClick={() => setCadence(o.id)}
                      className={"w-full flex items-center gap-3 p-3 rounded-lg border text-left " + (cadence === o.id ? "border-accent bg-accent-soft" : "border-line")}>
                <Icon name="Clock" size={14} className="text-accent" />
                <div className="flex-1">
                  <div className="font-medium text-ink">{o.label}</div>
                  <div className="text-xs text-ink-light">{o.desc}</div>
                </div>
                {cadence === o.id && <Icon name="CheckCircle2" size={16} className="text-accent" />}
              </button>
            ))}
            <div className="text-xs text-ink-faint pt-1">The first send is scheduled for the next 8:00 AM.</div>
          </div>
        )}

        {error && <div className="mt-4"><AlertBox type="danger">{error}</AlertBox></div>}

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-line">
          <button onClick={() => (step > 1 ? setStep(step - 1) : onClose())} className="btn btn-ghost" disabled={busy}><Icon name="ChevronLeft" size={13} /> Back</button>
          {step < 4 ? (
            <button onClick={next} className="btn btn-primary">Continue <Icon name="ArrowRight" size={13} /></button>
          ) : (
            <button onClick={submit} disabled={busy || whoSend.length === 0} className="btn btn-primary">
              {busy && <span className="loader" style={{ borderTopColor: "white" }} />} Set Up Reminders <Icon name="Check" size={13} />
            </button>
          )}
        </div>
      </Modal>
      {showPreview && <EmailPreviewModal templateId={selectedTemplate?.id} reminderType={whatRemind} providerId={whoSend[0]} onClose={() => setShowPreview(false)} />}
    </>
  );
}

/** Highlights {{variables}} the way the prototype does (blue mono chips). */
function SubjectWithVars({ subject }: { subject: string }) {
  const parts = subject.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\{\{[^}]+\}\}$/.test(p) ? (
          <span key={i} className="font-mono px-1 rounded" style={{ background: "#dbeafe" }}>{p.slice(2, -2).trim()}</span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}
