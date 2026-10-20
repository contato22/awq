import OfficeSimulator from "@/components/office/OfficeSimulator";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

// O mundo ocupa a janela inteira (sem cabeçalho nem rolagem de página): o painel entra no jogo.
export default function OfficePage() {
  return <OfficeSimulator />;
}
