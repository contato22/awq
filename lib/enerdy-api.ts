// ─── Enerdy Plataforma de Gestão — API Client (BU ENRD) ───────────────────────
//
// Puxa dados da plataforma de gestão da Enerdy (gestao.enerdy.com.br) para
// alimentar a BU ENRD na AWQ Plataforma.
//
// AUTENTICAÇÃO
//   Login por usuário/senha → sessão (cookie ou token Bearer, a confirmar na
//   descoberta). Credenciais SEMPRE via env var, nunca hardcoded:
//     - ENERDY_USER, ENERDY_PASS
//     - ENERDY_BASE_URL (default https://gestao.enerdy.com.br)
//
// DESCOBERTA DOS ENDPOINTS  ⚠️ PENDENTE
//   A tela /app/montagem é uma SPA; os dados vêm de uma API JSON ainda não
//   mapeada. Rode `node scripts/fetch-enerdy.mjs` (com a rede liberada) para
//   capturar os endpoints reais e preencher ENDPOINTS abaixo.
//   Enquanto ENDPOINTS.montagem === null, fetchMontagem() lança erro explícito.
//
// RUNTIME
//   nodejs (não Edge) — usa fetch nativo. Em ambiente com proxy de egresso,
//   o fetch nativo respeita HTTPS_PROXY quando NODE_USE_ENV_PROXY=1 (Node ≥22.21).
//
// Veja ENERDY_INTEGRATION.md para o passo a passo completo.

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.ENERDY_BASE_URL ?? "https://gestao.enerdy.com.br").replace(/\/$/, "");

function creds() {
  const user = process.env.ENERDY_USER ?? "";
  const pass = process.env.ENERDY_PASS ?? "";
  if (!user || !pass) {
    throw new Error("Enerdy: defina ENERDY_USER e ENERDY_PASS nas env vars (Vercel).");
  }
  return { user, pass };
}

// ⚠️ Preencher após rodar scripts/fetch-enerdy.mjs (discovery-report.json).
// Ex.: { login: "/api/auth/login", montagem: "/api/montagem" }
const ENDPOINTS: { login: string | null; montagem: string | null } = {
  login:    process.env.ENERDY_LOGIN_PATH    ?? null,
  montagem: process.env.ENERDY_MONTAGEM_PATH ?? null,
};

// ─── Tipos (provisórios — ajustar ao payload real) ─────────────────────────────

export interface EnerdyMontagemItem {
  id:        string;
  // TODO: mapear campos reais da tela de montagem (cliente, kit, status,
  //       valor, datas, técnico…). Definidos após a descoberta do payload.
  [key: string]: unknown;
}

export interface EnerdySession {
  token?:  string;            // Bearer, se a API usar
  cookie?: string;            // header Cookie, se a API usar sessão
}

// ─── Auth ───────────────────────────────────────────────────────────────────

let cached: { session: EnerdySession; at: number } | null = null;
const SESSION_TTL_MS = 25 * 60 * 1000; // renova a cada 25 min

export async function login(): Promise<EnerdySession> {
  if (cached && Date.now() - cached.at < SESSION_TTL_MS) return cached.session;
  if (!ENDPOINTS.login) {
    throw new Error(
      "Enerdy: endpoint de login não configurado. Rode scripts/fetch-enerdy.mjs " +
      "e preencha ENERDY_LOGIN_PATH (ou ENDPOINTS.login em lib/enerdy-api.ts).",
    );
  }
  const { user, pass } = creds();
  const resp = await fetch(`${BASE_URL}${ENDPOINTS.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    // TODO: confirmar nomes dos campos (username/password? login/senha?) na descoberta
    body: JSON.stringify({ username: user, password: pass }),
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`Enerdy login falhou: HTTP ${resp.status} ${await safeText(resp)}`);
  }
  const setCookie = resp.headers.get("set-cookie") ?? undefined;
  let token: string | undefined;
  try { token = (await resp.clone().json())?.token ?? undefined; } catch { /* sem token json */ }

  const session: EnerdySession = { token, cookie: setCookie };
  cached = { session, at: Date.now() };
  return session;
}

function authHeaders(s: EnerdySession): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (s.token)  h.Authorization = `Bearer ${s.token}`;
  if (s.cookie) h.Cookie = s.cookie;
  return h;
}

// ─── Escopo da BU ENRD: pós-venda atrelado a William e Tamara ──────────────────
//
// O usuário só quer PÓS-VENDA (serviço, limpeza, manutenção…) cujo responsável
// seja William OU Tamara. Como o shape do payload ainda não foi descoberto, o
// filtro é heurístico: procura os nomes e as palavras-chave de pós-venda em
// QUALQUER campo de texto do item. Após a descoberta, troque para os campos
// exatos (ex.: item.responsavel, item.tipoServico).
//
// Configurável por env (CSV), com defaults sensatos:
const RESPONSAVEIS = (process.env.ENERDY_RESPONSAVEIS ?? "william,tamara")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const POS_VENDA_KEYWORDS = (process.env.ENERDY_POSVENDA_KEYWORDS ??
  "pós-venda,pos-venda,pós venda,serviço,servico,limpeza,manutenção,manutencao,assistência,assistencia,o&m")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Concatena todos os valores string do item (raso) para busca textual
function itemText(item: EnerdyMontagemItem): string {
  return norm(Object.values(item)
    .filter((v) => typeof v === "string" || typeof v === "number")
    .join(" "));
}

export function isPosVenda(item: EnerdyMontagemItem): boolean {
  const t = itemText(item);
  return POS_VENDA_KEYWORDS.some((k) => t.includes(norm(k)));
}

export function isDeWilliamOuTamara(item: EnerdyMontagemItem): boolean {
  const t = itemText(item);
  return RESPONSAVEIS.some((r) => t.includes(norm(r)));
}

/** Itens de pós-venda atrelados a William ou Tamara — o escopo da BU ENRD. */
export function filtrarPosVendaWilliamTamara(items: EnerdyMontagemItem[]): EnerdyMontagemItem[] {
  return items.filter((it) => isPosVenda(it) && isDeWilliamOuTamara(it));
}

/** Atalho: busca a montagem e já aplica o filtro de escopo. */
export async function fetchPosVendaWilliamTamara(): Promise<EnerdyMontagemItem[]> {
  return filtrarPosVendaWilliamTamara(await fetchMontagem());
}

// ─── Fetch: tela de montagem ───────────────────────────────────────────────────

export async function fetchMontagem(): Promise<EnerdyMontagemItem[]> {
  if (!ENDPOINTS.montagem) {
    throw new Error(
      "Enerdy: endpoint de montagem não configurado. Rode scripts/fetch-enerdy.mjs " +
      "e preencha ENERDY_MONTAGEM_PATH (ou ENDPOINTS.montagem em lib/enerdy-api.ts).",
    );
  }
  const session = await login();
  const resp = await fetch(`${BASE_URL}${ENDPOINTS.montagem}`, {
    headers: authHeaders(session),
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`Enerdy montagem falhou: HTTP ${resp.status} ${await safeText(resp)}`);
  }
  const data = await resp.json();
  // TODO: normalizar para EnerdyMontagemItem[] conforme o shape real
  return Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
}

// ─── Util ───────────────────────────────────────────────────────────────────

async function safeText(resp: Response): Promise<string> {
  try { return (await resp.text()).slice(0, 300); } catch { return ""; }
}
