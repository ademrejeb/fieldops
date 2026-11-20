import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/* Applied to every response. CSP is production-only so Next dev (HMR over ws + eval) keeps working. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(isProd
    ? [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://unpkg.com",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
            "font-src 'self' data:",
            "connect-src 'self'",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentUpgrade: "security",
  },
  reactStrictMode: true,
  compress: true,
  /* production: classic dynamic rendering for ops dashboard (DB-driven) */
  cacheComponents: false,
  /* pin Turbopack root to this project (ignores stray lockfiles in parent dirs) */
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
