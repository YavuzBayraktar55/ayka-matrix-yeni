'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f7]'} transition-all duration-500 flex items-center justify-center relative overflow-hidden`}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 transition-opacity duration-500"
        style={{ backgroundImage: 'url(/bg.jpg)' }}
      />
      
      {/* Loading Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* macOS Style Loading Window */}
        <div className={`${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 w-80`}>
          {/* Title Bar */}
          <div className={`${isDark ? 'bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-gray-700' : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'} border-b px-4 py-3 transition-all duration-500`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-sm"></div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white rounded-lg px-2 py-1 shadow-sm">
                <img src="/logo.png" alt="Ayka Logo" className="w-5 h-5 object-contain" />
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} transition-colors duration-500`}>Ayka Matrix</span>
              </div>
              <div className="w-[52px]"></div>
            </div>
          </div>
          
          {/* Content */}
          <div className={`p-8 flex flex-col items-center gap-6 ${isDark ? 'bg-[#2d2d2d]' : 'bg-white'} transition-all duration-500`}>
            {/* Logo with Pulse Animation */}
            <div className="relative">
              <div className={`absolute inset-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-500/20'} rounded-2xl animate-ping`}></div>
              <div className="relative w-20 h-20 rounded-2xl bg-white flex items-center justify-center transition-all duration-500">
                <img src="/logo.png" alt="Ayka Logo" className="w-12 h-12 object-contain animate-pulse" />
              </div>
            </div>
            
            {/* Loading Text */}
            <div className="text-center">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-500`}>
                Yükleniyor
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-500`}>
                Lütfen bekleyin...
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className={`w-full h-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden transition-all duration-500`}>
              <div className={`h-full ${isDark ? 'bg-blue-500' : 'bg-blue-500'} rounded-full animate-pulse`} style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

