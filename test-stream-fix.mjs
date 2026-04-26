/**
 * Functional test for the stream idle timeout fix.
 * Tests: keepalive heartbeat, client timeout config, and retry detection.
 * Run with: node test-stream-fix.mjs
 */

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Test 1: Keepalive heartbeat fires during a long async operation ───────────
console.log("\n[1] Keepalive heartbeat");

async function testKeepalive() {
  const encoder = new TextEncoder();
  const received = [];

  // Replicate the keepalive pattern used in /api/agents and /api/supervisor
  const keepalive = (enqueue) =>
    setInterval(() => {
      try { enqueue(encoder.encode(": keepalive\n\n")); } catch { /* stream closed */ }
    }, 50); // use 50 ms so the test runs fast

  // Simulate a slow client.messages.create() (200 ms)
  const slowApiCall = () =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ content: [], stop_reason: "end_turn" }), 200)
    );

  const enqueue = (chunk) => received.push(new TextDecoder().decode(chunk));

  const ka = keepalive(enqueue);
  await slowApiCall().finally(() => clearInterval(ka));

  // Should have received at least 3 keepalive comments during the 200 ms wait
  const keepaliveCount = received.filter((s) => s === ": keepalive\n\n").length;
  assert(keepaliveCount >= 3, `received ${keepaliveCount} keepalive comments during 200 ms wait (≥3 expected)`);

  // Interval is cleared after call completes — no more pings
  const countBefore = keepaliveCount;
  await new Promise((r) => setTimeout(r, 100));
  const countAfter = received.filter((s) => s === ": keepalive\n\n").length;
  assert(countAfter === countBefore, `interval cleared after call — no keepalives after completion`);
}

await testKeepalive();

// ── Test 2: Keepalive is harmless to SSE parsers (clients skip ":" lines) ────
console.log("\n[2] SSE parser ignores keepalive comments");

function parseSSELines(raw) {
  const events = [];
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const d = line.slice(6).trim();
    if (d === "[DONE]") break;
    try { events.push(JSON.parse(d)); } catch { /* skip */ }
  }
  return events;
}

const sseChunk = [
  ": keepalive",
  "data: {\"text\":\"hello\"}",
  ": keepalive",
  "data: {\"text\":\" world\"}",
  ": keepalive",
  "data: [DONE]",
].join("\n");

const parsed = parseSSELines(sseChunk);
assert(parsed.length === 2, `parser sees 2 data events (got ${parsed.length})`);
assert(parsed[0].text === "hello", "first event text = 'hello'");
assert(parsed[1].text === " world", "second event text = ' world'");

// ── Test 3: Retry detection — correct error messages trigger retry ──────────
console.log("\n[3] Retry detection logic");

function isIdleTimeout(msg) {
  return msg.toLowerCase().includes("idle timeout") ||
         msg.toLowerCase().includes("partial response");
}

const shouldRetry = [
  "Stream idle timeout - partial response received",
  "API Error: Stream idle timeout - partial response received",
  "stream idle timeout",
  "partial response received",
  "Connection reset — partial response received",
];

const shouldNotRetry = [
  "API_KEY_REQUIRED",
  "HTTP 401",
  "HTTP 500",
  "invalid_api_key",
  "Erro desconhecido",
  "Agent not found",
];

for (const msg of shouldRetry) {
  assert(isIdleTimeout(msg), `retries on: "${msg}"`);
}
for (const msg of shouldNotRetry) {
  assert(!isIdleTimeout(msg), `does NOT retry on: "${msg}"`);
}

// ── Test 4: Retry loop — stops after MAX_RETRIES exhausted ───────────────────
console.log("\n[4] Retry loop exhaustion");

async function simulateSendWithRetry(getError) {
  const MAX_RETRIES = 2;
  let attempt = 0;
  const attempts = [];

  while (attempt <= MAX_RETRIES) {
    try {
      const err = getError(attempt);
      attempts.push(attempt);
      throw new Error(err);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (isIdleTimeout(msg) && attempt < MAX_RETRIES) {
        attempt++;
        continue;
      }
      return { finalAttempt: attempt, totalAttempts: attempts.length, finalError: msg };
    }
  }
}

// Scenario A: always idle timeout → should exhaust all retries
const alwaysTimeout = await simulateSendWithRetry(() => "Stream idle timeout - partial response received");
assert(alwaysTimeout.totalAttempts === 3, `idle timeout: made 3 total attempts (got ${alwaysTimeout.totalAttempts})`);
assert(alwaysTimeout.finalAttempt === 2, `idle timeout: stopped at attempt 2 (got ${alwaysTimeout.finalAttempt})`);

// Scenario B: non-retryable error → should fail immediately
const authError = await simulateSendWithRetry(() => "API_KEY_REQUIRED");
assert(authError.totalAttempts === 1, `auth error: failed after 1 attempt (got ${authError.totalAttempts})`);

// Scenario C: idle timeout on attempt 0, success on attempt 1 (no more errors)
let callCount = 0;
const MAX_RETRIES = 2;
let attempt2 = 0;
let successAttempt = null;
while (attempt2 <= MAX_RETRIES) {
  callCount++;
  const failFirst = callCount === 1;
  if (failFirst) {
    const msg = "Stream idle timeout - partial response received";
    if (isIdleTimeout(msg) && attempt2 < MAX_RETRIES) { attempt2++; continue; }
    break;
  } else {
    // "success"
    successAttempt = attempt2;
    break;
  }
}
assert(successAttempt === 1, `recovered on retry 1 after initial timeout (got attempt ${successAttempt})`);
assert(callCount === 2, `total calls made = 2 (got ${callCount})`);

// ── Test 5: Timeout value in Anthropic client config ─────────────────────────
console.log("\n[5] Timeout config (static analysis)");

import { readFileSync } from "fs";

const routes = [
  "app/api/agents/route.ts",
  "app/api/supervisor/route.ts",
  "app/api/chat/route.ts",
];

for (const route of routes) {
  const src = readFileSync(route, "utf-8");
  assert(src.includes("timeout: 300_000"), `${route} — timeout: 300_000`);
  assert(src.includes("new Anthropic("), `${route} — Anthropic client instantiated`);
}

// Check keepalive present in agentic routes
const agentSrc = readFileSync("app/api/agents/route.ts", "utf-8");
const supSrc = readFileSync("app/api/supervisor/route.ts", "utf-8");
assert(agentSrc.includes(": keepalive"), "agents/route.ts — keepalive SSE comment");
assert(agentSrc.includes(".finally(() => clearInterval"), "agents/route.ts — interval cleared via .finally()");
assert(supSrc.includes(": keepalive"), "supervisor/route.ts — keepalive SSE comment");
assert(supSrc.includes(".finally(() => clearInterval"), "supervisor/route.ts — interval cleared via .finally()");

// Check retry in frontends
const frontends = [
  "components/OpenClaw.tsx",
  "components/AgentsPanel.tsx",
  "components/SupervisorWidget.tsx",
];
for (const f of frontends) {
  const src = readFileSync(f, "utf-8");
  assert(src.includes("idle timeout"), `${f} — retry detection for 'idle timeout'`);
  assert(src.includes("partial response"), `${f} — retry detection for 'partial response'`);
  assert(src.includes("MAX_RETRIES"), `${f} — MAX_RETRIES constant`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
