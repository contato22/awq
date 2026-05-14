export async function register() {
  // Only run on the server, only on Vercel/SSR (not static export)
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PUBLIC_STATIC_DATA === "1"
  ) {
    return;
  }

  const url = process.env.NEXT_PUBLIC_GRC_SUPABASE_URL;
  const key = process.env.GRC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const { runGrcMigration } = await import("./app/api/grc/setup/route");
    const result = await runGrcMigration();
    if (result.ok) {
      console.log("[GRC] Schema provisionado com sucesso");
    } else {
      console.warn("[GRC] Migração automática falhou:", result.detail);
    }
  } catch (e) {
    console.warn("[GRC] Erro na migração automática:", e);
  }
}
