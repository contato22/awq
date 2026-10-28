import Header from "@/components/Header";
import FernandoChat from "@/components/FernandoChat";

export default function FernandoPage() {
  return (
    <>
      <Header title="Fernando" subtitle="COO e Chief AI Officer da AWQ: conversa direta, só recomenda" />
      <div className="px-8 py-6">
        <FernandoChat />
      </div>
    </>
  );
}
