/**
 * agent-tools.ts
 * Anthropic tool definitions + server-side execution functions for BU agents.
 * Used in server/Vercel mode only (not available in static/GitHub Pages export).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any;
type ToolResultBlockParam = { type: "tool_result"; tool_use_id: string; content: string };

const NOTION_VERSION = "2022-06-28";

// ── Tool definitions (Anthropic schema) ─────────────────────────────────────

export const AGENT_TOOLS: Tool[] = [
  {
    name: "query_notion_database",
    description:
      "Fetch live records from a Notion database. Use this to read current project status, client data, or financial records before making decisions.",
    input_schema: {
      type: "object" as const,
      properties: {
        database: {
          type: "string",
          enum: ["properties", "clients", "financial"],
          description: "Which Notion database to query: 'properties' for projects, 'clients' for client list, 'financial' for P&L.",
        },
      },
      required: ["database"],
    },
  },
  {
    name: "update_notion_record",
    description:
      "Update fields on an existing Notion page (e.g., change project status, priority, add a note). Only use when a concrete operational change is needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        page_id: {
          type: "string",
          description: "The Notion page ID to update.",
        },
        properties: {
          type: "object",
          description:
            "Key-value pairs to update. Supported: status (select), priority (select), note (rich_text). Example: { status: 'Urgente', note: 'CS intervention required' }",
        },
        reason: {
          type: "string",
          description: "Brief justification for this update.",
        },
      },
      required: ["page_id", "properties", "reason"],
    },
  },
  {
    name: "create_notion_alert",
    description:
      "Create a new action item / alert record in Notion to flag something for the team. Use for CS interventions, revenue risks, fund milestones.",
    input_schema: {
      type: "object" as const,
      properties: {
        database: {
          type: "string",
          enum: ["properties", "clients"],
          description: "Target database for the new record.",
        },
        title: {
          type: "string",
          description: "Short title of the alert (e.g., 'URGENT: CV002 Banco XP approval stuck').",
        },
        body: {
          type: "string",
          description: "Detailed description of the alert / recommended action.",
        },
        priority: {
          type: "string",
          enum: ["Alta", "Média", "Baixa"],
          description: "Priority level.",
        },
      },
      required: ["database", "title", "body", "priority"],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

interface QueryResult {
  source: string;
  data: unknown[] | null;
  error?: string;
}

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
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  const data = await res.json();
  // Return simplified view of pages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.results as any[]).map((p: any) => ({
    id: p.id,
    // Grab the first title property
    title: Object.values(p.properties as Record<string, { type: string; title?: { plain_text: string }[] }>).find(
      (v) => v.type === "title"
    )?.title?.[0]?.plain_text ?? "(sem título)",
    // Select fields
    ...Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Object.entries(p.properties) as [string, any][]).flatMap(([k, v]: [string, any]) => {
        if (v.type === "select" && v.select) return [[k, v.select.name]];
        if (v.type === "number" && v.number !== undefined) return [[k, v.number]];
        if (v.type === "date" && v.date) return [[k, v.date.start]];
        if (v.type === "rich_text" && v.rich_text?.length) return [[k, v.rich_text[0].plain_text]];
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
      // treat as select
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
        "Prioridade": { select: { name: priority } },
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

// ── Main tool executor ────────────────────────────────────────────────────────

interface ToolInput {
  database?: string;
  page_id?: string;
  properties?: Record<string, string | number>;
  reason?: string;
  title?: string;
  body?: string;
  priority?: string;
}

export async function executeTool(
  toolName: string,
  toolInput: ToolInput,
  env: {
    notionKey: string;
    dbProperties: string;
    dbClients: string;
    dbFinancial: string;
  }
): Promise<ToolResultBlockParam["content"]> {
  try {
    if (toolName === "query_notion_database") {
      const dbMap: Record<string, string> = {
        properties: env.dbProperties,
        clients: env.dbClients,
        financial: env.dbProperties, // reuses projects DB aggregated
      };
      const dbId = dbMap[toolInput.database ?? "properties"];
      if (!dbId) return `Notion database ID for '${toolInput.database}' not configured.`;
      const rows = await notionQuery(dbId, env.notionKey);
      const result: QueryResult = { source: "notion", data: rows };
      return JSON.stringify(result);
    }

    if (toolName === "update_notion_record") {
      if (!toolInput.page_id || !toolInput.properties) return "Missing page_id or properties.";
      const result = await notionUpdatePage(toolInput.page_id, toolInput.properties, env.notionKey);
      return JSON.stringify({ ...result, reason: toolInput.reason });
    }

    if (toolName === "create_notion_alert") {
      const dbId =
        toolInput.database === "clients" ? env.dbClients : env.dbProperties;
      if (!dbId) return `Database ID for '${toolInput.database}' not configured.`;
      const result = await notionCreatePage(
        dbId,
        toolInput.title ?? "Alert",
        toolInput.body ?? "",
        toolInput.priority ?? "Média",
        env.notionKey
      );
      return JSON.stringify(result);
    }

    return `Unknown tool: ${toolName}`;
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
