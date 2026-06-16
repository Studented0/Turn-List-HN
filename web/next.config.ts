import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep xlsx (SheetJS) on the server — it uses Node.js fs and must never
  // be bundled into the client JavaScript.
  serverExternalPackages: ['xlsx'],
}

export default nextConfig
