import dynamic from "next/dynamic";

const InstanceDetailClient = dynamic(() => import("./InstanceDetailClient"), { ssr: false });

// Static export: one placeholder keeps the build happy.
// Real instance IDs are loaded client-side via the BPM API (Vercel only).
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function InstanceDetailPage() {
  return <InstanceDetailClient />;
}
