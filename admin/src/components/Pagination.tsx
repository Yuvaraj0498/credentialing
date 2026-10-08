"use client";

import { Icon } from "./Icon";

export function Pagination({ page, totalPages, totalElements, size, onChange }: { page: number; totalPages: number; totalElements: number; size: number; onChange: (page: number) => void }) {
  if (totalElements === 0) return null;
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-ink-light">
      <span>
        Showing {from}–{to} of {totalElements}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn btn-secondary" style={{ padding: "4px 8px" }} disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <Icon name="ChevronLeft" size={13} />
        </button>
        <span className="px-2">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <button className="btn btn-secondary" style={{ padding: "4px 8px" }} disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Next page">
          <Icon name="ChevronRight" size={13} />
        </button>
      </div>
    </div>
  );
}
