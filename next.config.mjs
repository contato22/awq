/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 → GitHub Pages (sem API routes)
// default → Vercel/Node (SSR + /api/chat proxy)
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
