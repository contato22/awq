import Header from "@/components/Header";
import AgentsPanel from "@/components/AgentsPanel";

export default function AgentsPage() {
  return (
    <>
      <Header
        title="Agents"
        subtitle="Agentes autônomos por BU + AWQ Master Agent para gestão de portfolio"
      />
      <div className="page-content">
        <AgentsPanel />
      </div>
    </>
  );
}
