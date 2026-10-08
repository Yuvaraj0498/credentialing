"use client";

import { useUser } from "@/stores/auth";

/** CAQH permissions: writers = platform_admin | org_admin | clerk; config/delete = org_admin | platform_admin. */
export function useCaqhPerms() {
  const { role } = useUser();
  const isAdmin = role === "platform_admin" || role === "org_admin";
  const isWriter = isAdmin || role === "clerk";
  return { role, isAdmin, isWriter };
}
