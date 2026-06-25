import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
let supabaseHost = ''
try {
  if (supabaseUrl) supabaseHost = new URL(supabaseUrl).host
} catch {
  // ignore — env not set at build time
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `img-src 'self' data: blob: https://*.supabase.co${supabaseHost ? ` https://${supabaseHost}` : ''}`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''}`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  experimental: {
    // Avatars and post images are uploaded through Server Actions; the default
    // 1 MB body cap rejects most photos. Raise it to cover our 2 MB avatar /
    // 5 MB post-image validation ceilings (with headroom for multipart overhead).
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
