/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['technicalindicators', 'web-push'],
  },
};

export default nextConfig;
