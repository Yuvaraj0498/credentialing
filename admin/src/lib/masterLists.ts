"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** A Master Data dropdown option: value = what is stored, label = what is shown. */
export interface MasterOption {
  value: string;
  label: string;
}

export type MasterListKey = "specialty" | "suffix" | "payer_category" | "location_type" | "org_type" | "document_type" | "state" | "city";

const cache = new Map<string, Promise<MasterOption[]>>();

/**
 * Options of a Master Data list. Signed-in pages read /master-lists/{key}; public pages (sign-up, secure link)
 * read /public/master-lists/{key} (with the link token, so the organization's own items are included).
 */
export function loadMasterList(key: MasterListKey, opts?: { publicToken?: string | null; isPublic?: boolean }): Promise<MasterOption[]> {
  const pub = opts?.isPublic || opts?.publicToken != null;
  const id = (pub ? "p:" + (opts?.publicToken || "") + ":" : "") + key;
  let p = cache.get(id);
  if (!p) {
    p = (pub
      ? api.get<MasterOption[]>("/public/master-lists/" + key, opts?.publicToken ? { token: opts.publicToken } : undefined)
      : api.get<MasterOption[]>("/master-lists/" + key)
    ).catch((e) => {
      cache.delete(id);
      throw e;
    });
    cache.set(id, p);
  }
  return p;
}

/** Master Data changed: the next dropdown loads the list again. */
export function invalidateMasterList(key?: MasterListKey) {
  for (const id of [...cache.keys()]) if (!key || id === key || id.endsWith(":" + key)) cache.delete(id);
  if (!key || key === "city") cityCache.clear();
}

/** The options of a list (empty while loading or when the list can't be read). */
export function useMasterList(key: MasterListKey, opts?: { publicToken?: string | null; isPublic?: boolean }): MasterOption[] {
  const [items, setItems] = useState<MasterOption[]>([]);
  const token = opts?.publicToken ?? null;
  const isPublic = !!opts?.isPublic;
  useEffect(() => {
    let alive = true;
    loadMasterList(key, { publicToken: token, isPublic })
      .then((list) => alive && setItems(list))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [key, token, isPublic]);
  return items;
}

const cityCache = new Map<string, Promise<MasterOption[]>>();

/** The cities of a state (Master Data → City). */
export function loadCities(state: string, opts?: { publicToken?: string | null; isPublic?: boolean }): Promise<MasterOption[]> {
  const pub = opts?.isPublic || opts?.publicToken != null;
  const id = (pub ? "p:" + (opts?.publicToken || "") + ":" : "") + state;
  let p = cityCache.get(id);
  if (!p) {
    const q: Record<string, string> = { state };
    if (opts?.publicToken) q.token = opts.publicToken;
    p = (pub ? api.get<MasterOption[]>("/public/master-lists/city", q) : api.get<MasterOption[]>("/master-lists/city", q)).catch((e) => {
      cityCache.delete(id);
      throw e;
    });
    cityCache.set(id, p);
  }
  return p;
}

/** The cities of the chosen state (empty until a state is chosen). */
export function useCities(state: string | null | undefined, opts?: { publicToken?: string | null; isPublic?: boolean }): MasterOption[] {
  const [loaded, setLoaded] = useState<{ state: string; items: MasterOption[] }>({ state: "", items: [] });
  const token = opts?.publicToken ?? null;
  const isPublic = !!opts?.isPublic;
  useEffect(() => {
    if (!state) return;
    let alive = true;
    loadCities(state, { publicToken: token, isPublic })
      .then((items) => alive && setLoaded({ state, items }))
      .catch(() => alive && setLoaded({ state, items: [] }));
    return () => {
      alive = false;
    };
  }, [state, token, isPublic]);
  return state && loaded.state === state ? loaded.items : [];
}

/** The option list with a stored value that is no longer in the list kept at the top (so it still shows). */
export function withCurrent(options: MasterOption[], current: string | null | undefined): MasterOption[] {
  if (!current || options.some((o) => o.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}
