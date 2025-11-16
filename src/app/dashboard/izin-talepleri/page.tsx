'use client';

import { useEffect, useState, Suspense, useRef, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { IzinTalepleri, IzinTuru, TalepDurum, IzinTalepGecmis } from '@/types/database';
import { Calendar, Plus, X, Search, Clock, CheckCircle, XCircle, AlertCircle, History, Edit3, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIzinTalepleri } from '@/hooks/useIzinTalepleri';
import debounce from 'lodash/debounce';

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

function IzinTalepleriContent() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // SWR ile data fetching
  const { 
    talepler: swrTalepler, 
    isLoading: loading, 
    mutate: refreshTalepler 
  } = useIzinTalepleri({
    userEmail: user?.PersonelEmail || '',
    userRole: user?.PersonelRole || '',
    enabled: !!(user?.PersonelEmail && user?.PersonelRole)
  });

  // SWR data tracking removed - causing console spam

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
  
  // Personel için izin oluşturma bilgileri
  const [creatingForPersonel, setCreatingForPersonel] = useState<{
    tcKimlik: string;
    adSoyad: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    IzinTuru: 'yillik' as IzinTuru,
    BaslangicTarihi: '',
    BitisTarihi: '',
    Aciklama: '',
    YillikIzinYili: null as number | null,
  });

  const [izinHesapBilgisi, setIzinHesapBilgisi] = useState<{
    toplamGun: number;
    calismaGunu: number;
    tatilGunSayisi: number;
  } | null>(null);

  // Yıllık izin hakları
  interface YillikIzinHak {
    HakID: number;
    PersonelTcKimlik: number;
    Yil: number;
    ToplamHakGun: number;
    KullanilanGun: number;
    KalanGun: number;
    YilDurumu: 'aktif' | 'gelecek';
    KullanimYuzdesi: number;
  }
  const [yillikIzinHaklari, setYillikIzinHaklari] = useState<YillikIzinHak[]>([]);
  const [izinHaklariLoading, setIzinHaklariLoading] = useState(false);

  const [onayFormData, setOnayFormData] = useState({
    isApprove: true,
    not: '',
  });

  const [editDateFormData, setEditDateFormData] = useState({
    BaslangicTarihi: '',
    BitisTarihi: '',
    DegisiklikNotu: '',
  });

  // Yıllık izin haklarını getir
  const fetchYillikIzinHaklari = useCallback(async (personelTcKimlik: string | number) => {
    setIzinHaklariLoading(true);
    try {
      const response = await fetch(`/api/yillik-izin-haklari?personelTcKimlik=${personelTcKimlik}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`API Hatası: ${response.status}`);
        }
        throw new Error(errorData.error || `İzin hakları getirilemedi (${response.status})`);
      }
      
      const data = await response.json();
      setYillikIzinHaklari(data);
    } catch (error) {
      setYillikIzinHaklari([]);
    } finally {
      setIzinHaklariLoading(false);
    }
  }, []);

  // Modal açma fonksiyonu - izin haklarını yükler
  const openModalForUser = useCallback(async (tcKimlik?: string, name?: string) => {
    if (tcKimlik && name) {
      setCreatingForPersonel({ tcKimlik, adSoyad: name });
      await fetchYillikIzinHaklari(tcKimlik);
    } else if (user?.PersonelTcKimlik) {
      setCreatingForPersonel(null);
      await fetchYillikIzinHaklari(user.PersonelTcKimlik);
    }
    setModalOpen(true);
  }, [user?.PersonelTcKimlik, fetchYillikIzinHaklari]);

  // Query params'dan personel bilgisini kontrol et - SADECE İLK MOUNT'TA
  useEffect(() => {
    const createFor = searchParams.get('createFor');
    const name = searchParams.get('name');
    
    if (createFor && name && user) {
      // Koordinatör veya yönetici kontrolü
      if (user.PersonelRole === 'koordinator' || user.PersonelRole === 'yonetici' || user.PersonelRole === 'insan_kaynaklari') {
        // Modal'ı aç
        setCreatingForPersonel({ tcKimlik: createFor, adSoyad: name });
        fetchYillikIzinHaklari(createFor);
        setModalOpen(true);
        
        // URL'den parametreleri temizle
        router.replace('/dashboard/izin-talepleri');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece ilk mount'ta çalış

  // Debounced izin hesaplama fonksiyonu - 500ms bekler
  const debouncedCalculateIzin = useRef(
    debounce(async (targetTcKimlik: string, baslangic: string, bitis: string) => {
      try {
        const hesap = await calculateWorkingDays(targetTcKimlik, baslangic, bitis);
        setIzinHesapBilgisi(hesap);
      } catch (error) {
        console.error('❌ İzin hesaplama hatası:', error);
        setIzinHesapBilgisi(null);
      }
    }, 500)
  ).current;

  // Form tarihlerini değiştiğinde izin hesabını güncelle
  useEffect(() => {
    const targetTcKimlik = creatingForPersonel?.tcKimlik || user?.PersonelTcKimlik?.toString();
    
    if (formData.BaslangicTarihi && formData.BitisTarihi && targetTcKimlik) {
      // Debounced fonksiyonu çağır - 500ms içinde tekrar değişirse iptal olur
      debouncedCalculateIzin(targetTcKimlik, formData.BaslangicTarihi, formData.BitisTarihi);
    } else {
      setIzinHesapBilgisi(null);
    }
    
    // Cleanup - component unmount olduğunda pending call'ları iptal et
    return () => {
      debouncedCalculateIzin.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.BaslangicTarihi, formData.BitisTarihi, user?.PersonelTcKimlik, creatingForPersonel]);

  // Otomatik tatil günleri hesaplama (puantaj verisi yoksa)
  const calculateTatillerOtomatik = (startDate: Date, endDate: Date): string[] => {
    const tatilGunleri: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); // 0 = Pazar, 6 = Cumartesi
      
      // Pazar günleri otomatik tatil
      if (dayOfWeek === 0) {
        tatilGunleri.push(d.toISOString().split('T')[0]);
      }
      
      // Resmi tatiller (Türkiye)
      const tarihStr = d.toISOString().split('T')[0];
      const [yil, ay, gun] = tarihStr.split('-').map(Number);
      
      // Yılbaşı
      if (ay === 1 && gun === 1) tatilGunleri.push(tarihStr);
      // 23 Nisan
      if (ay === 4 && gun === 23) tatilGunleri.push(tarihStr);
      // 1 Mayıs
      if (ay === 5 && gun === 1) tatilGunleri.push(tarihStr);
      // 19 Mayıs
      if (ay === 5 && gun === 19) tatilGunleri.push(tarihStr);
      // 30 Ağustos
      if (ay === 8 && gun === 30) tatilGunleri.push(tarihStr);
      // 29 Ekim
      if (ay === 10 && gun === 29) tatilGunleri.push(tarihStr);
      
      // Ramazan ve Kurban Bayramları - 2025 tarihleri (manuel güncellenmeli)
      // Ramazan Bayramı 2025: 30-31 Mart, 1 Nisan
      if (yil === 2025 && ay === 3 && (gun === 30 || gun === 31)) tatilGunleri.push(tarihStr);
      if (yil === 2025 && ay === 4 && gun === 1) tatilGunleri.push(tarihStr);
      // Kurban Bayramı 2025: 6-9 Haziran
      if (yil === 2025 && ay === 6 && (gun >= 6 && gun <= 9)) tatilGunleri.push(tarihStr);
    }
    
    // Tekrar eden tarihleri kaldır
    return [...new Set(tatilGunleri)];
  };

  // Tatil günlerini tespit et (puantaj tablosundan veya otomatik)
  const fetchTatilGunleri = async (personelId: string, baslangic: string, bitis: string): Promise<string[]> => {
    try {
      const startDate = new Date(baslangic);
      const endDate = new Date(bitis);
      
      // Puantaj tablosundan ilgili ayların verilerini al
      const aylar = new Set<string>();
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // YilAy formatı: "2025-01" gibi
        aylar.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      
      // Kullanıcının BolgeID'sini al
      // Not: PersonelTcKimlik bigint tipinde, string olarak sorgulamak daha güvenli
      
      // Önce giriş yapan kullanıcının bilgilerini al (RLS için)
      const currentUserEmail = user?.PersonelEmail;
      if (!currentUserEmail) {
        // Puantaj verisi alınamazsa otomatik hesaplama yap
        return calculateTatillerOtomatik(startDate, endDate);
      }

      // API endpoint üzerinden sorgula (RLS bypass için service role kullanacak)
      const response = await fetch(`/api/personel?userEmail=${encodeURIComponent(currentUserEmail)}&userRole=${user?.PersonelRole || 'saha_personeli'}`);
      if (!response.ok) {
        return calculateTatillerOtomatik(startDate, endDate);
      }
      
      const result = await response.json();
      const allPersonel = result.data || [];
      
      // İlgili personeli bul
      const targetPersonel = allPersonel.find((p: { PersonelTcKimlik: number | string }) => {
        const pTc = p.PersonelTcKimlik?.toString();
        const targetTc = personelId?.toString();
        return pTc === targetTc;
      });

      if (!targetPersonel?.BolgeID) {
        // Bölge bilgisi yoksa otomatik hesaplama yap
        return calculateTatillerOtomatik(startDate, endDate);
      }

      const userData = {
        BolgeID: targetPersonel.BolgeID,
        PersonelTcKimlik: targetPersonel.PersonelTcKimlik
      };

      // Tatil günlerini tespit et
      const tatilGunleri: string[] = [];
      let puantajBulunamadi = false;
      
      for (const yilAy of Array.from(aylar)) {
        const { data, error } = await supabase
          .from('AylikPuantaj')
          .select('TakvimJSON, SablonlarJSON')
          .eq('BolgeID', userData.BolgeID)
          .eq('YilAy', yilAy)
          .single();
        
        if (error || !data) {
          // Puantaj verisi bulunamadı - otomatik hesaplamaya geç
          puantajBulunamadi = true;
          continue;
        }

        // TakvimJSON: { "2025-10-01": { "isim": "Tam Gün", "baslangic": "08:00", "bitis": "18:00", "mola": 90 } }
        // Tatil günleri: { "isim": "Resmi Tatil", "baslangic": null, "bitis": null, "mola": 0 }
        const takvim = typeof data.TakvimJSON === 'string' 
          ? JSON.parse(data.TakvimJSON) 
          : data.TakvimJSON || {};
        
        // Tarih aralığındaki her gün için kontrol et
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const tarihStr = d.toISOString().split('T')[0];
          
          // Sadece bu ayın tarihlerini kontrol et
          if (tarihStr.startsWith(yilAy)) {
            const gunBilgi = takvim[tarihStr];
            const dayOfWeek = d.getDay();
            
            // Gün bilgisi yoksa veya başlangıç/bitiş saati null ise = tatil
            if (!gunBilgi) {
              tatilGunleri.push(tarihStr);
            } else if (gunBilgi.baslangic === null || gunBilgi.bitis === null) {
              // Resmi Tatil veya Hafta Tatili
              tatilGunleri.push(tarihStr);
            } else if (dayOfWeek === 0) {
              // Pazar günü - Puantajda çalışma günü gibi gösterilse bile tatil sayılır
              tatilGunleri.push(tarihStr);
            }
          }
        }
      }
      
      // Eğer hiç puantaj verisi bulunamadıysa otomatik hesapla
      if (puantajBulunamadi && tatilGunleri.length === 0) {
        return calculateTatillerOtomatik(startDate, endDate);
      }
      
      return tatilGunleri;
      
    } catch (error) {
      // Hata durumunda otomatik hesaplamaya geç
      return calculateTatillerOtomatik(new Date(baslangic), new Date(bitis));
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Tatil günleri hariç izin günü hesapla
  const calculateWorkingDays = async (personelId: string, start: string, end: string) => {
    const toplamGun = calculateDays(start, end);
    const tatilGunleri = await fetchTatilGunleri(personelId, start, end);
    const calismaGunu = toplamGun - tatilGunleri.length;
    
    return {
      toplamGun,
      calismaGunu,
      tatilGunSayisi: tatilGunleri.length,
      tatilGunleri
    };
  };

  const fetchGecmis = async (talepId: number) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/izin-gecmis?talepId=${talepId}`);
      const result = await response.json();
      
      if (result.error) {
        alert('Geçmiş yüklenirken hata oluştu: ' + result.error);
      } else if (result.data) {
        setGecmis(result.data);
      } else {
        setGecmis([]);
      }
    } catch (error) {
      alert('Geçmiş yüklenirken hata oluştu.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveGecmis = async (gecmisData: Partial<IzinTalepGecmis>) => {
    try {
      const response = await fetch('/api/izin-gecmis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gecmisData),
      });
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Personel için mi yoksa kendisi için mi izin oluşturuluyor?
    const targetTcKimlik = creatingForPersonel ? creatingForPersonel.tcKimlik : user.PersonelTcKimlik;
    const targetName = creatingForPersonel ? creatingForPersonel.adSoyad : user.PersonelInfo?.P_AdSoyad;

    console.log('📝 İzin oluşturma başlatıldı:', {
      creatingForPersonel: !!creatingForPersonel,
      targetTcKimlik,
      targetName,
      type: typeof targetTcKimlik
    });

    // Yıllık izin için validasyon
    if (formData.IzinTuru === 'yillik') {
      if (!formData.YillikIzinYili) {
        alert('⚠️ Lütfen hangi yılın izin hakkından kullanacağınızı seçin');
        return;
      }
    }

    // Tatil günleri hariç izin günü hesapla
    const izinHesap = await calculateWorkingDays(
      targetTcKimlik.toString(), 
      formData.BaslangicTarihi, 
      formData.BitisTarihi
    );

    // Yıllık izin hak kontrolü (uyarı amaçlı)
    if (formData.IzinTuru === 'yillik' && formData.YillikIzinYili) {
      const secilenHak = yillikIzinHaklari.find(h => h.Yil === formData.YillikIzinYili);
      if (secilenHak) {
        if (izinHesap.calismaGunu > secilenHak.KalanGun) {
          const onay = confirm(
            `⚠️ BİLGİLENDİRME\n\n` +
            `Talep edilen izin: ${izinHesap.calismaGunu} gün\n` +
            `${formData.YillikIzinYili} yılı kalan hakkınız: ${secilenHak.KalanGun} gün\n\n` +
            `${izinHesap.calismaGunu - secilenHak.KalanGun} gün fazla izin talep ediyorsunuz.\n\n` +
            `Şirket politikası gereği avans izin olarak değerlendirilebilir.\n` +
            `Devam etmek istiyor musunuz?`
          );
          if (!onay) {
            return;
          }
        }
      }
    }

    // Açıklama kısmına tatil bilgisi ve oluşturan kişi bilgisi ekle
    let aciklama = formData.Aciklama;
    if (izinHesap.tatilGunSayisi > 0) {
      aciklama += `\n\n📅 İzin Detayı: ${izinHesap.calismaGunu} gün izinli (${izinHesap.tatilGunSayisi} gün tatile denk geliyor)`;
    }
    if (creatingForPersonel) {
      aciklama += `\n\n👤 ${user.PersonelInfo?.P_AdSoyad} tarafından ${targetName} için oluşturuldu`;
    }

    const talepData: any = {
      PersonelTcKimlik: targetTcKimlik, // Supabase otomatik tip dönüşümü yapacak
      IzinTuru: formData.IzinTuru,
      BaslangicTarihi: formData.BaslangicTarihi,
      BitisTarihi: formData.BitisTarihi,
      GunSayisi: izinHesap.calismaGunu, // Tatil günleri hariç
      Aciklama: aciklama,
      Durum: 'beklemede' as TalepDurum,
    };

    // Yıllık izin için yıl bilgisini ekle
    if (formData.IzinTuru === 'yillik' && formData.YillikIzinYili) {
      talepData.YillikIzinYili = formData.YillikIzinYili;
    }

    console.log('💾 Database\'e gönderilen data:', talepData);
    console.log('👤 İşlemi yapan kullanıcı:', {
      PersonelTcKimlik: user.PersonelTcKimlik,
      PersonelRole: user.PersonelRole,
      isCreatingForAnother: !!creatingForPersonel
    });

    // Eğer başkası adına oluşturuyorsa API kullan (RLS bypass için)
    let data, error;
    
    if (creatingForPersonel) {
      console.log('🔄 API route üzerinden izin oluşturuluyor...');
      
      try {
        const response = await fetch('/api/izin-olustur', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...talepData,
            CreatedBy: user.PersonelTcKimlik,
            CreatedByRole: user.PersonelRole
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          error = { message: result.error };
          console.error('❌ API hatası:', result);
        } else {
          data = result.data;
          console.log('✅ API başarılı:', data);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
        error = { message: errorMessage };
        console.error('❌ Fetch hatası:', err);
      }
    } else {
      // Kendisi için oluşturuyorsa direkt Supabase kullan
      console.log('🔄 Direkt Supabase ile izin oluşturuluyor...');
      const result = await supabase.from('IzinTalepleri').insert([talepData]).select().single();
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error('❌ İzin talebi oluşturma hatası:', error);
      alert(`İzin talebi oluşturulamadı: ${error.message}`);
      return;
    }

    if (data) {
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
      
      // Optimistic update: Yeni talebi listeye ekle
      await refreshTalepler(
        (currentData) => {
          if (!currentData) return [data];
          return [data, ...currentData]; // En üste ekle
        },
        { revalidate: true }
      );
      closeModal();
    }
  };

  const handleOnayReddet = async () => {
    if (!selectedTalep || !user) {
      console.error('❌ handleOnayReddet: Eksik veri', { selectedTalep, user: !!user });
      return;
    }

    console.log('🔄 Onay/Red işlemi başlıyor:', {
      talepId: selectedTalep.TalepID,
      isApprove: onayFormData.isApprove,
      userRole: user.PersonelRole,
      not: onayFormData.not
    });

    try {
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

      console.log('📝 Update data hazırlandı:', { yeniDurum, islemTipi, updateData });

      const { data: updateResult, error } = await supabase
        .from('IzinTalepleri')
        .update(updateData)
        .eq('TalepID', selectedTalep.TalepID)
        .select();

      if (error) {
        console.error('❌ Supabase update hatası:', error);
        alert('İşlem sırasında hata oluştu: ' + error.message);
        return;
      }

      console.log('✅ Supabase update başarılı:', { 
        updateCount: updateResult?.length, 
        updatedData: updateResult?.[0] 
      });

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

      console.log('✅ Geçmiş kaydedildi');

      console.log('🔄 SWR optimistic update yapılıyor...');
      
      // Optimistic update: Local state'i hemen güncelle
      await refreshTalepler(
        (currentData) => {
          if (!currentData) return currentData;
          return currentData.map(t => 
            t.TalepID === selectedTalep.TalepID 
              ? { ...t, Durum: yeniDurum, ...updateData }
              : t
          );
        },
        { revalidate: false } // İlk başta revalidate etme
      );
      
      console.log('✅ Liste kalıcı olarak güncellendi (optimistic update)');
      
      setOnayModalOpen(false);
      setSelectedTalep(null);
      setOnayFormData({ isApprove: true, not: '' });
      
      console.log('✅ Onay/Red işlemi tamamlandı');
    } catch (err) {
      console.error('❌ handleOnayReddet genel hata:', err);
      alert('İşlem sırasında beklenmeyen bir hata oluştu');
    }
  };

  const handlePrintIzin = async (talep: FullIzinTalep) => {
    try {
      const response = await fetch('/api/izin-belgesi-olustur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          talepId: talep.TalepID.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'İzin belgesi oluşturulamadı');
        return;
      }

      // Word dosyasını indir
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izin_${talep.PersonelInfo?.P_AdSoyad || talep.PersonelTcKimlik}_${talep.TalepID}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('İzin belgesi oluşturma hatası:', error);
      alert('İzin belgesi oluşturulurken bir hata oluştu');
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

        // Optimistic update: Talebin durumunu güncelle
        await refreshTalepler(
          (currentData) => {
            if (!currentData) return currentData;
            return currentData.map(t => 
              t.TalepID === talep.TalepID 
                ? { ...t, Durum: 'iptal', updated_at: new Date().toISOString() }
                : t
            );
          },
          { revalidate: true }
        );
      }
    }
  };

  const handleEditDates = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTalep || !user) return;

    // Tatil günleri hariç yeni izin günü hesapla
    const yeniIzinHesap = await calculateWorkingDays(
      selectedTalep.PersonelTcKimlik.toString(),
      editDateFormData.BaslangicTarihi,
      editDateFormData.BitisTarihi
    );

    const yeniGunSayisi = yeniIzinHesap.calismaGunu;

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
      // Geçmişe kaydet - tatil bilgisi ile
      let notText = `Tarih değiştirildi: ${selectedTalep.BaslangicTarihi} - ${selectedTalep.BitisTarihi} → ${editDateFormData.BaslangicTarihi} - ${editDateFormData.BitisTarihi}`;
      
      if (yeniIzinHesap.tatilGunSayisi > 0) {
        notText += ` (${yeniGunSayisi} gün izinli, ${yeniIzinHesap.tatilGunSayisi} gün tatile denk geliyor)`;
      }
      
      if (editDateFormData.DegisiklikNotu) {
        notText += `. ${editDateFormData.DegisiklikNotu}`;
      }
      
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

      // Optimistic update: Tarih ve gün sayısını güncelle
      await refreshTalepler(
        (currentData) => {
          if (!currentData) return currentData;
          return currentData.map(t => 
            t.TalepID === selectedTalep.TalepID 
              ? { 
                  ...t, 
                  BaslangicTarihi: editDateFormData.BaslangicTarihi,
                  BitisTarihi: editDateFormData.BitisTarihi,
                  GunSayisi: yeniGunSayisi,
                  updated_at: new Date().toISOString()
                }
              : t
          );
        },
        { revalidate: true }
      );
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
      IzinTuru: 'yillik',
      BaslangicTarihi: '',
      BitisTarihi: '',
      Aciklama: '',
      YillikIzinYili: null,
    });
    setIzinHesapBilgisi(null);
    setCreatingForPersonel(null); // Personel bilgisini temizle
    setYillikIzinHaklari([]); // İzin haklarını temizle
  };

  const getIzinTuruLabel = (tur: string) => {
    const labels: Record<string, string> = {
      'yillik': 'Yıllık İzin',
      'ucretli': 'Ücretli İzin',
      'ucretsiz': 'Ücretsiz İzin',
      'raporlu': 'Raporlu İzin'
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

  const canCancel = useCallback((talep: FullIzinTalep) => {
    return user?.PersonelTcKimlik === talep.PersonelTcKimlik && 
           (talep.Durum === 'beklemede' || talep.Durum === 'koordinator_onay');
  }, [user?.PersonelTcKimlik]);

  // useMemo ile filtreleme işlemini cache'le - sadece gerektiğinde hesapla
  const filteredTalepler = useMemo(() => {
    if (!swrTalepler) return [];
    
    return swrTalepler.filter((talep: FullIzinTalep) => {
      const matchesSearch = searchTerm === '' || 
        talep.PersonelInfo?.P_AdSoyad?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDurum = filterDurum === 'all' || talep.Durum === filterDurum;
      const matchesTur = filterTur === 'all' || talep.IzinTuru === filterTur;

      return matchesSearch && matchesDurum && matchesTur;
    });
  }, [swrTalepler, searchTerm, filterDurum, filterTur]);

  const isSahaPersoneli = useMemo(() => 
    user?.PersonelRole === 'saha_personeli', 
    [user?.PersonelRole]
  );

  // Stat card değerlerini useMemo ile hesapla - sadece swrTalepler değişince hesapla
  const stats = useMemo(() => ({
    toplam: swrTalepler.length,
    beklemede: swrTalepler.filter((t: FullIzinTalep) => t.Durum === 'beklemede').length,
    onaylanan: swrTalepler.filter((t: FullIzinTalep) => t.Durum === 'yonetim_onay').length,
    reddedilen: swrTalepler.filter((t: FullIzinTalep) => t.Durum === 'reddedildi').length
  }), [swrTalepler]);

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
            <div className="flex gap-3">
              {isSahaPersoneli && (
                <button
                  onClick={() => openModalForUser()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span>Yeni İzin Talebi</span>
                </button>
              )}
              
              {/* Koordinatör ve Yönetici için Personel İzni Butonu */}
              {(user?.PersonelRole === 'koordinator' || user?.PersonelRole === 'yonetici' || user?.PersonelRole === 'insan_kaynaklari') && (
                <button
                  onClick={() => window.location.href = '/dashboard/personel'}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
                  title="Personel sayfasından personel seçerek izin oluşturabilirsiniz"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Personelim İçin İzin Oluştur</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Toplam Talep"
            value={stats.toplam}
            icon={Calendar}
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Beklemede"
            value={stats.beklemede}
            icon={Clock}
            color="from-yellow-500 to-orange-500"
          />
          <StatCard
            title="Onaylanan"
            value={stats.onaylanan}
            icon={CheckCircle}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Reddedilen"
            value={stats.reddedilen}
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
                <option value="yillik">Yıllık İzin</option>
                <option value="ucretli">Ücretli İzin</option>
                <option value="ucretsiz">Ücretsiz İzin</option>
                <option value="raporlu">Raporlu İzin</option>
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
            filteredTalepler.map((talep: FullIzinTalep) => {
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
                              {talep.IzinTuru === 'yillik' && talep.YillikIzinYili && (
                                <span className={`ml-2 font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {talep.YillikIzinYili}
                                </span>
                              )}
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
                              <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
                                {talep.GunSayisi} gün
                                {talep.Aciklama?.includes('tatile denk geliyor') && (
                                  <span className="ml-2 text-xs text-orange-500">
                                    ⚠️ Tatil(ler) Hariç
                                  </span>
                                )}
                              </p>
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

                      {/* İzin Belgesi Yazdır - Koordinatör, İK ve Yönetici */}
                      {(user?.PersonelRole === 'koordinator' || user?.PersonelRole === 'insan_kaynaklari' || user?.PersonelRole === 'yonetici') && (
                        <button
                          onClick={() => handlePrintIzin(talep)}
                          className={cn(
                            'px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 justify-center',
                            isDark
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          )}
                          title="İzin Belgesi Yazdır"
                        >
                          <FileText className="w-4 h-4" />
                          Belge Yazdır
                        </button>
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
          <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
              style={{ position: 'fixed', bottom: '60px' }}
            />
            <div 
              className={cn(
                'rounded-none shadow-2xl w-full overflow-y-auto backdrop-blur-xl animate-scale-in',
                isDark ? 'bg-gray-800/95' : 'bg-white/95'
              )}
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
                  <div>
                    <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                      {creatingForPersonel ? 'Personel İçin İzin Oluştur' : 'Yeni İzin Talebi'}
                    </h2>
                    {creatingForPersonel && (
                      <p className="text-green-500 text-sm mt-1">
                        👤 {creatingForPersonel.adSoyad} için izin oluşturuyorsunuz
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={closeModal} 
                    className={cn(
                      'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                      isDark ? 'text-gray-300' : 'text-gray-600'
                    )}
                    title="Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      İzin Türü *
                    </label>
                    <select
                      required
                      value={formData.IzinTuru}
                      onChange={(e) => setFormData({ ...formData, IzinTuru: e.target.value as IzinTuru, YillikIzinYili: null })}
                      className={cn(
                        'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                    >
                      <option value="yillik">Yıllık İzin</option>
                      <option value="ucretli">Ücretli İzin</option>
                      <option value="ucretsiz">Ücretsiz İzin</option>
                      <option value="raporlu">Raporlu İzin</option>
                    </select>
                  </div>

                  {/* Yıllık İzin için Yıl Seçimi */}
                  {formData.IzinTuru === 'yillik' && (
                    <div>
                      <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                        Hangi Yılın İzin Hakkından? *
                      </label>
                      {izinHaklariLoading ? (
                        <div className={cn('p-4 rounded-xl border text-center', isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200')}>
                          <p className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>Yükleniyor...</p>
                        </div>
                      ) : yillikIzinHaklari.length === 0 ? (
                        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200')}>
                          <p className={cn('text-sm mb-2', isDark ? 'text-blue-300' : 'text-blue-700')}>
                            ℹ️ İşe başlama tarihi (P_KidemTarihi) bilgisi bulunamadı veya henüz 1 yıl dolmadı
                          </p>
                          <p className={cn('text-xs', isDark ? 'text-blue-400/70' : 'text-blue-600/70')}>
                            Avans izin olarak gelecek yıldan seçim yapabilirsiniz
                          </p>
                          <select
                            required={formData.IzinTuru === 'yillik'}
                            value={formData.YillikIzinYili || ''}
                            onChange={(e) => setFormData({ ...formData, YillikIzinYili: e.target.value ? parseInt(e.target.value) : null })}
                            className={cn(
                              'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mt-3',
                              isDark 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            )}
                          >
                            <option value="">Yıl seçin (Avans İzin)</option>
                            <option value={new Date().getFullYear()}>
                              {new Date().getFullYear()} - Avans İzin
                            </option>
                            <option value={new Date().getFullYear() + 1}>
                              {new Date().getFullYear() + 1} - Avans İzin
                            </option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <select
                            required={formData.IzinTuru === 'yillik'}
                            value={formData.YillikIzinYili || ''}
                            onChange={(e) => setFormData({ ...formData, YillikIzinYili: e.target.value ? parseInt(e.target.value) : null })}
                            className={cn(
                              'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                              isDark 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            )}
                          >
                            <option value="">Yıl seçin</option>
                            {/* Gelecek yıl (+1) seçeneği - henüz hak kazanılmamış olabilir */}
                            {(() => {
                              const gelecekYil = new Date().getFullYear() + 1;
                              const gelecekYilHak = yillikIzinHaklari.find(h => h.Yil === gelecekYil);
                              if (!gelecekYilHak) {
                                return (
                                  <option key={gelecekYil} value={gelecekYil}>
                                    {gelecekYil} - Avans İzin (Henüz hak kazanılmadı)
                                  </option>
                                );
                              }
                            })()}
                            {/* Mevcut ve geçmiş yıllar */}
                            {yillikIzinHaklari.map(hak => (
                              <option key={hak.Yil} value={hak.Yil}>
                                {hak.Yil} - Kalan: {hak.KalanGun} gün (Toplam: {hak.ToplamHakGun})
                                {hak.YilDurumu === 'gelecek' && ' - Gelecek'}
                              </option>
                            ))}
                          </select>
                          
                          {/* İzin Hakkı Özeti */}
                          <div className={cn('p-3 rounded-xl border', isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200')}>
                            <p className={cn('text-xs font-semibold mb-2', isDark ? 'text-blue-300' : 'text-blue-700')}>
                              💼 Yıllık İzin Hakkı Özeti
                            </p>
                            <div className="space-y-1">
                              {yillikIzinHaklari.map(hak => (
                                <div key={hak.Yil} className="flex justify-between text-xs">
                                  <span className={cn(isDark ? 'text-gray-300' : 'text-gray-700')}>
                                    {hak.Yil} {hak.YilDurumu === 'gelecek' && '(Gelecek)'}:
                                  </span>
                                  <span className={cn('font-medium', hak.KalanGun > 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600'))}>
                                    {hak.KalanGun}/{hak.ToplamHakGun} gün
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                        Başlangıç Tarihi *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.BaslangicTarihi}
                        onChange={(e) => setFormData({ ...formData, BaslangicTarihi: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        )}
                      />
                    </div>

                    <div>
                      <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                        Bitiş Tarihi *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.BitisTarihi}
                        onChange={(e) => setFormData({ ...formData, BitisTarihi: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        )}
                      />
                    </div>
                  </div>

                  {formData.BaslangicTarihi && formData.BitisTarihi && izinHesapBilgisi && (
                    <div className="space-y-3">
                      <div className={cn(
                        'p-4 rounded-xl border',
                        isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={cn('text-sm font-medium', isDark ? 'text-green-300' : 'text-green-700')}>
                            📅 Toplam Takvim Günü: <span className="font-bold">{izinHesapBilgisi.toplamGun} gün</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={cn('text-sm font-medium', isDark ? 'text-green-300' : 'text-green-700')}>
                            💼 İş Günü (Hak Kullanımı): <span className="font-bold text-lg">{izinHesapBilgisi.calismaGunu} gün</span>
                          </p>
                        </div>
                        {izinHesapBilgisi.tatilGunSayisi > 0 && (
                          <p className={cn('text-xs mt-2 pt-2 border-t', 
                            isDark ? 'text-green-400/70 border-green-700/50' : 'text-green-600/70 border-green-200'
                          )}>
                            🏖️ {izinHesapBilgisi.tatilGunSayisi} tatil/hafta sonu günü çıkarıldı
                          </p>
                        )}
                        <p className={cn('text-xs mt-1', isDark ? 'text-green-400/70' : 'text-green-600/70')}>
                          * Yıllık izin hakları sadece iş günü üzerinden hesaplanır
                        </p>
                      </div>

                      {/* Yıllık İzin Hakkı Kontrolü */}
                      {formData.IzinTuru === 'yillik' && formData.YillikIzinYili && (() => {
                        const secilenHak = yillikIzinHaklari.find(h => h.Yil === formData.YillikIzinYili);
                        if (secilenHak && izinHesapBilgisi.calismaGunu > secilenHak.KalanGun) {
                          return (
                            <div className={cn(
                              'p-4 rounded-xl border',
                              isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                            )}>
                              <p className={cn('text-sm font-bold mb-2', isDark ? 'text-red-300' : 'text-red-700')}>
                                ⚠️ YETERSİZ İZİN HAKKI!
                              </p>
                              <div className={cn('text-sm space-y-1', isDark ? 'text-red-300' : 'text-red-700')}>
                                <p>📊 Talep Edilen İş Günü: <span className="font-bold">{izinHesapBilgisi.calismaGunu} gün</span></p>
                                <p>💼 Kalan İzin Hakkı: <span className="font-bold">{secilenHak.KalanGun} iş günü</span></p>
                                <p>❌ Eksik: <span className="font-bold">{izinHesapBilgisi.calismaGunu - secilenHak.KalanGun} iş günü</span></p>
                              </div>
                              <p className={cn('text-xs mt-2 pt-2 border-t', 
                                isDark ? 'text-red-400/70 border-red-700/50' : 'text-red-600/70 border-red-200'
                              )}>
                                💡 Şirket politikası gereği avans izin olarak verilebilir
                              </p>
                            </div>
                          );
                        }
                        if (secilenHak) {
                          return (
                            <div className={cn(
                              'p-4 rounded-xl border',
                              isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                            )}>
                              <p className={cn('text-sm font-bold mb-2', isDark ? 'text-blue-300' : 'text-blue-700')}>
                                ✅ {formData.YillikIzinYili} YILI İZİN HAKKI DURUMU
                              </p>
                              <div className={cn('text-sm space-y-1', isDark ? 'text-blue-300' : 'text-blue-700')}>
                                <p>💼 Toplam Hakkınız: <span className="font-bold">{secilenHak.ToplamHakGun} iş günü</span></p>
                                <p>📊 Talep: <span className="font-bold">{izinHesapBilgisi.calismaGunu} iş günü</span></p>
                                <p>✅ İzin Sonrası Kalan: <span className="font-bold text-green-500">{secilenHak.KalanGun - izinHesapBilgisi.calismaGunu} iş günü</span></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {izinHesapBilgisi.tatilGunSayisi > 0 && (
                        <div className={cn(
                          'p-4 rounded-xl border',
                          isDark ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'
                        )}>
                          <p className={cn('text-sm', isDark ? 'text-orange-300' : 'text-orange-700')}>
                            ⚠️ <span className="font-bold">{izinHesapBilgisi.tatilGunSayisi} gün</span> tatile denk geliyor
                          </p>
                          <p className={cn('text-xs mt-1', isDark ? 'text-orange-400/70' : 'text-orange-600/70')}>
                            (Puantaj tablosundaki tatiller izin sayılmaz)
                          </p>
                        </div>
                      )}
                      
                      <div className={cn(
                        'p-3 rounded-xl border',
                        isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                      )}>
                        <p className={cn('text-xs', isDark ? 'text-blue-300' : 'text-blue-700')}>
                          📅 Toplam süre: {izinHesapBilgisi.toplamGun} gün 
                          ({izinHesapBilgisi.calismaGunu} çalışma + {izinHesapBilgisi.tatilGunSayisi} tatil)
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Açıklama
                    </label>
                    <textarea
                      value={formData.Aciklama}
                      onChange={(e) => setFormData({ ...formData, Aciklama: e.target.value })}
                      rows={4}
                      className={cn(
                        'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      )}
                      placeholder="İzin sebebinizi açıklayın..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className={cn(
                        'flex-1 px-6 py-3 rounded-xl transition-colors',
                        isDark 
                          ? 'bg-gray-700 text-white hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      )}
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

export default function IzinTalepleriPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <IzinTalepleriContent />
    </Suspense>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StatCard = memo(({ title, value, icon: Icon, color }: any) => {
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
});

StatCard.displayName = 'StatCard';

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
              {talep.IzinTuru === 'yillik' && talep.YillikIzinYili && (
                <InfoField label="İzin Hakkı Yılı" value={`${talep.YillikIzinYili}`} />
              )}
              <InfoField label="Başlangıç" value={new Date(talep.BaslangicTarihi).toLocaleDateString('tr-TR')} />
              <InfoField label="Bitiş" value={new Date(talep.BitisTarihi).toLocaleDateString('tr-TR')} />
              <InfoField 
                label="Süre" 
                value={
                  talep.Aciklama?.includes('tatile denk geliyor') 
                    ? (() => {
                        const match = talep.Aciklama.match(/(\d+) gün izinli \((\d+) gün tatile denk geliyor\)/);
                        if (match) {
                          return `${match[1]} gün izinli (${match[2]} gün tatile denk geliyor)`;
                        }
                        return `${talep.GunSayisi} gün`;
                      })()
                    : `${talep.GunSayisi} gün`
                } 
              />
              <InfoField label="Talep Tarihi" value={new Date(talep.created_at).toLocaleDateString('tr-TR')} />
            </div>
          </div>

          {talep.Aciklama && (
            <div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Açıklama</h3>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-line`}>
                  {talep.Aciklama.split('\n\n📅 İzin Detayı:')[0]}
                </p>
                {talep.Aciklama.includes('📅 İzin Detayı:') && (
                  <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-orange-900/20 border-orange-800/30' : 'bg-orange-50 border-orange-200'} border`}>
                    <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>
                      📅 {talep.Aciklama.split('📅 İzin Detayı: ')[1]}
                    </p>
                  </div>
                )}
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
              İzin Belgesi İndir (PDF)
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
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      <div 
        className={cn(
          'rounded-none shadow-2xl w-full overflow-y-auto backdrop-blur-xl animate-scale-in',
          isDark ? 'bg-gray-800/95' : 'bg-white/95'
        )}
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
            <div className="flex items-center gap-3">
              <History className={cn('w-7 h-7', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                İzin Geçmişi
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className={cn(
                'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-4xl mx-auto">

            {/* Talep Özeti */}
            <div className={cn(
              'p-4 rounded-xl mb-6 border',
              isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
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
  const { isDark } = useTheme();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      <div 
        className={cn(
          'rounded-none shadow-2xl w-full overflow-y-auto backdrop-blur-xl animate-scale-in',
          isDark ? 'bg-gray-800/95' : 'bg-white/95'
        )}
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
            <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              {onayFormData.isApprove ? 'Talebi Onayla' : 'Talebi Reddet'}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <div className={cn(
              'p-4 rounded-xl border',
              isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            )}>
              <p className={cn('text-sm mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>Personel:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {selectedTalep.PersonelInfo?.P_AdSoyad}
              </p>
              <p className={cn('text-sm mt-2 mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>İzin Türü:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {getIzinTuruLabel(selectedTalep.IzinTuru)}
              </p>
              <p className={cn('text-sm mt-2 mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>Süre:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {new Date(selectedTalep.BaslangicTarihi).toLocaleDateString('tr-TR')} - 
                {new Date(selectedTalep.BitisTarihi).toLocaleDateString('tr-TR')} ({selectedTalep.GunSayisi} gün)
              </p>
            </div>

            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                Not {onayFormData.isApprove ? '(Opsiyonel)' : '*'}
              </label>
              <textarea
                required={!onayFormData.isApprove}
                value={onayFormData.not}
                onChange={(e) => setOnayFormData({ ...onayFormData, not: e.target.value })}
                rows={4}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder={onayFormData.isApprove ? "Onay notu ekleyin..." : "Red sebebini açıklayın..."}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex-1 px-6 py-3 rounded-xl transition-colors',
                  isDark 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                )}
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
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      <div 
        className={cn(
          'rounded-none shadow-2xl w-full overflow-y-auto backdrop-blur-xl animate-scale-in',
          isDark ? 'bg-gray-800/95' : 'bg-white/95'
        )}
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
            <div className="flex items-center gap-3">
              <Edit3 className={cn('w-6 h-6', isDark ? 'text-purple-400' : 'text-purple-600')} />
              <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                Tarihleri Düzenle
              </h2>
            </div>
            <button 
              onClick={onClose}
              className={cn(
                'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-2xl mx-auto">

            {/* Mevcut Bilgiler */}
            <div className={cn(
              'p-4 rounded-xl mb-6 border',
              isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
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

