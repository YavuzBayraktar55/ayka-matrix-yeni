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
  
  // React Strict Mode'u devre dışı bırak (konsol gürültüsünü azaltır)
  // Development'ta false, production build öncesi true yapın
  reactStrictMode: false,
  
  // Watchpack hatalarını önle - sistem dosyalarını izleme
  webpack: (config, { isServer, dev }) => {
    // Development modunda console.log'ları sustur
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
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
  
  // Performans optimizasyonları
  experimental: {
    optimizePackageImports: ['@/components', '@/lib', '@/hooks'],
  },
};

export default nextConfig;
