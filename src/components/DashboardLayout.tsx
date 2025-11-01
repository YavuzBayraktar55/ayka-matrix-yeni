'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoading } from '@/contexts/LoadingContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  LogOut,
  User,
  Clock,
  Moon,
  Sun,
  ChevronUp,
  Terminal,
  X,
  ChevronDown,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Console log entry type
interface ConsoleLog {
  id: number;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: Date;
  expanded: boolean;
}

// Network request type
interface NetworkRequest {
  id: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  timestamp: Date;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  expanded: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isNavigating, startNavigation, stopNavigation } = useLoading();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Console panel state
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'console' | 'network'>('console');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [devMode, setDevMode] = useState(false);

  // Intercept console methods - DISABLED for performance
  // This was causing excessive re-renders
  useEffect(() => {
    // Console interception disabled to improve performance
    // If you need to debug, use browser DevTools console directly
  }, []);

  // Intercept fetch requests - DISABLED for performance
  useEffect(() => {
    // Network interception disabled to improve performance
    // Use browser DevTools Network tab for debugging
  }, []);

  // Dev Mode - DISABLED for performance
  // This feature was causing severe performance issues with MutationObserver
  // Use browser DevTools for debugging instead
  useEffect(() => {
    // Dev mode completely disabled
  }, []);

  // Loading'i pathname değişince durdur
  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  // Saat güncelleme
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const menuItems = [
    {
      name: 'Ana Sayfa',
      icon: LayoutDashboard,
      href: '/dashboard',
      roles: ['saha_personeli', 'koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Bölgeler',
      icon: MapPin,
      href: '/dashboard/bolgeler',
      roles: ['yonetici', 'insan_kaynaklari']
    },
    {
      name: 'Personel',
      icon: Users,
      href: '/dashboard/personel',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'İzin Talepleri',
      icon: Calendar,
      href: '/dashboard/izin-talepleri',
      roles: ['saha_personeli', 'koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Avans Talepleri',
      icon: DollarSign,
      href: '/dashboard/avans-talepleri',
      roles: ['saha_personeli', 'koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Aylık Puantaj',
      icon: Clock,
      href: '/dashboard/puantaj',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Evraklar',
      icon: FileText,
      href: '/dashboard/evraklar',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Şablon Düzenleyici',
      icon: FileText,
      href: '/dashboard/sablon-duzenleyici',
      roles: ['insan_kaynaklari', 'yonetici']
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    user && item.roles.includes(user.PersonelRole)
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'saha_personeli': 'Saha Personeli',
      'koordinator': 'Koordinatör',
      'insan_kaynaklari': 'İnsan Kaynakları',
      'yonetici': 'Yönetici'
    };
    return labels[role] || role;
  };

  return (
    <div className="fixed inset-0 min-h-screen overflow-hidden">
      {/* Background Image - Tam ekran, blur yok */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg.jpg)' }}
      />
      
      {/* Glassmorphism Container - Hafif blur ve şeffaf */}
      <div className="absolute inset-0">
        <div className={`
          w-full h-full
          ${isDark 
            ? 'bg-[#2d2d2d]/80 backdrop-blur-xl' 
            : 'bg-white/70 backdrop-blur-xl'
          }
          flex flex-col transition-all duration-500
        `}>
        
        {/* Content Area - Main */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Main Content - Modern Design */}
          <main
            className={`
              w-full overflow-y-auto transition-all duration-500 relative pb-24 sm:pb-28 md:pb-24
              ${isDark 
                ? 'bg-gradient-to-br from-gray-900/60 via-gray-800/50 to-gray-900/60' 
                : 'bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60'
              }
              backdrop-blur-md
            `}
            // make sure main content is padded above mobile browser UI (home indicator)
            style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
          >
            {/* Navigation Loading Overlay - Windows 11 Style */}
            {isNavigating && (
              <div className={`
                absolute inset-0 z-50 flex items-center justify-center
                ${isDark 
                  ? 'bg-gradient-to-br from-gray-900/90 via-gray-900/95 to-gray-900/90' 
                  : 'bg-gradient-to-br from-blue-50/90 via-white/95 to-purple-50/90'
                }
                backdrop-blur-xl
                animate-in fade-in duration-300
              `}>
                {/* Windows 11 Loading Animation */}
                <div className="relative flex flex-col items-center gap-6">
                  {/* Main Spinner with Gradient */}
                  <div className="relative w-20 h-20">
                    {/* Outer glow ring */}
                    <div className={`absolute inset-0 rounded-full blur-xl ${isDark ? 'bg-blue-500/30' : 'bg-blue-400/40'} animate-pulse`}></div>
                    
                    {/* Spinning gradient ring */}
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 rounded-full border-[3px] border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-spin [animation-duration:1.5s]"
                        style={{ 
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          padding: '3px'
                        }}
                      ></div>
                      
                      {/* Center dot */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Loading Text */}
                  <div className="flex flex-col items-center gap-2">
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} animate-pulse`}>
                      Yükleniyor
                    </p>
                    {/* Animated dots */}
                    <div className="flex gap-1">
                      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'} animate-bounce [animation-delay:-0.3s]`}></div>
                      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'} animate-bounce [animation-delay:-0.15s]`}></div>
                      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'} animate-bounce`}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Content Container - Modern Card Style */}
            <div className="p-4 sm:p-6 md:p-8 lg:p-10">
              <div className={`
                rounded-2xl sm:rounded-3xl overflow-hidden
                ${isDark 
                  ? 'bg-gray-800/40 shadow-2xl shadow-black/20' 
                  : 'bg-white/40 shadow-2xl shadow-gray-900/10'
                }
                backdrop-blur-xl border
                ${isDark ? 'border-gray-700/50' : 'border-white/50'}
                transition-all duration-500
                hover:shadow-3xl
                ${isDark 
                  ? 'hover:bg-gray-800/50 hover:border-gray-600/50' 
                  : 'hover:bg-white/50 hover:border-white/60'
                }
              `}>
                <div className="p-4 sm:p-6 md:p-8">
                  {children}
                </div>
              </div>
            </div>
          </main>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div 
                className={cn(
                  'absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto',
                  isDark 
                    ? 'bg-gray-900/98 border-t border-gray-700/50' 
                    : 'bg-white/98 border-t border-gray-300/50',
                  'backdrop-blur-2xl shadow-2xl slide-in-from-bottom'
                )}
                onClick={(e) => e.stopPropagation()}
                  // ensure mobile panel content respects safe-area (home indicator)
                  style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn(
                    'text-xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Menü
                  </h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isDark 
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          startNavigation();
                          router.push(item.href);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200',
                          isActive
                            ? isDark 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                              : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : isDark
                              ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                              : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        <Icon className="w-7 h-7" />
                        <span className="text-sm font-medium text-center">{item.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* User Info in Mobile Menu */}
                <div className={cn(
                  'p-4 rounded-2xl mb-3',
                  isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'
                )}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm font-semibold',
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      )}>
                        {user?.PersonelInfo?.P_AdSoyad || 'Kullanıcı'}
                      </p>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {getRoleLabel(user?.PersonelRole || '')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors',
                      isDark 
                        ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Çıkış Yap</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Windows Taskbar Style - Alt - Desktop */}
          <div className="fixed left-0 right-0 z-[9999]" style={{ bottom: 'env(safe-area-inset-bottom)', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
            <div className={cn(
              'flex items-center justify-between px-2 sm:px-3 py-2 sm:py-2.5 border-t',
              isDark 
                ? 'bg-gray-900/98 border-gray-700/50' 
                : 'bg-gray-100/98 border-gray-300/50',
              'backdrop-blur-2xl shadow-2xl'
            )}>
              {/* Sol - Logo + Mobile Menu Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Mobile Menu Button - Only on small screens */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className={cn(
                    'md:hidden p-1.5 rounded-lg transition-colors',
                    isDark 
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  )}
                  title="Menü"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {/* Constrain logo to taskbar sizes so it doesn't resize the bar. Use different image for dark mode if provided. */}
                <img src={isDark ? '/logoLGT.png' : '/logo.png'} alt="Ayka Logo" className=" h-6 sm:h-9 " />
              </div>

              {/* Orta - Menü Items - Hidden on Mobile, Show on Desktop */}
              <div className="hidden md:flex flex-1 overflow-x-auto overflow-y-hidden mx-1 sm:mx-2 scrollbar-hide">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-max w-full">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          startNavigation();
                          router.push(item.href);
                        }}
                        className={cn(
                          'group/taskbar relative flex flex-col items-center gap-0 sm:gap-0.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex-shrink-0',
                          isActive
                            ? isDark 
                              ? 'bg-gray-700 text-blue-400' 
                              : 'bg-gray-200 text-blue-600'
                            : isDark
                              ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                        )}
                        title={item.name}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-[8px] sm:text-[9px] font-medium">{item.name}</span>
                        
                        {/* Active indicator - Alt çizgi */}
                        {isActive && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-blue-500 rounded-t-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile - Current Page Indicator */}
              <div className="flex-1 flex items-center justify-center md:hidden">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  if (!isActive) return null;

                  return (
                    <div 
                      key={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                        isDark ? 'text-blue-400' : 'text-blue-600'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{item.name}</span>
                    </div>
                  );
                })}
              </div>

              {/* Sağ - User Panel + Tema + Saat */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {/* Tema Toggle */}
                <button
                  onClick={toggleTheme}
                  className={cn(
                    'p-1.5 sm:p-2 rounded-lg transition-colors',
                    isDark 
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-yellow-400' 
                      : 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
                  )}
                  title={isDark ? 'Açık Mod' : 'Koyu Mod'}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>

                {/* Saat - Gizle çok küçük ekranlarda */}
                <div className={cn(
                  'hidden sm:block px-2 sm:px-3 py-1 sm:py-2 rounded-lg cursor-default',
                  isDark ? 'text-gray-300' : 'text-gray-700'
                )}>
                  <div className="text-right leading-tight">
                    <div className="text-[10px] sm:text-xs font-semibold">
                      {currentTime.toLocaleTimeString('tr-TR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-[8px] sm:text-[9px]">
                      {currentTime.toLocaleDateString('tr-TR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                {/* User Panel */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={cn(
                      'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200',
                      profileOpen
                        ? isDark ? 'bg-gray-700' : 'bg-gray-200'
                        : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                    )}
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className={cn(
                        'text-xs font-semibold leading-tight',
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      )}>
                        {user?.PersonelInfo?.P_AdSoyad || 'Kullanıcı'}
                      </p>
                      <p className={cn(
                        'text-[10px] leading-tight',
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {user && getRoleLabel(user.PersonelRole)}
                      </p>
                    </div>
                    <ChevronUp className={cn(
                      'w-3 h-3 transition-transform duration-200 hidden sm:block',
                      profileOpen ? 'rotate-180' : '',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )} />
                  </button>

                  {/* User Dropdown - Yukarı açılır */}
                  {profileOpen && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-[90]" 
                        onClick={() => setProfileOpen(false)}
                      />
                      
                      {/* Panel */}
                      <div className={cn(
                        'absolute right-0 bottom-full mb-2 w-64 sm:w-72 rounded-xl shadow-2xl overflow-hidden border z-[100]',
                        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      )}>
                        <div className={cn(
                          'px-3 sm:px-4 py-3 sm:py-4 border-b',
                          isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                        )}>
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-semibold truncate',
                                isDark ? 'text-white' : 'text-gray-900'
                              )}>
                                {user?.PersonelInfo?.P_AdSoyad}
                              </p>
                              <p className={cn(
                                'text-xs mt-0.5 truncate',
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              )}>
                                {user && getRoleLabel(user.PersonelRole)}
                              </p>
                            </div>
                          </div>
                          {user?.BolgeInfo?.BolgeAdi && (
                            <div className={cn(
                              'flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg',
                              isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'
                            )}>
                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="text-xs font-medium truncate">{user.BolgeInfo.BolgeAdi}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2">
                          {/* Console button - DISABLED for performance
                          {user?.PersonelRole === 'yonetici' && (
                            <button
                              onClick={() => {
                                setConsoleOpen(!consoleOpen);
                                setProfileOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors mb-1',
                                consoleOpen
                                  ? isDark 
                                    ? 'bg-green-900/30 text-green-300' 
                                    : 'bg-green-100 text-green-700'
                                  : isDark 
                                    ? 'text-green-400 hover:bg-green-900/20' 
                                    : 'text-green-600 hover:bg-green-50'
                              )}
                            >
                              <Terminal className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium">Konsol Ekranı</span>
                              {consoleOpen && (
                                <span className={cn(
                                  'ml-auto text-xs px-1.5 py-0.5 rounded',
                                  isDark ? 'bg-green-700/50' : 'bg-green-600/20'
                                )}>
                                  Açık
                                </span>
                              )}
                            </button>
                          )}
                          */}
                          <button
                            onClick={() => {
                              setShowProfileInfo(true);
                              setProfileOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors mb-1',
                              isDark 
                                ? 'text-blue-400 hover:bg-blue-900/20' 
                                : 'text-blue-600 hover:bg-blue-50'
                            )}
                          >
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">Bilgilerim</span>
                          </button>
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              router.push('/reset-password');
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors mb-1',
                              isDark 
                                ? 'text-purple-400 hover:bg-purple-900/20' 
                                : 'text-purple-600 hover:bg-purple-50'
                            )}
                          >
                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span className="text-sm font-medium">Şifremi Sıfırla</span>
                          </button>
                          <button
                            onClick={handleSignOut}
                            className={cn(
                              'w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors',
                              isDark 
                                ? 'text-red-400 hover:bg-red-900/20' 
                                : 'text-red-600 hover:bg-red-50'
                            )}
                          >
                            <LogOut className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">Çıkış Yap</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Console Panel - DISABLED for performance */}
      {false && user?.PersonelRole === 'yonetici' && consoleOpen && (
        <div 
          className={cn(
            'fixed left-0 top-0 bottom-0 sm:bottom-16 w-full sm:w-[500px] md:w-[600px] z-[9998] shadow-2xl',
            'transition-transform duration-300 ease-in-out',
            isDark ? 'bg-gray-900/98 border-r border-gray-700' : 'bg-white/98 border-r border-gray-300',
            'backdrop-blur-xl'
          )}
          style={{ transform: consoleOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 border-b',
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100/50 border-gray-200'
          )}>
            <div className="flex items-center gap-2">
              <Terminal className={cn('w-5 h-5', isDark ? 'text-green-400' : 'text-green-600')} />
              <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                Yönetici Konsolu
              </h3>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded',
                isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
              )}>
                Canlı
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Dev Mode Toggle */}
              <button
                onClick={() => setDevMode(!devMode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  devMode
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
                title={devMode ? 'Dev Mode Aktif - Elementler vurgulanıyor' : 'Dev Mode\'u Aç'}
              >
                <svg 
                  className="w-3.5 h-3.5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Dev Mode
                {devMode && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setConsoleOpen(false)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={cn(
            'flex border-b',
            isDark ? 'border-gray-700' : 'border-gray-200'
          )}>
            <button
              onClick={() => setConsoleTab('console')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                consoleTab === 'console'
                  ? isDark
                    ? 'bg-gray-800 text-white border-b-2 border-green-500'
                    : 'bg-gray-50 text-gray-900 border-b-2 border-green-600'
                  : isDark
                    ? 'text-gray-400 hover:bg-gray-800/50'
                    : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              Console ({consoleLogs.length})
            </button>
            <button
              onClick={() => setConsoleTab('network')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                consoleTab === 'network'
                  ? isDark
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'bg-gray-50 text-gray-900 border-b-2 border-blue-600'
                  : isDark
                    ? 'text-gray-400 hover:bg-gray-800/50'
                    : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              Network ({networkRequests.length})
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
            {consoleTab === 'console' ? (
              <div className="p-2">
                {consoleLogs.length === 0 ? (
                  <div className={cn(
                    'text-center py-8 text-sm',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    Henüz konsol mesajı yok
                  </div>
                ) : (
                  consoleLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'p-2 mb-1 rounded text-xs font-mono border-l-2',
                        log.type === 'error' 
                          ? isDark ? 'bg-red-900/20 border-red-500 text-red-300' : 'bg-red-50 border-red-500 text-red-700'
                          : log.type === 'warn'
                          ? isDark ? 'bg-yellow-900/20 border-yellow-500 text-yellow-300' : 'bg-yellow-50 border-yellow-500 text-yellow-700'
                          : log.type === 'info'
                          ? isDark ? 'bg-blue-900/20 border-blue-500 text-blue-300' : 'bg-blue-50 border-blue-500 text-blue-700'
                          : isDark ? 'bg-gray-800/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-400 text-gray-700'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn('text-[10px] opacity-60 shrink-0')}>
                          {log.timestamp.toLocaleTimeString('tr-TR')}
                        </span>
                        <button
                          onClick={() => {
                            setConsoleLogs(prev => prev.map(l => 
                              l.id === log.id ? { ...l, expanded: !l.expanded } : l
                            ));
                          }}
                          className="shrink-0 mt-0.5"
                        >
                          {log.expanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <div className="flex-1 break-all">
                          <div className={cn('font-semibold text-[10px] mb-0.5 uppercase')}>
                            {log.type}
                          </div>
                          <pre className={cn('whitespace-pre-wrap', !log.expanded && 'line-clamp-3')}>
                            {log.message}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-2">
                {networkRequests.length === 0 ? (
                  <div className={cn(
                    'text-center py-8 text-sm',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    Henüz ağ isteği yok
                  </div>
                ) : (
                  networkRequests.map((req) => (
                    <div
                      key={req.id}
                      className={cn(
                        'p-2 mb-2 rounded text-xs border',
                        isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0',
                            req.method === 'GET'
                              ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : req.method === 'POST'
                              ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                              : req.method === 'PUT' || req.method === 'PATCH'
                              ? isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                              : isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                          )}>
                            {req.method}
                          </span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0',
                            req.status && req.status >= 200 && req.status < 300
                              ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                              : req.status && req.status >= 400
                              ? isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          )}>
                            {req.status || 'Failed'}
                          </span>
                          <span className={cn('text-[10px] opacity-60 shrink-0')}>
                            {req.duration}ms
                          </span>
                          <button
                            onClick={() => {
                              setNetworkRequests(prev => prev.map(r => 
                                r.id === req.id ? { ...r, expanded: !r.expanded } : r
                              ));
                            }}
                            className="shrink-0"
                          >
                            {req.expanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className={cn('text-[10px] opacity-60 shrink-0 ml-2')}>
                          {req.timestamp.toLocaleTimeString('tr-TR')}
                        </span>
                      </div>
                      <div className={cn(
                        'text-xs break-all',
                        isDark ? 'text-blue-300' : 'text-blue-600',
                        !req.expanded && 'truncate'
                      )}>
                        {req.url}
                      </div>
                      {req.expanded && (
                        <div className="mt-2 space-y-2">
                          {req.requestHeaders && Object.keys(req.requestHeaders).length > 0 && (
                            <div>
                              <div className={cn('text-[10px] font-semibold mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                                Request Headers:
                              </div>
                              <pre className={cn(
                                'text-[10px] p-2 rounded overflow-x-auto',
                                isDark ? 'bg-gray-900/50' : 'bg-white'
                              )}>
                                {JSON.stringify(req.requestHeaders, null, 2)}
                              </pre>
                            </div>
                          )}
                          {req.requestBody && (
                            <div>
                              <div className={cn('text-[10px] font-semibold mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                                Request Body:
                              </div>
                              <pre className={cn(
                                'text-[10px] p-2 rounded overflow-x-auto max-h-40',
                                isDark ? 'bg-gray-900/50' : 'bg-white'
                              )}>
                                {req.requestBody}
                              </pre>
                            </div>
                          )}
                          {req.responseHeaders && Object.keys(req.responseHeaders).length > 0 && (
                            <div>
                              <div className={cn('text-[10px] font-semibold mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                                Response Headers:
                              </div>
                              <pre className={cn(
                                'text-[10px] p-2 rounded overflow-x-auto',
                                isDark ? 'bg-gray-900/50' : 'bg-white'
                              )}>
                                {JSON.stringify(req.responseHeaders, null, 2)}
                              </pre>
                            </div>
                          )}
                          {req.responseBody && (
                            <div>
                              <div className={cn('text-[10px] font-semibold mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                                Response:
                              </div>
                              <pre className={cn(
                                'text-[10px] p-2 rounded overflow-x-auto max-h-60',
                                isDark ? 'bg-gray-900/50' : 'bg-white'
                              )}>
                                {req.responseBody.length > 1000 
                                  ? req.responseBody.slice(0, 1000) + '...\n[Truncated]'
                                  : req.responseBody
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer - Clear buttons */}
          <div className={cn(
            'absolute bottom-0 left-0 right-0 px-4 py-2 border-t flex gap-2',
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100/50 border-gray-200'
          )}>
            <button
              onClick={() => {
                if (consoleTab === 'console') {
                  setConsoleLogs([]);
                } else {
                  setNetworkRequests([]);
                }
              }}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                isDark 
                  ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              )}
            >
              {consoleTab === 'console' ? 'Konsolu Temizle' : 'Network\'ü Temizle'}
            </button>
          </div>
        </div>
      )}

      {/* Bilgilerim Modal */}
      {showProfileInfo && (
        <>
          {/* Container - stops before taskbar */}
          <div 
            className="fixed inset-0 z-[9999] overflow-hidden"
            style={{ position: 'fixed', bottom: '60px' }}
          >
            {/* Backdrop - stops before taskbar */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowProfileInfo(false)}
              style={{ position: 'fixed', bottom: '60px' }}
            />
            
            {/* Modal Content - full screen */}
            <div 
              className={cn(
                'rounded-none shadow-2xl w-full overflow-y-auto animate-scale-in',
                isDark ? 'bg-gray-800/95' : 'bg-white/95'
              )}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: '60px',
                width: '100%',
                zIndex: 10000
              }}
            >
              {/* Header */}
              <div className={cn(
                'px-6 py-5 border-b flex items-center justify-between',
                isDark ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-gray-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-gray-200'
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={cn(
                      'text-xl font-bold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      Bilgilerim
                    </h2>
                    <p className={cn(
                      'text-sm',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      Profil detaylarınız
                    </p>
                  </div>
                </div>
                {/* Windows style close button */}
                <button
                  onClick={() => setShowProfileInfo(false)}
                  className={cn(
                    'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  )}
                  title="Kapat"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {/* Kişisel Bilgiler */}
                  <div className={cn(
                    'p-3 sm:p-4 rounded-xl border',
                    isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-3 flex items-center gap-2',
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    )}>
                      <User className="w-4 h-4" />
                      Kişisel Bilgiler
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoField 
                        label="Ad Soyad" 
                        value={user?.PersonelInfo?.P_AdSoyad || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="TC Kimlik No" 
                        value={user?.PersonelTcKimlik?.toString() || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Doğum Tarihi" 
                        value={user?.PersonelInfo?.P_DogumTarihi ? new Date(user.PersonelInfo.P_DogumTarihi).toLocaleDateString('tr-TR') : '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Doğum Yeri" 
                        value={user?.PersonelInfo?.P_DogumYeri || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Baba Adı" 
                        value={user?.PersonelInfo?.P_BabaAdi || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Kan Grubu" 
                        value={user?.PersonelInfo?.P_KanGrubu || '-'} 
                        isDark={isDark} 
                      />
                    </div>
                  </div>

                  {/* İletişim Bilgileri */}
                  <div className={cn(
                    'p-3 sm:p-4 rounded-xl border',
                    isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-3 flex items-center gap-2',
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    )}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      İletişim
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoField 
                        label="E-posta" 
                        value={user?.PersonelEmail || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Telefon" 
                        value={user?.PersonelInfo?.P_TelNo || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Adres" 
                        value={user?.PersonelInfo?.P_Adres || '-'} 
                        isDark={isDark}
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* İş Bilgileri */}
                  <div className={cn(
                    'p-3 sm:p-4 rounded-xl border',
                    isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-3 flex items-center gap-2',
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    )}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      İş Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoField 
                        label="Rol" 
                        value={user ? getRoleLabel(user.PersonelRole) : '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Görev" 
                        value={user?.PersonelInfo?.P_Gorevi || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Şube" 
                        value={user?.PersonelInfo?.P_Sube || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Kıdem Tarihi" 
                        value={user?.PersonelInfo?.P_KidemTarihi ? new Date(user.PersonelInfo.P_KidemTarihi).toLocaleDateString('tr-TR') : '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Sözleşme Tarihi" 
                        value={user?.PersonelInfo?.P_AykaSozlesmeTarihi ? new Date(user.PersonelInfo.P_AykaSozlesmeTarihi).toLocaleDateString('tr-TR') : '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Medeni Hal" 
                        value={user?.PersonelInfo?.P_MedeniHali ? 'Evli' : 'Bekar'} 
                        isDark={isDark} 
                      />
                    </div>
                  </div>

                  {/* Bölge Bilgileri */}
                  {user?.BolgeInfo && (
                    <div className={cn(
                      'p-3 sm:p-4 rounded-xl border',
                      isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'
                    )}>
                      <h3 className={cn(
                        'text-sm font-semibold mb-3 flex items-center gap-2',
                        isDark ? 'text-blue-300' : 'text-blue-700'
                      )}>
                        <MapPin className="w-4 h-4" />
                        Bölge
                      </h3>
                      <InfoField 
                        label="Bölge Adı" 
                        value={user.BolgeInfo.BolgeAdi || '-'} 
                        isDark={isDark}
                        highlight
                      />
                    </div>
                  )}

                  {/* Eğitim ve Belgeler */}
                  <div className={cn(
                    'p-3 sm:p-4 rounded-xl border',
                    isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-3 flex items-center gap-2',
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    )}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Eğitim ve Belgeler
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoField 
                        label="Mezuniyet" 
                        value={user?.PersonelInfo?.P_Mezuniyet || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Bölüm" 
                        value={user?.PersonelInfo?.P_Bolum || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Ehliyet" 
                        value={user?.PersonelInfo?.P_Ehliyet || '-'} 
                        isDark={isDark} 
                      />
                      <InfoField 
                        label="Askerlik Durumu" 
                        value={user?.PersonelInfo?.P_AskerlikDurum || '-'} 
                        isDark={isDark} 
                      />
                    </div>
                  </div>

                  {/* Banka Bilgileri */}
                  {user?.PersonelInfo?.P_IBANno && (
                    <div className={cn(
                      'p-3 sm:p-4 rounded-xl border',
                      isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200'
                    )}>
                      <h3 className={cn(
                        'text-sm font-semibold mb-3 flex items-center gap-2',
                        isDark ? 'text-green-300' : 'text-green-700'
                      )}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Banka Bilgileri
                      </h3>
                      <InfoField 
                        label="IBAN" 
                        value={user.PersonelInfo.P_IBANno} 
                        isDark={isDark}
                        highlight
                        fullWidth
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={cn(
                'px-6 py-4 border-t flex justify-end',
                isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
              )}>
                <button
                  onClick={() => setShowProfileInfo(false)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Info Field Component
function InfoField({ 
  label, 
  value, 
  isDark, 
  fullWidth = false,
  highlight = false 
}: { 
  label: string; 
  value: string; 
  isDark: boolean;
  fullWidth?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className={cn(
        'text-xs mb-1',
        isDark ? 'text-gray-400' : 'text-gray-600'
      )}>
        {label}
      </p>
      <p className={cn(
        'text-sm font-medium break-words',
        highlight 
          ? isDark ? 'text-blue-300' : 'text-blue-600'
          : isDark ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
    </div>
  );
}