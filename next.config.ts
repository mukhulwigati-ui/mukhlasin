// next.config.ts

import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /**
   * ============================================================
   * IMAGE CONFIGURATION
   * ============================================================
   */
  images: {
    remotePatterns: [
      // Sanity CDN
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },

      // Google profile images
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },

      // Google static assets
      {
        protocol: "https",
        hostname: "**.gstatic.com",
        pathname: "/**",
      },
    ],
  },

  /**
   * ============================================================
   * TURBOPACK
   * ============================================================
   */
  turbopack: {},

  /**
   * ============================================================
   * SECURITY HEADERS
   * ============================================================
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",

              [
                "script-src",
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://www.googletagmanager.com",
                "https://*.sanity.io",
              ].join(" "),

              [
                "style-src",
                "'self'",
                "'unsafe-inline'",
                "https://design-system-static.sanity.io",
              ].join(" "),

              [
                "font-src",
                "'self'",
                "data:",
                "https://design-system-static.sanity.io",
              ].join(" "),

              [
                "img-src",
                "'self'",
                "data:",
                "blob:",
                "https://cdn.sanity.io",
                "https://www.google-analytics.com",
                "https://*.googleusercontent.com",
                "https://*.gstatic.com",
                "https://*.sanity.io",
              ].join(" "),

              [
                "frame-src",
                "'self'",
                "https://*.sanity.io",
              ].join(" "),

              [
                "connect-src",
                "'self'",

                // Supabase
                "https://vnneqinjvfxqkukvcyzm.supabase.co",
                "wss://vnneqinjvfxqkukvcyzm.supabase.co",

                // Google Analytics
                "https://www.google-analytics.com",
                "https://stats.g.doubleclick.net",
                "https://www.googletagmanager.com",

                // Sanity
                "https://*.sanity.io",
                "wss://*.sanity.io",
              ].join(" "),

              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ]
              .join("; ")
              .concat(";"),
          },
        ],
      },
    ];
  },
};

/**
 * ============================================================
 * PWA
 * ============================================================
 */
export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,

  // Service Worker dimatikan saat development
  disable: process.env.NODE_ENV === "development",
})(nextConfig);