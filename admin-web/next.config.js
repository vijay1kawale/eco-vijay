/** @type {import('next').NextConfig} */
const neubrainUrl = process.env.NEUBRAIN_URL || 'http://localhost:3000';

const nextConfig = {
  basePath: '/ecovijay-app',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow Neubrain to embed this app in an iframe
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${neubrainUrl}`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
