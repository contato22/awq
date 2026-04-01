"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import SupervisorWidget from "./SupervisorWidget";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <SupervisorWidget />
      </div>
    </div>
  );
}
