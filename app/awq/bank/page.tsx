// Server component wrapper — allows force-dynamic to take effect.
// All client logic lives in BankPageClient.tsx.
export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";
export { default } from "./BankPageClient";
