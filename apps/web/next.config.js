/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'react-native': 'react-native-web',
      'lucide-react-native': 'lucide-react',
    };

    return config;
  },
};

module.exports = nextConfig;
