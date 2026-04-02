import { redirect } from "next/navigation";

// Migrated to /jacqes/categorias — kept for backward compatibility
export default function CategoriasRedirect() {
  redirect("/jacqes/categorias");
}
