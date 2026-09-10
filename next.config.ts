import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Do NOT use `output: "standalone"` with @netlify/plugin-nextjs.
  // The plugin handles the serverless conversion from the standard `.next`
  // build output automatically.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
