'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { Calendar, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Singleton Supabase client
const supabase = createClient();

// Varsayılan 6 şablon
const VARSAYILAN_SABLONLAR = [
  { id: 1, isim: 'Tam Çalışma Günü', renk: '#10b981', baslangic: '08:00', bitis: '18:00', mola: 90 },
  { id: 2, isim: 'Yarım Çalışma Günü', renk: '#3b82f6', baslangic: '08:00', bitis: '14:00', mola: 0 },
  { id: 3, isim: 'Okuma Tam Gün', renk: '#8b5cf6', baslangic: '08:00', bitis: '18:00', mola: 90 },
  { id: 4, isim: 'Ayarlanabilir', renk: '#f59e0b', baslangic: null, bitis: null, mola: 0 },
  { id: 5, isim: 'Resmi Tatil', renk: '#ef4444', baslangic: null, bitis: null, mola: 0 },
  { id: 6, isim: 'Hafta Tatili', renk: '#6366f1', baslangic: null, bitis: null, mola: 0 }
];

interface Sablon {
  id: number;
  isim: string;
  renk: string;
  baslangic: string | null;
  bitis: string | null;
  mola: number;
}

interface GunVerisi {
  isim: string;
  renk: string;
  baslangic: string | null;
  bitis: string | null;
  mola: number;
}

interface AylikPuantaj {
  PuantajID: number;
  BolgeID: number;
  YilAy: string;
  TakvimJSON: string; // { "2024-10-01": { isim: "Normal Mesai", renk: "#10b981", baslangic: "08:00", bitis: "17:00", mola: 60 }, ... }
  SablonlarJSON: string; // 6 şablonun o anki hali (şablon düzenleme için)
  Durum: 'hazirlanıyor' | 'kaydedildi';
}

export default function PuantajPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [bolgeAdi, setBolgeAdi] = useState('');
  const [secilenAy, setSecilenAy] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // 6 Şablon - Koordinatör düzenleyebilir
  const [sablonlar, setSablonlar] = useState<Sablon[]>(VARSAYILAN_SABLONLAR);
  const [sablonModalAcik, setSablonModalAcik] = useState(false);
  
  // Aylık puantaj
  const [aylikPuantaj, setAylikPuantaj] = useState<AylikPuantaj | null>(null);
  const [takvimVerisi, setTakvimVerisi] = useState<Record<string, GunVerisi>>({});
  
  // Seçili gün
  const [secilenGun, setSecilenGun] = useState<string | null>(null);
  const [secimModalAcik, setSecimModalAcik] = useState(false);

  const takvimGunleri = () => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    const ilkGun = new Date(yil, ay - 1, 1);
    const sonGun = new Date(yil, ay, 0);
    let baslangic = ilkGun.getDay() - 1;
    if (baslangic === -1) baslangic = 6;
    const gunler: Date[] = [];
    for (let i = baslangic - 1; i >= 0; i--) {
      gunler.push(new Date(yil, ay - 1, -i));
    }
    for (let i = 1; i <= sonGun.getDate(); i++) {
      gunler.push(new Date(yil, ay - 1, i));
    }
    return gunler;
  };

  useEffect(() => {
    if (user?.BolgeID) yukleVeriler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, secilenAy]);

  const yukleVeriler = async () => {
    setLoading(true);
    try {
      const { data: bolge } = await supabase
        .from('BolgeInfo')
        .select('BolgeAdi')
        .eq('BolgeID', user?.BolgeID)
        .single();
      if (bolge?.BolgeAdi) setBolgeAdi(bolge.BolgeAdi);

      // Bölgenin son kullandığı şablonları yükle (en son kaydedilen aydan)
      const { data: sonPuantaj } = await supabase
        .from('AylikPuantaj')
        .select('SablonlarJSON')
        .eq('BolgeID', user?.BolgeID)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sonPuantaj?.SablonlarJSON) {
        try {
          const yuklenenSablonlar = JSON.parse(sonPuantaj.SablonlarJSON);
          setSablonlar(yuklenenSablonlar);
        } catch {
          setSablonlar(VARSAYILAN_SABLONLAR);
        }
      }

      await yukleAylikPuantaj();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const yukleAylikPuantaj = async () => {
    const { data } = await supabase
      .from('AylikPuantaj')
      .select('*')
      .eq('BolgeID', user?.BolgeID)
      .eq('YilAy', secilenAy)
      .single();

    if (data) {
      setAylikPuantaj(data);
      try {
        const takvim = JSON.parse(data.TakvimJSON || '{}');
        setTakvimVerisi(takvim);
      } catch {
        setTakvimVerisi({});
      }
      try {
        const sablonlarSnapshot = JSON.parse(data.SablonlarJSON || '[]');
        if (sablonlarSnapshot.length === 6) {
          setSablonlar(sablonlarSnapshot);
        }
      } catch {}
    } else {
      setAylikPuantaj(null);
      setTakvimVerisi({});
    }
  };

  const ayBaslat = async () => {
    if (!user) return;
    try {
      // Boş takvim oluştur - Her gün için şablonun değerlerini snapshot olarak kaydet
      const gunler = takvimGunleri().filter(g => {
        const [, ay] = secilenAy.split('-').map(Number);
        return g.getMonth() === ay - 1;
      });

      const bosTakvim: Record<string, GunVerisi> = {};
      gunler.forEach(gun => {
        const tarih = gun.toISOString().split('T')[0];
        const gunNo = gun.getDay(); // 0=Pazar, 6=Cumartesi
        const gunSayisi = gun.getDate(); // Ayın kaçıncı günü
        
        let varsayilanSablon: Sablon;
        
        if (gunSayisi <= 8) {
          // İlk 8 gün (Pazar dahil) => Okuma Tam Gün (id=3)
          varsayilanSablon = sablonlar.find(s => s.id === 3) || sablonlar[2];
        } else if (gunNo === 6) {
          // Cumartesi (okuma sonrası) => Yarım Çalışma Günü (id=2)
          varsayilanSablon = sablonlar.find(s => s.id === 2) || sablonlar[1];
        } else if (gunNo === 0) {
          // Pazar (okuma sonrası) => Hafta Tatili (id=6)
          varsayilanSablon = sablonlar.find(s => s.id === 6) || sablonlar[5];
        } else {
          // Diğer hafta içi günler => Tam Çalışma Günü (id=1)
          varsayilanSablon = sablonlar.find(s => s.id === 1) || sablonlar[0];
        }
        
        bosTakvim[tarih] = {
          isim: varsayilanSablon.isim,
          renk: varsayilanSablon.renk,
          baslangic: varsayilanSablon.baslangic,
          bitis: varsayilanSablon.bitis,
          mola: varsayilanSablon.mola
        };
      });

      const { data } = await supabase
        .from('AylikPuantaj')
        .insert({
          BolgeID: user.BolgeID,
          YilAy: secilenAy,
          TakvimJSON: JSON.stringify(bosTakvim),
          SablonlarJSON: JSON.stringify(sablonlar),
          Durum: 'hazirlanıyor',
          KaydedenKisi: user.PersonelTcKimlik
        })
        .select()
        .single();

      if (data) {
        await yukleAylikPuantaj();
        alert('Ay başlatıldı! Şimdi günleri boyayabilirsiniz.');
      }
    } catch (error) {
      console.error(error);
      alert('Hata oluştu!');
    }
  };

  const gunBoya = async (tarih: string, sablon: Sablon) => {
    if (!aylikPuantaj) return;
    
    // Şablonun o anki değerlerini snapshot olarak kaydet
    const gunVerisi: GunVerisi = {
      isim: sablon.isim,
      renk: sablon.renk,
      baslangic: sablon.baslangic,
      bitis: sablon.bitis,
      mola: sablon.mola
    };
    
    const yeniTakvim = { ...takvimVerisi, [tarih]: gunVerisi };
    setTakvimVerisi(yeniTakvim);
    
    // Database'e kaydet
    supabase
      .from('AylikPuantaj')
      .update({ TakvimJSON: JSON.stringify(yeniTakvim) })
      .eq('PuantajID', aylikPuantaj.PuantajID)
      .then(() => {
        setSecimModalAcik(false);
        setSecilenGun(null);
      });
  };

  const ayiKaydet = async () => {
    if (!aylikPuantaj) return;
    
    await supabase
      .from('AylikPuantaj')
      .update({ 
        Durum: 'kaydedildi',
        KayitTarihi: new Date().toISOString(),
        SablonlarJSON: JSON.stringify(sablonlar),
        TakvimJSON: JSON.stringify(takvimVerisi)
      })
      .eq('PuantajID', aylikPuantaj.PuantajID);
    
    await yukleAylikPuantaj();
    alert('Ay kaydedildi! Artık değiştirilemez.');
  };

  const sablonlariKaydet = () => {
    // Sadece UI'da güncelle, database'e ay kaydedildiğinde gidecek
    setSablonModalAcik(false);
    alert('Şablonlar güncellendi! "Ayı Kaydet" butonuna basarak kaydedin.');
  };

  const ayDegistir = (yon: 'prev' | 'next') => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    let yeniYil = yil, yeniAy = ay;
    if (yon === 'prev') {
      yeniAy--;
      if (yeniAy === 0) { yeniAy = 12; yeniYil--; }
    } else {
      yeniAy++;
      if (yeniAy === 13) { yeniAy = 1; yeniYil++; }
    }
    setSecilenAy(`${yeniYil}-${String(yeniAy).padStart(2, '0')}`);
  };

  const getGunVerisi = (tarih: string): GunVerisi | null => {
    return takvimVerisi[tarih] || null;
  };

  return (
    <ProtectedRoute allowedRoles={['koordinator', 'insan_kaynaklari', 'yonetici']}>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Bölge Bilgisi */}
          <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{bolgeAdi}</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bölge Çalışma Takvimi</p>
            </div>
          </div>

      {/* Şablonlar - Önizleme */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Aktif Şablonlar</h3>
          <button 
            onClick={() => setSablonModalAcik(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} shadow-sm`}
          >
            Şablonları Düzenle
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {sablonlar.map(sablon => (
            <div key={sablon.id} className={`${isDark ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: sablon.renk }}></div>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{sablon.isim}</span>
              </div>
              {sablon.baslangic && (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{sablon.baslangic} - {sablon.bitis}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ay Seçici */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => ayDegistir('prev')} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
          </button>
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
            </h2>
            {aylikPuantaj && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                aylikPuantaj.Durum === 'kaydedildi' 
                  ? isDark ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-200'
                  : isDark ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              }`}>
                {aylikPuantaj.Durum === 'kaydedildi' ? '✓ Kaydedildi' : '⚠ Hazırlanıyor'}
              </span>
            )}
          </div>
          <button onClick={() => ayDegistir('next')} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
          </button>
        </div>

        {/* İstatistikler - Şablon adlarına göre */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {sablonlar.map(sablon => {
            // Kaydedilen günlerdeki şablon adlarını say
            const kullanim = Object.values(takvimVerisi).filter(v => v.isim === sablon.isim).length;
            return (
              <div key={sablon.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sablon.renk }}></div>
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{sablon.isim}</span>
                </div>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{kullanim}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Takvim */}
      {!aylikPuantaj ? (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-12 text-center border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
          <Calendar className={`w-16 h-16 ${isDark ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
          <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Bu Ay Henüz Başlatılmamış</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>Aylık puantaj tutmaya başlamak için ayı başlatın.</p>
          <button onClick={ayBaslat} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all">
            Ayı Başlat
          </button>
        </div>
      ) : (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Çalışma Takvimi - Günleri Boyayın
              {aylikPuantaj.Durum === 'kaydedildi' && (
                <span className={`text-sm ml-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>(Kaydedildi - Değiştirilebilir)</span>
              )}
            </h3>
            <button onClick={ayiKaydet} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2 transition-all">
              <Save className="w-4 h-4" />
              {aylikPuantaj.Durum === 'kaydedildi' ? 'Yeniden Kaydet' : 'Ayı Kaydet (JSON)'}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(gun => (
              <div key={gun} className={`text-center font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} py-2 text-sm`}>{gun}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {takvimGunleri().map((gun, idx) => {
              const [, ay] = secilenAy.split('-').map(Number);
              const buAyinGunu = gun.getMonth() === ay - 1;
              const tarih = gun.toISOString().split('T')[0];
              const gunVerisi = getGunVerisi(tarih);
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (buAyinGunu) {
                      setSecilenGun(tarih);
                      setSecimModalAcik(true);
                    }
                  }}
                  className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                    buAyinGunu 
                      ? `cursor-pointer hover:scale-105 hover:shadow-md ${isDark ? 'bg-gray-700' : 'bg-white'}` 
                      : `opacity-30 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`
                  }`}
                  style={{
                    backgroundColor: gunVerisi && buAyinGunu ? gunVerisi.renk + (isDark ? '30' : '15') : undefined,
                    borderColor: gunVerisi && buAyinGunu ? gunVerisi.renk : (isDark ? '#374151' : '#e5e7eb'),
                    borderWidth: gunVerisi && buAyinGunu ? '2px' : '1px'
                  }}
                >
                  <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>{gun.getDate()}</div>
                  {gunVerisi && buAyinGunu && (
                    <div className="text-xs space-y-1">
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{gunVerisi.isim}</div>
                      {gunVerisi.baslangic && (
                        <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>{gunVerisi.baslangic}-{gunVerisi.bitis}</div>
                      )}
                      {gunVerisi.mola > 0 && (
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>{gunVerisi.mola}dk</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gün Seçim Modal */}
      {secimModalAcik && secilenGun && (
        <GunSecimModal
          isOpen={secimModalAcik}
          onClose={() => { setSecimModalAcik(false); setSecilenGun(null); }}
          secilenGun={secilenGun}
          sablonlar={sablonlar}
          gunBoya={gunBoya}
          isDark={isDark}
        />
      )}

      {/* Şablon Düzenleme Modal */}
      {sablonModalAcik && (
        <SablonDuzenleModal
          isOpen={sablonModalAcik}
          onClose={() => setSablonModalAcik(false)}
          sablonlar={sablonlar}
          setSablonlar={setSablonlar}
          sablonlariKaydet={sablonlariKaydet}
          isDark={isDark}
        />
      )}
        </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GunSecimModal({ isOpen, onClose, secilenGun, sablonlar, gunBoya, isDark }: any) {
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
          <div className={`${isDark ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-2xl max-w-lg w-full border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-2xl`}>
            <div className={`${isDark ? 'bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-gray-700' : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'} border-b px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
              </div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'} absolute left-1/2 transform -translate-x-1/2`}>
                {new Date(secilenGun).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
              </h3>
              <button 
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4 text-sm`}>Bu günü hangi şablonla boyamak istersiniz?</p>
              <div className="space-y-2">
                {sablonlar.map((sablon: Sablon) => (
                  <button
                    key={sablon.id}
                    onClick={() => gunBoya(secilenGun, sablon)}
                    className="w-full p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform shadow-sm"
                    style={{
                      backgroundColor: sablon.renk + (isDark ? '20' : '10'),
                      borderColor: sablon.renk
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: sablon.renk }}></div>
                        <div className="text-left">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{sablon.isim}</div>
                          {sablon.baslangic && (
                            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {sablon.baslangic} - {sablon.bitis} ({sablon.mola}dk mola)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
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
function SablonDuzenleModal({ isOpen, onClose, sablonlar, setSablonlar, sablonlariKaydet, isDark }: any) {
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
          <div className={`${isDark ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-2xl max-w-4xl w-full border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-2xl`}>
            <div className={`${isDark ? 'bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-gray-700' : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'} border-b px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
              </div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'} absolute left-1/2 transform -translate-x-1/2`}>6 Şablon Düzenle</h3>
              <button 
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {sablonlar.map((sablon: Sablon, idx: number) => (
                <div key={sablon.id} className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                  <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Şablon {sablon.id}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 font-medium`}>Şablon Adı</label>
                      <input
                        type="text"
                        value={sablon.isim}
                        onChange={(e) => {
                          const yeni = [...sablonlar];
                          yeni[idx].isim = e.target.value;
                          setSablonlar(yeni);
                        }}
                        className={`w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Örn: Toplantı Günü"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 font-medium`}>Renk</label>
                      <input
                        type="color"
                        value={sablon.renk}
                        onChange={(e) => {
                          const yeni = [...sablonlar];
                          yeni[idx].renk = e.target.value;
                          setSablonlar(yeni);
                        }}
                        className={`w-full h-10 rounded-lg cursor-pointer border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 font-medium`}>Başlangıç (opsiyonel)</label>
                      <input
                        type="time"
                        value={sablon.baslangic || ''}
                        onChange={(e) => {
                          const yeni = [...sablonlar];
                          yeni[idx].baslangic = e.target.value || null;
                          setSablonlar(yeni);
                        }}
                        className={`w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 font-medium`}>Bitiş (opsiyonel)</label>
                      <input
                        type="time"
                        value={sablon.bitis || ''}
                        onChange={(e) => {
                          const yeni = [...sablonlar];
                          yeni[idx].bitis = e.target.value || null;
                          setSablonlar(yeni);
                        }}
                        className={`w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 font-medium`}>Mola (dk)</label>
                      <input
                        type="number"
                        value={sablon.mola}
                        onChange={(e) => {
                          const yeni = [...sablonlar];
                          yeni[idx].mola = Number(e.target.value);
                          setSablonlar(yeni);
                        }}
                        className={`w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button onClick={onClose} className={`px-6 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'} border rounded-lg transition-colors`}>
                  İptal
                </button>
                <button onClick={sablonlariKaydet} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all">
                  Şablonları Güncelle
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
