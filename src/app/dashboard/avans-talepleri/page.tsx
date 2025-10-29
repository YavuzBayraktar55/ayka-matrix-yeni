'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { AvansTalepleri, TalepDurum } from '@/types/database';
import { DollarSign, Plus, X, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export const dynamic = 'force-dynamic';

// Singleton Supabase client
const supabase = createClient();

interface FullAvansTalep extends AvansTalepleri {
  PersonelInfo?: {
    P_AdSoyad: string;
  };
  BolgeInfo?: {
    BolgeAdi: string;
  };
}

export default function AvansTalepleriPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [talepler, setTalepler] = useState<FullAvansTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDurum, setFilterDurum] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTalep, setSelectedTalep] = useState<FullAvansTalep | null>(null);
  const [onayModalOpen, setOnayModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    AvansGunSayisi: '',
    AvansMiktari: '',
    Aciklama: '',
  });

  const [onayFormData, setOnayFormData] = useState({
    isApprove: true,
    not: '',
    odemeTarihi: '',
  });

  useEffect(() => {
    fetchTalepler();
  }, []);

  const fetchTalepler = async () => {
    setLoading(true);
    
    // RLS otomatik olarak filtreliyor:
    // - Saha personeli: Sadece kendi taleplerini görür
    // - Koordinatör: Kendi bölgesindeki personellerin taleplerini görür
    // - Yönetici/IK: Tüm talepleri görür
    const query = supabase
      .from('AvansTalepleri')
      .select(`
        *,
        PersonelLevelizasyon!inner(
          PersonelInfo(P_AdSoyad),
          BolgeInfo(BolgeAdi),
          BolgeID
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedData = data.map((item: any) => ({
        ...item,
        PersonelInfo: item.PersonelLevelizasyon?.PersonelInfo,
        BolgeInfo: item.PersonelLevelizasyon?.BolgeInfo,
      }));
      setTalepler(formattedData);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const talepData = {
      PersonelTcKimlik: user.PersonelTcKimlik,
      AvansGunSayisi: parseInt(formData.AvansGunSayisi),
      AvansMiktari: parseFloat(formData.AvansMiktari),
      Aciklama: formData.Aciklama,
      Durum: 'beklemede' as TalepDurum,
    };

    const { error } = await supabase.from('AvansTalepleri').insert([talepData]);

    if (!error) {
      fetchTalepler();
      closeModal();
    }
  };

  const handleOnayReddet = async () => {
    if (!selectedTalep) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (user?.PersonelRole === 'koordinator') {
      updateData.Durum = onayFormData.isApprove ? 'koordinator_onay' : 'reddedildi';
      updateData.KoordinatorNotu = onayFormData.not;
      updateData.KoordinatorOnayTarihi = new Date().toISOString();
    } else if (user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') {
      updateData.Durum = onayFormData.isApprove ? 'yonetim_onay' : 'reddedildi';
      updateData.YonetimNotu = onayFormData.not;
      updateData.YonetimOnayTarihi = new Date().toISOString();
      if (onayFormData.isApprove && onayFormData.odemeTarihi) {
        updateData.OdemeTarihi = onayFormData.odemeTarihi;
      }
    }

    const { error } = await supabase
      .from('AvansTalepleri')
      .update(updateData)
      .eq('TalepID', selectedTalep.TalepID);

    if (!error) {
      fetchTalepler();
      setOnayModalOpen(false);
      setSelectedTalep(null);
      setOnayFormData({ isApprove: true, not: '', odemeTarihi: '' });
    }
  };

  const handleIptal = async (talep: FullAvansTalep) => {
    if (confirm('Bu talebi iptal etmek istediğinizden emin misiniz?')) {
      const { error } = await supabase
        .from('AvansTalepleri')
        .update({ Durum: 'iptal', updated_at: new Date().toISOString() })
        .eq('TalepID', talep.TalepID);

      if (!error) {
        fetchTalepler();
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      AvansGunSayisi: '',
      AvansMiktari: '',
      Aciklama: '',
    });
  };

  const getDurumLabel = (durum: string) => {
    const labels: Record<string, string> = {
      'beklemede': 'Beklemede',
      'koordinator_onay': 'Koordinatör Onayı',
      'yonetim_onay': 'Onaylandı',
      'reddedildi': 'Reddedildi',
      'iptal': 'İptal Edildi'
    };
    return labels[durum] || durum;
  };

  const getDurumColor = (durum: string) => {
    const colors: Record<string, string> = {
      'beklemede': 'from-yellow-500 to-orange-500',
      'koordinator_onay': 'from-blue-500 to-cyan-500',
      'yonetim_onay': 'from-green-500 to-emerald-500',
      'reddedildi': 'from-red-500 to-pink-500',
      'iptal': 'from-gray-500 to-slate-500'
    };
    return colors[durum] || 'from-gray-500 to-gray-600';
  };

  const getDurumIcon = (durum: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icons: Record<string, any> = {
      'beklemede': Clock,
      'koordinator_onay': AlertCircle,
      'yonetim_onay': CheckCircle,
      'reddedildi': XCircle,
      'iptal': XCircle
    };
    return icons[durum] || Clock;
  };

  const canApprove = (talep: FullAvansTalep) => {
    if (user?.PersonelRole === 'koordinator') {
      return talep.Durum === 'beklemede';
    }
    if (user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') {
      return talep.Durum === 'koordinator_onay' || talep.Durum === 'beklemede';
    }
    return false;
  };

  const canCancel = (talep: FullAvansTalep) => {
    return user?.PersonelTcKimlik === talep.PersonelTcKimlik && 
           (talep.Durum === 'beklemede' || talep.Durum === 'koordinator_onay');
  };

  const filteredTalepler = talepler.filter((talep) => {
    const matchesSearch = 
      talep.PersonelInfo?.P_AdSoyad?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDurum = filterDurum === 'all' || talep.Durum === filterDurum;

    return matchesSearch && matchesDurum;
  });

  const isSahaPersoneli = user?.PersonelRole === 'saha_personeli';

  const toplamAvans = filteredTalepler
    .filter(t => t.Durum === 'yonetim_onay')
    .reduce((sum, t) => sum + t.AvansMiktari, 0);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
        <>
        {/* Header */}
        <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} rounded-2xl p-6 sm:p-8 mb-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Avans Talepleri</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isSahaPersoneli ? 'Avans taleplerinizi yönetin' : 'Tüm avans taleplerini görüntüleyin ve onaylayın'}
              </p>
            </div>
            {isSahaPersoneli && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Avans Talebi</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Toplam Talep"
            value={talepler.length}
            icon={DollarSign}
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Beklemede"
            value={talepler.filter(t => t.Durum === 'beklemede').length}
            icon={Clock}
            color="from-yellow-500 to-orange-500"
          />
          <StatCard
            title="Onaylanan"
            value={talepler.filter(t => t.Durum === 'yonetim_onay').length}
            icon={CheckCircle}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Reddedilen"
            value={talepler.filter(t => t.Durum === 'reddedildi').length}
            icon={XCircle}
            color="from-red-500 to-pink-500"
          />
          <div className="glass-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {toplamAvans.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </h3>
            <p className="text-white/60 text-sm">Toplam Avans</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-dark rounded-2xl p-4 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Personel adı ile ara..."
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Durum Filtresi</label>
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="koordinator_onay">Koordinatör Onayı</option>
              <option value="yonetim_onay">Onaylandı</option>
              <option value="reddedildi">Reddedildi</option>
              <option value="iptal">İptal</option>
            </select>
          </div>
        </div>

        {/* Talepler Listesi */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass-dark rounded-2xl p-8 text-center text-white/70">
              Yükleniyor...
            </div>
          ) : filteredTalepler.length === 0 ? (
            <div className="glass-dark rounded-2xl p-8 text-center text-white/70">
              Talep bulunamadı
            </div>
          ) : (
            filteredTalepler.map((talep) => {
              const Icon = getDurumIcon(talep.Durum);
              return (
                <div key={talep.TalepID} className="glass-dark rounded-2xl p-6 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Sol Taraf - Bilgiler */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getDurumColor(talep.Durum)} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="text-lg font-semibold text-white">
                              {talep.PersonelInfo?.P_AdSoyad || 'Bilinmiyor'}
                            </h3>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-white text-sm font-medium",
                              talep.Durum === 'yonetim_onay' && "bg-green-500/20",
                              talep.Durum === 'beklemede' && "bg-yellow-500/20",
                              talep.Durum === 'koordinator_onay' && "bg-blue-500/20",
                              talep.Durum === 'reddedildi' && "bg-red-500/20",
                              talep.Durum === 'iptal' && "bg-gray-500/20"
                            )}>
                              {getDurumLabel(talep.Durum)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-white/60">Avans Miktarı</p>
                              <p className="text-white font-bold text-lg">
                                {talep.AvansMiktari.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                              </p>
                            </div>
                            <div>
                              <p className="text-white/60">Avans Gün Sayısı</p>
                              <p className="text-white font-medium">{talep.AvansGunSayisi} gün</p>
                            </div>
                            <div>
                              <p className="text-white/60">Talep Tarihi</p>
                              <p className="text-white font-medium">
                                {new Date(talep.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            {talep.OdemeTarihi && (
                              <div>
                                <p className="text-white/60">Ödeme Tarihi</p>
                                <p className="text-white font-medium">
                                  {new Date(talep.OdemeTarihi).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            )}
                          </div>

                          {talep.Aciklama && (
                            <div className="mt-3 p-3 rounded-lg bg-white/5">
                              <p className="text-white/60 text-sm mb-1">Açıklama:</p>
                              <p className="text-white text-sm">{talep.Aciklama}</p>
                            </div>
                          )}

                          {(talep.KoordinatorNotu || talep.YonetimNotu) && (
                            <div className="mt-3 space-y-2">
                              {talep.KoordinatorNotu && (
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                  <p className="text-blue-300 text-sm mb-1">Koordinatör Notu:</p>
                                  <p className="text-white text-sm">{talep.KoordinatorNotu}</p>
                                </div>
                              )}
                              {talep.YonetimNotu && (
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                  <p className="text-purple-300 text-sm mb-1">Yönetim Notu:</p>
                                  <p className="text-white text-sm">{talep.YonetimNotu}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sağ Taraf - Aksiyonlar */}
                    <div className="flex flex-col gap-2 lg:w-40">
                      {canApprove(talep) && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTalep(talep);
                              setOnayFormData({ isApprove: true, not: '', odemeTarihi: '' });
                              setOnayModalOpen(true);
                            }}
                            className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTalep(talep);
                              setOnayFormData({ isApprove: false, not: '', odemeTarihi: '' });
                              setOnayModalOpen(true);
                            }}
                            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {canCancel(talep) && (
                        <button
                          onClick={() => handleIptal(talep)}
                          className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors text-sm font-medium"
                        >
                          İptal Et
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTalep(talep);
                          setViewModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                      >
                        Detay
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Yeni Talep Modal */}
        {modalOpen && (
          <AvansFormModal
            isOpen={modalOpen}
            onClose={closeModal}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
          />
        )}

        {/* Onay/Red Modal */}
        {onayModalOpen && selectedTalep && (
          <AvansOnayModal
            isOpen={onayModalOpen}
            onClose={() => {
              setOnayModalOpen(false);
              setSelectedTalep(null);
              setOnayFormData({ isApprove: true, not: '', odemeTarihi: '' });
            }}
            selectedTalep={selectedTalep}
            onayFormData={onayFormData}
            setOnayFormData={setOnayFormData}
            handleOnayReddet={handleOnayReddet}
            user={user}
          />
        )}

        {/* Detay Modal */}
        {viewModalOpen && selectedTalep && (
          <TalepDetayModal
            talep={selectedTalep}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedTalep(null);
            }}
            getDurumLabel={getDurumLabel}
          />
        )}
        </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="glass-dark rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-white/60 text-sm">{title}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TalepDetayModal({ talep, onClose, getDurumLabel }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        style={{ bottom: '60px' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: '60px', width: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <div className="min-h-full p-4 sm:p-8 flex items-center justify-center">
          <div className="glass-dark rounded-2xl p-6 sm:p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Talep Detayları</h2>
              <button 
                onClick={onClose} 
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Personel Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Ad Soyad" value={talep.PersonelInfo?.P_AdSoyad} />
              <InfoField label="Bölge" value={talep.BolgeInfo?.BolgeAdi} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Avans Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField 
                label="Avans Miktarı" 
                value={`${talep.AvansMiktari.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`} 
              />
              <InfoField label="Avans Gün Sayısı" value={`${talep.AvansGunSayisi} gün`} />
              <InfoField label="Durum" value={getDurumLabel(talep.Durum)} />
              <InfoField label="Talep Tarihi" value={new Date(talep.created_at).toLocaleDateString('tr-TR')} />
              {talep.OdemeTarihi && (
                <InfoField label="Ödeme Tarihi" value={new Date(talep.OdemeTarihi).toLocaleDateString('tr-TR')} />
              )}
            </div>
          </div>

          {talep.Aciklama && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Açıklama</h3>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-white">{talep.Aciklama}</p>
              </div>
            </div>
          )}

          {talep.KoordinatorNotu && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Koordinatör Notu</h3>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-white">{talep.KoordinatorNotu}</p>
                {talep.KoordinatorOnayTarihi && (
                  <p className="text-blue-300 text-sm mt-2">
                    {new Date(talep.KoordinatorOnayTarihi).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </div>
          )}

          {talep.YonetimNotu && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Yönetim Notu</h3>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-white">{talep.YonetimNotu}</p>
                {talep.YonetimOnayTarihi && (
                  <p className="text-purple-300 text-sm mt-2">
                    {new Date(talep.YonetimOnayTarihi).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
      </div>
    </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AvansFormModal({ isOpen, onClose, formData, setFormData, handleSubmit }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        style={{ bottom: '60px' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: '60px', width: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <div className="min-h-full p-4 sm:p-8 flex items-center justify-center">
          <div className="glass-dark rounded-2xl p-6 sm:p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Yeni Avans Talebi</h2>
              <button 
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Avans Gün Sayısı *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.AvansGunSayisi}
                    onChange={(e) => setFormData({ ...formData, AvansGunSayisi: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Avans Miktarı (₺) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.AvansMiktari}
                    onChange={(e) => setFormData({ ...formData, AvansMiktari: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="5000.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Açıklama *</label>
                <textarea
                  required
                  value={formData.Aciklama}
                  onChange={(e) => setFormData({ ...formData, Aciklama: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Avans sebebinizi açıklayın..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Talep Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AvansOnayModal({ isOpen, onClose, selectedTalep, onayFormData, setOnayFormData, handleOnayReddet, user }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        style={{ bottom: '60px' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: '60px', width: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <div className="min-h-full p-4 sm:p-8 flex items-center justify-center">
          <div className="glass-dark rounded-2xl p-6 sm:p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {onayFormData.isApprove ? 'Talebi Onayla' : 'Talebi Reddet'}
              </h2>
              <button
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-white/60 text-sm mb-1">Personel:</p>
                <p className="text-white font-medium">{selectedTalep.PersonelInfo?.P_AdSoyad}</p>
                <p className="text-white/60 text-sm mt-2 mb-1">Avans Miktarı:</p>
                <p className="text-white font-bold text-lg">
                  {selectedTalep.AvansMiktari.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </p>
                <p className="text-white/60 text-sm mt-2 mb-1">Avans Gün Sayısı:</p>
                <p className="text-white font-medium">{selectedTalep.AvansGunSayisi} gün</p>
              </div>

              {onayFormData.isApprove && (user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Ödeme Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="date"
                    value={onayFormData.odemeTarihi}
                    onChange={(e) => setOnayFormData({ ...onayFormData, odemeTarihi: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Not {onayFormData.isApprove ? '(Opsiyonel)' : '*'}
                </label>
                <textarea
                  required={!onayFormData.isApprove}
                  value={onayFormData.not}
                  onChange={(e) => setOnayFormData({ ...onayFormData, not: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder={onayFormData.isApprove ? "Onay notu ekleyin..." : "Red sebebini açıklayın..."}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleOnayReddet}
                  className={cn(
                    "flex-1 px-6 py-3 text-white rounded-xl hover:shadow-lg transition-all",
                    onayFormData.isApprove
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-gradient-to-r from-red-500 to-pink-500"
                  )}
                >
                  {onayFormData.isApprove ? 'Onayla' : 'Reddet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-white/60 text-sm mb-1">{label}</p>
      <p className="text-white font-medium">{value || '-'}</p>
    </div>
  );
}
