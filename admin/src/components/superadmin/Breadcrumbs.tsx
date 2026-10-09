"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Icon } from "@/components/Icon";

/** "Organizations › Precision Health" — the last item is the current page. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-light mb-3 flex-wrap">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <Icon name="ChevronRight" size={12} className="text-ink-faint" />}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">{it.label}</Link>
          ) : (
            <span className="text-ink font-medium truncate" style={{ maxWidth: 320 }}>{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
