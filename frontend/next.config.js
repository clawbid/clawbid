/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // No hardcoded fallback URLs - use Railway env vars
};

module.exports = nextConfig;
