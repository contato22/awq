"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileNavDrawer from "./MobileNavDrawer";
import BottomNavigation from "./BottomNavigation";
import OpenClawWidget from "./OpenClawWidget";
import SupervisorWidget from "./SupervisorWidget";

export default function LayoutShell({ children }: { children?: React.ReactNode; [extra: string]: unknown }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar — hidden below lg */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header — visible below lg */}
        <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>

        <OpenClawWidget />
        <SupervisorWidget />
      </div>

      {/* Mobile Nav Drawer — slide-out overlay below lg */}
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Bottom Navigation — visible below lg */}
      <BottomNavigation />
    </div>
  );
}
