'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { IzinTalepleri, IzinTuru, TalepDurum, IzinTalepGecmis } from '@/types/database';
import { Calendar, Plus, X, Search, Clock, CheckCircle, XCircle, AlertCircle, History, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export const dynamic = 'force-dynamic';

// Singleton Supabase client
const supabase = createClient();

interface FullIzinTalep extends IzinTalepleri {
  PersonelInfo?: {
    P_AdSoyad: string;
  };
  BolgeInfo?: {
    BolgeAdi: string;
  };
}

export default function IzinTalepleriPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [talepler, setTalepler] = useState<FullIzinTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDurum, setFilterDurum] = useState<string>('all');
  const [filterTur, setFilterTur] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTalep, setSelectedTalep] = useState<FullIzinTalep | null>(null);
  const [onayModalOpen, setOnayModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editDateModalOpen, setEditDateModalOpen] = useState(false);
  const [gecmis, setGecmis] = useState<IzinTalepGecmis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    IzinTuru: 'ucretli' as IzinTuru,
    BaslangicTarihi: '',
    BitisTarihi: '',
    Aciklama: '',
  });

  const [onayFormData, setOnayFormData] = useState({
    isApprove: true,
    not: '',
  });

  const [editDateFormData, setEditDateFormData] = useState({
    BaslangicTarihi: '',
    BitisTarihi: '',
    DegisiklikNotu: '',
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
      .from('IzinTalepleri')
      .select(`
        *,
        PersonelLevelizasyon!inner(
          PersonelInfo(P_AdSoyad),
          BolgeInfo(BolgeAdi, BolgeSicilNo),
          BolgeID
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      // Veriyi düzelt
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

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const fetchGecmis = async (talepId: number) => {
    setHistoryLoading(true);
    try {
      console.log('🔍 Geçmiş getiriliyor, TalepID:', talepId);
      const response = await fetch(`/api/izin-gecmis?talepId=${talepId}`);
      const result = await response.json();
      
      console.log('📊 API Sonucu:', result);
      
      if (result.error) {
        console.error('❌ API Hatası:', result.error);
        alert('Geçmiş yüklenirken hata oluştu: ' + result.error);
      } else if (result.data) {
        console.log('✅ Geçmiş yüklendi:', result.data.length, 'kayıt');
        setGecmis(result.data);
      } else {
        console.warn('⚠️ Geçmiş verisi boş');
        setGecmis([]);
      }
    } catch (error) {
      console.error('❌ Geçmiş yükleme hatası:', error);
      alert('Geçmiş yüklenirken hata oluştu. Console\'u kontrol edin.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveGecmis = async (gecmisData: Partial<IzinTalepGecmis>) => {
    try {
      console.log('💾 Geçmiş kaydediliyor:', gecmisData);
      const response = await fetch('/api/izin-gecmis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gecmisData),
      });
      
      const result = await response.json();
      
      if (result.error) {
        console.error('❌ Geçmiş kaydetme hatası:', result.error);
      } else {
        console.log('✅ Geçmiş kaydedildi:', result.data);
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ Geçmiş kaydetme hatası:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const gunSayisi = calculateDays(formData.BaslangicTarihi, formData.BitisTarihi);

    const talepData = {
      PersonelTcKimlik: user.PersonelTcKimlik,
      IzinTuru: formData.IzinTuru,
      BaslangicTarihi: formData.BaslangicTarihi,
      BitisTarihi: formData.BitisTarihi,
      GunSayisi: gunSayisi,
      Aciklama: formData.Aciklama,
      Durum: 'beklemede' as TalepDurum,
    };

    const { data, error } = await supabase.from('IzinTalepleri').insert([talepData]).select().single();

    if (!error && data) {
      // Geçmişe kaydet
      await saveGecmis({
        TalepID: data.TalepID,
        IslemYapan: user.PersonelTcKimlik,
        IslemTipi: 'olusturuldu',
        YeniDurum: 'beklemede',
        YeniBaslangic: formData.BaslangicTarihi,
        YeniBitis: formData.BitisTarihi,
        Not: formData.Aciklama || 'İzin talebi oluşturuldu',
        IslemYapanAd: user.PersonelInfo?.P_AdSoyad,
      });
      
      fetchTalepler();
      closeModal();
    }
  };

  const handleOnayReddet = async () => {
    if (!selectedTalep || !user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    let yeniDurum: TalepDurum = selectedTalep.Durum;
    let islemTipi: 'koordinator_onay' | 'yonetim_onay' | 'reddedildi' = 'koordinator_onay';

    if (user?.PersonelRole === 'koordinator') {
      yeniDurum = onayFormData.isApprove ? 'koordinator_onay' : 'reddedildi';
      updateData.Durum = yeniDurum;
      updateData.KoordinatorNotu = onayFormData.not;
      updateData.KoordinatorOnayTarihi = new Date().toISOString();
      islemTipi = onayFormData.isApprove ? 'koordinator_onay' : 'reddedildi';
    } else if (user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') {
      yeniDurum = onayFormData.isApprove ? 'yonetim_onay' : 'reddedildi';
      updateData.Durum = yeniDurum;
      updateData.YonetimNotu = onayFormData.not;
      updateData.YonetimOnayTarihi = new Date().toISOString();
      islemTipi = onayFormData.isApprove ? 'yonetim_onay' : 'reddedildi';
    }

    const { error } = await supabase
      .from('IzinTalepleri')
      .update(updateData)
      .eq('TalepID', selectedTalep.TalepID);

    if (!error) {
      // Geçmişe kaydet
      await saveGecmis({
        TalepID: selectedTalep.TalepID,
        IslemYapan: user.PersonelTcKimlik,
        IslemTipi: islemTipi,
        EskiDurum: selectedTalep.Durum,
        YeniDurum: yeniDurum,
        Not: onayFormData.not || (onayFormData.isApprove ? 'Onaylandı' : 'Reddedildi'),
        IslemYapanAd: user.PersonelInfo?.P_AdSoyad,
      });

      fetchTalepler();
      setOnayModalOpen(false);
      setSelectedTalep(null);
      setOnayFormData({ isApprove: true, not: '' });
    }
  };

  const handleIptal = async (talep: FullIzinTalep) => {
    if (!user) return;
    
    if (confirm('Bu talebi iptal etmek istediğinizden emin misiniz?')) {
      const { error } = await supabase
        .from('IzinTalepleri')
        .update({ Durum: 'iptal', updated_at: new Date().toISOString() })
        .eq('TalepID', talep.TalepID);

      if (!error) {
        // Geçmişe kaydet
        await saveGecmis({
          TalepID: talep.TalepID,
          IslemYapan: user.PersonelTcKimlik,
          IslemTipi: 'iptal',
          EskiDurum: talep.Durum,
          YeniDurum: 'iptal',
          Not: 'Talep iptal edildi',
          IslemYapanAd: user.PersonelInfo?.P_AdSoyad,
        });

        fetchTalepler();
      }
    }
  };

  const handleEditDates = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTalep || !user) return;

    const yeniGunSayisi = calculateDays(editDateFormData.BaslangicTarihi, editDateFormData.BitisTarihi);

    const { error } = await supabase
      .from('IzinTalepleri')
      .update({
        BaslangicTarihi: editDateFormData.BaslangicTarihi,
        BitisTarihi: editDateFormData.BitisTarihi,
        GunSayisi: yeniGunSayisi,
        updated_at: new Date().toISOString(),
      })
      .eq('TalepID', selectedTalep.TalepID);

    if (!error) {
      // Geçmişe kaydet
      const notText = `Tarih değiştirildi: ${selectedTalep.BaslangicTarihi} - ${selectedTalep.BitisTarihi} → ${editDateFormData.BaslangicTarihi} - ${editDateFormData.BitisTarihi}. ${editDateFormData.DegisiklikNotu}`;
      
      await saveGecmis({
        TalepID: selectedTalep.TalepID,
        IslemYapan: user.PersonelTcKimlik,
        IslemTipi: 'tarih_degistirildi',
        EskiBaslangic: selectedTalep.BaslangicTarihi,
        YeniBaslangic: editDateFormData.BaslangicTarihi,
        EskiBitis: selectedTalep.BitisTarihi,
        YeniBitis: editDateFormData.BitisTarihi,
        Not: notText,
        IslemYapanAd: user.PersonelInfo?.P_AdSoyad,
      });

      fetchTalepler();
      setEditDateModalOpen(false);
      setSelectedTalep(null);
      setEditDateFormData({ BaslangicTarihi: '', BitisTarihi: '', DegisiklikNotu: '' });
    }
  };

  const openEditDateModal = (talep: FullIzinTalep) => {
    setSelectedTalep(talep);
    setEditDateFormData({
      BaslangicTarihi: talep.BaslangicTarihi,
      BitisTarihi: talep.BitisTarihi,
      DegisiklikNotu: '',
    });
    setEditDateModalOpen(true);
  };

  const openHistoryModal = async (talep: FullIzinTalep) => {
    setSelectedTalep(talep);
    setHistoryModalOpen(true);
    await fetchGecmis(talep.TalepID);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      IzinTuru: 'ucretli',
      BaslangicTarihi: '',
      BitisTarihi: '',
      Aciklama: '',
    });
  };

  const getIzinTuruLabel = (tur: string) => {
    const labels: Record<string, string> = {
      // Yeni değerler
      'ucretli': 'Ücretli İzin',
      'ucretsiz': 'Ücretsiz İzin',
      'raporlu': 'Raporlu İzin',
      // Eski değerler (geçici uyumluluk)
      'yillik': 'Yıllık İzin (Ücretli)',
      'mazeret': 'Mazeret İzni (Ücretli)',
      'hastalik': 'Hastalık İzni (Raporlu)',
      'dogum': 'Doğum İzni (Raporlu)',
      'vefat': 'Vefat İzni (Raporlu)',
      'evlilik': 'Evlilik İzni (Ücretli)'
    };
    return labels[tur] || tur;
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

  const canApprove = (talep: FullIzinTalep) => {
    if (user?.PersonelRole === 'koordinator') {
      return talep.Durum === 'beklemede';
    }
    if (user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') {
      return talep.Durum === 'koordinator_onay' || talep.Durum === 'beklemede';
    }
    return false;
  };

  const canCancel = (talep: FullIzinTalep) => {
    return user?.PersonelTcKimlik === talep.PersonelTcKimlik && 
           (talep.Durum === 'beklemede' || talep.Durum === 'koordinator_onay');
  };

  const filteredTalepler = talepler.filter((talep) => {
    const matchesSearch = 
      talep.PersonelInfo?.P_AdSoyad?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDurum = filterDurum === 'all' || talep.Durum === filterDurum;
    const matchesTur = filterTur === 'all' || talep.IzinTuru === filterTur;

    return matchesSearch && matchesDurum && matchesTur;
  });

  const isSahaPersoneli = user?.PersonelRole === 'saha_personeli';

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
        <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 to-purple-50'} rounded-2xl p-6 sm:p-8 mb-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>İzin Talepleri</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isSahaPersoneli ? 'İzin taleplerinizi yönetin' : 'Tüm izin taleplerini görüntüleyin ve onaylayın'}
              </p>
            </div>
            {isSahaPersoneli && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni İzin Talebi</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Toplam Talep"
            value={talepler.length}
            icon={Calendar}
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
        </div>

        {/* Filters */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4 mb-6 space-y-4`}>
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Personel adı ile ara..."
              className={`w-full pl-12 pr-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Durum Filtresi</label>
              <select
                value={filterDurum}
                onChange={(e) => setFilterDurum(e.target.value)}
                className={`w-full px-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="koordinator_onay">Koordinatör Onayı</option>
                <option value="yonetim_onay">Onaylandı</option>
                <option value="reddedildi">Reddedildi</option>
                <option value="iptal">İptal</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>İzin Türü Filtresi</label>
              <select
                value={filterTur}
                onChange={(e) => setFilterTur(e.target.value)}
                className={`w-full px-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">Tüm Türler</option>
                <optgroup label="Yeni Sistem">
                  <option value="ucretli">Ücretli İzin</option>
                  <option value="ucretsiz">Ücretsiz İzin</option>
                  <option value="raporlu">Raporlu İzin</option>
                </optgroup>
                <optgroup label="Eski Sistem (Geçici)">
                  <option value="yillik">Yıllık İzin</option>
                  <option value="mazeret">Mazeret İzni</option>
                  <option value="hastalik">Hastalık İzni</option>
                  <option value="dogum">Doğum İzni</option>
                  <option value="vefat">Vefat İzni</option>
                  <option value="evlilik">Evlilik İzni</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Talepler Listesi */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass-dark rounded-2xl p-8 text-center text-white/70">
              Yükleniyor...
            </div>
          ) : filteredTalepler.length === 0 ? (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Talep bulunamadı
            </div>
          ) : (
            filteredTalepler.map((talep) => {
              const Icon = getDurumIcon(talep.Durum);
              return (
                <div key={talep.TalepID} className={`${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'} border rounded-2xl p-6 transition-all`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Sol Taraf - Bilgiler */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getDurumColor(talep.Durum)} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {talep.PersonelInfo?.P_AdSoyad || 'Bilinmiyor'}
                            </h3>
                            <span className={`px-3 py-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>
                              {getIzinTuruLabel(talep.IzinTuru)}
                            </span>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-white text-sm",
                              talep.Durum === 'yonetim_onay' && "bg-green-500/80",
                              talep.Durum === 'beklemede' && "bg-yellow-500/80",
                              talep.Durum === 'koordinator_onay' && "bg-blue-500/80",
                              talep.Durum === 'reddedildi' && "bg-red-500/80",
                              talep.Durum === 'iptal' && "bg-gray-500/80"
                            )}>
                              {getDurumLabel(talep.Durum)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Başlangıç</p>
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
                                {new Date(talep.BaslangicTarihi).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div>
                              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Bitiş</p>
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
                                {new Date(talep.BitisTarihi).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div>
                              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Süre</p>
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{talep.GunSayisi} gün</p>
                            </div>
                            <div>
                              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Talep Tarihi</p>
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
                                {new Date(talep.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </div>

                          {talep.Aciklama && (
                            <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>Açıklama:</p>
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{talep.Aciklama}</p>
                            </div>
                          )}

                          {(talep.KoordinatorNotu || talep.YonetimNotu) && (
                            <div className="mt-3 space-y-2">
                              {talep.KoordinatorNotu && (
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'} border`}>
                                  <p className={`${isDark ? 'text-blue-300' : 'text-blue-700'} text-sm mb-1`}>Koordinatör Notu:</p>
                                  <p className={`${isDark ? 'text-white' : 'text-blue-900'} text-sm`}>{talep.KoordinatorNotu}</p>
                                </div>
                              )}
                              {talep.YonetimNotu && (
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/20 border-purple-800/30' : 'bg-purple-50 border-purple-200'} border`}>
                                  <p className={`${isDark ? 'text-purple-300' : 'text-purple-700'} text-sm mb-1`}>Yönetim Notu:</p>
                                  <p className={`${isDark ? 'text-white' : 'text-purple-900'} text-sm`}>{talep.YonetimNotu}</p>
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
                              setOnayFormData({ isApprove: true, not: '' });
                              setOnayModalOpen(true);
                            }}
                            className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTalep(talep);
                              setOnayFormData({ isApprove: false, not: '' });
                              setOnayModalOpen(true);
                            }}
                            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      
                      {/* Tarih Düzenleme - Sadece Koordinatör ve Yönetici */}
                      {(user?.PersonelRole === 'koordinator' || user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') && (
                        <button
                          onClick={() => openEditDateModal(talep)}
                          className={cn(
                            'px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 justify-center',
                            isDark
                              ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                              : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                          )}
                          title="Tarihleri Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                          Tarih Düzenle
                        </button>
                      )}

                      {/* Geçmiş Görüntüleme - Herkes görebilir */}
                      <button
                        onClick={() => openHistoryModal(talep)}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 justify-center',
                          isDark
                            ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                            : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                        )}
                        title="Geçmişi Görüntüle"
                      >
                        <History className="w-4 h-4" />
                        Geçmiş
                      </button>

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
            <div className="glass-dark rounded-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Yeni İzin Talebi</h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">İzin Türü *</label>
                  <select
                    required
                    value={formData.IzinTuru}
                    onChange={(e) => setFormData({ ...formData, IzinTuru: e.target.value as IzinTuru })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="ucretli">Ücretli İzin</option>
                    <option value="ucretsiz">Ücretsiz İzin</option>
                    <option value="raporlu">Raporlu İzin</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Başlangıç Tarihi *</label>
                    <input
                      type="date"
                      required
                      value={formData.BaslangicTarihi}
                      onChange={(e) => setFormData({ ...formData, BaslangicTarihi: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Bitiş Tarihi *</label>
                    <input
                      type="date"
                      required
                      value={formData.BitisTarihi}
                      onChange={(e) => setFormData({ ...formData, BitisTarihi: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                </div>

                {formData.BaslangicTarihi && formData.BitisTarihi && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 text-sm">
                      Toplam İzin Süresi: <span className="font-bold">
                        {calculateDays(formData.BaslangicTarihi, formData.BitisTarihi)} gün
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Açıklama</label>
                  <textarea
                    value={formData.Aciklama}
                    onChange={(e) => setFormData({ ...formData, Aciklama: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="İzin sebebinizi açıklayın..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
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
        )}

        {/* Onay/Red Modal */}
        {onayModalOpen && selectedTalep && (
          <OnayModal
            isOpen={onayModalOpen}
            onClose={() => {
              setOnayModalOpen(false);
              setSelectedTalep(null);
              setOnayFormData({ isApprove: true, not: '' });
            }}
            selectedTalep={selectedTalep}
            onayFormData={onayFormData}
            setOnayFormData={setOnayFormData}
            handleOnayReddet={handleOnayReddet}
            getIzinTuruLabel={getIzinTuruLabel}
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
            getIzinTuruLabel={getIzinTuruLabel}
            getDurumLabel={getDurumLabel}
          />
        )}

        {/* Geçmiş Modal */}
        <HistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedTalep(null);
            setGecmis([]);
          }}
          talep={selectedTalep}
          gecmis={gecmis}
          loading={historyLoading}
        />

        {/* Tarih Düzenleme Modal */}
        {editDateModalOpen && selectedTalep && (
          <EditDateModal
            isOpen={editDateModalOpen}
            onClose={() => {
              setEditDateModalOpen(false);
              setSelectedTalep(null);
              setEditDateFormData({ BaslangicTarihi: '', BitisTarihi: '', DegisiklikNotu: '' });
            }}
            selectedTalep={selectedTalep}
            editDateFormData={editDateFormData}
            setEditDateFormData={setEditDateFormData}
            handleEditDates={handleEditDates}
            calculateDays={calculateDays}
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
  const { isDark } = useTheme();
  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>{value}</h3>
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{title}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TalepDetayModal({ talep, onClose, getIzinTuruLabel, getDurumLabel }: any) {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  
  const handleDownloadPDF = async () => {
    // Yeni template sistemini kullan - izin türüne göre otomatik seçim
    const { generateLeaveAgreement } = await import('@/lib/pdfGenerator');
    
    const today = new Date();
    const agreementData = {
      employerName: 'AYKA GÜVENLİK',
      employerId: talep.BolgeInfo?.BolgeSicilNo || '',
      employeeName: talep.PersonelInfo?.P_AdSoyad || '',
      employeeId: String(talep.PersonelTcKimlik),
      leaveStartDate: new Date(talep.BaslangicTarihi).toLocaleDateString('tr-TR'),
      leaveDays: talep.GunSayisi,
      preparationDate: today.toLocaleDateString('tr-TR')
    };
    
    // İzin türüne göre doğru template'i çağır
    await generateLeaveAgreement(talep.IzinTuru, agreementData);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      <div 
        className={`
          rounded-none shadow-2xl w-full overflow-y-auto
          ${isDark ? 'bg-gray-800/95' : 'bg-white/95'}
          backdrop-blur-xl animate-scale-in
        `}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: '60px',
          width: '100%',
          zIndex: 10000
        }}
      >
        <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Talep Detayları</h2>
          <button 
            onClick={onClose} 
            className={`
              w-12 h-10 flex items-center justify-center transition-all
              hover:bg-red-600 hover:text-white
              ${isDark ? 'text-gray-300' : 'text-gray-600'}
            `}
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Personel Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Ad Soyad" value={talep.PersonelInfo?.P_AdSoyad} />
              <InfoField label="Bölge" value={talep.BolgeInfo?.BolgeAdi} />
            </div>
          </div>

          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>İzin Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="İzin Türü" value={getIzinTuruLabel(talep.IzinTuru)} />
              <InfoField label="Durum" value={getDurumLabel(talep.Durum)} />
              <InfoField label="Başlangıç" value={new Date(talep.BaslangicTarihi).toLocaleDateString('tr-TR')} />
              <InfoField label="Bitiş" value={new Date(talep.BitisTarihi).toLocaleDateString('tr-TR')} />
              <InfoField label="Süre" value={`${talep.GunSayisi} gün`} />
              <InfoField label="Talep Tarihi" value={new Date(talep.created_at).toLocaleDateString('tr-TR')} />
            </div>
          </div>

          {talep.Aciklama && (
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Açıklama</h3>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{talep.Aciklama}</p>
              </div>
            </div>
          )}

          {talep.KoordinatorNotu && (
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Koordinatör Notu</h3>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'} border`}>
                <p className={`${isDark ? 'text-blue-300' : 'text-blue-900'}`}>{talep.KoordinatorNotu}</p>
                {talep.KoordinatorOnayTarihi && (
                  <p className={`${isDark ? 'text-blue-400' : 'text-blue-600'} text-sm mt-2`}>
                    {new Date(talep.KoordinatorOnayTarihi).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </div>
          )}

          {talep.YonetimNotu && (
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Yönetim Notu</h3>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20 border-purple-800/30' : 'bg-purple-50 border-purple-200'} border`}>
                <p className={`${isDark ? 'text-purple-300' : 'text-purple-900'}`}>{talep.YonetimNotu}</p>
                {talep.YonetimOnayTarihi && (
                  <p className={`${isDark ? 'text-purple-400' : 'text-purple-600'} text-sm mt-2`}>
                    {new Date(talep.YonetimOnayTarihi).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {(talep.IzinTuru === 'ucretli' || talep.IzinTuru === 'yillik' || talep.IzinTuru === 'mazeret' || talep.IzinTuru === 'evlilik') && (
            <button
              onClick={handleDownloadPDF}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Sözleşme İndir (PDF)
            </button>
          )}
          <button
            onClick={onClose}
            className={`${talep.IzinTuru === 'ucretli' ? 'flex-1' : 'w-full'} px-6 py-3 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDark ? 'text-white' : 'text-gray-900'} rounded-xl transition-colors`}
          >
            Kapat
          </button>
        </div>
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoField({ label, value }: { label: string; value: any }) {
  const { isDark } = useTheme();
  return (
    <div>
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>{label}</p>
      <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{value || '-'}</p>
    </div>
  );
}

// Geçmiş Modal Component
function HistoryModal({ 
  isOpen, 
  onClose, 
  talep, 
  gecmis, 
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  talep: FullIzinTalep | null;
  gecmis: IzinTalepGecmis[];
  loading: boolean;
}) {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !talep || !mounted) return null;

  const getIslemTipiLabel = (tip: string) => {
    const labels: Record<string, string> = {
      'olusturuldu': '📝 Oluşturuldu',
      'koordinator_onay': '✅ Koordinatör Onayı',
      'yonetim_onay': '✅ Yönetim Onayı',
      'reddedildi': '❌ Reddedildi',
      'tarih_degistirildi': '📅 Tarih Değiştirildi',
      'iptal': '🚫 İptal Edildi',
    };
    return labels[tip] || tip;
  };

  const getIslemColor = (tip: string) => {
    const colors: Record<string, string> = {
      'olusturuldu': isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200',
      'koordinator_onay': isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200',
      'yonetim_onay': isDark ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200',
      'reddedildi': isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200',
      'tarih_degistirildi': isDark ? 'bg-purple-900/20 border-purple-800/30' : 'bg-purple-50 border-purple-200',
      'iptal': isDark ? 'bg-gray-900/20 border-gray-800/30' : 'bg-gray-100 border-gray-300',
    };
    return colors[tip] || (isDark ? 'bg-gray-900/20 border-gray-800/30' : 'bg-gray-100 border-gray-300');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        style={{ bottom: '60px' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: '60px', width: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <div className={cn(
          'min-h-full p-4 sm:p-8'
        )}>
          <div className={cn(
            'rounded-2xl p-6 sm:p-8 w-full max-w-3xl mx-auto shadow-2xl',
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
            'border'
          )}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History className={cn('w-7 h-7', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  İzin Geçmişi
                </h2>
              </div>
              <button 
                onClick={onClose} 
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

        {/* Talep Özeti */}
        <div className={cn(
          'p-4 rounded-xl mb-6',
          isDark ? 'bg-gray-700/50' : 'bg-gray-50'
        )}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Personel</p>
              <p className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {talep.PersonelInfo?.P_AdSoyad}
              </p>
            </div>
            <div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>İzin Türü</p>
              <p className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {talep.IzinTuru}
              </p>
            </div>
            <div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tarih</p>
              <p className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {new Date(talep.BaslangicTarihi).toLocaleDateString('tr-TR')} - {new Date(talep.BitisTarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Durum</p>
              <p className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {talep.Durum}
              </p>
            </div>
          </div>
        </div>

        {/* Geçmiş Timeline */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : gecmis.length === 0 ? (
            <div className="text-center py-12">
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Henüz geçmiş kaydı bulunmuyor
              </p>
            </div>
          ) : (
            gecmis.map((item, index) => (
              <div key={item.GecmisID} className="relative">
                {/* Timeline çizgisi */}
                {index !== gecmis.length - 1 && (
                  <div className={cn(
                    'absolute left-4 top-12 bottom-0 w-0.5',
                    isDark ? 'bg-gray-700' : 'bg-gray-300'
                  )} />
                )}

                {/* Timeline noktası */}
                <div className={cn(
                  'absolute left-2.5 top-6 w-3 h-3 rounded-full border-2',
                  isDark ? 'bg-gray-800 border-cyan-500' : 'bg-white border-cyan-600'
                )} />

                {/* İçerik */}
                <div className={cn(
                  'ml-10 p-4 rounded-xl border',
                  getIslemColor(item.IslemTipi)
                )}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                        {getIslemTipiLabel(item.IslemTipi)}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {item.IslemYapanAd || 'Sistem'}
                      </p>
                    </div>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
                      {new Date(item.IslemTarihi).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Durum Değişikliği */}
                  {item.EskiDurum && item.YeniDurum && (
                    <div className={cn('text-xs mb-2 p-2 rounded', isDark ? 'bg-black/20' : 'bg-white/50')}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        {item.EskiDurum}
                      </span>
                      <span className="mx-2">→</span>
                      <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        {item.YeniDurum}
                      </span>
                    </div>
                  )}

                  {/* Tarih Değişikliği */}
                  {item.EskiBaslangic && item.YeniBaslangic && (
                    <div className={cn('text-xs mb-2 p-2 rounded', isDark ? 'bg-black/20' : 'bg-white/50')}>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          {new Date(item.EskiBaslangic).toLocaleDateString('tr-TR')} - {new Date(item.EskiBitis!).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="mx-2">→</span>
                        <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                          {new Date(item.YeniBaslangic).toLocaleDateString('tr-TR')} - {new Date(item.YeniBitis!).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Not */}
                  {item.Not && (
                    <p className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      {item.Not}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className={cn(
              'w-full px-6 py-3 rounded-xl transition-colors',
              isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            )}
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

function OnayModal({
  isOpen,
  onClose,
  selectedTalep,
  onayFormData,
  setOnayFormData,
  handleOnayReddet,
  getIzinTuruLabel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
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
                <p className="text-white/60 text-sm mt-2 mb-1">İzin Türü:</p>
                <p className="text-white font-medium">{getIzinTuruLabel(selectedTalep.IzinTuru)}</p>
                <p className="text-white/60 text-sm mt-2 mb-1">Süre:</p>
                <p className="text-white font-medium">
                  {new Date(selectedTalep.BaslangicTarihi).toLocaleDateString('tr-TR')} - 
                  {new Date(selectedTalep.BitisTarihi).toLocaleDateString('tr-TR')} ({selectedTalep.GunSayisi} gün)
                </p>
              </div>

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

function EditDateModal({
  isOpen,
  onClose,
  selectedTalep,
  editDateFormData,
  setEditDateFormData,
  handleEditDates,
  calculateDays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
  const { isDark } = useTheme();
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
          <div className={cn(
            'rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl',
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
            'border'
          )}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Edit3 className={cn('w-6 h-6', isDark ? 'text-purple-400' : 'text-purple-600')} />
                <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  Tarihleri Düzenle
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mevcut Bilgiler */}
            <div className={cn(
              'p-4 rounded-xl mb-6',
              isDark ? 'bg-gray-700/50' : 'bg-gray-50'
            )}>
              <p className={cn('text-sm mb-2', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Mevcut Tarihler
              </p>
              <p className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {new Date(selectedTalep.BaslangicTarihi).toLocaleDateString('tr-TR')} - {new Date(selectedTalep.BitisTarihi).toLocaleDateString('tr-TR')}
              </p>
              <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                ({selectedTalep.GunSayisi} gün)
              </p>
            </div>

            <form onSubmit={handleEditDates} className="space-y-4">
              <div>
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                  Yeni Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={editDateFormData.BaslangicTarihi}
                  onChange={(e) => setEditDateFormData({ ...editDateFormData, BaslangicTarihi: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500',
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  )}
                />
              </div>

              <div>
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                  Yeni Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={editDateFormData.BitisTarihi}
                  onChange={(e) => setEditDateFormData({ ...editDateFormData, BitisTarihi: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500',
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  )}
                />
              </div>

              {editDateFormData.BaslangicTarihi && editDateFormData.BitisTarihi && (
                <div className={cn(
                  'p-3 rounded-lg',
                  isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-50 text-purple-700'
                )}>
                  <p className="text-sm">
                    Yeni süre: {calculateDays(editDateFormData.BaslangicTarihi, editDateFormData.BitisTarihi)} gün
                  </p>
                </div>
              )}

              <div>
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                  Değişiklik Notu *
                </label>
                <textarea
                  required
                  value={editDateFormData.DegisiklikNotu}
                  onChange={(e) => setEditDateFormData({ ...editDateFormData, DegisiklikNotu: e.target.value })}
                  rows={3}
                  placeholder="Tarih değişikliğinin nedenini yazın..."
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500',
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'flex-1 px-6 py-3 rounded-xl transition-colors',
                    isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  )}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Kaydet
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

