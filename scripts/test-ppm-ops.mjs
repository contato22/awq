// Quick operational test for PPM data layer
// Run: node scripts/test-ppm-ops.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const key = process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNTkwMywiZXhwIjoyMDk0MjAxOTAzfQ.oxSM8vzwytxaHF7ZSh5iMEut9By11_oQnfNW7ntiE8A";

const sb = createClient(url, key);

async function run() {
  console.log("=== PPM Operational Test ===\n");

  // 1. Connectivity
  console.log("1. Testing Supabase connectivity...");
  const { data: ping, error: pingErr } = await sb.from("ppm_projects").select("*", { count: "exact", head: true });
  if (pingErr) {
    console.error(`   ❌ FAILED: ${pingErr.message}\n   Code: ${pingErr.code}`);
    if (pingErr.message.includes("not_allowed") || pingErr.code === "42P01") {
      console.log("\n   ► TABLE MISSING: Run scripts/supabase-ppm-schema.sql in Supabase SQL editor");
      console.log("   ► NETWORK BLOCKED: Add this server IP to Supabase allowlist:");
      const ip = await fetch("https://checkip.amazonaws.com").then(r => r.text()).catch(() => "unknown");
      console.log(`     IP: ${ip.trim()}`);
    }
    process.exit(1);
  }
  console.log("   ✅ Connected to Supabase");

  // 2. Read projects
  console.log("2. Reading ppm_projects...");
  const { data: projects, error: readErr } = await sb.from("ppm_projects").select("project_id,project_name,status").order("created_at");
  if (readErr) { console.error("   ❌ READ failed:", readErr.message); process.exit(1); }
  console.log(`   ✅ Found ${projects.length} projects`);
  projects.forEach(p => console.log(`      [${p.status}] ${p.project_name}`));

  // 3. Write test (create + delete ephemeral project)
  console.log("\n3. Testing WRITE (insert + delete)...");
  const testId = "test-" + randomUUID().slice(0, 8);
  const { error: insErr } = await sb.from("ppm_projects").insert({
    project_id:       testId,
    project_code:     "TEST-0000",
    project_name:     "__OPERACIONAL_TEST__",
    bu_code:          "AWQ",
    project_type:     "internal",
    contract_type:    "fixed_price",
    start_date:       "2026-01-01",
    planned_end_date: "2026-12-31",
    budget_cost:      0,
    actual_cost:      0,
    budget_revenue:   0,
    actual_revenue:   0,
    actual_hours:     0,
    phase:            "initiation",
    status:           "active",
    health_status:    "green",
    priority:         "low",
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  });
  if (insErr) { console.error("   ❌ INSERT failed:", insErr.message); process.exit(1); }
  console.log("   ✅ INSERT OK");

  const { error: delErr } = await sb.from("ppm_projects").delete().eq("project_id", testId);
  if (delErr) { console.error("   ❌ DELETE failed:", delErr.message); process.exit(1); }
  console.log("   ✅ DELETE OK");

  // 4. Read tasks
  console.log("\n4. Reading ppm_tasks...");
  const { data: tasks, error: taskErr } = await sb.from("ppm_tasks").select("task_id,task_name,status");
  if (taskErr) { console.error("   ❌ READ failed:", taskErr.message); process.exit(1); }
  console.log(`   ✅ Found ${tasks.length} tasks`);

  // 5. Read time entries
  console.log("\n5. Reading ppm_time_entries...");
  const { data: entries, error: teErr } = await sb.from("ppm_time_entries").select("entry_id,hours,status");
  if (teErr) { console.error("   ❌ READ failed:", teErr.message); process.exit(1); }
  console.log(`   ✅ Found ${entries.length} time entries`);

  console.log("\n=== ALL TESTS PASSED ✅ ===\nSupabase read/write operacional 100%.");
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
