"use client";

import { useState } from "react";
import { AccessDenied } from "@/components/AlertBox";
import { ConfirmDialog } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useShell } from "@/stores/shell";
import { ROLE_LABEL } from "@/lib/constants";
import { JsonDataCard } from "./JsonDataCard";
import type { TestDataCounts, TestDataResult } from "@/types/admin";

const fmtCounts = (c: TestDataCounts) =>
  (c.clients ? c.clients + " clients · " : "") +
  (c.practices ? c.practices + " practices · " : "") +
  c.providers + " providers · " + c.enrollments + " enrollments · " + c.locations + " locations · " + c.users + " users · " + c.tasks + " tasks";
const total = (c: TestDataCounts) => c.providers + c.enrollments + c.locations + c.users + c.tasks + (c.clients || 0) + (c.practices || 0);

export function TestDataGenerator() {
  const authUser = useUser();
  const toast = useToast();
  const { publish } = useShell();
  const allowed = authUser.role === "platform_admin" || authUser.role === "org_admin";
  const summary = useAsync<TestDataCounts>(allowed ? () => api.get<TestDataCounts>("/admin/test-data/summary") : null, [allowed]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<TestDataResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState<TestDataCounts | null>(null);

  if (!allowed) return <AccessDenied action="generate" entity="test data" role={ROLE_LABEL[authUser.role] || authUser.role} />;

  const notifyAll = () => {
    publish("providers");
    publish("enrollments");
    publish("tasks");
  };

  const generateTestData = async () => {
    setGenerating(true);
    setDeleted(null);
    try {
      const res = await api.post<TestDataResult>("/admin/test-data");
      setResult(res);
      summary.setData(res.totals);
      notifyAll();
      toast("Test data generated · " + res.created.providers + " providers, " + res.created.enrollments + " enrollments");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setGenerating(false);
    }
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      const res = await api.delete<TestDataCounts>("/admin/test-data");
      setDeleted(res);
      setResult(null);
      setConfirmDelete(false);
      summary.reload();
      notifyAll();
      toast("Test data deleted · " + res.providers + " providers, " + res.enrollments + " enrollments");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleting(false);
    }
  };

  const current = summary.data;

  return (
    <div>
      <PageHeader title="Test Data Generator" subtitle="Load realistic sample data for demos and testing" />

      <div className="card card-pad mb-4" style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}>
        <div className="flex items-start gap-3">
          <Icon name="AlertTriangle" size={18} style={{ color: "#a16207" }} className="flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <strong>Important:</strong> Generating test data will <strong>merge</strong> with your current data. Providers, enrollments, locations, users and tasks are appended. This action is
            useful for demos but should not be used in production.
          </div>
        </div>
      </div>

      <div className="card card-pad mb-4">
        <h3 className="font-semibold text-sm text-ink mb-3">What gets generated</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Providers", count: "15", icon: "Users", desc: "Across 8 specialties" },
            { label: "Enrollments", count: "~60", icon: "ClipboardList", desc: "All 8 payers × many providers" },
            { label: "Locations", count: "5", icon: "Building2", desc: "Mix of primary and satellite" },
            { label: "Users", count: "7", icon: "UserCheck", desc: "Various roles" },
            { label: "Tasks", count: "20", icon: "CheckSquare", desc: "Various statuses" },
          ].map((item) => (
            <div key={item.label} className="card card-pad text-center">
              <Icon name={item.icon} size={20} className="mx-auto text-accent mb-1" />
              <div className="font-display text-2xl font-bold text-ink">{item.count}</div>
              <div className="text-xs font-semibold text-ink">{item.label}</div>
              <div className="text-[10px] text-ink-light mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <JsonDataCard
        onImported={(res) => {
          summary.setData(res.totals);
          setResult(null);
          setDeleted(null);
          notifyAll();
        }}
      />

      <div className="card card-pad text-center">
        <button onClick={generateTestData} disabled={generating || deleting} className="btn btn-primary" style={{ padding: "12px 24px", fontSize: 14 }}>
          {generating ? (
            <>
              <span className="loader" style={{ borderTopColor: "white" }}></span> Generating...
            </>
          ) : (
            <>
              <Icon name="Sparkles" size={14} /> Generate Test Data
            </>
          )}
        </button>
        {result && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--success-soft)" }}>
            <div className="text-sm font-semibold mb-2" style={{ color: "#059669" }}>
              <Icon name="Check" size={13} className="inline mr-1" /> Done
            </div>
            <div className="text-xs text-ink">Added {fmtCounts(result.created)}</div>
            {result.testUserPassword && (
              <div className="text-[11px] text-ink-light mt-1">
                Test user logins share the password <span className="font-mono bg-paper px-1.5 py-0.5 rounded">{result.testUserPassword}</span>
              </div>
            )}
          </div>
        )}
        {deleted && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--info-soft)" }}>
            <div className="text-xs text-ink">Removed {fmtCounts(deleted)}</div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-3 flex-wrap text-left">
          <div className="text-xs text-ink-light">
            {summary.error ? (
              <span style={{ color: "#b91c1c" }}>
                Could not load the test data summary: {summary.error}{" "}
                <button className="text-accent hover:underline" onClick={summary.reload}>Retry</button>
              </span>
            ) : !current ? (
              "Loading current test data…"
            ) : total(current) === 0 ? (
              "No test data in this organization."
            ) : (
              <>
                <span className="font-semibold text-ink">Test data in this organization:</span> {fmtCounts(current)}
              </>
            )}
          </div>
          <button onClick={() => setConfirmDelete(true)} disabled={!current || total(current) === 0 || generating || deleting} className="btn btn-danger">
            <Icon name="Trash2" size={13} /> Delete All Test Data
          </button>
        </div>
      </div>

      {confirmDelete && current && (
        <ConfirmDialog
          title="Delete all test data"
          message={"Delete all generated test data (" + fmtCounts(current) + ")? Real data is not touched. This cannot be undone."}
          confirmLabel="Delete All"
          busy={deleting}
          onConfirm={deleteAll}
          onClose={() => !deleting && setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
