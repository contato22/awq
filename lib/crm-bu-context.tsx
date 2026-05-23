"use client";
import { createContext, useContext } from "react";

const CrmBuContext = createContext<string | null>(null);

export { CrmBuContext };

export function useCrmBuContext(): string | null {
  return useContext(CrmBuContext);
}

export function BuCrmProvider({ bu, children }: { bu: string; children: React.ReactNode }) {
  return <CrmBuContext.Provider value={bu}>{children}</CrmBuContext.Provider>;
}
