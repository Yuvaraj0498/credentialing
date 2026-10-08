"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./Icon";

export interface Crumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; breadcrumb?: Crumb[] }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="flex items-center gap-1 text-xs text-ink-light mb-2">
          {breadcrumb.map((b, i) => (
            <Fragment key={i}>
              {i > 0 && <Icon name="ChevronRight" size={12} className="text-ink-faint" />}
              {b.href ? (
                <Link href={b.href} className="hover:text-ink">{b.label}</Link>
              ) : b.onClick ? (
                <button onClick={b.onClick} className="hover:text-ink">{b.label}</button>
              ) : (
                <span className={i === breadcrumb.length - 1 ? "text-ink font-medium" : ""}>{b.label}</span>
              )}
            </Fragment>
          ))}
        </div>
      )}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-light mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
