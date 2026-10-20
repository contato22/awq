// Pure CSV lead import. No I/O, no Supabase — safe to run in the browser
// and in unit tests. Persistence is a separate interface (lib/lead-import-store.ts).

export const LEAD_IMPORT_BUS = ["JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
export type LeadImportBu = (typeof LEAD_IMPORT_BUS)[number];

export const LEAD_IMPORT_SOURCES = ["organic", "paid", "referral", "inbound", "manual"] as const;
export type LeadImportSource = (typeof LEAD_IMPORT_SOURCES)[number];

export type BantNeed = "low" | "medium" | "high";

export type LeadImportDraft = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  bu: LeadImportBu;
  lead_source: LeadImportSource;
  bant_budget: number | null;
  bant_authority: boolean;
  bant_need: BantNeed | null;
  bant_timeline: string | null;
  assigned_to: string;
  qualification_notes: string | null;
  lead_score: number;
};

export type LeadCsvRow = {
  row: number;
  ok: boolean;
  errors: string[];
  lead?: LeadImportDraft;
  name?: string;
};

export type LeadCsvParseResult = {
  fileErrors: string[];
  rows: LeadCsvRow[];
};

export type ParseLeadCsvOptions = {
  defaultBu?: string;
  defaultAssignedTo?: string;
  /** When set, an explicit BU that differs is a row error. Empty cells use this BU. */
  forcedBu?: string | null;
  now?: Date;
  maxRows?: number;
};

export const LEAD_CSV_MAX_ROWS = 500;
export const LEAD_CSV_MAX_CHARS = 500_000;

export const LEAD_CSV_TEMPLATE = [
  "nome,empresa,email,telefone,cargo,bu,fonte,budget,necessidade,timeline,decisor,responsavel,notas",
  "Ana Souza,Acme Ltda,ana@acme.com.br,11999990000,CMO,JACQES,inbound,50000,alta,2026-11-01,sim,Miguel,Campanha do site",
].join("\n");

const HEADER_MAP: Record<string, keyof RawLead> = {
  nome: "contact_name",
  name: "contact_name",
  contato: "contact_name",
  contact_name: "contact_name",
  empresa: "company_name",
  company: "company_name",
  companhia: "company_name",
  company_name: "company_name",
  email: "email",
  e_mail: "email",
  mail: "email",
  telefone: "phone",
  phone: "phone",
  celular: "phone",
  whatsapp: "phone",
  cargo: "job_title",
  job_title: "job_title",
  title: "job_title",
  funcao: "job_title",
  bu: "bu",
  unidade: "bu",
  fonte: "lead_source",
  source: "lead_source",
  origem: "lead_source",
  lead_source: "lead_source",
  budget: "bant_budget",
  bant_budget: "bant_budget",
  orcamento: "bant_budget",
  necessidade: "bant_need",
  need: "bant_need",
  bant_need: "bant_need",
  timeline: "bant_timeline",
  prazo: "bant_timeline",
  bant_timeline: "bant_timeline",
  decisor: "bant_authority",
  authority: "bant_authority",
  bant_authority: "bant_authority",
  responsavel: "assigned_to",
  assigned_to: "assigned_to",
  owner: "assigned_to",
  notas: "qualification_notes",
  notes: "qualification_notes",
  observacoes: "qualification_notes",
  qualification_notes: "qualification_notes",
};

type RawLead = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  bu: string;
  lead_source: string;
  bant_budget: string;
  bant_need: string;
  bant_timeline: string;
  bant_authority: string;
  assigned_to: string;
  qualification_notes: string;
};

const REQUIRED_FIELDS = ["contact_name", "company_name", "email"] as const;

const SOURCE_ALIASES: Record<string, LeadImportSource> = {
  organic: "organic",
  organico: "organic",
  paid: "paid",
  pago: "paid",
  ads: "paid",
  referral: "referral",
  indicacao: "referral",
  inbound: "inbound",
  manual: "manual",
  planilha: "manual",
};

const NEED_ALIASES: Record<string, BantNeed> = {
  high: "high",
  alta: "high",
  medium: "medium",
  media: "medium",
  low: "low",
  baixa: "low",
};

const AUTHORITY_TRUE = new Set(["sim", "s", "yes", "y", "true", "1", "decisor"]);
const AUTHORITY_FALSE = new Set(["nao", "no", "n", "false", "0"]);

const LIMITS: Record<"contact_name" | "company_name" | "email" | "phone" | "job_title" | "assigned_to" | "qualification_notes", number> = {
  contact_name: 120,
  company_name: 160,
  email: 160,
  phone: 40,
  job_title: 80,
  assigned_to: 80,
  qualification_notes: 2000,
};

export function isLeadImportBu(value: string): value is LeadImportBu {
  return (LEAD_IMPORT_BUS as readonly string[]).includes(value);
}

export function bantScore(
  input: {
    budget: number | null;
    authority: boolean;
    need: BantNeed | null;
    timeline: string | null;
  },
  now: Date,
): number {
  let score = 0;
  const budget = input.budget ?? 0;
  if (budget >= 50000) score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  if (input.authority) score += 20;
  if (input.need === "high") score += 25;
  else if (input.need === "medium") score += 15;
  else if (input.need === "low") score += 5;
  if (input.timeline) {
    const target = Date.parse(`${input.timeline}T00:00:00Z`);
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.ceil((target - today) / 86_400_000);
    // Same bands as the manual lead form: a date already due still counts as near-term.
    if (days <= 30) score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

export function parseLeadCsv(csv: string, options: ParseLeadCsvOptions = {}): LeadCsvParseResult {
  const maxRows = options.maxRows ?? LEAD_CSV_MAX_ROWS;
  const now = options.now ?? new Date();
  const text = csv.replace(/^\uFEFF/, "");
  if (!text.trim()) return { fileErrors: ["CSV vazio."], rows: [] };
  if (text.length > LEAD_CSV_MAX_CHARS) {
    return { fileErrors: ["CSV excede 500 KB."], rows: [] };
  }

  const defaults = resolveDefaults(options);
  if (defaults.fileErrors.length) return { fileErrors: defaults.fileErrors, rows: [] };

  const delimiter = detectDelimiter(text);
  const parsed = parseRecords(text, delimiter);
  if (parsed.unclosedQuote) return { fileErrors: ["Aspas não fechadas no CSV."], rows: [] };
  if (!parsed.records.length) return { fileErrors: ["CSV vazio."], rows: [] };

  const header = mapHeader(parsed.records[0].cells);
  if (header.fileErrors.length) return { fileErrors: header.fileErrors, rows: [] };

  const data = parsed.records.slice(1);
  if (!data.length) return { fileErrors: ["Nenhuma linha de dados além do cabeçalho."], rows: [] };
  if (data.length > maxRows) {
    return { fileErrors: [`O CSV tem ${data.length} linhas; o máximo é ${maxRows}.`], rows: [] };
  }

  const seenEmails = new Set<string>();
  const rows = data.map((record) =>
    validateRow(record, header.index, defaults, now, seenEmails),
  );
  return { fileErrors: [], rows };
}

function resolveDefaults(options: ParseLeadCsvOptions): {
  fileErrors: string[];
  defaultBu: LeadImportBu;
  forcedBu: LeadImportBu | null;
  defaultAssignedTo: string;
} {
  const fileErrors: string[] = [];
  const forcedRaw = options.forcedBu?.trim().toUpperCase() ?? "";
  let forcedBu: LeadImportBu | null = null;
  if (forcedRaw) {
    if (!isLeadImportBu(forcedRaw)) {
      fileErrors.push(`A BU ${forcedRaw} não entra no cadastro de leads.`);
    } else {
      forcedBu = forcedRaw;
    }
  }

  const requested = (forcedBu ?? options.defaultBu ?? "JACQES").trim().toUpperCase();
  let defaultBu: LeadImportBu = "JACQES";
  if (!isLeadImportBu(requested)) {
    fileErrors.push("BU padrão inválida. Use JACQES, CAZA, ADVISOR ou VENTURE.");
  } else {
    defaultBu = requested;
  }

  const assignee = (options.defaultAssignedTo ?? "Miguel").trim() || "Miguel";
  if (assignee.length > LIMITS.assigned_to || looksLikeFormula(assignee)) {
    fileErrors.push("Responsável padrão inválido.");
  }

  return { fileErrors, defaultBu, forcedBu, defaultAssignedTo: assignee };
}

function detectDelimiter(text: string): "," | ";" {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const commas = (first.match(/,/g) ?? []).length;
  const semis = (first.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseRecords(text: string, delimiter: "," | ";"): {
  records: { line: number; cells: string[] }[];
  unclosedQuote: boolean;
} {
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;

  const commit = () => {
    cells.push(field);
    field = "";
    if (cells.some((cell) => cell.trim() !== "")) {
      records.push({ line: startLine, cells });
    }
    cells = [];
  };

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line++;
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      cells.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      commit();
      line++;
      startLine = line;
      continue;
    }
    field += char;
  }

  if (field.length > 0 || cells.length > 0) commit();
  return { records, unclosedQuote: inQuotes };
}

function mapHeader(cells: string[]): {
  fileErrors: string[];
  index: Partial<Record<keyof RawLead, number>>;
} {
  const index: Partial<Record<keyof RawLead, number>> = {};
  const fileErrors: string[] = [];
  cells.forEach((cell, i) => {
    const key = normalizeToken(cell).replace(/_+/g, "_").replace(/^_|_$/g, "");
    if (!key) return;
    const field = HEADER_MAP[key];
    if (!field) return;
    if (index[field] !== undefined) {
      fileErrors.push(`Coluna duplicada: ${field}.`);
      return;
    }
    index[field] = i;
  });
  const missing = REQUIRED_FIELDS.filter((field) => index[field] === undefined);
  if (missing.length && !fileErrors.length) {
    fileErrors.push("Faltam colunas obrigatórias: nome, empresa e e-mail.");
  }
  return { fileErrors, index };
}

function validateRow(
  record: { line: number; cells: string[] },
  index: Partial<Record<keyof RawLead, number>>,
  defaults: { defaultBu: LeadImportBu; forcedBu: LeadImportBu | null; defaultAssignedTo: string },
  now: Date,
  seenEmails: Set<string>,
): LeadCsvRow {
  const raw = readRaw(record.cells, index);
  const errors: string[] = [];
  const nameHint = raw.company_name.trim() || raw.contact_name.trim() || undefined;

  const contact = textField(raw.contact_name, "nome", LIMITS.contact_name, errors, true);
  const company = textField(raw.company_name, "empresa", LIMITS.company_name, errors, true);
  const email = parseEmail(raw.email, errors, seenEmails);
  const phone = optionalText(raw.phone, "telefone", LIMITS.phone, errors, true);
  const job = optionalText(raw.job_title, "cargo", LIMITS.job_title, errors, false);
  const notes = optionalText(raw.qualification_notes, "notas", LIMITS.qualification_notes, errors, false);
  const bu = parseBu(raw.bu, defaults, errors);
  const source = parseSource(raw.lead_source, errors);
  const budget = parseBudget(raw.bant_budget, errors);
  const need = parseNeed(raw.bant_need, errors);
  const authority = parseAuthority(raw.bant_authority, errors);
  const timeline = parseTimeline(raw.bant_timeline, errors);
  const assignee = parseAssignee(raw.assigned_to, defaults.defaultAssignedTo, errors);

  if (errors.length || !contact || !company || !email || !bu || !source || !assignee) {
    return { row: record.line, ok: false, errors, name: nameHint };
  }

  const lead: LeadImportDraft = {
    contact_name: contact,
    company_name: company,
    email,
    phone,
    job_title: job,
    bu,
    lead_source: source,
    bant_budget: budget,
    bant_authority: authority,
    bant_need: need,
    bant_timeline: timeline,
    assigned_to: assignee,
    qualification_notes: notes,
    lead_score: bantScore(
      { budget, authority, need, timeline },
      now,
    ),
  };
  return { row: record.line, ok: true, errors: [], lead, name: company };
}

function readRaw(cells: string[], index: Partial<Record<keyof RawLead, number>>): RawLead {
  const pick = (field: keyof RawLead) => {
    const at = index[field];
    return at === undefined ? "" : (cells[at] ?? "");
  };
  return {
    contact_name: pick("contact_name"),
    company_name: pick("company_name"),
    email: pick("email"),
    phone: pick("phone"),
    job_title: pick("job_title"),
    bu: pick("bu"),
    lead_source: pick("lead_source"),
    bant_budget: pick("bant_budget"),
    bant_need: pick("bant_need"),
    bant_timeline: pick("bant_timeline"),
    bant_authority: pick("bant_authority"),
    assigned_to: pick("assigned_to"),
    qualification_notes: pick("qualification_notes"),
  };
}

function textField(value: string, label: string, max: number, errors: string[], required: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) errors.push(`${label} obrigatório`);
    return null;
  }
  if (looksLikeFormula(trimmed)) {
    errors.push(`${label} parece fórmula de planilha`);
    return null;
  }
  if (trimmed.length > max) {
    errors.push(`${label} excede ${max} caracteres`);
    return null;
  }
  return trimmed;
}

function optionalText(value: string, label: string, max: number, errors: string[], phone: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!phone && looksLikeFormula(trimmed)) {
    errors.push(`${label} parece fórmula de planilha`);
    return null;
  }
  if (phone && !/^[0-9+().\-\s]+$/.test(trimmed)) {
    errors.push("telefone inválido");
    return null;
  }
  if (trimmed.length > max) {
    errors.push(`${label} excede ${max} caracteres`);
    return null;
  }
  return trimmed;
}

function parseEmail(value: string, errors: string[], seen: Set<string>): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    errors.push("e-mail obrigatório");
    return null;
  }
  if (looksLikeFormula(trimmed) || trimmed.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errors.push("e-mail inválido");
    return null;
  }
  if (seen.has(trimmed)) {
    errors.push("e-mail repetido nesta planilha");
    return null;
  }
  seen.add(trimmed);
  return trimmed;
}

function parseBu(
  value: string,
  defaults: { defaultBu: LeadImportBu; forcedBu: LeadImportBu | null },
  errors: string[],
): LeadImportBu | null {
  const trimmed = value.trim();
  if (!trimmed) return defaults.forcedBu ?? defaults.defaultBu;
  const bu = trimmed.toUpperCase();
  if (!isLeadImportBu(bu)) {
    errors.push("BU inválida. Use JACQES, CAZA, ADVISOR ou VENTURE.");
    return null;
  }
  if (defaults.forcedBu && bu !== defaults.forcedBu) {
    errors.push(`BU fora do seu acesso (${defaults.forcedBu}).`);
    return null;
  }
  return bu;
}

function parseSource(value: string, errors: string[]): LeadImportSource | null {
  const token = normalizeToken(value);
  if (!token) return "manual";
  const source = SOURCE_ALIASES[token];
  if (!source) {
    errors.push("fonte inválida. Use organic, paid, referral, inbound ou manual.");
    return null;
  }
  return source;
}

function parseNeed(value: string, errors: string[]): BantNeed | null {
  const token = normalizeToken(value);
  if (!token) return null;
  const need = NEED_ALIASES[token];
  if (!need) {
    errors.push("necessidade inválida. Use alta, média ou baixa.");
    return null;
  }
  return need;
}

function parseAuthority(value: string, errors: string[]): boolean {
  const token = normalizeToken(value);
  if (!token) return false;
  if (AUTHORITY_TRUE.has(token)) return true;
  if (AUTHORITY_FALSE.has(token)) return false;
  errors.push("decisor inválido. Use sim ou não.");
  return false;
}

function parseBudget(value: string, errors: string[]): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let normalized: string | null = null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+(,\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed.replace(",", ".");
  } else if (/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed;
  }
  const amount = normalized === null ? Number.NaN : Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) {
    errors.push("budget inválido");
    return null;
  }
  return amount;
}

function parseTimeline(value: string, errors: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    errors.push("timeline inválida (use AAAA-MM-DD)");
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    errors.push("timeline inválida (use AAAA-MM-DD)");
    return null;
  }
  return trimmed;
}

function parseAssignee(value: string, fallback: string, errors: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (looksLikeFormula(trimmed)) {
    errors.push("responsável parece fórmula de planilha");
    return null;
  }
  if (trimmed.length > LIMITS.assigned_to) {
    errors.push(`responsável excede ${LIMITS.assigned_to} caracteres`);
    return null;
  }
  return trimmed;
}

function looksLikeFormula(value: string): boolean {
  return /^[=+\-@\t]/.test(value.trim());
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
