import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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

// Helper: Sayıyı yazıya çevir (basit versiyon)
function numberToWords(num: number): string {
  if (num === 0) return 'Sıfır';
  
  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const hundreds = ['', 'Yüz', 'İkiyüz', 'Üçyüz', 'Dörtyüz', 'Beşyüz', 'Altıyüz', 'Yediyüz', 'Sekizyüz', 'Dokuzyüz'];
  
  let result = '';
  
  // Binler
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'Bin';
    } else {
      result += ones[thousands] + 'bin';
    }
    num = num % 1000;
  }
  
  // Yüzler
  const hundred = Math.floor(num / 100);
  if (hundred > 0) {
    result += hundreds[hundred];
    num = num % 100;
  }
  
  // Onlar
  const ten = Math.floor(num / 10);
  if (ten > 0) {
    result += tens[ten];
    num = num % 10;
  }
  
  // Birler
  if (num > 0) {
    result += ones[num];
  }
  
  return result;
}

// Helper: String'i düzgün formata çevir
function toTitleCase(str: string | number | null): string {
  if (!str) return '';
  const strValue = String(str);
  
  return strValue
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      const firstChar = word.charAt(0).toLocaleUpperCase('tr-TR');
      const restOfWord = word.slice(1);
      return firstChar + restOfWord;
    })
    .join(' ');
}

// Helper: TC No formatla
function formatTcNo(tc: string | number | null): string {
  if (!tc) return '';
  const tcStr = String(tc);
  return tcStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1 $2 $3 $4');
}

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Avans belgesi oluşturma başladı');

    const body = await request.json();
    const { talepId } = body;

    console.log('📦 Request data:', { talepId });

    if (!talepId) {
      return NextResponse.json({ error: 'Avans talebi ID gerekli' }, { status: 400 });
    }

    // Avans talebi bilgilerini getir
    const { data: avansTalep, error: talepError } = await supabaseAdmin
      .from('AvansTalepleri')
      .select(`
        *,
        PersonelLevelizasyon!inner(
          *,
          PersonelInfo(*),
          BolgeInfo(*)
        )
      `)
      .eq('TalepID', talepId)
      .single();

    if (talepError || !avansTalep) {
      console.error('❌ Avans talebi bulunamadı:', talepError);
      return NextResponse.json({ error: 'Avans talebi bulunamadı' }, { status: 404 });
    }

    const personelLevel = avansTalep.PersonelLevelizasyon;
    const personelInfo = personelLevel.PersonelInfo || {};
    const bolgeInfo = personelLevel.BolgeInfo || {};

    console.log('✅ Avans talebi bulundu:', personelInfo.P_AdSoyad, '- Miktar:', avansTalep.AvansMiktari);

    // Şablon dosyasını yükle
    console.log('📥 Şablon dosyası Storage\'dan indiriliyor: avans');
    
    const { data: sablonMeta, error: sablonError } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .eq('sablonturu', 'avans')
      .single();

    if (sablonError || !sablonMeta) {
      console.error('❌ Şablon metadata bulunamadı:', sablonError);
      return NextResponse.json({ 
        error: 'Avans şablonu bulunamadı. Lütfen önce şablon yükleyin.' 
      }, { status: 404 });
    }

    console.log('✅ Şablon metadata bulundu:', sablonMeta.dosyayolu);

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

    const bugun = new Date();
    const avansMiktar = Number(avansTalep.AvansMiktari);

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
      // Personel Bilgileri
      personel_adi: personelInfo.P_AdSoyad || '',
      personel_adi_duzgun: toTitleCase(personelInfo.P_AdSoyad),
      personel_adi_kucuk: (personelInfo.P_AdSoyad || '').toLowerCase(),
      tc_no: personelLevel.PersonelTcKimlik || '',
      tc_no_duzgun: formatTcNo(personelLevel.PersonelTcKimlik),
      dogum_tarihi: formatDate(personelInfo.P_DogumTarihi),
      dogum_yeri: personelInfo.P_DogumYeri || '',
      dogum_yeri_duzgun: toTitleCase(personelInfo.P_DogumYeri),
      
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
      departman: personelInfo.P_Gorevi || '',
      departman_duzgun: toTitleCase(personelInfo.P_Gorevi),
      
      // Şirket Bilgileri
      sirket_adi: 'AY-KA DOĞALGAZ ENERJİ GIDA TURZ. SOFRA ve TAAHHÜT HİZ. SAN. TİC. LTD. ŞTİ.',
      sirket_adi_duzgun: 'Ay-Ka Doğalgaz Enerji Gıda Turz. Sofra Ve Taahhüt Hiz. San. Tic. Ltd. Şti.',
      sirket_adres: bolgeInfo.BolgeAdres || 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul',
      sirket_adres_duzgun: bolgeInfo.BolgeAdres || 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul',
      sgk_isyeri_sicil: bolgeInfo.BolgeSicilNo ? bolgeInfo.BolgeSicilNo.split('/')[0] : '',
      
      // Avans Bilgileri
      avans_miktar: formatCurrency(avansMiktar),
      avans_miktar_rakam: avansMiktar.toFixed(2),
      avans_miktar_yazi: numberToWords(Math.floor(avansMiktar)) + ' Türk Lirası',
      avans_gun: avansTalep.AvansGunSayisi.toString(),
      avans_aciklama: avansTalep.Aciklama || '',
      avans_durum: avansTalep.Durum || '',
      odeme_tarihi: formatDate(avansTalep.OdemeTarihi),
      
      // Onay Bilgileri
      koordinator_notu: avansTalep.KoordinatorNotu || '',
      yonetim_notu: avansTalep.YonetimNotu || '',
      koordinator_onay_tarihi: formatDate(avansTalep.KoordinatorOnayTarihi),
      yonetim_onay_tarihi: formatDate(avansTalep.YonetimOnayTarihi),
      
      // Tarihler
      ise_giris_tarihi: formatDate(personelInfo.P_KidemTarihi),
      kidem_tarihi: formatDate(personelInfo.P_KidemTarihi),
      sozlesme_tarihi: formatDate(personelInfo.P_AykaSozlesmeTarihi),
      sozlesme_baslangic: formatDate(personelInfo.P_AykaSozlesmeTarihi),
      sozlesme_bitis: '',
      hazirlama_tarihi: formatDate(bugun),
      bugun_tarihi: formatDate(bugun),
      talep_tarihi: formatDate(avansTalep.created_at),
      yil: bugun.getFullYear().toString(),
      ay: bugun.toLocaleDateString('tr-TR', { month: 'long' }),
      gun: bugun.getDate().toString(),
      
      // Sözleşme başlangıcına göre hesaplanan tarihler
      sozlesme_baslangic_yil_son: sozlesmeBaslangicYilSon,
      sozlesme_baslangic_yil2_bas: sozlesmeBaslangicYil2Bas,
      sozlesme_baslangic_yil2_son: sozlesmeBaslangicYil2Son,
      sozlesme_baslangic_yil3_bas: sozlesmeBaslangicYil3Bas,
      sozlesme_baslangic_yil3_son: sozlesmeBaslangicYil3Son
    };

    console.log('📝 Değişkenler hazırlandı:', Object.keys(data).length, 'adet');
    console.log('💰 Avans değişkenleri:', {
      avans_miktar: data.avans_miktar,
      avans_gun: data.avans_gun,
      avans_miktar_yazi: data.avans_miktar_yazi
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

    // Dosya adı oluştur
    const adSoyad = personelInfo.P_AdSoyad?.replace(/\s+/g, '_') || personelLevel.PersonelTcKimlik;
    const fileName = `Avans_${adSoyad}_${bugun.getTime()}.docx`;

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
    console.error('❌ Avans belgesi oluşturma hatası:', error);
    return NextResponse.json({ 
      error: 'Avans belgesi oluşturulurken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
