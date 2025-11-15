import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Production'da console.log'ları kaldır (performans için)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { 
          exclude: ['error', 'warn'] // error ve warn tutulur
        } 
      : false,
  },
  // Watchpack hatalarını önle - sistem dosyalarını izleme
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/C:/DumpStack.log.tmp',
        '**/C:/System Volume Information',
        '**/C:/hiberfil.sys',
        '**/C:/pagefile.sys',
        '**/C:/swapfile.sys',
        '**/C:/$RECYCLE.BIN/**',
      ],
    };
    return config;
  },
};

export default nextConfig;
