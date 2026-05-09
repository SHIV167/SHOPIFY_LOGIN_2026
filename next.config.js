/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.shopify.com', 'your-app-domain.com'],
  },
};

module.exports = nextConfig;
