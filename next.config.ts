import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output as standalone for Docker deployment
  output: "standalone",

  // Enable image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "**.aliyuncs.com", // Aliyun OSS
      },
      {
        protocol: "https",
        hostname: "**.oss-cn-**.aliyuncs.com", // Aliyun OSS regional
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com", // Cloudflare R2
      },
      {
        protocol: "https",
        hostname: "pub-**.pages.dev", // Cloudflare Pages
      },
      {
        protocol: "https",
        hostname: "tambra-**.ngrok-free.dev", // ngrok for development
      },
    ],
    // Enable modern image formats
    formats: ["image/avif", "image/webp"],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for responsive images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum cache TTL for optimized images
    minimumCacheTTL: 60 * 60 * 24, // 1 day
  },

  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["@/components/ui", "@/lib"],
  },

  // Enable compression
  compress: true,

  // Generate ETags for caching
  generateEtags: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // XSS protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // API routes - stricter headers
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
