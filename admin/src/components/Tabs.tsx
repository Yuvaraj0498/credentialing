"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";

/** Prototype-style tab strip (.tabs/.tab). */
export function Tabs<T extends string>({ tabs, value, onChange, className = "" }: { tabs: { id: T; label: ReactNode; icon?: string }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div className={"tabs " + className}>
      {tabs.map((t) => (
        <div key={t.id} className={"tab flex items-center justify-center gap-1.5 " + (value === t.id ? "active" : "")} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={13} />}
          {t.label}
        </div>
      ))}
    </div>
  );
}
