/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["firebasestorage.googleapis.com"],
    unoptimized: true,
  },
  experimental: {
    esmExternals: false,
  },
}

module.exports = nextConfig
