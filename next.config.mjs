/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 → GitHub Pages (sem API routes)
// default → Vercel/Node (SSR + /api/chat proxy)
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Pin NEXT_PUBLIC_STATIC_DATA to the actual build target.
// NEXT_PUBLIC_* vars are inlined by Next.js at build time from process.env.
// If the Vercel project has NEXT_PUBLIC_STATIC_DATA=1 leftover from a
// GitHub Pages setup, this override ensures SSR builds always get "0".
process.env.NEXT_PUBLIC_STATIC_DATA = isStaticExport ? "1" : "0";

const nextConfig = {
    reactStrictMode: true,

    // postgres uses Node.js built-ins (fs, perf_hooks) — cannot be bundled for
    // the client. Mark as server-external AND stub out the Node built-ins in
    // client bundles so webpack doesn't fail when client components transitively
    // import lib/db.ts. At runtime on the server the real Node modules are used;
    // on the client sql is always null (DATABASE_URL is not exposed to the browser).
    serverExternalPackages: ["postgres"],

    webpack(config, { isServer }) {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          perf_hooks: false,
          "node:perf_hooks": false,
          "node:fs": false,
          "node:net": false,
          "node:tls": false,
          "node:crypto": false,
        };
      }
      return config;
    },

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
            : {}),
};

export default nextConfig;
