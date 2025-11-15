import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { formatDate, toTitleCase, formatTcNo } from '@/lib/helpers/formatters';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client - RLS'i bypass eder
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // Şablon dosyasını Supabase Storage'dan yükle
    console.log('📥 Şablon dosyası Storage\'dan indiriliyor:', sablonTuru);
    
    // Önce şablon metadata'sını al
    const { data: sablonMeta, error: sablonError } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .eq('sablonturu', sablonTuru)
      .single();

    if (sablonError || !sablonMeta) {
      console.error('❌ Şablon metadata bulunamadı:', sablonError);
      return NextResponse.json({ 
        error: `${sablonTuru} türünde şablon bulunamadı. Lütfen önce şablon yükleyin.` 
      }, { status: 404 });
    }

    console.log('✅ Şablon metadata bulundu:', sablonMeta.dosyayolu);

    // Storage'dan dosyayı indir
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('sablonlar')
      .download(sablonMeta.dosyayolu);

    if (downloadError || !fileData) {
      console.error('❌ Şablon dosyası indirilemedi:', downloadError);
      return NextResponse.json({ 
        error: 'Şablon dosyası indirilemedi',
        details: downloadError?.message 
      }, { status: 500 });
    }

    // Blob'u Buffer'a çevir
    const arrayBuffer = await fileData.arrayBuffer();
    const content = Buffer.from(arrayBuffer);
    
    console.log('✅ Şablon dosyası indirildi, boyut:', content.length, 'bytes');

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

    // Sözleşme başlangıç tarihine göre yıl sonu ve sonraki yılların tarihlerini hesapla
    const sozlesmeBaslangic = personelInfo.P_AykaSozlesmeTarihi ? new Date(personelInfo.P_AykaSozlesmeTarihi) : null;
    let sozlesmeBaslangicYilSon = '';
    let sozlesmeBaslangicYil2Bas = '';
    let sozlesmeBaslangicYil2Son = '';
    let sozlesmeBaslangicYil3Bas = '';
    let sozlesmeBaslangicYil3Son = '';

    if (sozlesmeBaslangic) {
      const baslangicYil = sozlesmeBaslangic.getFullYear();
      
      // Sözleşme başlangıç yılının son günü
      const yilSon = new Date(baslangicYil, 11, 31);
      sozlesmeBaslangicYilSon = formatDate(yilSon);
      
      // 2. yıl başlangıç ve bitiş
      const yil2Bas = new Date(baslangicYil + 1, 0, 1);
      const yil2Son = new Date(baslangicYil + 1, 11, 31);
      sozlesmeBaslangicYil2Bas = formatDate(yil2Bas);
      sozlesmeBaslangicYil2Son = formatDate(yil2Son);
      
      // 3. yıl başlangıç ve bitiş
      const yil3Bas = new Date(baslangicYil + 2, 0, 1);
      const yil3Son = new Date(baslangicYil + 2, 11, 31);
      sozlesmeBaslangicYil3Bas = formatDate(yil3Bas);
      sozlesmeBaslangicYil3Son = formatDate(yil3Son);
    }

    // Değişkenleri hazırla
    const data = {
      // Personel Bilgileri (PersonelInfo tablosundan)
      personel_adi: personelInfo.P_AdSoyad || '',
      personel_adi_duzgun: toTitleCase(personelInfo.P_AdSoyad),
      personel_adi_kucuk: (personelInfo.P_AdSoyad || '').toLowerCase(),
      personel_soyadi: '',
      personel_tam_adi: personelInfo.P_AdSoyad || '',
      tc_no: personelLevel.PersonelTcKimlik || '',
      tc_no_duzgun: formatTcNo(personelLevel.PersonelTcKimlik),
      dogum_tarihi: formatDate(personelInfo.P_DogumTarihi),
      dogum_yili: personelInfo.P_DogumTarihi ? new Date(personelInfo.P_DogumTarihi).getFullYear().toString() : '',
      dogum_yeri: personelInfo.P_DogumYeri || '',
      dogum_yeri_duzgun: toTitleCase(personelInfo.P_DogumYeri),
      baba_adi: personelInfo.P_BabaAdi || '',
      baba_adi_duzgun: toTitleCase(personelInfo.P_BabaAdi),
      
      // Medeni Durum
      medeni_hali: personelInfo.P_MedeniHali ? 'Evli' : 'Bekar',
      es_gelir: personelInfo.P_EsGelir ? 'Var' : 'Yok',
      cocuk_sayisi: personelInfo.P_CocukSayisi || '',
      
      // İletişim
      telefon: personelInfo.P_TelNo || '',
      email: personelLevel.PersonelEmail || '',
      adres: personelInfo.P_Adres || '',
      adres_duzgun: toTitleCase(personelInfo.P_Adres),
      
      // İş Bilgileri
      bolge: bolgeInfo.BolgeAdi || '',
      bolge_duzgun: toTitleCase(bolgeInfo.BolgeAdi),
      pozisyon: personelInfo.P_Gorevi || '',
      pozisyon_duzgun: toTitleCase(personelInfo.P_Gorevi),
      // departman ve pozisyon aynı şeyi gösteriyor (P_Gorevi)
      departman: personelInfo.P_Gorevi || '',
      departman_duzgun: toTitleCase(personelInfo.P_Gorevi),
      // Eğer P_Sube kullanmak isterseniz:
      sube: personelInfo.P_Sube || '',
      sube_duzgun: toTitleCase(personelInfo.P_Sube),
      
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
      
      // Sözleşme başlangıcına göre hesaplanan tarihler
      sozlesme_baslangic_yil_son: sozlesmeBaslangicYilSon,
      sozlesme_baslangic_yil2_bas: sozlesmeBaslangicYil2Bas,
      sozlesme_baslangic_yil2_son: sozlesmeBaslangicYil2Son,
      sozlesme_baslangic_yil3_bas: sozlesmeBaslangicYil3Bas,
      sozlesme_baslangic_yil3_son: sozlesmeBaslangicYil3Son,
      
      // Şirket Bilgileri
      sirket_adi: 'AY-KA DOĞALGAZ ENERJİ GIDA TURZ. SOFRA ve TAAHHÜT HİZ. SAN. TİC. LTD. ŞTİ.',
      sirket_adi_duzgun: 'Ay-Ka Doğalgaz Enerji Gıda Turz. Sofra Ve Taahhüt Hiz. San. Tic. Ltd. Şti.',
      sirket_adres: bolgeInfo.BolgeAdres || 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul',
      sirket_adres_duzgun: bolgeInfo.BolgeAdres || 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul',
      sgk_isyeri_sicil: bolgeInfo.BolgeSicilNo ? bolgeInfo.BolgeSicilNo.split('/')[0] : '',
      
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
    console.log('🔍 Şirket değişkenleri:', {
      sirket_adres: data.sirket_adres,
      sirket_adres_duzgun: data.sirket_adres_duzgun,
      bolgeAdres: bolgeInfo.BolgeAdres,
      type_sirket_adres: typeof data.sirket_adres,
      type_sirket_adres_duzgun: typeof data.sirket_adres_duzgun
    });

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
