import Header from "@/components/Header";
import OfficeSimulator from "@/components/office/OfficeSimulator";

export const dynamic = "force-dynamic";

export default function OfficePage() {
  return (
    <>
      <Header
        title="Office · Simulador de Squad"
        subtitle="Teste interno da squad de social media: ciclo editorial, aprovação do gestor e análise das respostas"
      />
      <div className="px-8 py-6">
        <OfficeSimulator />
      </div>
    </>
  );
}
