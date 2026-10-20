// Path e headers usados pelo middleware de auth.
// Quem é público olha o path cru. O canônico só endurece allow-list e
// canAccess: Next entrega o segmento cru ao handler ([id] não resolve %2F).

const IDENTITY_HEADERS = ["x-user-email", "x-user-role", "x-bu-lock"] as const;

/** Subpaths reais do NextAuth. `..`, `%` e segmentos fora do conjunto não entram. */
const LEGIT_NEXTAUTH_PATH = /^\/api\/auth(?:\/[A-Za-z0-9_-]+)*\/?$/;

export function isLegitNextAuthPath(pathname: string): boolean {
  return LEGIT_NEXTAUTH_PATH.test(pathname);
}

/** Encoding, barra duplicada, barra invertida ou segmento "." / "..". */
const UNSAFE_PATH = /%|\\|\/\/|\.\.|(?:^|\/)\.(?:\/|$)/;

export function isRawPathUnsafe(pathname: string): boolean {
  return UNSAFE_PATH.test(pathname);
}

export function authPathname(pathname: string): string {
  if (!isRawPathUnsafe(pathname)) return pathname;
  return canonicalizePathname(pathname);
}

/**
 * Decodifica (inclusive %2f e dupla codificação) e resolve "." / "..".
 * Não muda caixa: /API/health continua /API/health e não vira a rota pública.
 * Não usar isto para decidir se a rota é pública.
 */
export function canonicalizePathname(input: string): string {
  let current = input;
  for (let i = 0; i < 4; i++) {
    const slashed = current.replace(/\\/g, "/").replace(/%5c/gi, "/").replace(/%2f/gi, "/");
    let decoded = slashed;
    try {
      decoded = decodeURIComponent(slashed);
    } catch {
      decoded = slashed;
    }
    if (decoded === current) break;
    current = decoded;
  }

  const trailing = current.length > 1 && current.endsWith("/");
  const stack: string[] = [];
  for (const segment of current.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  const joined = `/${stack.join("/")}`;
  return trailing && joined !== "/" ? `${joined}/` : joined;
}

/**
 * Apaga x-user-email, x-user-role e x-bu-lock (qualquer caixa) e regrava só
 * o que veio do JWT. Role sem bu-lock não herda o x-bu-lock do cliente.
 */
export function identityRequestHeaders(
  incoming: Headers,
  token: { email?: unknown; role?: unknown } | null | undefined,
  buLockByRole: Record<string, string>,
): Headers {
  const headers = new Headers(incoming);
  for (const name of IDENTITY_HEADERS) headers.delete(name);
  const role = typeof token?.role === "string" ? token.role : "";
  const email = typeof token?.email === "string" ? token.email : "";
  const locked = role ? buLockByRole[role] : undefined;
  if (locked) headers.set("x-bu-lock", locked);
  if (email) headers.set("x-user-email", email);
  if (role) headers.set("x-user-role", role);
  return headers;
}
