// Next.js instrumentation hook — runs once per server cold start (Node.js runtime only).
// Triggers the DB schema auto-migration so ap_entries (and other tables) exist
// before any request handler runs, eliminating "relation does not exist" errors.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDB } = await import("@/lib/db");
    await initDB();
  }
}
