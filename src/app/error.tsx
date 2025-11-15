'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hata loglama servisi kullanılabilir (Sentry, Datadog, etc.)
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* MacOS Style Window */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
          {/* Window Header */}
          <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2 border-b border-gray-200">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 text-center text-sm font-medium text-gray-700">
              Hata
            </div>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bir Hata Oluştu
            </h1>

            <p className="text-gray-600 mb-6">
              {error.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'}
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-700 break-all">
                  {error.stack?.split('\n').slice(0, 3).join('\n')}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tekrar Dene
              </button>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Ana Sayfa
              </Link>
            </div>

            {/* Error ID (for support) */}
            {error.digest && (
              <p className="mt-6 text-xs text-gray-400">
                Hata Kodu: {error.digest}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Sorun devam ederse lütfen sistem yöneticisi ile iletişime geçin.
        </p>
      </div>
    </div>
  );
}
