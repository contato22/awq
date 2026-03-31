/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 → GitHub Pages (sem API routes)
// default → Vercel/Node (SSR + /api/chat proxy)
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
    reactStrictMode: true,
    ...(isStaticExport
            ? {
                      output: "export",
                      basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/awq",
                      images: { unoptimized: true },
                      trailingSlash: true,
            }
            : {}),
};

export default nextConfig;
