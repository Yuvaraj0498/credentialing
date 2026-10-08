"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Counters } from "@/types";

type Topic = "tasks" | "notifications" | "providers" | "enrollments" | "invoices" | "chat";

interface ShellState {
  counters: Counters;
  refreshCounters: () => void;
  openCreateTask: (providerId?: number) => void;
  /** Tell other mounted pages that data of a topic changed (e.g. a task was created from the sidebar). */
  publish: (topic: Topic) => void;
  subscribe: (topic: Topic, fn: () => void) => () => void;
}

const ShellContext = createContext<ShellState | null>(null);

const EMPTY: Counters = { openTasks: 0, unreadNotifications: 0, outstandingInvoices: 0, unreadChat: 0 };

export function ShellProvider({ children, onOpenCreateTask }: { children: React.ReactNode; onOpenCreateTask: (providerId?: number) => void }) {
  const [counters, setCounters] = useState<Counters>(EMPTY);
  const listeners = useRef(new Map<Topic, Set<() => void>>());

  const refreshCounters = useCallback(() => {
    api.get<Counters>("/me/counters").then(setCounters).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCounters();
    const t = setInterval(refreshCounters, 30000);
    return () => clearInterval(t);
  }, [refreshCounters]);

  const publish = useCallback(
    (topic: Topic) => {
      listeners.current.get(topic)?.forEach((fn) => fn());
      refreshCounters();
    },
    [refreshCounters]
  );

  const subscribe = useCallback((topic: Topic, fn: () => void) => {
    if (!listeners.current.has(topic)) listeners.current.set(topic, new Set());
    listeners.current.get(topic)!.add(fn);
    return () => listeners.current.get(topic)?.delete(fn);
  }, []);

  return (
    <ShellContext.Provider value={{ counters, refreshCounters, openCreateTask: onOpenCreateTask, publish, subscribe }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside the app shell");
  return ctx;
}

/** Re-run `fn` whenever another component publishes `topic`. */
export function useTopic(topic: Topic, fn: () => void) {
  const { subscribe } = useShell();
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => subscribe(topic, () => ref.current()), [subscribe, topic]);
}
