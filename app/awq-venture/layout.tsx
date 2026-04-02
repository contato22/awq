import VentureTabNav from "./VentureTabNav";

export default function AwqVentureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50 font-sans">
      <VentureTabNav />
      <div className="page-container">
        {children}
      </div>
    </div>
  );
}
