import Header from "@/components/Header";
import { Tag, Plus, FolderOpen } from "lucide-react";

export default function CategoriasPage() {
  return (
    <>
      <Header title="Categorias" subtitle="Gestão de categorias — JACQES" />
      <div className="px-8 py-6">
        <div className="card p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Tag size={14} />
            <span>Nenhuma categoria cadastrada</span>
          </div>
          <button className="btn-primary flex items-center gap-2 text-xs">
            <Plus size={13} />
            Nova Categoria
          </button>
        </div>
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-5">
            <FolderOpen size={28} className="text-gray-400" />
          </div>
          <div className="text-base font-semibold text-gray-900 mb-1">Nenhuma categoria ainda</div>
          <div className="text-sm text-gray-400 mb-6 max-w-xs">
            Crie categorias para organizar ativos, clientes ou projetos do JACQES.
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Criar primeira categoria
          </button>
        </div>
      </div>
    </>
  );
}
