"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** A Master Data dropdown option: value = what is stored, label = what is shown. */
export interface MasterOption {
  value: string;
  label: string;
}

export type MasterListKey = "specialty" | "suffix" | "payer_category" | "location_type" | "org_type" | "document_type";

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

/** The option list with a stored value that is no longer in the list kept at the top (so it still shows). */
export function withCurrent(options: MasterOption[], current: string | null | undefined): MasterOption[] {
  if (!current || options.some((o) => o.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}
