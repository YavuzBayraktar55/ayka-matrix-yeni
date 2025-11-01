import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key ile client oluştur (RLS bypass için)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      PersonelTcKimlik, 
      IzinTuru, 
      BaslangicTarihi, 
      BitisTarihi, 
      GunSayisi, 
      Aciklama, 
      Durum,
      CreatedBy, // Kim oluşturdu
      CreatedByRole // Hangi rol oluşturdu
    } = body;

    console.log('🔐 API: İzin oluşturma isteği alındı:', {
      PersonelTcKimlik,
      CreatedBy,
      CreatedByRole
    });

    // Yetki kontrolü - sadece koordinatör, yönetici ve İK oluşturabilir
    if (!['koordinator', 'yonetici', 'insan_kaynaklari'].includes(CreatedByRole)) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // Eğer başkası adına oluşturuyorsa, bölge kontrolü yap (koordinatör için)
    if (CreatedByRole === 'koordinator' && Number(PersonelTcKimlik) !== Number(CreatedBy)) {
      // Koordinatörün bölgesini al
      const { data: creatorData } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select('BolgeID')
        .eq('PersonelTcKimlik', Number(CreatedBy))
        .maybeSingle();

      // Hedef personelin bölgesini al
      const { data: targetData } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select('BolgeID')
        .eq('PersonelTcKimlik', Number(PersonelTcKimlik))
        .maybeSingle();

      // Bölgeler eşleşmiyorsa izin verme
      if (creatorData?.BolgeID !== targetData?.BolgeID) {
        return NextResponse.json(
          { error: 'Sadece kendi bölgenizdeki personel için izin oluşturabilirsiniz' },
          { status: 403 }
        );
      }
    }

    // İzin talebini oluştur (TC'yi number'a çevir)
    const { data, error } = await supabaseAdmin
      .from('IzinTalepleri')
      .insert([{
        PersonelTcKimlik: Number(PersonelTcKimlik),
        IzinTuru,
        BaslangicTarihi,
        BitisTarihi,
        GunSayisi,
        Aciklama,
        Durum
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ API: İzin oluşturma hatası:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ API: İzin başarıyla oluşturuldu:', data.TalepID);

    return NextResponse.json({ data }, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ API: Beklenmeyen hata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
