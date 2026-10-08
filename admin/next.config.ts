import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every admin URL lives under /admin (e.g. http://localhost:3000/admin/providers).
  basePath: "/admin",
  async redirects() {
    return [
      { source: "/", destination: "/admin/dashboard", basePath: false, permanent: false },
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
