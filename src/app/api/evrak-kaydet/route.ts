import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Admin client for JWT verification
const getAdminClient = () => {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/evrak-kaydet - Evrak kaydetme başladı');
    
    // Authorization header'dan token al
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim - Token bulunamadı' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Admin client ile token'ı doğrula
    const adminSupabase = getAdminClient();
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim - Geçersiz token' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.email);

    const body = await request.json();
    const { 
      personelTcKimlik, 
      sablonAdi, 
      sablonTuru,
      pdfBase64,
      evrakTarihi,
      aciklama 
    } = body;

    console.log('📦 Body parametreleri:', {
      personelTcKimlik,
      sablonAdi,
      sablonTuru,
      evrakTarihi,
      aciklama,
      pdfBase64Length: pdfBase64?.length || 0
    });

    if (!personelTcKimlik || !sablonAdi || !pdfBase64) {
      console.error('❌ Eksik parametreler:', {
        personelTcKimlik: !!personelTcKimlik,
        sablonAdi: !!sablonAdi,
        pdfBase64: !!pdfBase64
      });
      return NextResponse.json(
        { 
          error: 'Eksik parametreler',
          missing: {
            personelTcKimlik: !personelTcKimlik,
            sablonAdi: !sablonAdi,
            pdfBase64: !pdfBase64
          }
        },
        { status: 400 }
      );
    }

    // Admin client ile tüm işlemleri yap (RLS bypass)
    console.log('📝 Evrak kaydı oluşturuluyor...');
    
    // 1. Evrak kaydını oluştur
    const { data: evrakData, error: evrakError } = await adminSupabase
      .from('EvrakKayitlari')
      .insert({
        PersonelTcKimlik: personelTcKimlik,
        SablonAdi: sablonAdi,
        SablonTuru: sablonTuru,
        EvrakTarihi: evrakTarihi || new Date().toISOString(),
        Aciklama: aciklama,
        OlusturanEmail: user.email,
        OlusturmaTarihi: new Date().toISOString()
      })
      .select()
      .single();

    if (evrakError) {
      console.error('❌ Evrak kaydı hatası:', evrakError);
      return NextResponse.json(
        { error: 'Evrak kaydı oluşturulamadı', details: evrakError.message },
        { status: 500 }
      );
    }

    console.log('✅ Evrak kaydı oluşturuldu:', evrakData.EvrakID);

    // 2. PDF'i storage'a yükle
    // Türkçe karakterleri İngilizce'ye çevir ve özel karakterleri temizle
    const sanitizeName = (name: string): string => {
      const turkishMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
      };
      
      let result = name;
      Object.keys(turkishMap).forEach(key => {
        result = result.replace(new RegExp(key, 'g'), turkishMap[key]);
      });
      
      // Boşlukları _ ile değiştir, özel karakterleri kaldır
      result = result
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
        .replace(/_{2,}/g, '_');
      
      return result;
    };

    const safeSablonAdi = sanitizeName(sablonAdi);
    const fileName = `${personelTcKimlik}/${evrakData.EvrakID}_${safeSablonAdi}_${Date.now()}.pdf`;
    
    console.log('📤 PDF yükleniyor:', fileName);
    
    // Base64'ü buffer'a çevir
    const base64Data = pdfBase64.split(',')[1] || pdfBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await adminSupabase.storage
      .from('evraklar')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ PDF yükleme hatası:', uploadError);
      // Evrak kaydını sil
      await adminSupabase
        .from('EvrakKayitlari')
        .delete()
        .eq('EvrakID', evrakData.EvrakID);
        
      return NextResponse.json(
        { error: 'PDF yüklenemedi', details: uploadError.message },
        { status: 500 }
      );
    }

    console.log('✅ PDF yüklendi');

    // 3. PDF yolunu güncelle
    const { error: updateError } = await adminSupabase
      .from('EvrakKayitlari')
      .update({ PDFYolu: fileName })
      .eq('EvrakID', evrakData.EvrakID);

    if (updateError) {
      console.error('⚠️ PDF yolu güncelleme hatası:', updateError);
    }

    return NextResponse.json({
      success: true,
      evrakId: evrakData.EvrakID,
      message: 'Evrak başarıyla kaydedildi'
    });

  } catch (error) {
    console.error('Evrak kaydetme hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
