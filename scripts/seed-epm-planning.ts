/**
 * seed-epm-planning.ts
 *
 * Cria as tabelas EPM no Supabase e popula com os dados estáticos atuais.
 *
 * Uso:
 *   DATABASE_URL="postgresql://postgres:[SENHA]@db.gqkgsoglgubmaborixfb.supabase.co:5432/postgres" \
 *   npx tsx scripts/seed-epm-planning.ts
 *
 * Ou adicione DATABASE_URL no .env.local e rode:
 *   npm run seed:epm
 */

import { initEPMPlanningDB, seedAllEPMPlanningData } from "../lib/epm-planning-db";

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida. Configure .env.local ou passe via variável de ambiente.");
  process.exit(1);
}

console.log("🔧  Criando tabelas EPM (idempotente)...");
await initEPMPlanningDB();

console.log("🌱  Populando dados EPM...");
const result = await seedAllEPMPlanningData();

console.log("✅  Seed concluído. Tabelas populadas:");
result.seeded.forEach((t) => console.log(`    • ${t}`));

process.exit(0);
