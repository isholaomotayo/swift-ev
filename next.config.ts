import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses this project as root (avoids wrong root when parent has a lockfile).
  turbopack: { root: path.join(process.cwd()) },
  // Prefer this project's node_modules so "tailwindcss" and other deps resolve
  // here instead of a parent directory (e.g. $HOME with its own package.json).
  webpack: (config, { dir }) => {
    const projectDir = path.resolve(dir ?? process.cwd());
    const projectNodeModules = path.join(projectDir, "node_modules");
    config.resolve = config.resolve ?? {};
    const existing = Array.isArray(config.resolve.modules) ? config.resolve.modules : [];
    config.resolve.modules = [projectNodeModules, ...existing];
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.convex.site',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
