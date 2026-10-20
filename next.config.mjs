/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 → GitHub Pages (sem API routes).
// `npm run build` esconde app/api nesse modo (scripts/next-build.mjs):
// output:"export" rejeita `dynamic = "force-dynamic"`, e prerenderizar
// handlers publicaria respostas de API no site estático. O deploy Vercel
// usa `next build` (vercel.json) e não passa por esse script.
// default → Vercel/Node (SSR + /api)
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Pin NEXT_PUBLIC_STATIC_DATA to the actual build target.
// NEXT_PUBLIC_* vars are inlined by Next.js at build time from process.env.
// If the Vercel project has NEXT_PUBLIC_STATIC_DATA=1 leftover from a
// GitHub Pages setup, this override ensures SSR builds always get "0".
process.env.NEXT_PUBLIC_STATIC_DATA = isStaticExport ? "1" : "0";

// Bake o SHA do commit no bundle do client a partir do system env var que o
// Vercel injeta em build time (VERCEL_GIT_COMMIT_SHA). O BuildSHAGuard usa
// esse valor pra detectar bundles stale comparando com /api/health.
process.env.NEXT_PUBLIC_BUILD_SHA = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

// Persistência local do Estúdio. Desligada por padrão. O nome que se liga na
// Vercel é CAZA_STUDIO_PERSIST=1; o prefixo NEXT_PUBLIC é só para o bundle do browser.
const persistirEstudio = process.env.CAZA_STUDIO_PERSIST;
process.env.NEXT_PUBLIC_CAZA_STUDIO_PERSIST =
  persistirEstudio === "1" || persistirEstudio === "true" ? "1" : "";

// 'unsafe-inline' / 'unsafe-eval' stay because Next.js 14 injects inline
// bootstrap scripts and some client charts still evaluate strings. This CSP
// blocks framing, plugins, and unexpected connect targets; it is not a nonce CSP.
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://*.vercel-insights.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
].join("; ");

const SECURITY_HEADERS = [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
    reactStrictMode: true,

    // Type-checking and linting run as separate CI steps (vercel-deploy.yml).
    // Ignoring here prevents build failures from blocking the static export
    // pipeline (pages.yml) and the Vercel SSR build.
    typescript: { ignoreBuildErrors: true },
    eslint:     { ignoreDuringBuilds: true },

    ...(isStaticExport
            ? {
                      output: "export",
                      basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq",
                      images: { unoptimized: true },
                      trailingSlash: true,
            }
            : {
                      // SSR (Vercel): garante que respostas de navegação (HTML) nunca
                      // sejam cacheadas pelo browser ou pela edge. Chunks estáticos
                      // (_next/static/*) continuam com immutable padrão do Next, o
                      // que é correto porque o hash do filename muda a cada build.
                      // Isso é safety net além do force-dynamic nas páginas; previne
                      // que o navegador (ou um intermediário) sirva HTML velho que
                      // referencie chunks antigos.
                      async headers() {
                            return [
                                  {
                                        source: "/(.*)",
                                        headers: SECURITY_HEADERS,
                                  },
                                  {
                                        source: "/((?!_next/static|_next/image|favicon\\.ico|api).*)",
                                        headers: [
                                              { key: "Cache-Control", value: "no-store, must-revalidate" },
                                        ],
                                  },
                            ];
                      },
            }),
};

export default nextConfig;
