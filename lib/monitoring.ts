// Structured logging + in-memory error aggregator for Vercel serverless.
// Outputs JSON logs to stderr (visible in Vercel Logs / Datadog / Grafana Cloud).
// Use withMonitoring() to wrap route handlers.

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  route: string;
  ms?: number;
  status?: number;
  user?: string;
  message?: string;
  error?: string;
}

// In-memory error ring buffer — last 100 errors per Vercel instance.
// Reset on cold start. For persistent error tracking, forward to an
// external service (Sentry, Grafana, etc.).
const MAX_ERRORS = 100;
const errorRing: LogEntry[] = [];

export function getRecentErrors(): LogEntry[] {
  return [...errorRing];
}

function log(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    process.stderr.write(line + "\n");
    errorRing.push(entry);
    if (errorRing.length > MAX_ERRORS) errorRing.shift();
  } else {
    process.stdout.write(line + "\n");
  }
}

export function logRequest(route: string, status: number, ms: number, user?: string) {
  const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  log({ ts: new Date().toISOString(), level, route, status, ms, user });
}

export function logError(route: string, error: unknown, user?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  log({
    ts: new Date().toISOString(),
    level: "error",
    route,
    error: message,
    message: stack?.split("\n")[1]?.trim(),
    user,
  });
}

/**
 * Wraps a Next.js route handler with latency logging and error capture.
 *
 * Usage:
 *   export const POST = withMonitoring("/api/chat", async (req) => { ... });
 */
export function withMonitoring(
  route: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const t0 = Date.now();
    // Extract user from x-user-email header (set by middleware)
    const user = req.headers.get("x-user-email") ?? undefined;

    try {
      const res = await handler(req);
      logRequest(route, res.status, Date.now() - t0, user);
      return res;
    } catch (err) {
      logError(route, err, user);
      logRequest(route, 500, Date.now() - t0, user);
      throw err;
    }
  };
}
