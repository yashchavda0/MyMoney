import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray parent lockfile otherwise misleads Turbopack.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  // Never serve a stale prefetched segment — every navigation to a data page
  // refetches, so a just-added transaction shows everywhere immediately.
  experimental: {
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
