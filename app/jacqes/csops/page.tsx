import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { HeartPulse } from "lucide-react";

export default function CsOpsPage() {
  return (
    <>
      <Header title="CS Ops" subtitle="Customer Success Operations — JACQES" />
      <EmptyState
        icon={<HeartPulse size={20} className="text-gray-400" />}
        title="CS Ops"
        description="Em construção — em breve"
        className="h-[60vh]"
      />
    </>
  );
}
