
/** @type {import('next').NextConfig} */
const staticPages = [
  'index',
  'inversionistas',
  'propietarios',
  'nosotros',
  'politica-privacidad',
  'terminos-condiciones',
  'login-inversionistas',
  'login-propietarios',
  'ty',
  'formulario-gohighlevel-test',
];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      ...staticPages
        .filter((page) => page !== 'index')
        .map((page) => ({
          source: `/${page}.html`,
          destination: `/${page}`,
          permanent: true,
        })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'aluri-property-photos.s3.us-east-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.us-east-1.amazonaws.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      ...staticPages
        .filter((page) => page !== 'index')
        .map((page) => ({
          source: `/${page}`,
          destination: `/${page}.html`,
        })),
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://link.msgsndr.com https://api.leadconnectorhq.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.s3.amazonaws.com https://*.s3.us-east-1.amazonaws.com https://lh3.googleusercontent.com https://i.pravatar.cc",
              "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://www.google-analytics.com https://api.leadconnectorhq.com",
              "frame-src 'self' https://js.stripe.com https://api.leadconnectorhq.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
