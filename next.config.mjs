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

    // Static export (GitHub Pages) skips the tsc CI step — keep ignoring there.
    // SSR build (Vercel) has a dedicated tsc --noEmit step in CI, so enforce types.
    typescript: { ignoreBuildErrors: isStaticExport },
    eslint:     { ignoreDuringBuilds: true }, // ESLint runs as a separate CI step

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
