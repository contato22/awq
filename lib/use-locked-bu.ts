"use client";

import { useSession } from "next-auth/react";

const ROLE_BU_LOCK: Record<string, string> = {
  caza: "CAZA",
};

/**
 * Returns the BU this user is locked to (e.g. "ENRD"), or null for unrestricted roles.
 * Use to pre-set and lock BU filters so scoped users only see their own data.
 */
export function useLockedBU(): string | null {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  return ROLE_BU_LOCK[role] ?? null;
}
