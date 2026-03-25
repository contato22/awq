import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import OpenClawWidget from "@/components/OpenClawWidget";

export const metadata: Metadata = {
  title: "JACQES BI — Business Intelligence Dashboard",
  description:
    "Business Intelligence dashboard for JACQES, a portfolio company of AWQ Group.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <OpenClawWidget />
          </div>
        </div>
      </body>
    </html>
  );
}
