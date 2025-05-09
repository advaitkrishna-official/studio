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

    // Ignore async_hooks module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      async_hooks: false,
    };
    return config;
  },
  env: {
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  },
};

export default nextConfig;
