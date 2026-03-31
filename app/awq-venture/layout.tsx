import VentureTabNav from "./VentureTabNav";

export default function AwqVentureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#f0f2f5] font-sans">
      <VentureTabNav />
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}
