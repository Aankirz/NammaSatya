import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // silence ts/eslint build errors for now so the dev server starts clean
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

export default nextConfig
