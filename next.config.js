/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bilder.vinmonopolet.no',
      },
    ],
  },
};

module.exports = nextConfig;
