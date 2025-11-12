import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client - RLS'i bypass eder
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Tarih formatla
function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Helper: Para formatla
function formatCurrency(amount: number | null): string {
  if (!amount) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
}

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Sözleşme oluşturma başladı');

    // Request body'yi al
    const body = await request.json();
    const { personelId, sablonTuru = 'sozlesme' } = body;

    console.log('📦 Request data:', { personelId, sablonTuru });

    if (!personelId) {
      return NextResponse.json({ error: 'Personel ID gerekli' }, { status: 400 });
    }

    // Personel bilgilerini getir - PersonelLevelizasyon ve PersonelInfo join
    const { data: personelLevel, error: levelError } = await supabaseAdmin
      .from('PersonelLevelizasyon')
      .select(`
        *,
        PersonelInfo(*),
        BolgeInfo(*)
      `)
      .eq('PersonelTcKimlik', personelId)
      .single();

    if (levelError || !personelLevel) {
      console.error('❌ Personel bulunamadı:', levelError);
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    const personelInfo = personelLevel.PersonelInfo || {};
    const bolgeInfo = personelLevel.BolgeInfo || {};

    console.log('✅ Personel bulundu:', personelInfo.P_AdSoyad);

    // Şablon dosyasını yükle
    const templatePath = path.join(process.cwd(), 'public', 'templates', `${sablonTuru}-sablon.docx`);
    
    let content: Buffer;
    try {
      content = await fs.readFile(templatePath);
      console.log('✅ Şablon dosyası okundu:', templatePath);
    } catch (error) {
      console.error('❌ Şablon dosyası okunamadı:', error);
      return NextResponse.json({ 
        error: 'Şablon dosyası bulunamadı. Lütfen public/templates/ klasörüne şablon yükleyin.' 
      }, { status: 404 });
    }

    // Docxtemplater ile şablonu işle
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}'
      }
    });

    // Bugünün tarihini al
    const bugun = new Date();
    const onBirGunSonra = new Date(bugun);
    onBirGunSonra.setDate(onBirGunSonra.getDate() + 11);

    // Değişkenleri hazırla
    const data = {
      // Personel Bilgileri (PersonelInfo tablosundan)
      personel_adi: personelInfo.P_AdSoyad || '',
      personel_soyadi: '',
      personel_tam_adi: personelInfo.P_AdSoyad || '',
      tc_no: personelLevel.PersonelTcKimlik || '',
      dogum_tarihi: formatDate(personelInfo.P_DogumTarihi),
      dogum_yeri: personelInfo.P_DogumYeri || '',
      baba_adi: personelInfo.P_BabaAdi || '',
      
      // Medeni Durum
      medeni_hali: personelInfo.P_MedeniHali ? 'Evli' : 'Bekar',
      es_gelir: personelInfo.P_EsGelir ? 'Var' : 'Yok',
      cocuk_sayisi: personelInfo.P_CocukSayisi || '',
      
      // İletişim
      telefon: personelInfo.P_TelNo || '',
      email: personelLevel.PersonelEmail || '',
      adres: personelInfo.P_Adres || '',
      
      // İş Bilgileri
      bolge: bolgeInfo.BolgeAdi || '',
      pozisyon: personelInfo.P_Gorevi || '',
      departman: personelInfo.P_Sube || '',
      
      // Eğitim
      mezuniyet: personelInfo.P_Mezuniyet || '',
      bolum: personelInfo.P_Bolum || '',
      
      // Askerlik
      askerlik_durum: personelInfo.P_AskerlikDurum || '',
      tecil_bitis: formatDate(personelInfo.P_TecilBitis),
      
      // Diğer Bilgiler
      ehliyet: personelInfo.P_Ehliyet || '',
      kan_grubu: personelInfo.P_KanGrubu || '',
      iban_no: personelInfo.P_IBANno || '',
      agi_yuzdesi: personelInfo.P_AgiYuzdesi || '',
      engel_orani: personelInfo.P_EngelOrani || '',
      
      // Belgeler
      dogalgaz_belge: personelInfo.P_DogalGazSayacBelge ? 'Var' : 'Yok',
      dogalgaz_belge_gecerlilik: formatDate(personelInfo.P_DogalGazSayacBelgeGecerlilik),
      ic_tesisat_belge: personelInfo.P_IcTesisatBelge ? 'Var' : 'Yok',
      ic_tesisat_belge_gecerlilik: formatDate(personelInfo.P_IcTesisatBelgeGecerlilik),
      
      // Maaş Bilgileri (şimdilik yok, eklenebilir)
      maas: '',
      maas_rakam: 0,
      
      // Tarihler
      ise_giris_tarihi: formatDate(personelInfo.P_KidemTarihi),
      kidem_tarihi: formatDate(personelInfo.P_KidemTarihi),
      sozlesme_tarihi: formatDate(personelInfo.P_AykaSozlesmeTarihi),
      sozlesme_baslangic: formatDate(personelInfo.P_AykaSozlesmeTarihi),
      sozlesme_bitis: '', // Belirsiz süreli için boş
      
      // Şirket Bilgileri
      sirket_adi: 'AY-KA DOĞALGAZ ENERJİ GIDA TURZ. SOFRA ve TAAHHÜT HİZ. SAN. TİC. LTD. ŞTİ.',
      sirket_adres: 'İstanbul, Türkiye',
      
      // Belgeler için dinamik tarihler
      hazirlama_tarihi: formatDate(bugun),
      bugun_tarihi: formatDate(bugun),
      izin_hazirlama_tarihi: formatDate(onBirGunSonra), // İzin için başlangıçtan 1 gün önce
      
      // İzin bilgileri (varsayılan - gerçek izin talebi olursa API'den gelir)
      izin_baslangic: '',
      izin_bitis: '',
      izin_gun: '',
      izin_turu: '',
      
      // Avans bilgileri (varsayılan)
      avans_miktar: '',
      avans_tarih: formatDate(bugun),
      avans_aciklama: '',
      
      // Ek alanlar
      aciklama: '',
      not: '',
      yil: bugun.getFullYear().toString(),
      ay: bugun.toLocaleDateString('tr-TR', { month: 'long' }),
      gun: bugun.getDate().toString()
    };

    console.log('📝 Değişkenler hazırlandı:', Object.keys(data).length, 'adet');

    // Değişkenleri şablona uygula
    try {
      doc.render(data);
      console.log('✅ Şablon değişkenleri uygulandı');
    } catch (error) {
      console.error('❌ Şablon render hatası:', error);
      return NextResponse.json({ 
        error: 'Şablon işlenirken hata oluştu', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }

    // Word dosyasını oluştur
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    console.log('✅ Word dosyası oluşturuldu, boyut:', buf.length, 'bytes');

    // Dosya adı oluştur - P_AdSoyad'ı kullan
    const adSoyad = personelInfo.P_AdSoyad?.replace(/\s+/g, '_') || personelId;
    const fileName = `Sozlesme_${adSoyad}_${bugun.getTime()}.docx`;

    // Response döndür
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buf.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Sözleşme oluşturma hatası:', error);
    return NextResponse.json({ 
      error: 'Sözleşme oluşturulurken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
