/**
 * seed-epm-planning.ts
 *
 * Cria as tabelas EPM no Supabase (quando DATABASE_URL disponível) e popula
 * com os dados estáticos via Supabase JS client.
 *
 * Uso (com DATABASE_URL para criação de tabelas + seed via JS client):
 *   SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." \
 *   DATABASE_URL="postgresql://..." \
 *   npx tsx scripts/seed-epm-planning.ts
 *
 * Uso (somente seed via JS client — tabelas já existem):
 *   SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." \
 *   npx tsx scripts/seed-epm-planning.ts
 *
 * Ou adicione as variáveis no .env.local e rode:
 *   npm run seed:epm
 */

import { initEPMPlanningDB } from "../lib/db";
import { seedAllEPMPlanningData } from "../lib/epm-planning-db";
import { USE_SUPABASE } from "../lib/supabase";

if (!USE_SUPABASE) {
  console.error("❌  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY não definidos.");
  console.error("    Configure .env.local ou passe via variável de ambiente.");
  process.exit(1);
}

if (process.env.DATABASE_URL) {
  console.log("🔧  Criando tabelas EPM via SQL direto (idempotente)...");
  await initEPMPlanningDB();
} else {
  console.log("ℹ️   DATABASE_URL não definida — pulando criação de tabelas via SQL.");
  console.log("    (As tabelas devem já existir no Supabase.)");
}

console.log("🌱  Populando dados EPM via Supabase JS client...");
const result = await seedAllEPMPlanningData();

console.log("✅  Seed concluído. Tabelas populadas:");
result.seeded.forEach((t) => console.log(`    • ${t}`));

process.exit(0);
