// ─── Leitor do portal gestão.enerdy.com.br (app "Controle de Montagem") ──────
// Lê (somente leitura) o Supabase próprio do app de montagem (gxgvucnkldzcktdzkkdv)
// para espelhar no banco da AWQ. Usado por POST /api/enrd/montagem/sync.
//
// Autenticação: Supabase Auth (email/senha). A anon key é pública (subject to
// RLS) e o login é OBRIGATÓRIO — leitura anônima retorna 0 linhas. O email é
// derivado do usuário como `${ENERDY_USER}@enerdy.local` (regra do frontend).
//
// Segredos (Vercel env): ENERDY_USER, ENERDY_PASS. A conta precisa ter acesso
// de leitura na RLS do app (ex.: usuário admin do portal).

import { createClient } from "@supabase/supabase-js";

const ENERDY_URL =
  process.env.ENERDY_SUPABASE_URL || "https://gxgvucnkldzcktdzkkdv.supabase.co";

// Anon key pública (embarcada no frontend do app). Override via env.
const ENERDY_ANON_KEY =
  process.env.ENERDY_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4Z3Z1Y25rbGR6Y2t0ZHpra2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODgzOTIsImV4cCI6MjA4ODA2NDM5Mn0.lT1GPmJOU3v12O5RvscEFFSUrf4JeLd77F0j34SiW4Q";

const ENERDY_EMAIL_DOMAIN = process.env.ENERDY_EMAIL_DOMAIN || "enerdy.local";

function deriveEmail(raw: string | undefined): string {
  const e = (raw || "").trim().toLowerCase();
  if (!e) return "";
  if (e.includes("@")) return e;
  return `${e.replace(/[^a-z0-9_.-]/g, "")}@${ENERDY_EMAIL_DOMAIN}`;
}

export function isEnerdyPortalConfigured(): boolean {
  return Boolean((process.env.ENERDY_EMAIL || process.env.ENERDY_USER) && process.env.ENERDY_PASS);
}

export type EnerdyInstallation = Record<string, unknown> & {
  id: string;
  nome?: string | null;
  localizacao?: string | null;
  status?: string | null;
  situacao?: string | null;
  tipo?: string | null;
  prioridade?: string | null;
  montador?: string | null;
  cliente_id?: string | null;
  qnt_placas?: number | null;
  valor_por_placa?: number | null;
  expectativa_geracao_kwh_ano?: number | null;
  distancia_km?: number | null;
  data_int?: string | null;
  data_max_inst?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EnerdyCliente = Record<string, unknown> & {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  created_at?: string | null;
};

export type EnerdyCleaningReport = Record<string, unknown> & {
  id: string;
  installation_id?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  local_instalacao?: string | null;
  data_limpeza?: string | null;
  proxima_limpeza?: string | null;
  equipe?: string | null;
  capacidade_kwp?: number | null;
  nivel_sujeira?: string | null;
  tem_anomalias?: boolean | null;
};

const PAGE_SIZE = 1000;

// Tipo estrutural mínimo (evita atrito com os generics do SupabaseClient).
type Queryable = {
  from: (table: string) => {
    select: (cols: string) => {
      range: (
        from: number,
        to: number
      ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

async function fetchAll<T>(supabase: Queryable, table: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`gestão.${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export type PortalSnapshot = {
  installations: EnerdyInstallation[];
  clientes: EnerdyCliente[];
  cleaningReports: EnerdyCleaningReport[];
};

// Loga no portal e lê installations + clientes. Lança em caso de falha de auth
// ou leitura — o caller (rota de sync) captura e devolve erro estruturado.
export async function readEnerdyPortal(): Promise<PortalSnapshot> {
  const email = process.env.ENERDY_EMAIL || deriveEmail(process.env.ENERDY_USER);
  const password = process.env.ENERDY_PASS || "";
  if (!email || !password) {
    throw new Error("Credenciais do portal ausentes (ENERDY_USER/ENERDY_PASS).");
  }

  const supabase = createClient(ENERDY_URL, ENERDY_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Login no portal falhou: ${authError.message}`);

  try {
    const q = supabase as unknown as Queryable;
    const [installations, clientes, cleaningReports] = await Promise.all([
      fetchAll<EnerdyInstallation>(q, "installations"),
      fetchAll<EnerdyCliente>(q, "clientes"),
      fetchAll<EnerdyCleaningReport>(q, "cleaning_reports"),
    ]);
    return { installations, clientes, cleaningReports };
  } finally {
    await supabase.auth.signOut();
  }
}
