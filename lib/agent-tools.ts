/**
 * agent-tools.ts
 * Anthropic tool definitions + server-side execution for BU agents.
 *
 * Tools available:
 *   Notion (server mode): query_notion_database, update_notion_record, create_notion_alert
 *   Filesystem:           read_file, write_file, list_directory
 *
 * Static/GitHub Pages mode: only analysis (no server). Data is pre-injected into context.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";
type ToolResultBlockParam = { type: "tool_result"; tool_use_id: string; content: string };

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const NOTION_VERSION = "2022-06-28";

// Repo root in server context
const REPO_ROOT = process.env.VERCEL_ROOT ?? process.cwd();

// Files the agent is allowed to write (whitelist)
const WRITABLE_PATHS = [
  "lib/data.ts",
  "lib/caza-data.ts",
  "public/data/",
  "app/financial/page.tsx",
  "app/caza-vision/page.tsx",
  "app/awq/page.tsx",
  "app/customers/page.tsx",
  "app/products/page.tsx",
  "app/overview/page.tsx",
];

function isWritable(filePath: string): boolean {
  const normalized = filePath.replace(/^\//, "");
  return WRITABLE_PATHS.some((allowed) =>
    allowed.endsWith("/") ? normalized.startsWith(allowed) : normalized === allowed
  );
}

// ── Tool definitions (Anthropic schema) ─────────────────────────────────────

export const AGENT_TOOLS: Tool[] = [
  // ── Notion tools ──────────────────────────────────────────────────────────
  {
    name: "query_notion_database",
    description:
      "Fetch live records from a Notion database. Use this to read current project status, client data, or financial records BEFORE making decisions or taking action.",
    input_schema: {
      type: "object" as const,
      properties: {
        database: {
          type: "string",
          enum: ["properties", "clients", "financial"],
          description: "'properties' for projects/pipeline, 'clients' for client list, 'financial' for P&L.",
        },
      },
      required: ["database"],
    },
  },
  {
    name: "update_notion_record",
    description:
      "Update fields on an existing Notion page — e.g., change project status/priority, mark as urgent, add a note. Take this action when you identify a record that needs to be changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        page_id: { type: "string", description: "Notion page ID to update." },
        properties: {
          type: "object",
          description: "Fields to update: status (select), priority (select), note (rich_text), value (number).",
        },
        reason: { type: "string", description: "Why this update is needed." },
      },
      required: ["page_id", "properties", "reason"],
    },
  },
  {
    name: "create_notion_alert",
    description:
      "Create a new action item / alert in Notion for the team — CS interventions, revenue risks, fund milestones. Use when you identify something that needs human follow-up that you cannot resolve through code.",
    input_schema: {
      type: "object" as const,
      properties: {
        database: { type: "string", enum: ["properties", "clients"] },
        title: { type: "string", description: "Short title, e.g. 'URGENT: CV002 Banco XP stuck 10 days'." },
        body: { type: "string", description: "Detailed description of the issue and recommended action." },
        priority: { type: "string", enum: ["Alta", "Média", "Baixa"] },
      },
      required: ["database", "title", "body", "priority"],
    },
  },

  // ── Filesystem tools ───────────────────────────────────────────────────────
  {
    name: "read_file",
    description:
      "Read the content of a source file in the repository. Use this to understand current frontend components, backend logic, or data before proposing or making changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to repo root, e.g. 'lib/data.ts' or 'app/financial/page.tsx'.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write or update a source file in the repository. Use this to fix data, update frontend components, or improve backend logic. ALWAYS read the file first before writing. Only write to relevant data/page files — do NOT touch config files.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to repo root, e.g. 'lib/data.ts'.",
        },
        content: {
          type: "string",
          description: "Complete new file content. Must be valid TypeScript/JavaScript.",
        },
        reason: {
          type: "string",
          description: "Brief explanation of what was changed and why.",
        },
      },
      required: ["path", "content", "reason"],
    },
  },
  {
    name: "list_directory",
    description: "List files in a directory of the repository to understand the code structure.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to repo root, e.g. 'app' or 'lib'.",
        },
      },
      required: ["path"],
    },
  },
];

// ── Notion helpers ────────────────────────────────────────────────────────────

async function notionQuery(databaseId: string, notionKey: string): Promise<unknown[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 50 }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
  const data = await res.json();
  type NotionProp = { type: string; title?: { plain_text: string }[]; select?: { name: string }; number?: number; date?: { start: string }; rich_text?: { plain_text: string }[]; checkbox?: boolean };
  type NotionPage = { id: string; properties: Record<string, NotionProp> };
  return (data.results as NotionPage[]).map((p) => ({
    id: p.id,
    title: Object.values(p.properties)
      .find((v) => v.type === "title")?.title?.[0]?.plain_text ?? "(sem título)",
    ...Object.fromEntries(
      (Object.entries(p.properties) as [string, NotionProp][]).flatMap(([k, v]): [string, unknown][] => {
        if (v.type === "select" && v.select) return [[k, v.select.name]];
        if (v.type === "number" && v.number !== undefined) return [[k, v.number]];
        if (v.type === "date" && v.date) return [[k, v.date.start]];
        if (v.type === "rich_text" && v.rich_text?.length) return [[k, v.rich_text[0].plain_text]];
        if (v.type === "checkbox") return [[k, v.checkbox]];
        return [];
      })
    ),
  }));
}

async function notionUpdatePage(
  pageId: string,
  props: Record<string, string | number>,
  notionKey: string
): Promise<{ updated: boolean }> {
  const notionProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === "note") {
      notionProps[k] = { rich_text: [{ text: { content: String(v) } }] };
    } else if (typeof v === "number") {
      notionProps[k] = { number: v };
    } else {
      notionProps[k] = { select: { name: String(v) } };
    }
  }
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: notionProps }),
  });
  return { updated: res.ok };
}

async function notionCreatePage(
  databaseId: string,
  title: string,
  body: string,
  priority: string,
  notionKey: string
): Promise<{ created: boolean; page_id?: string }> {
  const res = await fetch(`https://api.notion.com/v1/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        "Nome do projeto": { title: [{ text: { content: title } }] },
        Prioridade: { select: { name: priority } },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: body } }] },
        },
      ],
    }),
  });
  const data = await res.json();
  return { created: res.ok, page_id: data.id };
}

// ── Filesystem helpers ────────────────────────────────────────────────────────

function safeReadFile(filePath: string): string {
  const abs = join(REPO_ROOT, filePath.replace(/^\//, ""));
  if (!existsSync(abs)) return `File not found: ${filePath}`;
  const content = readFileSync(abs, "utf8");
  // Truncate very large files to prevent token overflow
  if (content.length > 12000) {
    return content.slice(0, 12000) + `\n... [truncated — ${content.length} chars total]`;
  }
  return content;
}

function safeWriteFile(
  filePath: string,
  content: string
): { written: boolean; error?: string } {
  const normalized = filePath.replace(/^\//, "");
  if (!isWritable(normalized)) {
    return { written: false, error: `Path '${filePath}' is not in the writable whitelist.` };
  }
  try {
    const abs = join(REPO_ROOT, normalized);
    const dir = dirname(abs);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(abs, content, "utf8");
    return { written: true };
  } catch (err) {
    return { written: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function safeListDir(dirPath: string): string[] {
  try {
    const abs = join(REPO_ROOT, dirPath.replace(/^\//, ""));
    if (!existsSync(abs)) return [];
    return readdirSync(abs).map((f) => join(dirPath, f));
  } catch {
    return [];
  }
}

// ── Tool executor ─────────────────────────────────────────────────────────────

interface ToolInput {
  database?: string;
  page_id?: string;
  properties?: Record<string, string | number>;
  reason?: string;
  title?: string;
  body?: string;
  priority?: string;
  path?: string;
  content?: string;
}

export interface NotionEnv {
  notionKey: string;
  dbProperties: string;
  dbClients: string;
  dbFinancial: string;
}

export async function executeTool(
  toolName: string,
  toolInput: ToolInput,
  env: NotionEnv
): Promise<ToolResultBlockParam["content"]> {
  try {
    // ── Notion ───────────────────────────────────────────────────────────────
    if (toolName === "query_notion_database") {
      const dbMap: Record<string, string> = {
        properties: env.dbProperties,
        clients: env.dbClients,
        financial: env.dbProperties,
      };
      const dbId = dbMap[toolInput.database ?? "properties"];
      if (!dbId) return `Notion database '${toolInput.database}' not configured.`;
      const rows = await notionQuery(dbId, env.notionKey);
      return JSON.stringify({ source: "notion", data: rows, count: rows.length });
    }

    if (toolName === "update_notion_record") {
      if (!toolInput.page_id || !toolInput.properties) return "Missing page_id or properties.";
      const result = await notionUpdatePage(toolInput.page_id, toolInput.properties, env.notionKey);
      return JSON.stringify({ ...result, reason: toolInput.reason });
    }

    if (toolName === "create_notion_alert") {
      const dbId = toolInput.database === "clients" ? env.dbClients : env.dbProperties;
      if (!dbId) return `Database '${toolInput.database}' not configured.`;
      const result = await notionCreatePage(
        dbId,
        toolInput.title ?? "Alert",
        toolInput.body ?? "",
        toolInput.priority ?? "Média",
        env.notionKey
      );
      return JSON.stringify(result);
    }

    // ── Filesystem ───────────────────────────────────────────────────────────
    if (toolName === "read_file") {
      if (!toolInput.path) return "Missing path.";
      return safeReadFile(toolInput.path);
    }

    if (toolName === "write_file") {
      if (!toolInput.path || !toolInput.content) return "Missing path or content.";
      const result = safeWriteFile(toolInput.path, toolInput.content);
      return JSON.stringify({ ...result, path: toolInput.path, reason: toolInput.reason });
    }

    if (toolName === "list_directory") {
      if (!toolInput.path) return "Missing path.";
      const files = safeListDir(toolInput.path);
      return JSON.stringify({ files });
    }

    return `Unknown tool: ${toolName}`;
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
