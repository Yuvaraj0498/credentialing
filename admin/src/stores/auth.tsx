"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, refreshAccessToken, setAccessToken, setOnAuthLost, setSelectedOrgId } from "@/lib/api";
import type { AuthResponse, Me, PermAction, PermEntity } from "@/types";

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<Me>;
  completeAuth: (res: AuthResponse) => Me;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  /** Mirrors the prototype's can(action, entity) using the permission matrix returned by /auth/me. */
  can: (action: PermAction, entity: PermEntity) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const me = await api.get<Me>("/auth/me");
    setUser(me);
  }, []);

  // Restore the session from the refresh-token cookie on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await refreshAccessToken()) {
          const me = await api.get<Me>("/auth/me");
          if (!cancelled) setUser(me);
        }
      } catch {
        /* not signed in */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    setOnAuthLost(() => {
      setAccessToken(null);
      setUser(null);
    });
    return () => {
      cancelled = true;
      setOnAuthLost(null);
    };
  }, []);

  const completeAuth = useCallback((res: AuthResponse) => {
    setAccessToken(res.accessToken);
    if (res.user.role !== "platform_admin") setSelectedOrgId(null);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { username, password });
      return completeAuth(res);
    },
    [completeAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setSelectedOrgId(null);
    setUser(null);
  }, []);

  const can = useCallback(
    (action: PermAction, entity: PermEntity) => {
      if (!user) return false;
      if (user.role === "platform_admin") return true;
      return (user.permissions?.[entity] || []).includes(action);
    },
    [user]
  );

  const value = useMemo(() => ({ user, loading, login, completeAuth, logout, reload, can }), [user, loading, login, completeAuth, logout, reload, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Non-null user for pages rendered inside the authenticated shell. */
export function useUser(): Me {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called without a signed-in user");
  return user;
}

export const isStaff = (u: Me | null) => !!u && u.role !== "provider";
export const isOrgAdmin = (u: Me | null) => !!u && (u.role === "org_admin" || u.role === "platform_admin");
