"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";

export function EmptyState({ icon = "Inbox", title, description, action }: { icon?: string; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-soft-2 mb-3">
        <Icon name={icon} size={24} className="text-ink-faint" />
      </div>
      <div className="font-display font-semibold text-ink">{title}</div>
      {description && <div className="text-sm text-ink-light mt-1 max-w-md mx-auto">{description}</div>}
      {action}
    </div>
  );
}
