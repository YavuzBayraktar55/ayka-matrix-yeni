'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FileText, User, Download, Search, X, ChevronRight, Calendar, DollarSign, UserPlus, UserMinus, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface Personel {
  PersonelID: number;
  PersonelTcKimlik: string;
  PersonelEmail: string;
  PersonelRole: string;
  PersonelInfo?: {
    P_AdSoyad: string;
    P_DogumTarihi: string;
    P_TelNo?: string;
    P_Gorevi?: string;
    P_Sube?: string;
  };
  BolgeInfo?: {
    BolgeAdi: string;
  };
}

interface Sablon {
  SablonID: number;
  SablonAdi: string;
  SablonTuru: 'genel' | 'izin' | 'avans' | 'ise_giris' | 'isten_cikis';
  HeaderContent: string;
  ContentHTML: string;
  FooterContent: string;
  ImagesJSON: string;
  StylesJSON: string;
  created_at: string;
}

interface IzinKayit {
  IzinID: number;
  PersonelTcKimlik: string;
  BaslangicTarihi: string;
  BitisTarihi: string;
  IzinTuru: string;
  Durum: string;
  GunSayisi: number;
  PersonelLevelizasyon?: {
    PersonelTcKimlik: string;
    PersonelEmail: string;
    PersonelInfo?: {
      P_AdSoyad: string;
    };
  };
}

interface AvansKayit {
  AvansID: number;
  PersonelTcKimlik: string;
  TalepTarihi: string;
  AvansMiktari: number;
  Durum: string;
  Aciklama?: string;
  PersonelLevelizasyon?: {
    PersonelTcKimlik: string;
    PersonelEmail: string;
    PersonelInfo?: {
      P_AdSoyad: string;
    };
  };
}

interface TemplateImage {
  id: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

interface PreviewData {
  html: string;
  personelInfo: Personel;
  sablonAdi: string;
  personel: Personel;
  contentHTML: string;
  headerContent?: string;
  footerContent?: string;
  images?: TemplateImage[];
  styles?: {
    fontSize?: string;
    fontFamily?: string;
  };
}

export default function EvraklarPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [filteredPersoneller, setFilteredPersoneller] = useState<Personel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sablonlar, setSablonlar] = useState<Sablon[]>([]);
  const [selectedSablon, setSelectedSablon] = useState<Sablon | null>(null);
  const [selectedPersonel, setSelectedPersonel] = useState<Personel | null>(null);
  
  const [showPersonelModal, setShowPersonelModal] = useState(false);
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [showAvansModal, setShowAvansModal] = useState(false);
  
  const [izinKayitlari, setIzinKayitlari] = useState<IzinKayit[]>([]);
  const [avansKayitlari, setAvansKayitlari] = useState<AvansKayit[]>([]);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPersoneller(personeller);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = personeller.filter(p => 
        p.PersonelInfo?.P_AdSoyad?.toLowerCase().includes(query) ||
        p.PersonelEmail?.toLowerCase().includes(query) ||
        p.PersonelTcKimlik?.toString().includes(query) ||
        p.BolgeInfo?.BolgeAdi?.toLowerCase().includes(query)
      );
      setFilteredPersoneller(filtered);
    }
  }, [searchQuery, personeller]);

  // Personelleri getir
  const fetchPersoneller = async () => {
    if (!user?.PersonelEmail || !user?.PersonelRole) {
      console.error('❌ User bilgisi eksik');
      return;
    }

    try {
      const response = await fetch(
        `/api/personel?userEmail=${encodeURIComponent(user.PersonelEmail)}&userRole=${encodeURIComponent(user.PersonelRole)}`
      );

      if (!response.ok) throw new Error('API request failed');

      const result = await response.json();

      if (result.error) {
        console.error('❌ API Error:', result.error);
        setPersoneller([]);
        setFilteredPersoneller([]);
      } else {
        console.log('✅ Personel Verisi Geldi:', result.data?.length || 0);
        setPersoneller((result.data as unknown as Personel[]) || []);
        setFilteredPersoneller((result.data as unknown as Personel[]) || []);
      }
    } catch (error) {
      console.error('Error fetching personel:', error);
      setPersoneller([]);
      setFilteredPersoneller([]);
    }
  };

  // Şablonları getir
  const fetchSablonlar = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Oturum bulunamadı');
        return;
      }

      const response = await fetch('/api/sablonlar', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSablonlar(data);
        console.log('✅ Şablonlar yüklendi:', data.length);
      } else {
        console.error('❌ Şablon yükleme hatası:', response.status);
      }
    } catch (error) {
      console.error('❌ Şablon yükleme hatası:', error);
    }
  };

  // Tüm izinleri getir (tüm personeller için)
  const fetchAllIzinler = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Oturum bulunamadı!');
        return;
      }

      const response = await fetch('/api/izin-gecmis', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setIzinKayitlari(result.data || []);
        setShowIzinModal(true);
        console.log('✅ Tüm izinler yüklendi:', result.data?.length);
      } else {
        alert('İzinler yüklenemedi!');
      }
    } catch (error) {
      console.error('İzin yükleme hatası:', error);
      alert('İzinler yüklenemedi!');
    } finally {
      setLoading(false);
    }
  };

  // Tüm avansları getir (tüm personeller için)
  const fetchAllAvanslar = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('AvansKayitlari')
        .select(`
          *,
          PersonelLevelizasyon!inner(
            PersonelTcKimlik,
            PersonelEmail,
            PersonelInfo(P_AdSoyad)
          )
        `)
        .order('TalepTarihi', { ascending: false });

      if (error) throw error;
      
      setAvansKayitlari(data || []);
      setShowAvansModal(true);
      console.log('✅ Tüm avanslar yüklendi:', data?.length);
    } catch (error) {
      console.error('Avans yükleme hatası:', error);
      alert('Avanslar yüklenemedi!');
    } finally {
      setLoading(false);
    }
  };

  // PDF olarak indir
  const downloadPDF = async () => {
    if (!canvasRef.current || !previewData) return;

    try {
      const canvas = canvasRef.current;
      
      // Canvas'ı yakalama - sadece canvas div'i, beyaz arkaplan zorla
      const canvasImage = await html2canvas(canvas, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        background: '#ffffff'
      });

      // PDF oluştur - A4 boyutu mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = 210; // A4 genişlik (mm)
      const pdfHeight = 297; // A4 yükseklik (mm)
      
      // Canvas'tan PNG oluştur
      const imgData = canvasImage.toDataURL('image/png', 1.0);
      
      // Tam sayfa ekle - marjin yok
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const fileName = `${previewData.sablonAdi}_${previewData.personel.PersonelInfo?.P_AdSoyad || 'personel'}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF İndirildi:', fileName);
      alert('✅ PDF başarıyla indirildi!');
    } catch (error) {
      console.error('❌ PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu!');
    }
  };

  useEffect(() => {
    fetchPersoneller();
    fetchSablonlar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <ProtectedRoute allowedRoles={['koordinator', 'insan_kaynaklari', 'yonetici']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn(
                'text-3xl font-bold',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                Evraklar
              </h1>
              <p className={cn(
                'mt-1 text-sm',
                isDark ? 'text-gray-400' : 'text-gray-600'
              )}>
                Şablon seçin ve personel için evrak oluşturun
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
              )}>
                <FileText className="w-5 h-5" />
                <span className="font-medium">{sablonlar.length} Şablon</span>
              </div>
            </div>
          </div>

          {/* Şablon Kartları */}
          <div>
            <h2 className={cn(
              'text-xl font-semibold mb-4',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              📄 Şablonlar
            </h2>

            {/* Şablon Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sablonlar.length === 0 ? (
                <div className={cn(
                  'col-span-full text-center py-12',
                  isDark ? 'text-gray-400' : 'text-gray-600'
                )}>
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    Henüz şablon yok
                  </p>
                  <p className="text-sm mt-2">
                    Şablon Düzenleyici&apos;den yeni şablon oluşturun
                  </p>
                </div>
              ) : (
                sablonlar.map((sablon) => {
                  const typeConfig = {
                    genel: { icon: FileText, color: 'gray', emoji: '📄', bg: 'from-gray-500 to-slate-600' },
                    izin: { icon: Calendar, color: 'blue', emoji: '🏖️', bg: 'from-blue-500 to-cyan-600' },
                    avans: { icon: DollarSign, color: 'green', emoji: '💰', bg: 'from-green-500 to-emerald-600' },
                    ise_giris: { icon: UserPlus, color: 'purple', emoji: '👋', bg: 'from-purple-500 to-pink-600' },
                    isten_cikis: { icon: UserMinus, color: 'red', emoji: '🚪', bg: 'from-red-500 to-orange-600' },
                  };

                  const config = typeConfig[sablon.SablonTuru as keyof typeof typeConfig];

                  return (
                    <div
                      key={sablon.SablonID}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl p-6 transition-all duration-300',
                        'hover:shadow-2xl',
                        isDark 
                          ? 'bg-gray-800/50 border border-gray-700' 
                          : 'bg-white border border-gray-200'
                      )}
                    >
                      {/* Gradient Background */}
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity',
                        config.bg
                      )} />

                      {/* Content */}
                      <div className="relative z-10">
                        {/* Icon & Type Badge */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn(
                            'w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg',
                            'bg-gradient-to-br',
                            config.bg
                          )}>
                            {config.emoji}
                          </div>
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full font-medium',
                            config.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                            config.color === 'green' && 'bg-green-500/20 text-green-400',
                            config.color === 'purple' && 'bg-purple-500/20 text-purple-400',
                            config.color === 'red' && 'bg-red-500/20 text-red-400',
                            config.color === 'gray' && 'bg-gray-500/20 text-gray-400'
                          )}>
                            {sablon.SablonTuru}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className={cn(
                          'text-lg font-bold mb-2',
                          isDark ? 'text-white' : 'text-gray-900'
                        )}>
                          {sablon.SablonAdi}
                        </h3>

                        {/* Date */}
                        <p className={cn(
                          'text-xs mb-4',
                          isDark ? 'text-gray-500' : 'text-gray-500'
                        )}>
                          {new Date(sablon.created_at).toLocaleDateString('tr-TR')}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => router.push(`/dashboard/sablon-duzenleyici?id=${sablon.SablonID}`)}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all',
                              isDark 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            )}
                          >
                            <Edit className="w-4 h-4" />
                            <span>Düzenle</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSablon(sablon);
                              
                              // Şablon içeriğinde hangi placeholder'lar var kontrol et
                              const allContent = `${sablon.HeaderContent} ${sablon.ContentHTML} ${sablon.FooterContent}`;
                              const hasIzinPlaceholder = allContent.includes('{izin_baslangic}') || 
                                                        allContent.includes('{izin_bitis}') || 
                                                        allContent.includes('{izin_gun}') ||
                                                        allContent.includes('{izin_turu}');
                              const hasAvansPlaceholder = allContent.includes('{avans_miktar}') || 
                                                         allContent.includes('{avans_tarih}') || 
                                                         allContent.includes('{avans_aciklama}');
                              
                              // İzin placeholder'ı varsa tüm izinleri göster
                              if (hasIzinPlaceholder) {
                                fetchAllIzinler();
                              } 
                              // Avans placeholder'ı varsa tüm avansları göster
                              else if (hasAvansPlaceholder) {
                                fetchAllAvanslar();
                              } 
                              // Yoksa personel seç
                              else {
                                if (personeller.length > 0) {
                                  setShowPersonelModal(true);
                                } else {
                                  alert('Henüz personel yok!');
                                }
                              }
                            }}
                            disabled={loading}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all',
                              loading && 'opacity-50 cursor-not-allowed',
                              isDark 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            )}
                          >
                            <User className="w-4 h-4" />
                            <span>Personel Seç</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>

      {/* Personel Seçim Modal - Şablon seçildikten sonra açılır */}
      {showPersonelModal && selectedSablon && createPortal(
        <>
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowPersonelModal(false);
                setSelectedSablon(null);
              }}
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000] pointer-events-none">
              <div 
                className={cn(
                  'w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto',
                  'transform transition-all duration-300 ease-out',
                  isDark ? 'bg-gray-900' : 'bg-white'
                )}
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-700 p-6">
                  <button
                    onClick={() => {
                      setShowPersonelModal(false);
                      setSelectedSablon(null);
                    }}
                    className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    👤 Personel Seçin
                  </h2>
                  <p className="text-purple-100">
                    <span className="font-semibold">{selectedSablon.SablonAdi}</span> için personel seçin
                  </p>
                </div>

                {/* Search */}
                <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5',
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    )} />
                    <input
                      type="text"
                      placeholder="Personel ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all',
                        isDark 
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                      )}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Evrak oluşturuluyor...</p>
                    </div>
                  ) : filteredPersoneller.length === 0 ? (
                    <div className={cn(
                      'text-center py-12',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">
                        {searchQuery ? 'Personel bulunamadı' : 'Henüz personel yok'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {filteredPersoneller.map((personel) => (
                        <button
                          key={personel.PersonelTcKimlik}
                          onClick={async () => {
                            setSelectedPersonel(personel);
                            
                            // Şablon türüne göre yönlendir
                            if (selectedSablon.SablonTuru === 'izin') {
                              // İzin kayıtlarını getir
                              setLoading(true);
                              try {
                                const supabase = createClient();
                                const { data: { session } } = await supabase.auth.getSession();
                                
                                if (!session?.access_token) {
                                  alert('Oturum bulunamadı!');
                                  return;
                                }

                                const response = await fetch(`/api/izin-gecmis?personelTcKimlik=${personel.PersonelTcKimlik}`, {
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`
                                  }
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  setIzinKayitlari(data.data || []);
                                  setShowPersonelModal(false);
                                  setShowIzinModal(true);
                                }
                              } catch (error) {
                                console.error('İzin kayıtları yüklenemedi:', error);
                                alert('İzin kayıtları yüklenemedi!');
                              } finally {
                                setLoading(false);
                              }
                            } else if (selectedSablon.SablonTuru === 'avans') {
                              // Avans kayıtlarını getir
                              setLoading(true);
                              try {
                                const supabase = createClient();
                                const { data, error } = await supabase
                                  .from('AvansKayitlari')
                                  .select('*')
                                  .eq('PersonelTcKimlik', personel.PersonelTcKimlik)
                                  .order('TalepTarihi', { ascending: false });

                                if (error) throw error;
                                
                                setAvansKayitlari(data || []);
                                setShowPersonelModal(false);
                                setShowAvansModal(true);
                              } catch (error) {
                                console.error('Avans kayıtları yüklenemedi:', error);
                                alert('Avans kayıtları yüklenemedi!');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              // Genel şablon - direkt oluştur
                              setLoading(true);
                              try {
                                const supabase = createClient();
                                const { data: { session } } = await supabase.auth.getSession();
                                
                                if (!session?.access_token) {
                                  alert('Oturum bulunamadı!');
                                  return;
                                }

                                const response = await fetch('/api/evrak-olustur', {
                                  method: 'POST',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`
                                  },
                                  body: JSON.stringify({
                                    sablonId: selectedSablon.SablonID,
                                    personelTcKimlik: personel.PersonelTcKimlik,
                                  }),
                                });

                                if (!response.ok) throw new Error('Evrak oluşturulamadı');

                                const result = await response.json();
                                setPreviewData(result.data);
                                setShowPersonelModal(false);
                                setShowPreviewModal(true);
                              } catch (error) {
                                console.error('Error:', error);
                                alert('Evrak oluşturulurken bir hata oluştu!');
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          disabled={loading}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all hover:border-purple-500 hover:shadow-lg group',
                            loading && 'opacity-50 cursor-not-allowed',
                            isDark 
                              ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800' 
                              : 'bg-white border-gray-200 hover:bg-purple-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow">
                                {personel.PersonelInfo?.P_AdSoyad?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1">
                                <p className={cn(
                                  'font-semibold',
                                  isDark ? 'text-white' : 'text-gray-900'
                                )}>
                                  {personel.PersonelInfo?.P_AdSoyad || 'İsimsiz'}
                                </p>
                                <div className={cn(
                                  'text-sm flex items-center gap-3',
                                  isDark ? 'text-gray-400' : 'text-gray-600'
                                )}>
                                  <span>TC: {personel.PersonelTcKimlik}</span>
                                  {personel.BolgeInfo?.BolgeAdi && (
                                    <>
                                      <span>•</span>
                                      <span>{personel.BolgeInfo.BolgeAdi}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={cn(
                              'w-5 h-5 transition-transform group-hover:translate-x-1',
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            )} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* İzin Seçim Modal */}
      {showIzinModal && selectedSablon && createPortal(
        <>
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowIzinModal(false);
                setSelectedPersonel(null);
                setIzinKayitlari([]);
              }}
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000] pointer-events-none">
              <div 
                className={cn(
                  'w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto',
                  'transform transition-all duration-300 ease-out',
                  isDark ? 'bg-gray-900' : 'bg-white'
                )}
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-700 p-6">
                  <button
                    onClick={() => {
                      setShowIzinModal(false);
                      setSelectedPersonel(null);
                      setIzinKayitlari([]);
                    }}
                    className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    📅 İzin Kaydı Seçin
                  </h2>
                  <p className="text-green-100">
                    {selectedPersonel 
                      ? <><span className="font-semibold">{selectedPersonel.PersonelInfo?.P_AdSoyad}</span> için izin seçin</>
                      : <><span className="font-semibold">{selectedSablon.SablonAdi}</span> için izin seçin</>
                    }
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>İzinler yükleniyor...</p>
                    </div>
                  ) : izinKayitlari.length === 0 ? (
                    <div className={cn(
                      'text-center py-12',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Bu personelin izin kaydı bulunamadı</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {izinKayitlari.map((izin) => (
                        <button
                          key={izin.IzinID}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const supabase = createClient();
                              const { data: { session } } = await supabase.auth.getSession();
                              
                              if (!session?.access_token) {
                                alert('Oturum bulunamadı!');
                                return;
                              }

                              // PersonelTcKimlik'i izinden al (selectedPersonel yoksa)
                              const personelTc = selectedPersonel?.PersonelTcKimlik || izin.PersonelTcKimlik;

                              const response = await fetch('/api/evrak-olustur', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify({
                                  sablonId: selectedSablon.SablonID,
                                  personelTcKimlik: personelTc,
                                  izinData: izin
                                }),
                              });

                              if (!response.ok) throw new Error('Evrak oluşturulamadı');

                              const result = await response.json();
                              setPreviewData(result.data);
                              setShowIzinModal(false);
                              setShowPreviewModal(true);
                            } catch (error) {
                              console.error('Error:', error);
                              alert('Evrak oluşturulurken bir hata oluştu!');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all hover:border-green-500 hover:shadow-lg group',
                            loading && 'opacity-50 cursor-not-allowed',
                            isDark 
                              ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800' 
                              : 'bg-white border-gray-200 hover:bg-green-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className={cn(
                                  'font-semibold',
                                  isDark ? 'text-white' : 'text-gray-900'
                                )}>
                                  {izin.IzinTuru} ({izin.GunSayisi} gün)
                                  {!selectedPersonel && izin.PersonelLevelizasyon?.PersonelInfo?.P_AdSoyad && (
                                    <span className={cn(
                                      'ml-2 text-sm font-normal',
                                      isDark ? 'text-gray-400' : 'text-gray-600'
                                    )}>
                                      - {izin.PersonelLevelizasyon.PersonelInfo.P_AdSoyad}
                                    </span>
                                  )}
                                </p>
                                <div className={cn(
                                  'text-sm flex items-center gap-3',
                                  isDark ? 'text-gray-400' : 'text-gray-600'
                                )}>
                                  <span>{new Date(izin.BaslangicTarihi).toLocaleDateString('tr-TR')}</span>
                                  <span>→</span>
                                  <span>{new Date(izin.BitisTarihi).toLocaleDateString('tr-TR')}</span>
                                  <span className={cn(
                                    'ml-2 px-2 py-0.5 rounded text-xs',
                                    izin.Durum === 'Onaylandi' ? 'bg-green-500/20 text-green-400' :
                                    izin.Durum === 'Beklemede' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  )}>
                                    {izin.Durum}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={cn(
                              'w-5 h-5 transition-transform group-hover:translate-x-1',
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            )} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Avans Seçim Modal */}
      {showAvansModal && selectedSablon && createPortal(
        <>
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowAvansModal(false);
                setSelectedPersonel(null);
                setAvansKayitlari([]);
              }}
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000] pointer-events-none">
              <div 
                className={cn(
                  'w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto',
                  'transform transition-all duration-300 ease-out',
                  isDark ? 'bg-gray-900' : 'bg-white'
                )}
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-orange-600 to-amber-700 p-6">
                  <button
                    onClick={() => {
                      setShowAvansModal(false);
                      setSelectedPersonel(null);
                      setAvansKayitlari([]);
                    }}
                    className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    💰 Avans Kaydı Seçin
                  </h2>
                  <p className="text-orange-100">
                    {selectedPersonel 
                      ? <><span className="font-semibold">{selectedPersonel.PersonelInfo?.P_AdSoyad}</span> için avans seçin</>
                      : <><span className="font-semibold">{selectedSablon.SablonAdi}</span> için avans seçin</>
                    }
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Avanslar yükleniyor...</p>
                    </div>
                  ) : avansKayitlari.length === 0 ? (
                    <div className={cn(
                      'text-center py-12',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Bu personelin avans kaydı bulunamadı</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {avansKayitlari.map((avans) => (
                        <button
                          key={avans.AvansID}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const supabase = createClient();
                              const { data: { session } } = await supabase.auth.getSession();
                              
                              if (!session?.access_token) {
                                alert('Oturum bulunamadı!');
                                return;
                              }

                              // PersonelTcKimlik'i avanstan al (selectedPersonel yoksa)
                              const personelTc = selectedPersonel?.PersonelTcKimlik || avans.PersonelTcKimlik;

                              const response = await fetch('/api/evrak-olustur', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify({
                                  sablonId: selectedSablon.SablonID,
                                  personelTcKimlik: personelTc,
                                  avansData: avans
                                }),
                              });

                              if (!response.ok) throw new Error('Evrak oluşturulamadı');

                              const result = await response.json();
                              setPreviewData(result.data);
                              setShowAvansModal(false);
                              setShowPreviewModal(true);
                            } catch (error) {
                              console.error('Error:', error);
                              alert('Evrak oluşturulurken bir hata oluştu!');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all hover:border-orange-500 hover:shadow-lg group',
                            loading && 'opacity-50 cursor-not-allowed',
                            isDark 
                              ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800' 
                              : 'bg-white border-gray-200 hover:bg-orange-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white">
                                <DollarSign className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className={cn(
                                  'font-semibold text-lg',
                                  isDark ? 'text-white' : 'text-gray-900'
                                )}>
                                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(avans.AvansMiktari)}
                                  {!selectedPersonel && avans.PersonelLevelizasyon?.PersonelInfo?.P_AdSoyad && (
                                    <span className={cn(
                                      'ml-2 text-sm font-normal',
                                      isDark ? 'text-gray-400' : 'text-gray-600'
                                    )}>
                                      - {avans.PersonelLevelizasyon.PersonelInfo.P_AdSoyad}
                                    </span>
                                  )}
                                </p>
                                <div className={cn(
                                  'text-sm flex items-center gap-3',
                                  isDark ? 'text-gray-400' : 'text-gray-600'
                                )}>
                                  <span>{new Date(avans.TalepTarihi).toLocaleDateString('tr-TR')}</span>
                                  {avans.Aciklama && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-xs">{avans.Aciklama}</span>
                                    </>
                                  )}
                                  <span className={cn(
                                    'ml-auto px-2 py-0.5 rounded text-xs',
                                    avans.Durum === 'Onaylandi' ? 'bg-green-500/20 text-green-400' :
                                    avans.Durum === 'Beklemede' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  )}>
                                    {avans.Durum}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={cn(
                              'w-5 h-5 transition-transform group-hover:translate-x-1',
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            )} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

        {/* Preview Modal */}
        {showPreviewModal && previewData && createPortal(
          <>
            <div 
              className="fixed inset-0 z-[9999] overflow-hidden"
              style={{ position: 'fixed', bottom: '60px' }}
            >
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowPreviewModal(false)}
                style={{ position: 'fixed', bottom: '60px' }}
              />
              
              <div 
                className={cn(
                  'rounded-none shadow-2xl w-full overflow-y-auto',
                  isDark ? 'bg-gray-900/95' : 'bg-gray-100/95'
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
                  'px-6 py-5 border-b flex items-center justify-between sticky top-0 z-20',
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className={cn(
                        'text-xl font-bold',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}>
                        Evrak Önizleme
                      </h2>
                      <p className={cn(
                        'text-sm',
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {previewData.personel.PersonelInfo?.P_AdSoyad || 'Personel'} - {previewData.sablonAdi}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                    >
                      <Download className="w-5 h-5" />
                      PDF İndir
                    </button>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className={cn(
                        'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white rounded-lg',
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      )}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-6 flex justify-center" style={{ backgroundColor: '#ffffff' }}>
                  <div
                    ref={canvasRef}
                    className="pdf-canvas"
                    style={{
                      width: '794px',
                      minHeight: '1123px',
                      backgroundColor: '#ffffff',
                      position: 'relative',
                      padding: '0',
                      margin: '0 auto',
                      boxShadow: 'none'
                    }}
                  >
                    {/* Images */}
                    {previewData.images?.map((img: TemplateImage) => (
                      <img
                        key={img.id}
                        src={img.src}
                        alt=""
                        style={{
                          position: 'absolute',
                          left: `${img.x}px`,
                          top: `${img.y}px`,
                          width: `${img.width}px`,
                          height: `${img.height}px`,
                          objectFit: 'contain',
                          pointerEvents: 'none',
                          userSelect: 'none'
                        }}
                        draggable={false}
                      />
                    ))}

                    {/* Header */}
                    {previewData.headerContent && (
                      <div
                        className="p-8 border-b-2 border-dashed border-gray-300"
                        style={{
                          fontSize: previewData.styles?.fontSize || '14px',
                          fontFamily: previewData.styles?.fontFamily || 'Arial',
                          color: '#000',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ __html: previewData.headerContent }}
                      />
                    )}

                    {/* Content */}
                    <div
                      className="p-8"
                      style={{
                        fontSize: previewData.styles?.fontSize || '14px',
                        fontFamily: previewData.styles?.fontFamily || 'Arial',
                        color: '#000',
                        lineHeight: '1.6',
                        minHeight: '600px'
                      }}
                      dangerouslySetInnerHTML={{ __html: previewData.contentHTML }}
                    />

                    {/* Footer */}
                    {previewData.footerContent && (
                      <div
                        className="p-8 border-t-2 border-dashed border-gray-300"
                        style={{
                          fontSize: previewData.styles?.fontSize || '14px',
                          fontFamily: previewData.styles?.fontFamily || 'Arial',
                          color: '#000',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ __html: previewData.footerContent }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
