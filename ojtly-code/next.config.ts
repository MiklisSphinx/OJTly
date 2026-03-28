import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
// next.config.js
module.exports = {
  productionBrowserSourceMaps: false, // This ensures no source maps are created for public users
}