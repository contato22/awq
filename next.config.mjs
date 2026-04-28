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

    // Type-checking and linting run as separate CI steps (vercel-deploy.yml).
    // Ignoring here prevents build failures from blocking the static export
    // pipeline (pages.yml) and the Vercel SSR build.
    typescript: { ignoreBuildErrors: true },
    eslint:     { ignoreDuringBuilds: true },

    ...(isStaticExport
            ? {
                      output: "export",
                      basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
                      images: { unoptimized: true },
                      trailingSlash: true,
            }
            : {}),
};

export default nextConfig;
