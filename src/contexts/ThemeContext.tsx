'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ayka-theme') as Theme | null;
    if (saved) {
      setTheme(saved);
    } else {
      // Sistem tercihini kontrol et
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('ayka-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setIsTransitioning(true);
    
    // İlk overlay gelir, ikon büyür (0-500ms)
    // İkon kaybolur (500-600ms)
    setTimeout(() => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, 600);
    
    // Yeni ikon belirir (600-700ms)
    // Overlay gider (700-1200ms)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
      
      {/* Tam Ekran Geçiş Overlay */}
      <div 
        className={`fixed inset-0 z-[9999] pointer-events-none transition-all duration-500 flex items-center justify-center ${
          isTransitioning 
            ? 'opacity-100' 
            : 'opacity-0'
        }`}
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)' 
            : 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)',
        }}
      >
        {/* Büyük İkon - Tema değişirken */}
        <div className={`transition-all duration-500 ease-in-out ${isTransitioning ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'}`}>
          {theme === 'dark' ? (
            // Ay İkonu
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" className="drop-shadow-2xl">
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="#FDB813"
                stroke="#FDB813"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Güneş İkonu
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" className="drop-shadow-2xl">
              <circle cx="12" cy="12" r="5" fill="#FDB813" stroke="#FDB813" strokeWidth="2" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // SSR sırasında default değer döndür
    return { isDark: false, toggleTheme: () => {} };
  }
  return context;
}
