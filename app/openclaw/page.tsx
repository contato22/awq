import OpenClaw from "@/components/OpenClaw";
import Header from "@/components/Header";

export default function OpenClawPage() {
  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <Header
        title="OpenClaw"
        subtitle="AI-powered business intelligence assistant — ask anything about your data"
      />
      <div className="flex-1 px-8 py-4" style={{ minHeight: 0 }}>
        <div className="h-full max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          <OpenClaw />
        </div>
      </div>
    </div>
  );
}
