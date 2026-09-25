/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  eslint: {
    // Prevents ESLint 8/9 circular dependency crashes from blocking builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ensures real TypeScript code bugs are still validated
    ignoreBuildErrors: false,
  },
};

export default nextConfig;