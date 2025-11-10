'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, FileText, Save, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const dynamic = 'force-dynamic';

const supabase = createClient();

interface Personel {
  PersonelTcKimlik: number;
  P_AdSoyad: string;
  P_AykaSozlesmeTarihi: string | null;
}

interface BolgeInfo {
  BolgeID: number;
  BolgeAdi: string;
  BolgeSicilNo: string;
}

interface PuantajHucre {
  deger: string;
  renk?: string;
}

interface PuantajSatir {
  sira: number;
  tcKimlik: number;
  adSoyad: string;
  iseGirisTarihi: string | null;
  hucreler: Record<string, PuantajHucre>;
  netSoforluk?: string;
  gunlukBrut?: string;
  yolYardimi?: string;
}

export default function PuantajPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [bolge, setBolge] = useState<BolgeInfo | null>(null);
  const [puantajVerisi, setPuantajVerisi] = useState<PuantajSatir[]>([]);
  
  const [secilenAy, setSecilenAy] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [gunler, setGunler] = useState<Date[]>([]);
  const [puantajYuklenmedi, setPuantajYuklenmedi] = useState(false);
  const [manuelDegisiklikler, setManuelDegisiklikler] = useState<Record<number, Record<string, {
    HucreDeger?: string;
    NetSoforluk?: string;
    GunlukBrut?: string;
    YolYardimi?: string;
  }>>>({});
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedilecekDegisiklikler, setKaydedilecekDegisiklikler] = useState<Array<{
    PersonelTcKimlik: number;
    Tarih: string;
    HucreDeger?: string | null;
    NetSoforluk?: string;
    GunlukBrut?: string;
    YolYardimi?: string;
    silme?: boolean;
  }>>([]);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    const sonGun = new Date(yil, ay, 0).getDate();
    const gunListesi: Date[] = [];
    
    for (let i = 1; i <= sonGun; i++) {
      gunListesi.push(new Date(yil, ay - 1, i));
    }
    
    setGunler(gunListesi);
  }, [secilenAy]);

  const yukleVeriler = useCallback(async () => {
    if (!user?.BolgeID) return;
    setLoading(true);
    try {
      const { data: bolgeData } = await supabase
        .from('BolgeInfo')
        .select('BolgeID, BolgeAdi, BolgeSicilNo')
        .eq('BolgeID', user!.BolgeID)
        .single();
      
      if (bolgeData) setBolge(bolgeData);

      const { data: personelData } = await supabase
        .from('PersonelInfo')
        .select(`
          PersonelTcKimlik,
          P_AdSoyad,
          P_AykaSozlesmeTarihi,
          PersonelLevelizasyon!inner(BolgeID)
        `)
        .eq('PersonelLevelizasyon.BolgeID', user!.BolgeID)
        .order('P_AdSoyad', { ascending: true });

      if (personelData) {
        const personelList: Personel[] = personelData.map((p: Record<string, unknown>) => ({
          PersonelTcKimlik: p.PersonelTcKimlik as number,
          P_AdSoyad: (p.P_AdSoyad as string) || 'Isimsiz',
          P_AykaSozlesmeTarihi: p.P_AykaSozlesmeTarihi as string | null
        }));

        // build empty rows first
        const satirlar: PuantajSatir[] = personelList.map((p, index) => ({
          sira: index + 1,
          tcKimlik: p.PersonelTcKimlik,
          adSoyad: p.P_AdSoyad,
          iseGirisTarihi: p.P_AykaSozlesmeTarihi,
            hucreler: {},
            netSoforluk: '',
            gunlukBrut: '',
            yolYardimi: ''
        }));

        // Fetch AylikPuantaj (puantaj boyama) for this Bolge and month
        const { data: aylikPuantaj } = await supabase
          .from('AylikPuantaj')
          .select('PuantajID, TakvimJSON, Durum')
          .eq('BolgeID', user!.BolgeID)
          .eq('YilAy', secilenAy)
          .single();

        if (!aylikPuantaj) {
          // No puantaj boyama found -> set state to show in-page refresh/banner
          setPuantajVerisi(satirlar);
          setPuantajYuklenmedi(true);
        } else {
          setPuantajYuklenmedi(false);
          // parse TakvimJSON and map to each satir hücreleri (same for all personnel)
          let takvim: Record<string, { isim?: string }> = {};
          try {
            takvim = typeof aylikPuantaj.TakvimJSON === 'string' ? JSON.parse(aylikPuantaj.TakvimJSON) : aylikPuantaj.TakvimJSON || {};
          } catch (error) {
            console.error('TakvimJSON parse error', error);
          }

          // Only pull "Resmi Tatil" and "Hafta Tatili" from puantaj boyama.
          // Use legend symbol and normal yellow color for both.
          const LEGEND_YELLOW = '#facc15';

          const isResmi = (isim: string) => isim && isim.toLowerCase().includes('resmi');
          const isHafta = (isim: string) => isim && isim.toLowerCase().includes('hafta');

          // for each satir and date, populate hucreler only for Resmi Tatil (RT) and Hafta Tatili (T)
          satirlar.forEach((satir) => {
            gunler.forEach((gun) => {
              const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
              const entry = takvim[tarih];
              if (entry && entry.isim) {
                const isim = String(entry.isim || '');
                if (isResmi(isim)) {
                  satir.hucreler[tarih] = { deger: 'RT', renk: LEGEND_YELLOW };
                } else if (isHafta(isim)) {
                  satir.hucreler[tarih] = { deger: 'T', renk: LEGEND_YELLOW };
                }
                // otherwise: ignore other types and leave cell empty (white)
              }
            });
          });

          // Now fetch approved leave (izin) records for personnel in this region and month
          try {
            const personelTcList = personelList.map(p => p.PersonelTcKimlik);
            const [yilStr, ayStr] = secilenAy.split('-');
            const firstDay = `${yilStr}-${ayStr}-01`;
            const lastDay = `${yilStr}-${String(Number(ayStr)).padStart(2, '0')}-${new Date(Number(yilStr), Number(ayStr), 0).getDate()}`;

            const { data: izinData } = await supabase
              .from('IzinTalepleri')
              .select('TalepID, PersonelTcKimlik, IzinTuru, BaslangicTarihi, BitisTarihi, Durum, KoordinatorOnayTarihi, YonetimOnayTarihi')
              .in('PersonelTcKimlik', personelTcList)
              .lte('BaslangicTarihi', lastDay)
              .gte('BitisTarihi', firstDay);

            if (izinData && Array.isArray(izinData)) {
              // simple helper to determine if a leave row is approved
              // Determine whether an izin row should be considered approved.
              // Accepts a variety of signals: Durum text containing approval words,
              // or presence of coordinator/management approval timestamps.
              interface IzinRow {
                TalepID: number;
                PersonelTcKimlik: number;
                IzinTuru: string;
                BaslangicTarihi: string;
                BitisTarihi: string;
                Durum?: string | number;
                KoordinatorOnayTarihi?: string;
                YonetimOnayTarihi?: string;
              }
              
              const isApproved = (row: IzinRow) => {
                try {
                  if (!row) return false;
                  // Check textual status (case-insensitive)
                  if (row?.Durum && typeof row.Durum === 'string') {
                    const d = row.Durum.toLowerCase();
                    if (d.includes('onay') || d.includes('approved') || d.includes('tamam') || d.includes('onaylandi') || d.includes('onaylandı')) return true;
                  }
                  // Some flows store approval timestamps instead of a textual status
                  if (row?.KoordinatorOnayTarihi || row?.YonetimOnayTarihi) return true;
                  // If Durum is a numeric code (e.g. 1/2) treat common accepted codes as approved
                  if (typeof row?.Durum === 'number') {
                    // assume 1 or 2 are approved in some systems; adjust if your app uses different codes
                    if (row.Durum === 1 || row.Durum === 2) return true;
                  }
                } catch (error) {
                  // ignore and treat as not approved
                  console.error('Error checking approval status:', error);
                }
                return false;
              };

              const izinMap: Record<string, IzinRow[]> = {};
              izinData.forEach((iz: IzinRow) => {
                if (!isApproved(iz)) return; // skip not-approved
                const start = new Date(iz.BaslangicTarihi);
                const end = new Date(iz.BitisTarihi);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const tarih = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  if (!izinMap[tarih]) izinMap[tarih] = [];
                  izinMap[tarih].push(iz);
                }
              });

              // mapping of IzinTuru to symbol & color
              const izinTypeToSymbol = (t: string | null | undefined) => {
                // Map common izin type strings to a display symbol and color.
                // Falls back to a red 'I' (unpaid) if unknown.
                if (!t) return { symbol: 'I', color: '#ef4444' };
                const s = String(t).toLowerCase();
                if (s.includes('ucretli') || s.includes('ücretli') || s.includes('paid')) return { symbol: 'Ü', color: '#facc15' };
                if (s.includes('ucretsiz') || s.includes('ücretsiz') || s.includes('unpaid')) return { symbol: 'I', color: '#ef4444' };
                if (s.includes('yillik') || s.includes('yıllık') || s.includes('yillik izin') || s.includes('yıllık izin')) return { symbol: 'YI', color: '#3b82f6' };
                if (s.includes('rapor') || s.includes('saglik')) return { symbol: 'R', color: '#10b981' };
                // fallback: log for debugging and return unpaid symbol
                // console.debug(`Unknown IzinTuru mapping for: ${t}`);
                return { symbol: 'I', color: '#ef4444' };
              };

              // Apply izin entries to satirlar: do not override RT/T from takvim
              satirlar.forEach((satir) => {
                gunler.forEach((gun) => {
                  const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
                  const hucre = satir.hucreler[tarih];
                  // if already RT or T, keep as is
                  if (hucre && (hucre.deger === 'RT' || hucre.deger === 'T')) return;
                  const izler = izinMap[tarih];
                  if (izler && izler.length > 0) {
                    // pick the first matching izin for this person (there may be multiple overlapping, so filter by person)
                    const personIzin = izler.find((z) => Number(z.PersonelTcKimlik) === Number(satir.tcKimlik));
                    if (personIzin) {
                      const mapped = izinTypeToSymbol(personIzin.IzinTuru);
                      satir.hucreler[tarih] = { deger: mapped.symbol, renk: mapped.color };
                    }
                  }
                });
              });
            }
          } catch (error) {
            console.error('Izin verisi cekme hatasi', error);
          }

          setPuantajVerisi(satirlar);
        }
      }
    } catch (error) {
      console.error('Veri yukleme hatasi:', error);
    }
    setLoading(false);
  }, [user, secilenAy, gunler]);

  useEffect(() => {
    if (user?.BolgeID) {
      void yukleVeriler();
    }
  }, [user, yukleVeriler]);

  // Manuel değişiklikleri veritabanından çek
  const degisiklikleriCek = async () => {
    if (!user?.BolgeID) return;
    
    setKaydediliyor(true);
    try {
      const response = await fetch(`/api/puantaj-degisiklik?bolgeId=${user.BolgeID}&yilAy=${secilenAy}`);
      if (response.ok) {
        const { degisiklikler } = await response.json();
        setManuelDegisiklikler(degisiklikler || {});
        
        // Manuel değişiklikleri satırlara uygula
        if (degisiklikler) {
          setPuantajVerisi(prev => prev.map(satir => {
            const personelDegisiklikleri = degisiklikler[satir.tcKimlik];
            if (personelDegisiklikleri) {
              const yeniHucreler = { ...satir.hucreler };
              
              // map symbol -> color according to legend (sadece UI için)
              const symbolToColor = (val?: string) => {
                if (!val) return undefined;
                const s = val.toString().trim().toUpperCase();
                if (s === 'X' || s === '/') return undefined;
                if (s === 'Ü' || s === 'U') return '#facc15';
                if (s === 'I') return '#ef4444';
                if (s === 'YI' || s === 'Yİ' || s === 'Y') return '#3b82f6';
                if (s === 'T') return '#facc15';
                if (s === 'RT') return '#facc15';
                if (s === 'R') return '#10b981';
                if (s === 'M') return '#ef4444';
                return undefined;
              };
              
              Object.entries(personelDegisiklikleri).forEach(([tarih, deg]) => {
                const degisiklik = deg as {
                  HucreDeger?: string;
                  NetSoforluk?: string;
                  GunlukBrut?: string;
                  YolYardimi?: string;
                };
                if (degisiklik.HucreDeger !== undefined) {
                  const color = symbolToColor(degisiklik.HucreDeger);
                  yeniHucreler[tarih] = {
                    deger: degisiklik.HucreDeger || '',
                    renk: color
                  };
                }
              });
              const ilkDegisiklik = Object.values(personelDegisiklikleri)[0] as {
                NetSoforluk?: string;
                GunlukBrut?: string;
                YolYardimi?: string;
              } | undefined;
              return {
                ...satir,
                hucreler: yeniHucreler,
                netSoforluk: ilkDegisiklik?.NetSoforluk || satir.netSoforluk,
                gunlukBrut: ilkDegisiklik?.GunlukBrut || satir.gunlukBrut,
                yolYardimi: ilkDegisiklik?.YolYardimi || satir.yolYardimi
              };
            }
            return satir;
          }));
          alert(`✅ ${Object.keys(degisiklikler).length} personel için değişiklikler yüklendi!`);
        } else {
          alert('ℹ️ Bu ay için kaydedilmiş değişiklik bulunamadı.');
        }
      }
    } catch (error) {
      console.error('Manuel değişiklik yükleme hatası:', error);
      alert('❌ Değişiklikler yüklenirken hata oluştu!');
    }
    setKaydediliyor(false);
  };

  // Manuel değişiklikleri veritabanına kaydet
  const degisiklikleriKaydet = async () => {
    if (!user?.BolgeID || kaydedilecekDegisiklikler.length === 0) {
      alert('Kaydedilecek değişiklik yok!');
      return;
    }

    setKaydediliyor(true);
    try {
      let basariliSayisi = 0;
      let hataliSayisi = 0;

      for (const degisiklik of kaydedilecekDegisiklikler) {
        try {
          // Eğer silme işareti varsa veya değer boşsa, DELETE isteği gönder
          if (degisiklik.silme || degisiklik.HucreDeger === null) {
            const response = await fetch(
              `/api/puantaj-degisiklik?bolgeId=${user.BolgeID}&personelTc=${degisiklik.PersonelTcKimlik}&yilAy=${secilenAy}&tarih=${degisiklik.Tarih}`,
              { method: 'DELETE' }
            );
            
            if (response.ok) {
              basariliSayisi++;
            } else {
              hataliSayisi++;
            }
          } else {
            // Normal kaydetme işlemi
            const response = await fetch('/api/puantaj-degisiklik', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                BolgeID: user.BolgeID,
                PersonelTcKimlik: degisiklik.PersonelTcKimlik,
                YilAy: secilenAy,
                Tarih: degisiklik.Tarih,
                HucreDeger: degisiklik.HucreDeger,
                NetSoforluk: degisiklik.NetSoforluk || null,
                GunlukBrut: degisiklik.GunlukBrut || null,
                YolYardimi: degisiklik.YolYardimi || null,
                DegistirenKisi: user.PersonelEmail || String(user.PersonelTcKimlik)
              })
            });

            if (response.ok) {
              basariliSayisi++;
            } else {
              hataliSayisi++;
            }
          }
        } catch (error) {
          console.error('Değişiklik kaydetme hatası:', error);
          hataliSayisi++;
        }
      }

      if (hataliSayisi === 0) {
        alert(`✅ ${basariliSayisi} değişiklik başarıyla kaydedildi!`);
        setKaydedilecekDegisiklikler([]); // Listeyi temizle
      } else {
        alert(`⚠️ ${basariliSayisi} değişiklik kaydedildi, ${hataliSayisi} değişiklikte hata oluştu!`);
      }
    } catch (error) {
      console.error('Toplu kaydetme hatası:', error);
      alert('❌ Değişiklikler kaydedilirken hata oluştu!');
    }
    setKaydediliyor(false);
  };

  const ayDegistir = (yon: 'onceki' | 'sonraki') => {
    // Eğer kaydedilmemiş değişiklikler varsa uyar
    if (kaydedilecekDegisiklikler.length > 0) {
      const onay = confirm(
        `⚠️ ${kaydedilecekDegisiklikler.length} kaydedilmemiş değişiklik var!\n\nAy değiştirilirse bu değişiklikler kaybolacak. Devam etmek istiyor musunuz?`
      );
      if (!onay) return;
    }

    const [yil, ay] = secilenAy.split('-').map(Number);
    let yeniYil = yil;
    let yeniAy = ay;
    
    if (yon === 'onceki') {
      yeniAy--;
      if (yeniAy < 1) {
        yeniAy = 12;
        yeniYil--;
      }
    } else {
      yeniAy++;
      if (yeniAy > 12) {
        yeniAy = 1;
        yeniYil++;
      }
    }
    
    setSecilenAy(`${yeniYil}-${String(yeniAy).padStart(2, '0')}`);
    setKaydedilecekDegisiklikler([]); // Bekleyen değişiklikleri temizle
    setManuelDegisiklikler({}); // Manuel değişiklikleri temizle
  };

  const excelAktar = () => {
    if (puantajVerisi.length === 0) {
      alert('Aktarilacak veri yok!');
      return;
    }
    const ayAdi = new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();

    // Başlık bilgileri için 3 satır
    const sirketBilgi1 = ['SAMSUN - Sirket: Ay-Ka Dogalgaz Enerji'];
    const sirketBilgi2 = [`Sube Is Yeri Sicil No: ${bolge?.BolgeSicilNo || '482990101116728805516-96/000'}`];
    const bosSatir = [''];

    const basliklar = [
      'SIRA', 'PERS. TC. NO', 'ADI SOYADI',
      'İŞE GİRİŞ TARİHİ', 'İŞTEN AYRILIŞ TARİHİ', 'GÜNLÜK BRÜT ÜCRET',
      `${ayAdi} AYI MESAİ SAATİ`, 'MESAI SAATİ', 'FAZLA MESAİ SÜRESİ',
      'YOL YARDIMI', 'NET ŞOFÖRLÜK', 'EKİP ŞEFİ'
    ];

    gunler.forEach((gun) => {
      basliklar.push(`${gun.getDate()}`);
    });

    basliklar.push('Ilm. Gun', 'IMZA');

    const satirlar = puantajVerisi.map((satir) => {
      const iseGirisTarihiStr = satir.iseGirisTarihi 
        ? new Date(satir.iseGirisTarihi).toLocaleDateString('tr-TR')
        : '';
      
      const row: (string | number)[] = [
        satir.sira, satir.tcKimlik, satir.adSoyad,
        iseGirisTarihiStr,
        '', // İŞTEN AYRILIŞ TARİHİ
        (satir.gunlukBrut) || '', // GÜNLÜK BRÜT ÜCRET
        '', // {AY} AYI MESAİ SAATİ
        '', // MESAI SAATİ
        '', // FAZLA MESAİ SÜRESİ
        (satir.yolYardimi) || '', // YOL YARDIMI
        (satir.netSoforluk) || '', // NET ŞOFÖRLÜK PARASI EKLENECEK
        '', // EKİP ŞEFİ
      ];

      gunler.forEach((gun) => {
        const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
        const hucre = satir.hucreler[tarih];
        row.push(hucre?.deger || '');
      });

      row.push('', '');
      return row;
    });

    // Başlık satırları + tablo
    const ws = XLSX.utils.aoa_to_sheet([sirketBilgi1, sirketBilgi2, bosSatir, basliklar, ...satirlar]);

    // Sütun genişlikleri
    const colWidths = basliklar.map((h, idx) => {
      if (idx === 0) return { wch: 6 }; // SIRA
      if (idx === 1) return { wch: 15 }; // TC
      if (idx === 2) return { wch: 25 }; // ADI SOYADI
      if (idx === 3 || idx === 4) return { wch: 14 }; // dates
      if (idx === 5) return { wch: 16 }; // GUNLUK BRUT
      if (idx === 6) return { wch: 20 }; // month mesai
      if (idx === 7) return { wch: 12 }; // MESAI SAATI
      if (idx === 8) return { wch: 16 }; // FAZLA
      if (idx === 9) return { wch: 12 }; // YOL YARDIMI
      if (idx === 10) return { wch: 14 }; // NET SOFORLUK
      if (idx === 11) return { wch: 12 }; // EKIP SEFI
      if (idx >= 12 && idx < basliklar.length - 2) return { wch: 4 }; // Günler
      return { wch: 10 };
    });
    ws['!cols'] = colWidths;

    // Para formatı uygula
    const moneyCols = [5, 9];
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref'] as string);
      for (let R = 4; R <= range.e.r; ++R) { // 4. satırdan başla (0-indexed, başlıklar 3. satırda)
        moneyCols.forEach((c) => {
          const cellAddress = { c, r: R };
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          const cell = ws[cellRef];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            const num = Number(String(cell.v).replace(',', '.'));
            if (!Number.isNaN(num)) {
              cell.v = num;
              cell.t = 'n';
              cell.z = '#,##0.00 "₺"';
            }
          }
        });
      }
    }

    // Stil ve kenarlık uygulamaları
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref'] as string);
      const lastCol = basliklar.length - 1;
      
      // Tüm hücrelere border ekle
      const thinBorder = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // Başlık bilgisi satırları (ilk 2 satır) - stil
      for (let C = 0; C <= lastCol; ++C) {
        // İlk satır - Şirket bilgisi
        const cell1Ref = XLSX.utils.encode_cell({ c: C, r: 0 });
        if (!ws[cell1Ref]) ws[cell1Ref] = { t: 's', v: '' };
        ws[cell1Ref].s = {
          font: { bold: true, sz: 12, color: { rgb: '000000' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'E8F4F8' } }
        };
        
        // İkinci satır - Sicil no bilgisi
        const cell2Ref = XLSX.utils.encode_cell({ c: C, r: 1 });
        if (!ws[cell2Ref]) ws[cell2Ref] = { t: 's', v: '' };
        ws[cell2Ref].s = {
          font: { sz: 11, color: { rgb: '000000' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'E8F4F8' } }
        };
      }

      // Başlık bilgilerini merge et
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // İlk satır merge
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }  // İkinci satır merge
      ];

      // Tablo başlık satırı (4. satır, index 3)
      for (let C = 0; C <= lastCol; ++C) {
        const hdrRef = XLSX.utils.encode_cell({ c: C, r: 3 });
        if (!ws[hdrRef]) ws[hdrRef] = { t: 's', v: '' };
        ws[hdrRef].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          fill: { fgColor: { rgb: '4472C4' } },
          border: thinBorder
        };
      }

      // Veri satırları - stil ve renkler
      for (let R = 4; R <= range.e.r; ++R) {
        const satirIndex = R - 4; // satirlar array index
        const satirData = puantajVerisi[satirIndex];
        
        for (let C = 0; C <= lastCol; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
          
          // Temel stil
          const cellStyle: Record<string, unknown> = {
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder,
            font: { sz: 10 }
          };

          // Gün hücrelerinin renkleri (12. sütundan başlayarak günler)
          if (C >= 12 && C < basliklar.length - 2 && satirData) {
            const gunIndex = C - 12;
            const gun = gunler[gunIndex];
            if (gun) {
              const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
              const hucre = satirData.hucreler[tarih];
              
              if (hucre?.renk) {
                // Hex rengi RGB'ye çevir
                const hexToRgb = (hex: string) => hex.replace('#', '').toUpperCase();
                const rgbColor = hexToRgb(hucre.renk);
                
                // Renk mapping - daha parlak renkler
                const colorMap: Record<string, string> = {
                  'FACC15': 'FFEB3B', // Sarı - daha parlak
                  'EF4444': 'FF6B6B', // Kırmızı - daha parlak
                  '3B82F6': '64B5F6', // Mavi - daha parlak
                  '10B981': '4CAF50'  // Yeşil - daha parlak
                };
                
                cellStyle.fill = { fgColor: { rgb: colorMap[rgbColor] || rgbColor } };
                cellStyle.font = { sz: 10, bold: true, color: { rgb: '000000' } };
              }
            }
          }

          // Sütun adı ve TC kimlik sütunları için
          if (C === 2) { // Adı Soyadı
            cellStyle.alignment = { horizontal: 'left', vertical: 'center' };
          }

          ws[cellRef].s = cellStyle;
        }
      }

      // Satır yükseklikleri
      ws['!rows'] = [
        { hpt: 20 }, // 1. satır (şirket bilgisi)
        { hpt: 20 }, // 2. satır (sicil no)
        { hpt: 15 }, // 3. satır (boş)
        { hpt: 30 }  // 4. satır (başlıklar)
      ];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Puantaj');

    const [yil, ay] = secilenAy.split('-');
    const ayIsimleri = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
    const dosyaAdi = `${bolge?.BolgeAdi || 'Bolge'}_Puantaj_${ayIsimleri[parseInt(ay) - 1]}_${yil}.xlsx`;

    XLSX.writeFile(wb, dosyaAdi);
  };

  const pdfAktar = () => {
    if (puantajVerisi.length === 0) {
      alert('Aktarilacak veri yok!');
      return;
    }

    const ayAdi = new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();
    
    // Yatay A4 için PDF oluştur
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Türkçe karakterler için özel çözüm (İ, Ş, Ğ sorun oluyor)
    const fixTurkce = (text: string): string => {
      // Sorunlu karakterleri düzelt: İ, ı, Ş, ş, Ğ, ğ
      return text
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .replace(/Ş/g, 'S')
        .replace(/ş/g, 's')
        .replace(/Ğ/g, 'G')
        .replace(/ğ/g, 'g');
    };

    // Başlık bilgileri
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(fixTurkce('SAMSUN - Şirket: Ay-Ka Doğalgaz Enerji'), 10, 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(fixTurkce(`Şube İş Yeri Sicil No: ${bolge?.BolgeSicilNo || '482990101116728805516-96/000'}`), 10, 15);

    // Tablo başlıkları - tek satır olanlar büyük, çift satır olanlar küçük
    const basliklar = [
      'SIRA',
      'TC NO', 
      'ADI SOYADI', 
      fixTurkce('İŞE GİRİŞ'), 
      fixTurkce('İŞTEN ÇIKIŞ'),
      fixTurkce('GÜNLÜK ÜCRET'),
      fixTurkce(`${ayAdi} MESAİ`),
      fixTurkce('MESAİ SAAT'),
      fixTurkce('FAZLA MESAİ'),
      fixTurkce('YOL YRD.'),
      fixTurkce('NET ŞÖF.'),
      fixTurkce('EKİP ŞEFİ')
    ];

    // Gün başlıklarını ekle
    gunler.forEach((gun) => {
      basliklar.push(`${gun.getDate()}`);
    });

    basliklar.push('Ilm.', 'IMZA');

    // Tablo verileri
    const satirlar = puantajVerisi.map((satir) => {
      const iseGirisTarihiStr = satir.iseGirisTarihi 
        ? new Date(satir.iseGirisTarihi).toLocaleDateString('tr-TR')
        : '';
      
      const row: (string | number)[] = [
        satir.sira,
        satir.tcKimlik,
        fixTurkce(satir.adSoyad),
        iseGirisTarihiStr,
        '',
        fixTurkce(String((satir.gunlukBrut) || '')),
        '',
        '',
        '',
        fixTurkce(String((satir.yolYardimi) || '')),
        fixTurkce(String((satir.netSoforluk) || '')),
        ''
      ];

      // Gün verilerini ekle
      gunler.forEach((gun) => {
        const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
        const hucre = satir.hucreler[tarih];
        row.push(fixTurkce(String(hucre?.deger || '')));
      });

      row.push('', '');
      return row;
    });

    // Renk mapping fonksiyonu
    const getRenkKodu = (renk?: string): [number, number, number] | null => {
      if (!renk) return null;
      const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      
      const colorMap: Record<string, string> = {
        '#facc15': '#FFEB3B', // Sarı
        '#ef4444': '#FF6B6B', // Kırmızı
        '#3b82f6': '#64B5F6', // Mavi
        '#10b981': '#4CAF50'  // Yeşil
      };
      
      return hexToRgb(colorMap[renk.toLowerCase()] || renk);
    };

    // A4 Landscape: 297mm genişlik
    // Marjlar: Sol 10mm + Sağ 10mm = 20mm
    // Kullanılabilir alan: 277mm
    
    // Gün sayısı hesapla
    const gunSayisi = gunler.length;
    
    // Büyük sabit sütunlar (tek satır başlık)
    const buyukSutunlar = 6 + 18 + 35 + 14 + 14; // SIRA + TC NO + ADI SOYADI + İŞE GİRİŞ + İŞTEN ÇIKIŞ = 87mm
    
    // Küçük sütunlar (küçülebilir)
    const kucukSutunlar = 8 + 10 + 7 + 8 + 7 + 7 + 8; // 55mm
    
    // Son sütunlar
    const sonSutunlar = 7 + 9; // 16mm
    
    // Günler için kalan alan
    const gunlerIcinAlan = 277 - buyukSutunlar - kucukSutunlar - sonSutunlar; // ~119mm
    const gunCellWidth = gunlerIcinAlan / gunSayisi; // ~3.8mm per gün (31 gün için)
    
    // autoTable ile tablo oluştur
    autoTable(doc, {
      head: [basliklar],
      body: satirlar,
      startY: 19,
      theme: 'grid',
      tableWidth: 277, // Tam genişlik
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [68, 114, 196],
        textColor: [255, 255, 255],
        fontSize: 6.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.2,
        minCellHeight: 7, // Tek satır için yeterli
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 6, fontSize: 7 }, // SIRA - büyük
        1: { cellWidth: 18, fontSize: 7 }, // TC NO - büyük, tek satır
        2: { cellWidth: 35, halign: 'left', fontSize: 6.5 }, // ADI SOYADI - büyük, tek satır
        3: { cellWidth: 14, fontSize: 6.5 }, // İŞE GİRİŞ - büyük, tek satır
        4: { cellWidth: 14, fontSize: 6.5 }, // İŞTEN ÇIKIŞ - büyük, tek satır
        5: { cellWidth: 8, fontSize: 5.5 }, // GÜNLÜK ÜCRET - küçük
        6: { cellWidth: 10, fontSize: 5.5 }, // AY MESAİ - küçük
        7: { cellWidth: 7, fontSize: 5.5 }, // MESAİ SAAT - küçük
        8: { cellWidth: 8, fontSize: 5.5 }, // FAZLA MESAİ - küçük
        9: { cellWidth: 7, fontSize: 5.5 }, // YOL YARD - küçük
        10: { cellWidth: 7, fontSize: 5.5 }, // NET ŞÖF - küçük
        11: { cellWidth: 8, fontSize: 5.5 }  // EKİP ŞEFİ - küçük
      },
      didParseCell: function(data) {
        // Başlık satırı için özel ayarlar
        if (data.section === 'head') {
          // Büyük sütunlar (0-4) için tek satır ve büyük font
          if (data.column.index >= 0 && data.column.index <= 4) {
            data.cell.styles.fontSize = 7;
            data.cell.styles.minCellHeight = 7;
          }
          // Küçük sütunlar (5-11) için küçük font
          else if (data.column.index >= 5 && data.column.index <= 11) {
            data.cell.styles.fontSize = 5.5;
            data.cell.styles.minCellHeight = 10; // 2 satır için
          }
        }
        
        // Gün sütunları için
        if (data.column.index >= 12 && data.column.index < basliklar.length - 2) {
          data.cell.styles.cellWidth = gunCellWidth;
          data.cell.styles.fontSize = 7;
        }
        
        // Son 2 sütun için (İlm ve İmza)
        if (data.column.index === basliklar.length - 2) {
          data.cell.styles.cellWidth = 7;
          data.cell.styles.fontSize = 6;
        }
        if (data.column.index === basliklar.length - 1) {
          data.cell.styles.cellWidth = 9;
          data.cell.styles.fontSize = 6;
        }
        
        // Gün hücrelerine renk ekle (12. sütundan başlayarak günler)
        if (data.section === 'body' && data.column.index >= 12 && data.column.index < basliklar.length - 2) {
          const satirIndex = data.row.index;
          const satirData = puantajVerisi[satirIndex];
          
          if (satirData) {
            const gunIndex = data.column.index - 12;
            const gun = gunler[gunIndex];
            
            if (gun) {
              const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
              const hucre = satirData.hucreler[tarih];
              
              if (hucre?.renk) {
                const rgb = getRenkKodu(hucre.renk);
                if (rgb) {
                  data.cell.styles.fillColor = rgb;
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.textColor = [0, 0, 0];
                }
              }
            }
          }
        }
      },
      margin: { top: 19, right: 10, bottom: 10, left: 10 }
    });

    const [yil, ay] = secilenAy.split('-');
    const ayIsimleri = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const dosyaAdi = `${fixTurkce(bolge?.BolgeAdi || 'Bolge')}_Puantaj_${fixTurkce(ayIsimleri[parseInt(ay) - 1])}_${yil}.pdf`;

    doc.save(dosyaAdi);
  };

  const hucreGuncelle = (satirIndex: number, tarih: string, deger: string) => {
    // map symbol -> color according to legend
    const symbolToColor = (val?: string) => {
      if (!val) return undefined;
      const s = val.toString().trim().toUpperCase();
      // normalize Turkish Ü/YI etc
      if (s === 'X' || s === '/') return undefined; // white / empty
      if (s === 'Ü' || s === 'U') return '#facc15'; // ücretli izin - yellow
      if (s === 'I') return '#ef4444'; // ücretsiz izin - red
      if (s === 'YI' || s === 'Yİ' || s === 'Y') return '#3b82f6'; // yıllık izin - blue
      if (s === 'T') return '#facc15'; // hafta tatili - yellow
      if (s === 'RT') return '#facc15'; // resmi tatil - yellow
      if (s === 'R') return '#10b981'; // rapor - green
      if (s === 'M') return '#ef4444'; // tam gün fazla mesai - red
      // default: no color
      return undefined;
    };

    const satir = puantajVerisi[satirIndex];
    if (!satir) return;

    setPuantajVerisi((prev) => {
      const yeni = [...prev];
      if (!yeni[satirIndex]) return prev;
      if (!yeni[satirIndex].hucreler[tarih]) {
        yeni[satirIndex].hucreler[tarih] = { deger: '' };
      }
      const color = symbolToColor(deger);
      yeni[satirIndex].hucreler[tarih].deger = deger;
      if (color) yeni[satirIndex].hucreler[tarih].renk = color;
      else delete yeni[satirIndex].hucreler[tarih].renk;
      return yeni;
    });
    
    // Eğer değer boşsa, kaydedilecekler listesinden kaldır (silinecek demektir)
    const degerTemiz = deger?.trim();
    
    setKaydedilecekDegisiklikler((prev) => {
      // Önce aynı hücreyi listeden çıkar
      const filtered = prev.filter(
        (d) => !(d.PersonelTcKimlik === satir.tcKimlik && d.Tarih === tarih)
      );
      
      // Eğer değer tamamen boşsa, veritabanından silinmeli
      if (!degerTemiz || degerTemiz === '') {
        // Boş değer için "sil" işareti olarak özel bir işaret ekle
        return [
          ...filtered,
          {
            PersonelTcKimlik: satir.tcKimlik,
            Tarih: tarih,
            HucreDeger: null, // null = sil işareti
            silme: true // silme bayrağı
          } as never
        ];
      }
      
      // Değer varsa (X ve / dahil), sadece değeri kaydet
      return [
        ...filtered,
        {
          PersonelTcKimlik: satir.tcKimlik,
          Tarih: tarih,
          HucreDeger: degerTemiz
        }
      ];
    });
  };

  const updateInfoField = (satirIndex: number, field: keyof Pick<PuantajSatir, 'netSoforluk' | 'gunlukBrut' | 'yolYardimi'>, value: string) => {
    const satir = puantajVerisi[satirIndex];
    if (!satir || gunler.length === 0) return;

    setPuantajVerisi(prev => {
      const yeni = [...prev];
      if (!yeni[satirIndex]) return prev;
      yeni[satirIndex] = { ...yeni[satirIndex], [field]: value };
      return yeni;
    });
    
    // İlk günü tarih olarak kullan (NetSoforluk, GunlukBrut, YolYardimi ayda bir kez kaydedilir)
    const ilkGunTarihi = `${gunler[0].getFullYear()}-${String(gunler[0].getMonth() + 1).padStart(2, '0')}-${String(gunler[0].getDate()).padStart(2, '0')}`;
    
    const fieldMap = {
      netSoforluk: 'NetSoforluk',
      gunlukBrut: 'GunlukBrut',
      yolYardimi: 'YolYardimi'
    };
    
    // Kaydedilecek değişiklikler listesine ekle veya güncelle
    setKaydedilecekDegisiklikler((prev) => {
      const existing = prev.find(
        (d) => d.PersonelTcKimlik === satir.tcKimlik && d.Tarih === ilkGunTarihi
      );
      
      if (existing) {
        return prev.map((d) =>
          d.PersonelTcKimlik === satir.tcKimlik && d.Tarih === ilkGunTarihi
            ? { ...d, [fieldMap[field]]: value }
            : d
        );
      } else {
        return [
          ...prev,
          {
            PersonelTcKimlik: satir.tcKimlik,
            Tarih: ilkGunTarihi,
            [fieldMap[field]]: value
          }
        ];
      }
    });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['koordinator', 'insan_kaynaklari', 'yonetici']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['koordinator', 'insan_kaynaklari', 'yonetici']}>
      <DashboardLayout>
        <div className="h-full flex flex-col puantaj-page">
          {isDark && (
            <style>{`.puantaj-page select { background-color: #2d2d2d; color: #ffffff; }
              .puantaj-page select option { background-color: #2d2d2d; color: #ffffff; }
              .puantaj-page select::-ms-expand { filter: invert(1); }
            `}</style>
          )}
          <div className={`border-b p-3 ${isDark ? 'bg-[#2d2d2d]/50 border-gray-700' : 'bg-white/50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Donem Puantaj Listesi</h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{bolge?.BolgeAdi || 'Bolge'} - Sirket: Ay-Ka Dogalgaz Enerji</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Sube Is Yeri Sicil No: {bolge?.BolgeSicilNo || '-'}</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => ayDegistir('onceki')} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 min-w-[160px] justify-center ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-300'}`}>
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}</span>
                </div>

                <button onClick={() => ayDegistir('sonraki')} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button 
                  onClick={degisiklikleriKaydet} 
                  disabled={kaydediliyor || kaydedilecekDegisiklikler.length === 0}
                  className={`ml-2 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg text-sm relative ${
                    kaydediliyor || kaydedilecekDegisiklikler.length === 0
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={kaydedilecekDegisiklikler.length > 0 ? `${kaydedilecekDegisiklikler.length} değişiklik kaydedilecek` : 'Kaydedilecek değişiklik yok'}
                >
                  <Save className="w-4 h-4" />
                  Kaydet
                  {kaydedilecekDegisiklikler.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {kaydedilecekDegisiklikler.length}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={degisiklikleriCek} 
                  disabled={kaydediliyor}
                  className={`ml-2 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg text-sm ${
                    kaydediliyor 
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Veritabanından manuel değişiklikleri yükle"
                >
                  <Database className="w-4 h-4" />
                  Değişiklikleri Çek
                </button>

                <button onClick={excelAktar} className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-lg text-sm">
                  <Download className="w-4 h-4" />
                  Excel Aktar
                </button>
                <button onClick={pdfAktar} className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-lg text-sm">
                  <FileText className="w-4 h-4" />
                  PDF Aktar
                </button>
                <button onClick={() => { setPuantajYuklenmedi(false); yukleVeriler(); }} title="Puantaj Yenile" className="ml-2 p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Donem: {gunler[0]?.toLocaleDateString('tr-TR')} - {gunler[gunler.length - 1]?.toLocaleDateString('tr-TR')}</div>
          </div>

          {puantajYuklenmedi && (
            <div className={`p-2 text-center ${isDark ? 'bg-yellow-800 text-white' : 'bg-yellow-100 text-yellow-800'}`}>
              Puantaj verileri yüklenemedi lütfen <button onClick={() => { setPuantajYuklenmedi(false); yukleVeriler(); }} className="underline font-semibold">Puantaj Boyama Sayfasından </button> Aylık boyamayı kontrol ediniz .
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
            <div ref={tableContainerRef} className="flex-1 overflow-auto">
              <table className={`w-full border-collapse text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}>
                  <tr>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[15px] sticky left-0 z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>SIRA</th>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[85px] sticky left-[35px] z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>TC NO</th>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[120px] sticky left-[120px] z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>ADI SOYADI</th>
            <th className={`border px-0.5 py-0.5 font-semibold text-center w-[85px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>İŞE GİRİŞ TARİHİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>İŞTEN AYRILIŞ TARİHİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>GÜNLÜK BRÜT ÜCRET</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[90px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{/* Ay adı dinamik */} {new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase()} AYI MESAİ SAATİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>MESAI SAATİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[95px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>FAZLA MESAİ SÜRESİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[75px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>YOL YARDIMI</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[45px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>NET ŞOFÖRLÜK</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[85px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>EKİP ŞEFİ</th>
                    {gunler.map((gun) => {
                      const gunAdi = gun.toLocaleDateString('tr-TR', { weekday: 'short' }).substring(0, 2).toUpperCase();
                      const gunNo = gun.getDate();
                      return (
                        <th key={gun.toISOString()} className={`border px-0.5 py-0.5 font-semibold text-center w-[35px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                          <div className="flex flex-col"><span className="text-[8px]">{gunAdi}</span><span className="text-xs font-bold">{gunNo}</span></div>
                        </th>
                      );
                    })}
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[45px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>Ilm</th>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[50px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>IMZA</th>
                  </tr>
                </thead>

                <tbody>
                  {puantajVerisi.map((satir, satirIndex) => (
                    <tr key={satir.tcKimlik} className={isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}>
                      <td className={`border px-0.5 py-0.5 text-center sticky left-0 z-10 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-300'}`}>{satir.sira}</td>
                      <td className={`border px-0.5 py-0.5 text-center sticky left-[35px] z-10 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-300'}`}>{satir.tcKimlik}</td>
                      <td className={`border px-0.5 py-0.5 text-left sticky left-[120px] z-10 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-300'}`}>{satir.adSoyad}</td>
                      {(() => {
                        const ayAdi = new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();
                        const infoHeaders = [
                          'İŞE GİRİŞ TARİHİ',
                          'İŞTEN AYRILIŞ TARİHİ',
                          'GÜNLÜK BRÜT ÜCRET',
                          `${ayAdi} AYI MESAİ SAATİ`,
                          'MESAI SAATİ',
                          'FAZLA MESAİ SÜRESİ',
                          'YOL YARDIMI',
                          'NET ŞOFÖRLÜK',
                          'EKİP ŞEFİ'
                        ];

                        return infoHeaders.map((h, i) => {
                          if (i === 0) {
                            const tarihStr = satir.iseGirisTarihi 
                              ? new Date(satir.iseGirisTarihi).toLocaleDateString('tr-TR')
                              : '';
                            return (
                              <td key={`info-${i}`} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                                <input 
                                  type="text" 
                                  value={tarihStr}
                                  readOnly
                                  className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`} 
                                />
                              </td>
                            );
                          }
                          // render special select for NET ŞOFÖRLÜK PARASI EKLENECEK (index 7)
                          if (i === 7) {
                            const val = satir.netSoforluk || '';
                            const compact = val === 'X' || val === '/';
                              return (
                                <td key={`info-${i}`} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} text-center`}>
                                  <select value={val} onChange={(e) => updateInfoField(satirIndex, 'netSoforluk', e.target.value)} className={`px-0.5 py-0.5 text-[10px] ${isDark ? 'bg-[#2d2d2d] text-white' : 'bg-transparent text-gray-900'}`} style={{ width: compact ? 36 : '100%', margin: '0 auto', textAlign: 'center' }}>
                                    <option value=""> </option>
                                    <option value="X">X</option>
                                    <option value="/">/</option>
                                  </select>
                                </td>
                              );
                          }

                          // render numeric input for GÜNLÜK BRÜT ÜCRET (i===2) and YOL YARDIMI (i===6)
                          if (i === 2) {
                            const val = satir.gunlukBrut || '';
                            return (
                              <td key={`info-${i}`} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} text-center`}>
                                <div className="flex items-center justify-center">
                                  <input type="number" step="0.01" value={val} onChange={(e) => updateInfoField(satirIndex, 'gunlukBrut', e.target.value)} placeholder="0.00" className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                  <span className="text-[10px] ml-1">₺</span>
                                </div>
                              </td>
                            );
                          }

                          if (i === 6) {
                            const val = satir.yolYardimi || '';
                            return (
                              <td key={`info-${i}`} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} text-center`}>
                                <div className="flex items-center justify-center">
                                  <input type="number" step="0.01" value={val} onChange={(e) => updateInfoField(satirIndex, 'yolYardimi', e.target.value)} placeholder="0.00" className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                  <span className="text-[10px] ml-1">₺</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={`info-${i}`} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                              <input type="text" placeholder={h} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
                            </td>
                          );
                        });
                      })()}
                      {(() => {
                        const hire = satir.iseGirisTarihi ? new Date(satir.iseGirisTarihi) : null;
                        if (!hire) {
                          return gunler.map((gun) => {
                            const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
                            const hucre = satir.hucreler[tarih];
                            const manuelDegisti = manuelDegisiklikler[satir.tcKimlik]?.[tarih];
                            return (
                              <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} relative`} style={{ backgroundColor: hucre?.renk }}>
                                <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                {manuelDegisti && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" title="Manuel değiştirildi"></div>}
                              </td>
                            );
                          });
                        }

                        const firstDay = gunler[0];
                        const lastDay = gunler[gunler.length - 1];

                        if (hire > lastDay) {
                          const colspan = gunler.length;
                          const display = new Date(hire).toLocaleDateString('tr-TR');
                          return (
                            <td key={`merged-before-${satir.tcKimlik}`} colSpan={colspan} className={`border px-0.5 py-0.5 text-center font-semibold ${isDark ? 'border-gray-700' : 'border-gray-300'}`} style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                              {display}
                            </td>
                          );
                        }

                        if (hire <= firstDay) {
                          return gunler.map((gun) => {
                            const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
                            const hucre = satir.hucreler[tarih];
                            const manuelDegisti = manuelDegisiklikler[satir.tcKimlik]?.[tarih];
                            return (
                              <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} relative`} style={{ backgroundColor: hucre?.renk }}>
                                <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                {manuelDegisti && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" title="Manuel değiştirildi"></div>}
                              </td>
                            );
                          });
                        }

                        const mergedCount = gunler.filter(g => g < hire).length;
                        const remaining = gunler.slice(mergedCount);
                        const display = new Date(hire).toLocaleDateString('tr-TR');

                        return (
                          <>
                            {mergedCount > 0 && (
                              <td key={`merged-before-${satir.tcKimlik}`} colSpan={mergedCount} className={`border px-0.5 py-0.5 text-center font-semibold ${isDark ? 'border-gray-700' : 'border-gray-300'}`} style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                                {display}
                              </td>
                            )}
                            {remaining.map((gun) => {
                              const tarih = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
                              const hucre = satir.hucreler[tarih];
                              const manuelDegisti = manuelDegisiklikler[satir.tcKimlik]?.[tarih];
                              return (
                                <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'} relative`} style={{ backgroundColor: hucre?.renk }}>
                                  <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                  {manuelDegisti && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" title="Manuel değiştirildi"></div>}
                                </td>
                              );
                            })}
                          </>
                        );
                      })()}
                      <td className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}><input type="text" className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} /></td>
                      <td className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}><input type="text" className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`border-t p-2 ${isDark ? 'bg-[#2d2d2d]/50 border-gray-700' : 'bg-white/50 border-gray-200'}`}>
              <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1"><div className={`w-4 h-4 flex items-center justify-center border ${isDark ? 'border-gray-600' : 'border-gray-300'} bg-white text-black font-bold`}>X</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>ÇALIŞILAN GÜN - X</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-yellow-400 text-black font-bold border border-gray-300">Ü</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>ÜCRETLİ İZİN - Ü</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-red-500 text-white font-bold">I</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>ÜCRETSİZ İZİN - I</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-blue-500 text-white font-bold">YI</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>YILLIK İZİN - YI</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-yellow-400 text-black font-bold border border-gray-300">T</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>HAFTA TATİLİ - T</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-yellow-400 text-black font-bold border border-gray-300">RT</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>RESMİ TATİL - RT</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-green-500 text-white font-bold">R</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>RAPOR - R</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 flex items-center justify-center bg-red-500 text-white font-bold">M</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>TAM GÜN FAZLA MESAİ - M</span></div>
                <div className="flex items-center gap-1"><div className={`w-4 h-4 flex items-center justify-center border ${isDark ? 'border-gray-600' : 'border-gray-300'} bg-white text-black font-bold`}>/</div><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>YARIM GÜN FAZLA MESAİ - /</span></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
