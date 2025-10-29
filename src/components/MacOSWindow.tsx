'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Minus, Maximize2 } from 'lucide-react';

interface MacOSWindowProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function MacOSWindow({ title, icon, children, actions, className = '' }: MacOSWindowProps) {
  const { isDark } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  const handleClose = () => {
    if (confirm('Sayfayı kapatmak istediğinizden emin misiniz?')) {
      window.history.back();
    }
  };

  const handleMinimize = () => {
    // Şimdilik işlevsiz - gelecekte minimize özelliği eklenebilir
    // setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f7]'} p-8 transition-colors duration-200 ${className}`}>
      <div className={`max-w-7xl mx-auto ${isDark ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'} ${isMaximized ? 'fixed inset-8 max-w-none' : ''} transition-all duration-300`}>
        {/* macOS Title Bar */}
        <div className={`${isDark ? 'bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-gray-700' : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'} border-b px-4 py-3`}>
          <div className="flex items-center justify-between">
            {/* Sol Üst - 3 Renkli İşlevsel Nokta */}
            <div className="flex items-center gap-2 group">
              <button 
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] shadow-sm transition-all relative group/close"
                title="Kapat"
              >
                <X className="w-2 h-2 text-[#8B0000] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/close:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button 
                onClick={handleMinimize}
                className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm transition-all relative group/minimize cursor-default"
                title="Şimdilik işlevsiz"
              >
                <Minus className="w-2 h-2 text-[#8B6914] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/minimize:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button 
                onClick={handleMaximize}
                className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#20A038] shadow-sm transition-all relative group/maximize"
                title={isMaximized ? "Pencere Boyutu" : "Tam Ekran"}
              >
                <Maximize2 className="w-2 h-2 text-[#145E1E] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/maximize:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
            </div>
            
            {/* Orta - Başlık */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
              {icon && <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{icon}</span>}
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{title}</span>
            </div>
            
            {/* Sağ - Actions */}
            <div className="flex items-center gap-2">
              {actions}
            </div>
          </div>
        </div>
        
        {/* İçerik Alanı */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
