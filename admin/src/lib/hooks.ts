"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Loads data with loading/error state. `deps` re-run the loader (e.g. filters).
 * Pass `null` as the loader to skip loading (e.g. until an id is known).
 */
export function useAsync<T>(loader: (() => Promise<T>) | null, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(!!loader);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  });
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const fn = loaderRef.current;
    if (!fn) {
      setLoading(false);
      return;
    }
    const mySeq = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mySeq === seq.current) setDataState(result);
    } catch (e) {
      if (mySeq === seq.current) setError(errorMessage(e));
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return { data, loading, error, reload, setData };
}

/** Debounces a value (search boxes). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Runs an async action with a busy flag; returns [run, busy]. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>): [(...args: A) => Promise<R>, boolean] {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (...args: A) => {
      setBusy(true);
      try {
        return await fn(...args);
      } finally {
        setBusy(false);
      }
    },
    [fn]
  );
  return [run, busy];
}
