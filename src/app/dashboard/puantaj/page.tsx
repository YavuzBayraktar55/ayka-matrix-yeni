'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  const ayDegistir = (yon: 'onceki' | 'sonraki') => {
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
  };

  const excelAktar = () => {
    if (puantajVerisi.length === 0) {
      alert('Aktarilacak veri yok!');
      return;
    }
    const ayAdi = new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();

    const basliklar = [
      'SIRA', 'PERS. TC. NO', 'ADI SOYADI',
      'İŞE GİRİŞ TARİHİ', 'İŞTEN AYRILIŞ TARİHİ', 'GÜNLÜK BRÜT ÜCRET',
      `${ayAdi} AYI MESAİ SAATİ`, 'MESAI SAATİ', 'FAZLA MESAİ SÜRESİ',
      'YOL YARDIMI', 'NET ŞOFÖRLÜK PARASI EKLENECEK', 'EKİP ŞEFİ'
    ];

    gunler.forEach((gun) => {
      basliklar.push(`${gun.getDate()} Gun`);
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

    const ws = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar]);

    // set reasonable column widths
    const colWidths = basliklar.map((h, idx) => {
      if (idx === 0) return { wch: 6 }; // SIRA
      if (idx === 1) return { wch: 15 }; // TC
      if (idx === 2) return { wch: 25 }; // ADI SOYADI
      if (idx === 3 || idx === 4) return { wch: 14 }; // dates
      if (idx === 5) return { wch: 14 }; // GUNLUK BRUT
      if (idx === 6) return { wch: 18 }; // month mesai
      if (idx === 7) return { wch: 12 }; // MESAI SAATI
      if (idx === 8) return { wch: 16 }; // FAZLA
      if (idx === 9) return { wch: 12 }; // YOL YARDIMI
      if (idx === 10) return { wch: 14 }; // NET SOFORLUK
      if (idx === 11) return { wch: 12 }; // EKIP SEFI
      return { wch: 15 };
    });
    ws['!cols'] = colWidths;

    // Apply number formatting for currency columns (GÜNLÜK BRÜT ÜCRET idx=5, YOL YARDIMI idx=9)
    const moneyCols = [5, 9];
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref'] as string);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) { // start after header
        moneyCols.forEach((c) => {
          const cellAddress = { c, r: R };
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          const cell = ws[cellRef];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            const num = Number(String(cell.v).replace(',', '.'));
            if (!Number.isNaN(num)) {
              cell.v = num;
              cell.t = 'n';
              cell.z = '#,##0.00';
            }
          }
        });
      }
    }

    // Add autofilter for header row
    const lastCol = basliklar.length - 1;
    const lastColLetter = XLSX.utils.encode_col(lastCol);
    ws['!autofilter'] = { ref: `A1:${lastColLetter}1` };

    // Attempt to style header row (best-effort)
    try {
      for (let C = 0; C <= lastCol; ++C) {
        const hdrRef = XLSX.utils.encode_cell({ c: C, r: 0 });
        const cell = ws[hdrRef];
        if (!cell) continue;
        // Apply header styling
        (cell as { s?: unknown }).s = { fill: { fgColor: { rgb: 'FFD1D5DB' } }, font: { bold: true } };
      }
    } catch (error) {
      console.error('Header styling error:', error);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Puantaj');

    const [yil, ay] = secilenAy.split('-');
    const ayIsimleri = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
    const dosyaAdi = `${bolge?.BolgeAdi || 'Bolge'}_Puantaj_${ayIsimleri[parseInt(ay) - 1]}_${yil}.xlsx`;

    XLSX.writeFile(wb, dosyaAdi);
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
  };

  const updateInfoField = (satirIndex: number, field: keyof Pick<PuantajSatir, 'netSoforluk' | 'gunlukBrut' | 'yolYardimi'>, value: string) => {
    setPuantajVerisi(prev => {
      const yeni = [...prev];
      if (!yeni[satirIndex]) return prev;
      yeni[satirIndex] = { ...yeni[satirIndex], [field]: value };
      return yeni;
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

                <button onClick={excelAktar} className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-lg text-sm">
                  <Download className="w-4 h-4" />
                  Excel Aktar
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
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[35px] sticky left-0 z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>SIRA</th>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[85px] sticky left-[35px] z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>TC NO</th>
                    <th className={`border px-0.5 py-0.5 font-semibold text-center w-[120px] sticky left-[120px] z-20 ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>ADI SOYADI</th>
            <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>İŞE GİRİŞ TARİHİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>İŞTEN AYRILIŞ TARİHİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>GÜNLÜK BRÜT ÜCRET</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[90px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{/* Ay adı dinamik */} {new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase()} AYI MESAİ SAATİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[65px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>MESAI SAATİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[95px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>FAZLA MESAİ SÜRESİ</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[75px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>YOL YARDIMI</th>
              <th className={`border px-0.5 py-0.5 font-semibold text-center w-[145px] ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>NET ŞOFÖRLÜK PARASI EKLENECEK</th>
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
                          'NET ŞOFÖRLÜK PARASI EKLENECEK',
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
                            return (
                              <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`} style={{ backgroundColor: hucre?.renk }}>
                                <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
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
                            return (
                              <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`} style={{ backgroundColor: hucre?.renk }}>
                                <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
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
                              return (
                                <td key={tarih} className={`border px-0.5 py-0.5 ${isDark ? 'border-gray-700' : 'border-gray-300'}`} style={{ backgroundColor: hucre?.renk }}>
                                  <input type="text" value={hucre?.deger || ''} onChange={(e) => hucreGuncelle(satirIndex, tarih, e.target.value)} className={`w-full px-0.5 py-0.5 text-[10px] text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded ${isDark ? 'text-white' : 'text-gray-900'}`} />
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
