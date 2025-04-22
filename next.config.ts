import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    config.output = {
      ...config.output,
      publicPath: '/',
    };
    return config;
  },
};

export default nextConfig;

