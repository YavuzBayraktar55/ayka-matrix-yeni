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
  personel: Personel | {
    adi?: string;
    tcNo?: string;
    bolge?: string;
  };
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
  const [pageCount, setPageCount] = useState(1);

  // Sayfa sayısını hesapla (önizleme açıldığında)
  useEffect(() => {
    if (showPreviewModal && canvasRef.current) {
      setTimeout(() => {
        const pages = canvasRef.current?.querySelectorAll('.a4-page');
        if (pages) {
          setPageCount(pages.length);
          console.log(`📄 Toplam ${pages.length} sayfa`);
        }
      }, 100);
    }
  }, [showPreviewModal, previewData]);

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

  // PDF oluştur (hem indirme hem kaydetme için kullanılacak)
  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!canvasRef.current || !previewData) return null;

    try {
      const canvas = canvasRef.current;
      
      // Tüm .a4-page elementlerini bul
      const pages = canvas.querySelectorAll('.a4-page');
      const totalPages = pages.length;
      
      if (totalPages === 0) {
        alert('Sayfa bulunamadı!');
        return null;
      }

      console.log(`📄 ${totalPages} sayfa PDF'e dönüştürülüyor...`);
      
      // PDF oluştur - yüksek kalite ayarları
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 16, // Yüksek hassasiyet
        hotfixes: ['px_scaling'] // Piksel ölçekleme düzeltmesi
      });
      
      // A4 boyutları mm cinsinden
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      // Her sayfayı ayrı ayrı yakala
      for (let i = 0; i < totalPages; i++) {
        const pageElement = pages[i] as HTMLElement;
        
        console.log(`📄 Sayfa ${i + 1}/${totalPages} yakalanıyor (794x1123px)...`);
        
        // Geçici wrapper - zoom sorununu çözmek için
        const wrapper = document.createElement('div');
        wrapper.style.width = '794px';
        wrapper.style.height = '1123px';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.backgroundColor = '#FFFFFF !important';
        wrapper.style.overflow = 'hidden';
        wrapper.style.transform = 'scale(1)'; // Zoom etkisini sıfırla
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';
        
        // Sayfayı klonla ve wrapper'a ekle
        const clonedPage = pageElement.cloneNode(true) as HTMLElement;
        clonedPage.style.backgroundColor = '#FFFFFF';
        clonedPage.style.boxShadow = 'none';
        
        // Klonlanan sayfadaki tüm elementlerin box-shadow ve arka planlarını temizle
        const allElements = clonedPage.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Box shadow'ları kaldır
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.border = 'none'; // Border'ları da kaldır
          htmlEl.style.outline = 'none'; // Outline'ları da kaldır
          
          // Görseller hariç TÜM arka planları beyaz yap (transparent dahil)
          if (htmlEl.tagName !== 'IMG') {
            htmlEl.style.backgroundColor = '#FFFFFF';
          }
          
          // Crop marks (+ işaretleri) gibi gereksiz elementleri kaldır
          // zIndex 15 olan veya 10 piksel civarında olan küçük div'leri gizle
          if (htmlEl.tagName === 'DIV') {
            const width = parseFloat(getComputedStyle(htmlEl).width);
            const height = parseFloat(getComputedStyle(htmlEl).height);
            const bgColor = getComputedStyle(htmlEl).backgroundColor;
            
            // Siyah, küçük (crop mark benzeri) elementleri gizle
            if (bgColor === 'rgb(0, 0, 0)' && (width <= 25 || height <= 25)) {
              htmlEl.style.display = 'none';
            }
          }
        });
        
        wrapper.appendChild(clonedPage);
        document.body.appendChild(wrapper);
        
        // Canvas'a dönüştür - maksimum çözünürlük
        const pageCanvas = await html2canvas(wrapper, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 3, // 3x çözünürlük - daha net
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          backgroundColor: '#FFFFFF', // Tam beyaz
          imageTimeout: 0,
          removeContainer: false,
          letterRendering: true, // Metin render kalitesi artırıldı
          foreignObjectRendering: false, // Daha iyi uyumluluk
          onclone: (clonedDoc: Document) => {
            // Klonlanan dokümanda da tüm arka planları beyaz yap
            const body = clonedDoc.body;
            if (body) {
              body.style.backgroundColor = '#FFFFFF';
              const allEls = body.querySelectorAll('*');
              allEls.forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.tagName !== 'IMG') {
                  htmlEl.style.backgroundColor = '#FFFFFF';
                }
                // Box shadow ve border'ları temizle
                htmlEl.style.boxShadow = 'none';
                htmlEl.style.border = 'none';
                htmlEl.style.outline = 'none';
                
                // Crop marks gibi küçük siyah elementleri gizle
                if (htmlEl.tagName === 'DIV') {
                  const width = parseFloat(getComputedStyle(htmlEl).width);
                  const height = parseFloat(getComputedStyle(htmlEl).height);
                  const bgColor = getComputedStyle(htmlEl).backgroundColor;
                  
                  if (bgColor === 'rgb(0, 0, 0)' && (width <= 25 || height <= 25)) {
                    htmlEl.style.display = 'none';
                  }
                }
              });
            }
          }
        } as Record<string, unknown>);
        
        // Wrapper'ı temizle
        document.body.removeChild(wrapper);
        
        // Yeni sayfa ekle (ilk sayfa hariç)
        if (i > 0) {
          pdf.addPage();
        }
        
        // Yüksek çözünürlüklü canvas oluştur (scale 3 ile daha yüksek kalite)
        const scale = 3; // 2'den 3'e çıkarıldı - daha net PDF
        const whiteCanvas = document.createElement('canvas');
        whiteCanvas.width = 794 * scale;
        whiteCanvas.height = 1123 * scale;
        const ctx = whiteCanvas.getContext('2d', { 
          alpha: false,
          willReadFrequently: false // Performans optimizasyonu
        });
        
        if (ctx) {
          // 1. TAM beyaz arka plan (#FFFFFF)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 794 * scale, 1123 * scale);
          
          // 2. Maksimum kalite ayarları
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 3. İçeriği çok yüksek çözünürlükte çiz
          ctx.drawImage(pageCanvas, 0, 0, 794 * scale, 1123 * scale);
          
          // 4. JPEG yerine PNG kullan (kayıpsız sıkıştırma)
          const imgData = whiteCanvas.toDataURL('image/png', 1.0);
          
          // 5. PDF'e ekle - FAST yerine NONE (sıkıştırma yok, maksimum kalite)
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'NONE');
          
          console.log(`✅ Sayfa ${i + 1} eklendi (794x1123px → ${pdfWidth}x${pdfHeight}mm)`);
        }
      }
      
      return pdf;
    } catch (error) {
      console.error('❌ PDF oluşturma hatası:', error);
      return null;
    }
  };

  // PDF olarak indir
  const downloadPDF = async () => {
    if (!previewData) return;

    try {
      setLoading(true);
      const pdf = await generatePDF();
      
      if (!pdf) {
        alert('PDF oluşturulurken hata oluştu!');
        return;
      }

      const personelData = previewData.personel as Record<string, unknown>;
      const personelAdi = (personelData.adi as string) || ((personelData.PersonelInfo as Record<string, unknown>)?.P_AdSoyad as string) || 'personel';
      const fileName = `${previewData.sablonAdi}_${personelAdi}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF İndirildi:', fileName);
      alert(`✅ PDF başarıyla indirildi! (${pageCount} sayfa)`);
    } catch (error) {
      console.error('❌ PDF indirme hatası:', error);
      alert('PDF indirilirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Veritabanına kaydet
  const saveToDatabase = async () => {
    if (!previewData) return;

    try {
      setLoading(true);
      
      // 1. PDF oluştur
      console.log('🔧 PDF oluşturuluyor...');
      const pdf = await generatePDF();
      
      if (!pdf) {
        alert('PDF oluşturulurken hata oluştu!');
        return;
      }

      // 2. PDF'i base64'e çevir
      const pdfBase64 = pdf.output('datauristring');
      console.log('✅ PDF oluşturuldu, boyut:', pdfBase64.length);

      // 3. API'ye gönder
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Oturum bulunamadı!');
        return;
      }

      // Personel TC kimlik numarasını al (farklı yapılarda olabilir)
      const personelData = previewData.personel as Record<string, unknown>;
      const tcKimlik = (personelData.tcNo as string) || (personelData.PersonelTcKimlik as string);
      const personelAdi = (personelData.adi as string) || ((personelData.PersonelInfo as Record<string, unknown>)?.P_AdSoyad as string) || 'Personel';

      const requestData = {
        personelTcKimlik: tcKimlik,
        sablonAdi: previewData.sablonAdi,
        sablonTuru: selectedSablon?.SablonTuru || 'genel',
        pdfBase64: pdfBase64,
        evrakTarihi: new Date().toISOString(),
        aciklama: `${personelAdi} için oluşturulan evrak`
      };

      console.log('📤 API\'ye gönderilen veri:', {
        personelTcKimlik: requestData.personelTcKimlik,
        sablonAdi: requestData.sablonAdi,
        sablonTuru: requestData.sablonTuru,
        evrakTarihi: requestData.evrakTarihi,
        aciklama: requestData.aciklama,
        pdfBase64Length: requestData.pdfBase64?.length || 0
      });

      const response = await fetch('/api/evrak-kaydet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      console.log('📨 API Response:', result);

      if (response.ok && result.success) {
        alert(`✅ Evrak başarıyla veritabanına kaydedildi!\nEvrak ID: ${result.evrakId}`);
        console.log('✅ Evrak kaydedildi:', result);
      } else {
        const errorMsg = result.error || 'Bilinmeyen hata';
        const details = result.missing ? `\n\nEksik alanlar:\n${JSON.stringify(result.missing, null, 2)}` : '';
        alert(`❌ Evrak kaydedilemedi!\n${errorMsg}${details}`);
        console.error('❌ Evrak kaydetme hatası:', result);
      }
    } catch (error) {
      console.error('❌ Veritabanına kaydetme hatası:', error);
      alert('Evrak kaydedilirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPersoneller();
      fetchSablonlar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
                        {((previewData.personel as Record<string, unknown>).adi as string) || (((previewData.personel as Record<string, unknown>).PersonelInfo as Record<string, unknown>)?.P_AdSoyad as string) || 'Personel'} - {previewData.sablonAdi}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveToDatabase}
                      disabled={loading}
                      className={cn(
                        'flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                      title="Evrakı veritabanına kaydet"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Veritabanına Kaydet
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadPDF}
                      disabled={loading}
                      className={cn(
                        'flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-medium',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          PDF Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          PDF İndir ({pageCount} sayfa)
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      disabled={loading}
                      className={cn(
                        'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white rounded-lg',
                        loading && 'opacity-50 cursor-not-allowed',
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      )}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-10" style={{ backgroundColor: '#FFFFFF' }}>
                  <div
                    ref={canvasRef}
                    className="pdf-canvas"
                  >
                    {/* Çok Sayfalı Düzen - Her sayfa ayrı A4 */}
                    {(() => {
                      // İçerik yüksekliğini hesapla
                      const tempDiv = document.createElement('div');
                      tempDiv.style.width = '634px'; // 794 - 160 (padding: 80px left + 80px right)
                      tempDiv.style.position = 'absolute';
                      tempDiv.style.visibility = 'hidden';
                      tempDiv.style.fontSize = previewData.styles?.fontSize || '14px';
                      tempDiv.style.fontFamily = previewData.styles?.fontFamily || 'Arial';
                      tempDiv.style.lineHeight = '1.6';
                      tempDiv.innerHTML = previewData.contentHTML;
                      document.body.appendChild(tempDiv);
                      const contentHeight = tempDiv.scrollHeight;
                      document.body.removeChild(tempDiv);

                      const pageHeight = 1123;
                      const topPadding = 60;
                      const bottomPadding = 120;
                      const contentAreaHeight = pageHeight - topPadding - bottomPadding; // 943px
                      const numPages = Math.ceil(contentHeight / contentAreaHeight);

                      console.log(`📄 İçerik: ${contentHeight}px | Sayfa alan: ${contentAreaHeight}px | Sayfa sayısı: ${numPages}`);

                      return Array.from({ length: Math.max(1, numPages) }).map((_, pageIndex) => (
                        <div
                          key={pageIndex}
                          className="a4-page"
                          style={{
                            marginBottom: pageIndex < numPages - 1 ? '20px' : '0',
                            padding: '60px 80px 120px 80px', // Alt padding arttırıldı (90→120)
                            boxShadow: 'none',
                            backgroundColor: '#FFFFFF',
                            border: 'none',
                            height: '1123px', // Sabit yükseklik
                            overflow: 'hidden' // Taşan içerik gizlensin
                          }}
                        >
                          {/* Görseller sadece ilk sayfada - ÜSTTE */}
                          {pageIndex === 0 && previewData.images?.map((img: TemplateImage) => (
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
                                userSelect: 'none',
                                zIndex: 10 // Yüksek z-index - yazıların üstünde
                              }}
                              draggable={false}
                            />
                          ))}

                          {/* İçerik - Her sayfada tam içeriği göster, clip ile kes */}
                          <div
                            style={{
                              position: 'relative',
                              zIndex: 2,
                              height: `${contentAreaHeight}px`,
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                fontSize: previewData.styles?.fontSize || '14px',
                                fontFamily: previewData.styles?.fontFamily || 'Arial',
                                color: '#000',
                                lineHeight: '1.6',
                                position: 'absolute',
                                top: `-${pageIndex * contentAreaHeight}px`,
                                left: '0',
                                width: '100%'
                              }}
                              dangerouslySetInnerHTML={{ __html: previewData.contentHTML }}
                            />
                          </div>

                          {/* Sayfa numarası */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '40px',
                              right: '80px',
                              fontSize: '10px',
                              color: '#999',
                              zIndex: 10
                            }}
                          >
                            Sayfa {pageIndex + 1} / {numPages}
                          </div>
                          
                          {/* Crop Marks KALDIRILDI - PDF'de görünmemeli */}
                        </div>
                      ));
                    })()}
                  </div> {/* Close pdf-canvas */}
                </div> {/* Close preview content */}
              </div> {/* Close modal */}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
