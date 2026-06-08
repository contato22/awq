/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 → GitHub Pages (sem API routes)
// default → Vercel/Node (SSR + /api/chat proxy)
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Pin NEXT_PUBLIC_STATIC_DATA to the actual build target.
// NEXT_PUBLIC_* vars are inlined by Next.js at build time from process.env.
// If the Vercel project has NEXT_PUBLIC_STATIC_DATA=1 leftover from a
// GitHub Pages setup, this override ensures SSR builds always get "0".
process.env.NEXT_PUBLIC_STATIC_DATA = isStaticExport ? "1" : "0";

// Security headers globais. Aplicam-se a todas as respostas em SSR.
// CSP intencionalmente permite 'unsafe-inline' em script e style — Next.js
// injeta inline scripts (chunks) e Tailwind injeta styles. Sem nonce-based
// CSP isso é o mais restritivo viável sem quebrar a app. Revisitar quando
// migrarmos pra App Router pure + strict CSP com nonces.
const SECURITY_HEADERS = [
    {
        key:   "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co https://*.vercel.live https://vercel.live https://matls-clients.api.cora.com.br https://api.stage.cora.com.br https://api.anthropic.com",
            "frame-src 'self' https://vercel.live",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            "upgrade-insecure-requests",
        ].join("; "),
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options",    value: "nosniff" },
    { key: "X-Frame-Options",           value: "DENY" },
    { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
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
                      async headers() {
                            return [
                                  // Security headers em todas as páginas/APIs
                                  { source: "/:path*", headers: SECURITY_HEADERS },
                                  // Cache-control em páginas (excluindo assets e API)
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
