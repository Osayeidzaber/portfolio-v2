import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

/*
 * Content Security Policy. Scripts are first-party (plus inline bootstraps Next emits);
 * images may come from GitHub avatars, Simple Icons and https sources the admin entered.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-src 'self' blob:",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // The registry WebGL components release their context on unmount and then reuse the
  // same <canvas>; StrictMode's dev-only double mount leaves them on a lost context.
  // Production never double-mounts, so this keeps dev faithful to production.
  reactStrictMode: false,
  experimental: {
    // The custom Tailwind loader can retain stale global styles between dev runs.
    turbopackFileSystemCacheForDev: false,
    // Admin uploads (images ≤ 5 MB, résumé PDF ≤ 8 MB) go through a server action.
    serverActions: { bodySizeLimit: "9mb" },
  },
  // Bundled uploads are read from disk when the content repo isn't configured.
  outputFileTracingIncludes: {
    "/media/[name]": ["./content/uploads/**/*"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        // CSS modules (the UI Arc heatmap) must keep their own pipeline, or their
        // class names are never mapped.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
