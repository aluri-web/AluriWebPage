
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
          // CSP is set dynamically in middleware with per-request nonces
        ],
      },
    ];
  },
};

module.exports = nextConfig;
