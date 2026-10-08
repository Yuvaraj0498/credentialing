"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { Pill } from "@/components/Pill";
import { api } from "@/lib/api";
import { fmtTs } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import type { PageResponse } from "@/types";
import type { EmailLogItem } from "@/types/email";

const STATUS_PILL: Record<EmailLogItem["status"], string> = { queued: "info", sent: "success", failed: "danger", bounced: "warn" };

/** Email history for one provider (GET /email/log?providerId=). */
export function EmailHistoryModal({ providerId, name, onClose }: { providerId: number; name: string; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const size = 10;
  const { data, loading, error, reload } = useAsync(() => api.get<PageResponse<EmailLogItem>>("/email/log", { providerId, page, size }), [providerId, page]);

  return (
    <Modal title="Email History" subtitle={name} onClose={onClose} maxWidth={680}>
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {!data || data.content.length === 0 ? (
          <EmptyState icon="Mail" title="No emails sent yet" description="Reminder emails for this provider will appear here." />
        ) : (
          <div className="card overflow-hidden">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sent</th>
                    <th>Subject</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((l) => (
                    <tr key={l.id}>
                      <td className="text-ink-light text-xs whitespace-nowrap">{fmtTs(l.createdAt)}</td>
                      <td className="text-xs text-ink">{l.subject}</td>
                      <td className="text-ink-light text-xs">{l.toEmail}</td>
                      <td><Pill type={STATUS_PILL[l.status] || "neutral"}>{l.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onChange={setPage} />
          </div>
        )}
      </AsyncBoundary>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn btn-secondary">Close</button>
      </div>
    </Modal>
  );
}
