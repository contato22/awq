import dynamic from "next/dynamic";

const TaskDetailClient = dynamic(() => import("./TaskDetailClient"), { ssr: false });

// Static export: one placeholder keeps the build happy.
// Real task IDs are loaded client-side via the BPM API (Vercel only).
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ApproveTaskPage() {
  return <TaskDetailClient />;
}
