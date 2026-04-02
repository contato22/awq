/**
 * director-engine.ts
 *
 * AWQ Design Director — Autonomous agent orchestration engine.
 * Runs all BU agents + master in priority order, collects reports,
 * stores cycle logs, and surfaces escalations.
 *
 * Cycle order (mirrors sleeve priority):
 *   1. JACQES (motor) → 2. Caza Vision (suporte) → 3. AWQ Venture (captura) → 4. AWQ Master (governance)
 *
 * Each agent runs a full agentic loop (Claude + tools), producing a structured report.
 * The Master agent receives all previous reports as context for cross-sleeve synthesis.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, type AgentConfig } from "@/lib/agents-config";
import { AGENT_TOOLS, executeTool, type NotionEnv } from "@/lib/agent-tools";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentReport {
  agentId: string;
  agentName: string;
  bu: string;
  status: "success" | "error" | "timeout";
  report: string;
  toolCalls: { name: string; summary: string }[];
  durationMs: number;
  escalations: string[];
  timestamp: string;
}

export interface DirectorCycle {
  id: string;
  trigger: "cron" | "manual" | "webhook";
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "partial" | "failed";
  agents: AgentReport[];
  masterSynthesis: string | null;
  escalations: string[];
  durationMs: number;
}

export type CycleCallback = (event: DirectorEvent) => void;

export type DirectorEvent =
  | { type: "cycle_start"; cycleId: string }
  | { type: "agent_start"; agentId: string; agentName: string }
  | { type: "agent_tool"; agentId: string; toolName: string; summary: string }
  | { type: "agent_text"; agentId: string; text: string }
  | { type: "agent_done"; agentId: string; status: string; durationMs: number }
  | { type: "master_synthesis"; text: string }
  | { type: "cycle_done"; status: string; durationMs: number; escalations: string[] };

// ── Storage ──────────────────────────────────────────────────────────────────

const REPO_ROOT = process.env.VERCEL_ROOT ?? process.cwd();
const LOG_DIR = join(REPO_ROOT, "public", "data", "director");
const LOG_FILE = join(LOG_DIR, "cycles.json");
const MAX_STORED_CYCLES = 50;

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

export function readCycleLog(): DirectorCycle[] {
  ensureLogDir();
  if (!existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveCycle(cycle: DirectorCycle) {
  ensureLogDir();
  const cycles = readCycleLog();
  const idx = cycles.findIndex((c) => c.id === cycle.id);
  if (idx >= 0) cycles[idx] = cycle;
  else cycles.unshift(cycle);
  // Keep only recent cycles
  writeFileSync(LOG_FILE, JSON.stringify(cycles.slice(0, MAX_STORED_CYCLES), null, 2), "utf8");
}

// ── Escalation extraction ────────────────────────────────────────────────────

function extractEscalations(text: string): string[] {
  const escalations: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("🔴") || trimmed.startsWith("URGENTE") || trimmed.startsWith("CRÍTICO")) {
      escalations.push(trimmed);
    }
  }
  return escalations;
}

// ── Single agent runner ──────────────────────────────────────────────────────

const MAX_ITERATIONS = 8;
const AGENT_TIMEOUT_MS = 120_000; // 2 min per agent

async function runSingleAgent(
  agent: AgentConfig,
  apiKey: string,
  notionEnv: NotionEnv,
  hasNotion: boolean,
  extraContext: string,
  onEvent?: CycleCallback
): Promise<AgentReport> {
  const start = Date.now();
  const toolCalls: AgentReport["toolCalls"] = [];
  let reportText = "";

  try {
    const client = new Anthropic({ apiKey });

    const agentTools = hasNotion
      ? AGENT_TOOLS.filter((t) => agent.tools.includes(t.name))
      : AGENT_TOOLS.filter((t) =>
          agent.tools.includes(t.name) && ["read_file", "write_file", "list_directory"].includes(t.name)
        );

    const systemPrompt = agent.system + (extraContext ? `\n\n=== CONTEXTO DO CICLO ANTERIOR ===\n${extraContext}` : "");

    const prompt = agent.id === "awq-master" && extraContext
      ? `${agent.prompt}\n\nRelatórios dos agentes de sleeve neste ciclo:\n${extraContext}`
      : agent.prompt;

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    let iterations = 0;

    const deadline = start + AGENT_TIMEOUT_MS;

    while (iterations < MAX_ITERATIONS && Date.now() < deadline) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        tools: agentTools.length > 0 ? agentTools : undefined,
        messages,
      });

      // Collect text
      for (const block of response.content) {
        if (block.type === "text") {
          reportText += block.text;
          onEvent?.({ type: "agent_text", agentId: agent.id, text: block.text });
        }
      }

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tb of toolBlocks) {
          type TInput = Parameters<typeof executeTool>[1];
          const result = await executeTool(tb.name, tb.input as TInput, notionEnv);

          let summary = "";
          try {
            const p = JSON.parse(typeof result === "string" ? result : JSON.stringify(result));
            if (p.data && Array.isArray(p.data)) summary = `${p.data.length} registros`;
            else if (p.written === true) summary = `salvo: ${(p as Record<string, unknown>).path ?? ""}`;
            else if (p.updated) summary = "atualizado";
            else if (p.created) summary = "alerta criado";
            else if (p.files) summary = `${p.files.length} arquivos`;
            else summary = "ok";
          } catch {
            summary = typeof result === "string" ? `${result.length} chars` : "ok";
          }

          toolCalls.push({ name: tb.name, summary });
          onEvent?.({ type: "agent_tool", agentId: agent.id, toolName: tb.name, summary });

          toolResults.push({
            type: "tool_result",
            tool_use_id: tb.id,
            content: typeof result === "string" ? result : JSON.stringify(result),
          });
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }
      break;
    }

    const durationMs = Date.now() - start;
    const timedOut = Date.now() >= deadline && iterations >= MAX_ITERATIONS;

    return {
      agentId: agent.id,
      agentName: agent.name,
      bu: agent.bu,
      status: timedOut ? "timeout" : "success",
      report: reportText,
      toolCalls,
      durationMs,
      escalations: extractEscalations(reportText),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      bu: agent.bu,
      status: "error",
      report: `Erro: ${err instanceof Error ? err.message : String(err)}`,
      toolCalls,
      durationMs: Date.now() - start,
      escalations: [],
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Full cycle orchestration ─────────────────────────────────────────────────

const AGENT_ORDER = ["jacqes", "caza-vision", "awq-venture", "awq-master"];

export async function runDirectorCycle(
  trigger: DirectorCycle["trigger"],
  apiKey: string,
  onEvent?: CycleCallback
): Promise<DirectorCycle> {
  const cycleId = `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  onEvent?.({ type: "cycle_start", cycleId });

  const cycle: DirectorCycle = {
    id: cycleId,
    trigger,
    startedAt,
    completedAt: null,
    status: "running",
    agents: [],
    masterSynthesis: null,
    escalations: [],
    durationMs: 0,
  };
  saveCycle(cycle);

  const notionEnv: NotionEnv = {
    notionKey: process.env.NOTION_API_KEY ?? "",
    dbProperties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
    dbClients: process.env.NOTION_DATABASE_ID_CAZA_CLIENTS ?? "",
    dbFinancial: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
  };
  const hasNotion = !!notionEnv.notionKey;

  const sleeveReports: string[] = [];
  let hasError = false;

  for (const agentId of AGENT_ORDER) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) continue;

    onEvent?.({ type: "agent_start", agentId: agent.id, agentName: agent.name });

    // Master gets all previous sleeve reports as context
    const extraContext = agentId === "awq-master"
      ? sleeveReports.join("\n\n---\n\n")
      : "";

    const report = await runSingleAgent(agent, apiKey, notionEnv, hasNotion, extraContext, onEvent);
    cycle.agents.push(report);

    if (report.status === "error") hasError = true;

    // Build context for master
    if (agentId !== "awq-master") {
      sleeveReports.push(`[${agent.name}]\n${report.report}`);
    } else {
      cycle.masterSynthesis = report.report;
    }

    // Collect escalations
    cycle.escalations.push(...report.escalations);

    onEvent?.({ type: "agent_done", agentId: agent.id, status: report.status, durationMs: report.durationMs });
  }

  if (cycle.masterSynthesis) {
    onEvent?.({ type: "master_synthesis", text: cycle.masterSynthesis });
  }

  cycle.completedAt = new Date().toISOString();
  cycle.durationMs = Date.now() - new Date(startedAt).getTime();
  cycle.status = hasError
    ? (cycle.agents.some((a) => a.status === "success") ? "partial" : "failed")
    : "completed";

  onEvent?.({ type: "cycle_done", status: cycle.status, durationMs: cycle.durationMs, escalations: cycle.escalations });

  saveCycle(cycle);
  return cycle;
}

// ── Latest cycle summary (for dashboard) ─────────────────────────────────────

export function getLatestCycle(): DirectorCycle | null {
  const cycles = readCycleLog();
  return cycles[0] ?? null;
}

export function getCycleStats() {
  const cycles = readCycleLog();
  const completed = cycles.filter((c) => c.status === "completed");
  const last24h = cycles.filter((c) => {
    const age = Date.now() - new Date(c.startedAt).getTime();
    return age < 24 * 60 * 60 * 1000;
  });

  return {
    totalCycles: cycles.length,
    completedCycles: completed.length,
    cyclesLast24h: last24h.length,
    avgDurationMs: completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.durationMs, 0) / completed.length)
      : 0,
    totalEscalations: cycles.reduce((s, c) => s + c.escalations.length, 0),
    lastCycleAt: cycles[0]?.startedAt ?? null,
  };
}
