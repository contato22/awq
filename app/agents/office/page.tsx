import OfficeSimulator from "@/components/office/OfficeSimulator";

export const dynamic = "force-dynamic";

// O mundo ocupa a janela inteira (sem cabeçalho nem rolagem de página): o painel entra no jogo.
export default function OfficePage() {
  return <OfficeSimulator />;
}
