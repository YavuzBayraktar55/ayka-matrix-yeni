'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, Calendar, DollarSign, FileText, TrendingUp, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'saha_personeli': 'Saha Personeli',
      'koordinator': 'Koordinatör',
      'insan_kaynaklari': 'İnsan Kaynakları',
      'yonetici': 'Yönetici'
    };
    return labels[role] || role;
  };

  const stats = [
    {
      name: 'Aktif Personel',
      value: '247',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Bekleyen İzinler',
      value: '12',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Bekleyen Avanslar',
      value: '8',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      roles: ['koordinator', 'insan_kaynaklari', 'yonetici']
    },
    {
      name: 'Toplam Bölge',
      value: '20',
      icon: MapPin,
      color: 'from-orange-500 to-red-500',
      roles: ['yonetici', 'insan_kaynaklari']
    },
  ];

  const filteredStats = stats.filter(stat =>
    user && stat.roles.includes(user.PersonelRole)
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8">
            {/* Welcome Section - Modern Hero */}
            <div className={`
              relative overflow-hidden rounded-2xl sm:rounded-3xl p-8 sm:p-10 border
              ${isDark 
                ? 'bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 border-blue-500/30' 
                : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-300/30'
              }
              backdrop-blur-md shadow-xl
            `}>
              {/* Decorative elements - Daha hafif blur */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/20 to-orange-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    w-16 h-16 sm:w-20 sm:h-20 rounded-2xl 
                    bg-gradient-to-br from-blue-500 to-purple-600 
                    flex items-center justify-center shadow-xl
                  `}>
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                      Hoş Geldiniz 👋
                    </h1>
                    <p className={`text-lg sm:text-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user?.PersonelInfo?.P_AdSoyad || 'Kullanıcı'}
                    </p>
                  </div>
                </div>
                <div className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full
                  ${isDark 
                    ? 'bg-blue-500/20 border border-blue-400/30' 
                    : 'bg-blue-500/10 border border-blue-500/20'
                  }
                `}>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {user && getRoleLabel(user.PersonelRole)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid - Modern Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.name}
                    className={`
                      group relative overflow-hidden rounded-2xl p-6 border
                      ${isDark 
                        ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/70' 
                        : 'bg-white/50 border-gray-200/50 hover:bg-white/70 hover:border-gray-300/70'
                      }
                      backdrop-blur-md shadow-lg hover:shadow-xl
                      transform hover:-translate-y-1 transition-all duration-200
                      cursor-pointer
                    `}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`}></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`
                          w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} 
                          flex items-center justify-center shadow-lg
                          group-hover:scale-105 transition-transform duration-200
                        `}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex items-center gap-1 text-green-500">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs font-medium">+12%</span>
                        </div>
                      </div>
                      <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                        {stat.value}
                      </h3>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {stat.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions - Modern Grid */}
            <div className={`
              rounded-2xl sm:rounded-3xl p-6 sm:p-8 border
              ${isDark 
                ? 'bg-gray-800/50 border-gray-700/50' 
                : 'bg-white/50 border-gray-200/50'
              }
              backdrop-blur-xl shadow-xl
            `}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`
                  w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500
                  flex items-center justify-center shadow-lg
                `}>
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Hızlı İşlemler
                </h2>
              </div>
          
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {user?.PersonelRole === 'saha_personeli' && (
                  <>
                    <QuickActionCard
                      title="İzin Talebi"
                      description="Yeni izin talebi oluştur"
                      icon={Calendar}
                      href="/dashboard/izin-talepleri"
                      isDark={isDark}
                    />
                    <QuickActionCard
                      title="Avans Talebi"
                      description="Avans talebinde bulun"
                      icon={DollarSign}
                      href="/dashboard/avans-talepleri"
                      isDark={isDark}
                    />
                  </>
                )}

                {(user?.PersonelRole === 'koordinator' || user?.PersonelRole === 'insan_kaynaklari' || user?.PersonelRole === 'yonetici') && (
                  <>
                    <QuickActionCard
                      title="Personel Ekle"
                      description="Yeni personel kaydı oluştur"
                      icon={Users}
                      href="/dashboard/personel"
                      isDark={isDark}
                    />
                    <QuickActionCard
                      title="İzin Onayları"
                      description="Bekleyen talepleri incele"
                      icon={Calendar}
                      href="/dashboard/izin-talepleri"
                      isDark={isDark}
                    />
                    <QuickActionCard
                      title="Evrak Yönetimi"
                      description="Evrakları görüntüle ve yönet"
                      icon={FileText}
                      href="/dashboard/evraklar"
                      isDark={isDark}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity - Modern Timeline */}
            <div className={`
              rounded-2xl sm:rounded-3xl p-6 sm:p-8 border
              ${isDark 
                ? 'bg-gray-800/50 border-gray-700/50' 
                : 'bg-white/50 border-gray-200/50'
              }
              backdrop-blur-xl shadow-xl
            `}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`
                  w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500
                  flex items-center justify-center shadow-lg
                `}>
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Son Aktiviteler
                </h2>
              </div>
              <div className="space-y-4">
                <ActivityItem
                  title="Yeni izin talebi"
                  description="Ahmet Yılmaz tarafından 3 günlük izin talebi oluşturuldu"
                  time="5 dakika önce"
                  isDark={isDark}
                />
                <ActivityItem
                  title="Avans onaylandı"
                  description="Mehmet Demir'in avans talebi onaylandı"
                  time="1 saat önce"
                  isDark={isDark}
                />
                <ActivityItem
                  title="Yeni personel eklendi"
                  description="Ayşe Kaya sisteme eklendi"
                  time="2 saat önce"
                  isDark={isDark}
                />
              </div>
            </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function QuickActionCard({ title, description, icon: Icon, href, isDark }: { title: string; description: string; icon: React.ElementType; href: string; isDark: boolean }) {
  return (
    <a
      href={href}
      className={`
        group relative overflow-hidden flex items-start gap-4 p-5 rounded-xl border
        ${isDark 
          ? 'bg-gray-700/50 border-gray-600/50 hover:bg-gray-700/70 hover:border-gray-500/70' 
          : 'bg-gray-50/50 border-gray-200/50 hover:bg-white/70 hover:border-gray-300/70'
        }
        backdrop-blur-sm shadow-lg hover:shadow-xl
        transform hover:-translate-y-1 transition-all duration-300
      `}
    >
      {/* Gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className={`
        relative z-10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg
        bg-gradient-to-br from-blue-500 to-purple-600
        group-hover:scale-110 transition-transform duration-300
      `}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="relative z-10">
        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'} mb-1 group-hover:text-blue-500 transition-colors`}>
          {title}
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
      </div>
    </a>
  );
}

function ActivityItem({ title, description, time, isDark }: { title: string; description: string; time: string; isDark: boolean }) {
  return (
    <div className={`
      group relative flex items-start gap-4 p-4 rounded-xl border
      ${isDark 
        ? 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50 hover:border-gray-600/50' 
        : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-50/50 hover:border-gray-200/50'
      }
      backdrop-blur-sm
      hover:shadow-md transition-all duration-300
    `}>
      {/* Timeline dot */}
      <div className="relative flex-shrink-0 mt-2">
        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"></div>
        <div className="absolute inset-0 w-3 h-3 rounded-full bg-blue-500 animate-ping opacity-75"></div>
      </div>
      
      <div className="flex-1">
        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
          {title}
        </h4>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
          {description}
        </p>
        <div className="flex items-center gap-2">
          <div className={`
            text-xs font-medium px-2 py-1 rounded-full
            ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/10 text-blue-600'}
          `}>
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}
