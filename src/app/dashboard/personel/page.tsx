'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { PersonelLevelizasyon, PersonelInfo, BolgeInfo, UserRole } from '@/types/database';
import { Users, Plus, Edit, Trash2, Search, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export const dynamic = 'force-dynamic';

interface FullPersonel extends PersonelLevelizasyon {
  PersonelInfo?: PersonelInfo;
  BolgeInfo?: BolgeInfo;
}

export default function PersonelPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [personeller, setPersoneller] = useState<FullPersonel[]>([]);
  const [bolgeler, setBolgeler] = useState<BolgeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAktif, setFilterAktif] = useState<string>('all');
  const [filterBolge, setFilterBolge] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingPersonel, setEditingPersonel] = useState<FullPersonel | null>(null);
  const [viewingPersonel, setViewingPersonel] = useState<FullPersonel | null>(null);

  // Supabase client - sadece write işlemleri için
  const supabase = createClient();

  const [formData, setFormData] = useState({
    // PersonelLevelizasyon
    PersonelTcKimlik: '',
    PersonelRole: 'saha_personeli' as UserRole,
    PersonelEmail: '',
    PersonelPassword: '',
    PersonelAktif: true,
    BolgeID: '',
    // PersonelInfo
    P_AdSoyad: '',
    P_KidemTarihi: '',
    P_AykaSozlesmeTarihi: '',
    P_DogumTarihi: '',
    P_DogumYeri: '',
    P_BabaAdi: '',
    P_MedeniHali: false,
    P_EsGelir: false,
    P_CocukSayisi: '',
    P_AgiYuzdesi: '',
    P_EngelOrani: '',
    P_Adres: '',
    P_TelNo: '',
    P_MailAdres: '',
    P_Mezuniyet: '',
    P_Bolum: '',
    P_AskerlikDurum: '',
    P_TecilBitis: '',
    P_Ehliyet: '',
    P_KanGrubu: '',
    P_IBANno: '',
    P_DogalGazSayacBelge: false,
    P_DogalGazSayacBelgeGecerlilik: '',
    P_IcTesisatBelge: false,
    P_IcTesisatBelgeGecerlilik: '',
    P_Gorevi: '',
    P_Sube: '',
  });

  useEffect(() => {
    fetchPersoneller();
    fetchBolgeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBolgeler = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('BolgeInfo')
      .select('*')
      .order('BolgeAdi', { ascending: true });

    if (!error && data) {
      console.log('🗺️ Bölgeler Yüklendi:', data);
      setBolgeler(data);
    } else {
      console.error('❌ Bölge yükleme hatası:', error);
    }
  };

  const fetchPersoneller = async () => {
    if (!user?.PersonelEmail || !user?.PersonelRole) {
      console.error('❌ User bilgisi eksik');
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // API route üzerinden veri çek - RLS bypass ile
      const response = await fetch(
        `/api/personel?userEmail=${encodeURIComponent(user.PersonelEmail)}&userRole=${encodeURIComponent(user.PersonelRole)}`
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();

      if (result.error) {
        console.error('❌ API Error:', result.error);
        setPersoneller([]);
      } else {
        console.log('✅ Personel Verisi Geldi:', result.data);
        console.log('📊 Personel Sayısı:', result.count);
        console.log('🗺️ Bölge Bilgileri:', result.data.map((p: FullPersonel) => ({ 
          ad: p.PersonelInfo?.P_AdSoyad, 
          bolgeID: p.BolgeID, 
          bolgeAdi: p.BolgeInfo?.BolgeAdi 
        })));
        setPersoneller(result.data || []);
      }
    } catch (error) {
      console.error('❌ Fetch hatası:', error);
      setPersoneller([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const personelLevelizasyonData = {
      PersonelTcKimlik: parseInt(formData.PersonelTcKimlik),
      PersonelRole: formData.PersonelRole,
      PersonelEmail: formData.PersonelEmail,
      PersonelPassword: formData.PersonelPassword,
      PersonelAktif: formData.PersonelAktif,
      BolgeID: formData.BolgeID ? parseInt(formData.BolgeID) : null,
    };

    const personelInfoData = {
      PersonelTcKimlik: parseInt(formData.PersonelTcKimlik),
      P_AdSoyad: formData.P_AdSoyad,
      P_KidemTarihi: formData.P_KidemTarihi || null,
      P_AykaSozlesmeTarihi: formData.P_AykaSozlesmeTarihi || null,
      P_DogumTarihi: formData.P_DogumTarihi || null,
      P_DogumYeri: formData.P_DogumYeri || null,
      P_BabaAdi: formData.P_BabaAdi || null,
      P_MedeniHali: formData.P_MedeniHali,
      P_EsGelir: formData.P_EsGelir,
      P_CocukSayisi: formData.P_CocukSayisi || null,
      P_AgiYuzdesi: formData.P_AgiYuzdesi ? parseFloat(formData.P_AgiYuzdesi) : null,
      P_EngelOrani: formData.P_EngelOrani ? parseFloat(formData.P_EngelOrani) : null,
      P_Adres: formData.P_Adres || null,
      P_TelNo: formData.P_TelNo || null,
      P_MailAdres: formData.P_MailAdres || null,
      P_Mezuniyet: formData.P_Mezuniyet || null,
      P_Bolum: formData.P_Bolum || null,
      P_AskerlikDurum: formData.P_AskerlikDurum || null,
      P_TecilBitis: formData.P_TecilBitis || null,
      P_Ehliyet: formData.P_Ehliyet || null,
      P_KanGrubu: formData.P_KanGrubu || null,
      P_IBANno: formData.P_IBANno || null,
      P_DogalGazSayacBelge: formData.P_DogalGazSayacBelge,
      P_DogalGazSayacBelgeGecerlilik: formData.P_DogalGazSayacBelgeGecerlilik || null,
      P_IcTesisatBelge: formData.P_IcTesisatBelge,
      P_IcTesisatBelgeGecerlilik: formData.P_IcTesisatBelgeGecerlilik || null,
      P_Gorevi: formData.P_Gorevi || null,
      P_Sube: formData.P_Sube || null,
    };

    if (editingPersonel) {
      // Güncelleme
      const { error: error1 } = await supabase
        .from('PersonelLevelizasyon')
        .update({
          PersonelRole: personelLevelizasyonData.PersonelRole,
          PersonelEmail: personelLevelizasyonData.PersonelEmail,
          PersonelAktif: personelLevelizasyonData.PersonelAktif,
          BolgeID: personelLevelizasyonData.BolgeID,
          ...(formData.PersonelPassword && { PersonelPassword: formData.PersonelPassword })
        })
        .eq('PersonelTcKimlik', editingPersonel.PersonelTcKimlik);

      const { error: error2 } = await supabase
        .from('PersonelInfo')
        .update(personelInfoData)
        .eq('PersonelTcKimlik', editingPersonel.PersonelTcKimlik);

      if (!error1 && !error2) {
        fetchPersoneller();
        closeModal();
      }
    } else {
      // Yeni ekleme
      const { error: error1 } = await supabase
        .from('PersonelLevelizasyon')
        .insert([personelLevelizasyonData]);

      if (!error1) {
        const { error: error2 } = await supabase
          .from('PersonelInfo')
          .insert([personelInfoData]);

        if (!error2) {
          fetchPersoneller();
          closeModal();
        }
      }
    }
  };

  const handleEdit = (personel: FullPersonel) => {
    setEditingPersonel(personel);
    setFormData({
      PersonelTcKimlik: personel.PersonelTcKimlik.toString(),
      PersonelRole: personel.PersonelRole,
      PersonelEmail: personel.PersonelEmail,
      PersonelPassword: '',
      PersonelAktif: personel.PersonelAktif,
      BolgeID: personel.BolgeID?.toString() || '',
      P_AdSoyad: personel.PersonelInfo?.P_AdSoyad || '',
      P_KidemTarihi: personel.PersonelInfo?.P_KidemTarihi || '',
      P_AykaSozlesmeTarihi: personel.PersonelInfo?.P_AykaSozlesmeTarihi || '',
      P_DogumTarihi: personel.PersonelInfo?.P_DogumTarihi || '',
      P_DogumYeri: personel.PersonelInfo?.P_DogumYeri || '',
      P_BabaAdi: personel.PersonelInfo?.P_BabaAdi || '',
      P_MedeniHali: personel.PersonelInfo?.P_MedeniHali || false,
      P_EsGelir: personel.PersonelInfo?.P_EsGelir || false,
      P_CocukSayisi: personel.PersonelInfo?.P_CocukSayisi || '',
      P_AgiYuzdesi: personel.PersonelInfo?.P_AgiYuzdesi?.toString() || '',
      P_EngelOrani: personel.PersonelInfo?.P_EngelOrani?.toString() || '',
      P_Adres: personel.PersonelInfo?.P_Adres || '',
      P_TelNo: personel.PersonelInfo?.P_TelNo || '',
      P_MailAdres: personel.PersonelInfo?.P_MailAdres || '',
      P_Mezuniyet: personel.PersonelInfo?.P_Mezuniyet || '',
      P_Bolum: personel.PersonelInfo?.P_Bolum || '',
      P_AskerlikDurum: personel.PersonelInfo?.P_AskerlikDurum || '',
      P_TecilBitis: personel.PersonelInfo?.P_TecilBitis || '',
      P_Ehliyet: personel.PersonelInfo?.P_Ehliyet || '',
      P_KanGrubu: personel.PersonelInfo?.P_KanGrubu || '',
      P_IBANno: personel.PersonelInfo?.P_IBANno || '',
      P_DogalGazSayacBelge: personel.PersonelInfo?.P_DogalGazSayacBelge || false,
      P_DogalGazSayacBelgeGecerlilik: personel.PersonelInfo?.P_DogalGazSayacBelgeGecerlilik || '',
      P_IcTesisatBelge: personel.PersonelInfo?.P_IcTesisatBelge || false,
      P_IcTesisatBelgeGecerlilik: personel.PersonelInfo?.P_IcTesisatBelgeGecerlilik || '',
      P_Gorevi: personel.PersonelInfo?.P_Gorevi || '',
      P_Sube: personel.PersonelInfo?.P_Sube || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (tc: number) => {
    if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
      const { error } = await supabase
        .from('PersonelLevelizasyon')
        .delete()
        .eq('PersonelTcKimlik', tc);

      if (!error) {
        fetchPersoneller();
      }
    }
  };

  const toggleAktif = async (personel: FullPersonel) => {
    const { error } = await supabase
      .from('PersonelLevelizasyon')
      .update({ PersonelAktif: !personel.PersonelAktif })
      .eq('PersonelTcKimlik', personel.PersonelTcKimlik);

    if (!error) {
      fetchPersoneller();
    }
  };

  const handleView = (personel: FullPersonel) => {
    setViewingPersonel(personel);
    setViewModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPersonel(null);
    setFormData({
      PersonelTcKimlik: '',
      PersonelRole: 'saha_personeli',
      PersonelEmail: '',
      PersonelPassword: '',
      PersonelAktif: true,
      BolgeID: '',
      P_AdSoyad: '',
      P_KidemTarihi: '',
      P_AykaSozlesmeTarihi: '',
      P_DogumTarihi: '',
      P_DogumYeri: '',
      P_BabaAdi: '',
      P_MedeniHali: false,
      P_EsGelir: false,
      P_CocukSayisi: '',
      P_AgiYuzdesi: '',
      P_EngelOrani: '',
      P_Adres: '',
      P_TelNo: '',
      P_MailAdres: '',
      P_Mezuniyet: '',
      P_Bolum: '',
      P_AskerlikDurum: '',
      P_TecilBitis: '',
      P_Ehliyet: '',
      P_KanGrubu: '',
      P_IBANno: '',
      P_DogalGazSayacBelge: false,
      P_DogalGazSayacBelgeGecerlilik: '',
      P_IcTesisatBelge: false,
      P_IcTesisatBelgeGecerlilik: '',
      P_Gorevi: '',
      P_Sube: '',
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'saha_personeli': 'Saha Personeli',
      'koordinator': 'Koordinatör',
      'insan_kaynaklari': 'İnsan Kaynakları',
      'yonetici': 'Yönetici'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'saha_personeli': 'from-blue-500 to-cyan-500',
      'koordinator': 'from-purple-500 to-pink-500',
      'insan_kaynaklari': 'from-green-500 to-emerald-500',
      'yonetici': 'from-orange-500 to-red-500'
    };
    return colors[role] || 'from-gray-500 to-gray-600';
  };

  const filteredPersoneller = personeller.filter((personel) => {
    const matchesSearch = 
      personel.PersonelInfo?.P_AdSoyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personel.PersonelEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personel.PersonelTcKimlik.toString().includes(searchTerm);
    
    const matchesRole = filterRole === 'all' || personel.PersonelRole === filterRole;
    const matchesAktif = 
      filterAktif === 'all' || 
      (filterAktif === 'aktif' && personel.PersonelAktif) ||
      (filterAktif === 'pasif' && !personel.PersonelAktif);
    
    const matchesBolge = filterBolge === 'all' || personel.BolgeID?.toString() === filterBolge;

    return matchesSearch && matchesRole && matchesAktif && matchesBolge;
  });

  // Yetki kontrolü
  const canAddPersonel = user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari' || user?.PersonelRole === 'koordinator';

  return (
    <ProtectedRoute allowedRoles={['koordinator', 'insan_kaynaklari', 'yonetici']}>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : (
        <div className="space-y-6 animate-slide-up">
          {/* Header - Modern */}
          <div className={`
            rounded-2xl p-6 sm:p-8 border
            ${isDark 
              ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
              : 'bg-gradient-to-br from-white/50 to-gray-50/50 border-gray-200/50'
            }
            backdrop-blur-xl shadow-xl
          `}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Personel Yönetimi
                  </h1>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tüm personelleri yönetin
                  </p>
                </div>
              </div>
              {canAddPersonel && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Yeni Personel</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters - Modern */}
          <div className={`
            rounded-2xl p-6 border
            ${isDark 
              ? 'bg-gray-800/50 border-gray-700/50' 
              : 'bg-white/50 border-gray-200/50'
            }
            backdrop-blur-xl shadow-xl space-y-4
          `}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ad, TC Kimlik veya e-posta ile ara..."
                className={`w-full pl-12 pr-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${user?.PersonelRole === 'koordinator' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Rol Filtresi</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="all">Tüm Roller</option>
                  <option value="saha_personeli">Saha Personeli</option>
                  <option value="koordinator">Koordinatör</option>
                  <option value="insan_kaynaklari">İnsan Kaynakları</option>
                  <option value="yonetici">Yönetici</option>
                </select>
              </div>

              {/* Bölge Filtresi - Sadece Yönetici ve İK görebilir */}
              {user?.PersonelRole !== 'koordinator' && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Bölge Filtresi</label>
                  <select
                    value={filterBolge}
                    onChange={(e) => setFilterBolge(e.target.value)}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="all">Tüm Bölgeler</option>
                    {bolgeler.map((bolge) => (
                      <option key={bolge.BolgeID} value={bolge.BolgeID.toString()}>
                        {bolge.BolgeAdi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Durum Filtresi</label>
                <select
                  value={filterAktif}
                  onChange={(e) => setFilterAktif(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table - Modern */}
          <div className={`
            rounded-2xl overflow-hidden border
            ${isDark 
              ? 'bg-gray-800/50 border-gray-700/50' 
              : 'bg-white/50 border-gray-200/50'
            }
            backdrop-blur-xl shadow-xl
          `}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`
                  border-b
                  ${isDark 
                    ? 'bg-gray-900/50 border-gray-700' 
                    : 'bg-gray-50/50 border-gray-200'
                  }
                `}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Personel
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      TC Kimlik
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rol
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Bölge
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Görevi
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Durum
                    </th>
                    <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'divide-gray-700/50' : 'divide-gray-200/50'} divide-y`}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPersoneller.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Personel bulunamadı</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPersoneller.map((personel) => (
                      <tr 
                        key={personel.PersonelTcKimlik} 
                        className={`
                          transition-all duration-200
                          ${isDark 
                            ? 'hover:bg-gray-700/30' 
                            : 'hover:bg-gray-50/50'
                          }
                        `}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-11 h-11 rounded-xl bg-gradient-to-br ${getRoleColor(personel.PersonelRole)} 
                              flex items-center justify-center shadow-lg
                            `}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {personel.PersonelInfo?.P_AdSoyad || 'Bilinmiyor'}
                              </p>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {personel.PersonelEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {personel.PersonelTcKimlik}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium
                            ${isDark 
                              ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50' 
                              : 'bg-gray-100/50 text-gray-900 border border-gray-200/50'
                            }
                          `}>
                            {getRoleLabel(personel.PersonelRole)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {personel.BolgeInfo?.BolgeAdi || '-'}
                        </td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {personel.PersonelInfo?.P_Gorevi || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleAktif(personel)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              personel.PersonelAktif
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                            )}
                          >
                            {personel.PersonelAktif ? 'Aktif' : 'Pasif'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(personel)}
                              className={`
                                p-2.5 rounded-xl transition-all transform hover:scale-110
                                ${isDark 
                                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30' 
                                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                                }
                              `}
                              title="Detay"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canAddPersonel && (
                              <>
                                <button
                                  onClick={() => handleEdit(personel)}
                                  className={`
                                    p-2.5 rounded-xl transition-all transform hover:scale-110
                                    ${isDark 
                                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30' 
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                    }
                                  `}
                                  title="Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(personel.PersonelTcKimlik)}
                                  className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'} transition-colors`}
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit Modal */}
          {modalOpen && (
            <PersonelFormModal
              editingPersonel={editingPersonel}
              formData={formData}
              setFormData={setFormData}
              bolgeler={bolgeler}
              onSubmit={handleSubmit}
              onClose={closeModal}
              getRoleLabel={getRoleLabel}
            />
          )}

          {/* View Modal */}
          {viewModalOpen && viewingPersonel && (
            <PersonelViewModal
              personel={viewingPersonel}
              onClose={() => setViewModalOpen(false)}
              getRoleLabel={getRoleLabel}
            />
          )}
        </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Form Modal Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PersonelFormModal({ editingPersonel, formData, setFormData, bolgeler, onSubmit, onClose }: any) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'genel' | 'kisisel' | 'belge'>('genel');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      {/* Backdrop with better dark/light mode - stops before taskbar */}
      <div 
        className={`fixed inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      
      {/* Modal - full screen but above taskbar */}
      <div 
        className={`
          rounded-none shadow-2xl w-full overflow-y-auto
          ${isDark 
            ? 'bg-gray-800/95' 
            : 'bg-white/95'
          }
          backdrop-blur-xl
          animate-scale-in
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
          {/* Windows style header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingPersonel ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
            </h2>
            {/* Windows style close button */}
            <button 
              onClick={onClose} 
              className={`
                w-12 h-10 flex items-center justify-center transition-all
                hover:bg-red-600 hover:text-white
                ${isDark 
                  ? 'text-gray-300' 
                  : 'text-gray-600'
                }
              `}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['genel', 'kisisel', 'belge'].map((tab) => (
            <button
              key={tab}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                activeTab === tab
                  ? isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                  : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {tab === 'genel' ? 'Genel Bilgiler' : tab === 'kisisel' ? 'Kişisel Bilgiler' : 'Belge & Diğer'}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Genel Bilgiler Tab */}
          {activeTab === 'genel' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>TC Kimlik No *</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    disabled={!!editingPersonel}
                    value={formData.PersonelTcKimlik}
                    onChange={(e) => setFormData({ ...formData, PersonelTcKimlik: e.target.value.replace(/\D/g, '') })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                    placeholder="12345678901"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    value={formData.P_AdSoyad}
                    onChange={(e) => setFormData({ ...formData, P_AdSoyad: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Ahmet Yılmaz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>E-posta *</label>
                  <input
                    type="email"
                    required
                    value={formData.PersonelEmail}
                    onChange={(e) => setFormData({ ...formData, PersonelEmail: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="ahmet@aykaenerji.com"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>
                    Şifre {editingPersonel ? '(Boş bırakılırsa değişmez)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingPersonel}
                    value={formData.PersonelPassword}
                    onChange={(e) => setFormData({ ...formData, PersonelPassword: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Rol *</label>
                  <select
                    required
                    value={formData.PersonelRole}
                    onChange={(e) => setFormData({ ...formData, PersonelRole: e.target.value as UserRole })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="saha_personeli">Saha Personeli</option>
                    <option value="koordinator">Koordinatör</option>
                    <option value="insan_kaynaklari">İnsan Kaynakları</option>
                    <option value="yonetici">Yönetici</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Bölge</label>
                  <select
                    value={formData.BolgeID}
                    onChange={(e) => setFormData({ ...formData, BolgeID: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Seçiniz</option>
                    {bolgeler.map((bolge: BolgeInfo) => (
                      <option key={bolge.BolgeID} value={bolge.BolgeID}>
                        {bolge.BolgeAdi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Görevi</label>
                  <input
                    type="text"
                    value={formData.P_Gorevi}
                    onChange={(e) => setFormData({ ...formData, P_Gorevi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Saha Görevlisi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Telefon</label>
                  <input
                    type="tel"
                    value={formData.P_TelNo}
                    onChange={(e) => setFormData({ ...formData, P_TelNo: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="0555 123 4567"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Kıdem Tarihi</label>
                  <input
                    type="date"
                    value={formData.P_KidemTarihi}
                    onChange={(e) => setFormData({ ...formData, P_KidemTarihi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.PersonelAktif}
                    onChange={(e) => setFormData({ ...formData, PersonelAktif: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border border-white/20"
                  />
                  <span className="text-white/90">Aktif Personel</span>
                </label>
              </div>
            </div>
          )}

          {/* Kişisel Bilgiler Tab */}
          {activeTab === 'kisisel' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Doğum Tarihi</label>
                  <input
                    type="date"
                    value={formData.P_DogumTarihi}
                    onChange={(e) => setFormData({ ...formData, P_DogumTarihi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Doğum Yeri</label>
                  <input
                    type="text"
                    value={formData.P_DogumYeri}
                    onChange={(e) => setFormData({ ...formData, P_DogumYeri: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="İstanbul"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Baba Adı</label>
                  <input
                    type="text"
                    value={formData.P_BabaAdi}
                    onChange={(e) => setFormData({ ...formData, P_BabaAdi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Ali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Kan Grubu</label>
                  <select
                    value={formData.P_KanGrubu}
                    onChange={(e) => setFormData({ ...formData, P_KanGrubu: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Seçiniz</option>
                    <option value="A Rh+">A Rh+</option>
                    <option value="A Rh-">A Rh-</option>
                    <option value="B Rh+">B Rh+</option>
                    <option value="B Rh-">B Rh-</option>
                    <option value="AB Rh+">AB Rh+</option>
                    <option value="AB Rh-">AB Rh-</option>
                    <option value="0 Rh+">0 Rh+</option>
                    <option value="0 Rh-">0 Rh-</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Ehliyet Sınıfı</label>
                  <input
                    type="text"
                    value={formData.P_Ehliyet}
                    onChange={(e) => setFormData({ ...formData, P_Ehliyet: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="B"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Askerlik Durumu</label>
                  <select
                    value={formData.P_AskerlikDurum}
                    onChange={(e) => setFormData({ ...formData, P_AskerlikDurum: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Yapıldı">Yapıldı</option>
                    <option value="Muaf">Muaf</option>
                    <option value="Tecilli">Tecilli</option>
                    <option value="Yok">Yok</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Mezuniyet</label>
                  <input
                    type="text"
                    value={formData.P_Mezuniyet}
                    onChange={(e) => setFormData({ ...formData, P_Mezuniyet: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Lise"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Bölüm</label>
                  <input
                    type="text"
                    value={formData.P_Bolum}
                    onChange={(e) => setFormData({ ...formData, P_Bolum: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Elektrik"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Adres</label>
                <textarea
                  value={formData.P_Adres}
                  onChange={(e) => setFormData({ ...formData, P_Adres: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Ev adresi..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>IBAN</label>
                <input
                  type="text"
                  value={formData.P_IBANno}
                  onChange={(e) => setFormData({ ...formData, P_IBANno: e.target.value })}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.P_MedeniHali}
                    onChange={(e) => setFormData({ ...formData, P_MedeniHali: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border border-white/20"
                  />
                  <span className="text-white/90">Evli</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.P_EsGelir}
                    onChange={(e) => setFormData({ ...formData, P_EsGelir: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border border-white/20"
                  />
                  <span className="text-white/90">Eş Geliri Var</span>
                </label>
              </div>
            </div>
          )}

          {/* Belge & Diğer Tab */}
          {activeTab === 'belge' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.P_DogalGazSayacBelge}
                      onChange={(e) => setFormData({ ...formData, P_DogalGazSayacBelge: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/10 border border-white/20"
                    />
                    <span className="text-white/90">Doğal Gaz Sayaç Belgesi</span>
                  </label>
                  {formData.P_DogalGazSayacBelge && (
                    <input
                      type="date"
                      value={formData.P_DogalGazSayacBelgeGecerlilik}
                      onChange={(e) => setFormData({ ...formData, P_DogalGazSayacBelgeGecerlilik: e.target.value })}
                      className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.P_IcTesisatBelge}
                      onChange={(e) => setFormData({ ...formData, P_IcTesisatBelge: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/10 border border-white/20"
                    />
                    <span className="text-white/90">İç Tesisat Belgesi</span>
                  </label>
                  {formData.P_IcTesisatBelge && (
                    <input
                      type="date"
                      value={formData.P_IcTesisatBelgeGecerlilik}
                      onChange={(e) => setFormData({ ...formData, P_IcTesisatBelgeGecerlilik: e.target.value })}
                      className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Çocuk Sayısı</label>
                  <input
                    type="text"
                    value={formData.P_CocukSayisi}
                    onChange={(e) => setFormData({ ...formData, P_CocukSayisi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>AGİ Yüzdesi (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.P_AgiYuzdesi}
                    onChange={(e) => setFormData({ ...formData, P_AgiYuzdesi: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? "text-white/90" : "text-gray-700"} mb-2`}>Engel Oranı (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.P_EngelOrani}
                    onChange={(e) => setFormData({ ...formData, P_EngelOrani: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

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
              {editingPersonel ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// View Modal Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PersonelViewModal({ personel, onClose, getRoleLabel }: any) {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      {/* Backdrop - stops before taskbar */}
      <div 
        className={`fixed inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      
      {/* Modal - full screen but above taskbar */}
      <div 
        className={`
          rounded-none shadow-2xl w-full overflow-y-auto
          ${isDark 
            ? 'bg-gray-800/95' 
            : 'bg-white/95'
          }
          backdrop-blur-xl
          animate-scale-in
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
          {/* Windows style header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Personel Detayları
            </h2>
            {/* Windows style close button */}
            <button 
              onClick={onClose} 
              className={`
                w-12 h-10 flex items-center justify-center transition-all
                hover:bg-red-600 hover:text-white
                ${isDark 
                  ? 'text-gray-300' 
                  : 'text-gray-600'
                }
              `}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        <div className="space-y-6">
          {/* Genel Bilgiler */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Genel Bilgiler
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Ad Soyad" value={personel.PersonelInfo?.P_AdSoyad} />
              <InfoField label="TC Kimlik" value={personel.PersonelTcKimlik} />
              <InfoField label="E-posta" value={personel.PersonelEmail} />
              <InfoField label="Rol" value={getRoleLabel(personel.PersonelRole)} />
              <InfoField label="Bölge" value={personel.BolgeInfo?.BolgeAdi} />
              <InfoField label="Görevi" value={personel.PersonelInfo?.P_Gorevi} />
              <InfoField label="Telefon" value={personel.PersonelInfo?.P_TelNo} />
              <InfoField label="Durum" value={personel.PersonelAktif ? 'Aktif' : 'Pasif'} />
            </div>
          </div>

          {/* Kişisel Bilgiler */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Kişisel Bilgiler
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Doğum Tarihi" value={personel.PersonelInfo?.P_DogumTarihi} />
              <InfoField label="Doğum Yeri" value={personel.PersonelInfo?.P_DogumYeri} />
              <InfoField label="Baba Adı" value={personel.PersonelInfo?.P_BabaAdi} />
              <InfoField label="Kan Grubu" value={personel.PersonelInfo?.P_KanGrubu} />
              <InfoField label="Medeni Hali" value={personel.PersonelInfo?.P_MedeniHali ? 'Evli' : 'Bekar'} />
              <InfoField label="Askerlik" value={personel.PersonelInfo?.P_AskerlikDurum} />
              <InfoField label="Mezuniyet" value={personel.PersonelInfo?.P_Mezuniyet} />
              <InfoField label="Ehliyet" value={personel.PersonelInfo?.P_Ehliyet} />
            </div>
          </div>

          {/* Belgeler */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Belgeler
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField 
                label="Doğal Gaz Sayaç Belgesi" 
                value={personel.PersonelInfo?.P_DogalGazSayacBelge ? `Var (${personel.PersonelInfo?.P_DogalGazSayacBelgeGecerlilik || 'Tarih yok'})` : 'Yok'} 
              />
              <InfoField 
                label="İç Tesisat Belgesi" 
                value={personel.PersonelInfo?.P_IcTesisatBelge ? `Var (${personel.PersonelInfo?.P_IcTesisatBelgeGecerlilik || 'Tarih yok'})` : 'Yok'} 
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className={`
              w-full px-6 py-3 rounded-xl transition-all
              ${isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }
            `}
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
      <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </p>
      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value || '-'}
      </p>
    </div>
  );
}


