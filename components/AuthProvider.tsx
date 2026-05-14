"use client";

// Supabase SSR handles session management via cookies — no client-side
// provider wrapper is required.  This component is kept as a passthrough
// so the import in app/layout.tsx stays unchanged.
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
