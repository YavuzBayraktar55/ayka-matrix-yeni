import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Personelin yıllık izin haklarını getir
 * Query params: personelTcKimlik (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const personelTcKimlik = searchParams.get('personelTcKimlik');

    // Kullanıcının yetkisini kontrol et
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[YILLIK-IZIN-API] Auth hatası:', authError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', details: authError?.message },
        { status: 401 }
      );
    }

    // Belirli bir personel için filtrele
    if (!personelTcKimlik) {
      return NextResponse.json(
        { error: 'personelTcKimlik parametresi gereklidir' },
        { status: 400 }
      );
    }

    // PersonelTcKimlik bigint olduğu için number'a çevir
    const tcNumber = parseInt(personelTcKimlik, 10);
    if (isNaN(tcNumber)) {
      return NextResponse.json(
        { error: 'Geçersiz TC Kimlik numarası' },
        { status: 400 }
      );
    }

    // YillikIzinHaklari tablosundan direkt verileri çek
    let { data, error } = await supabase
      .from('YillikIzinHaklari')
      .select('*')
      .eq('PersonelTcKimlik', tcNumber)
      .order('Yil', { ascending: false });

    if (error) {
      console.error('[YILLIK-IZIN-API] YillikIzinHaklari getirme hatası:', error);
      return NextResponse.json(
        { error: 'Veriler alınırken bir hata oluştu', details: error.message },
        { status: 500 }
      );
    }

    // Eğer hiç kayıt yoksa, otomatik oluştur
    if (!data || data.length === 0) {
      try {
        // PostgreSQL fonksiyonunu çağır
        const { error: createError } = await supabase.rpc('olustur_yillik_izin_haklari', {
          p_personel_tc: parseInt(personelTcKimlik)
        });

        if (createError) {
          console.error('[YILLIK-IZIN-API] İzin hakları oluşturma hatası:', createError);
        } else {
          // Tekrar çek
          const { data: newData, error: newError } = await supabase
            .from('YillikIzinHaklari')
            .select('*')
            .eq('PersonelTcKimlik', tcNumber)
            .order('Yil', { ascending: false });

          if (!newError && newData) {
            data = newData;
          } else {
            console.error('[YILLIK-IZIN-API] Tekrar sorgu hatası:', newError);
          }
        }
      } catch (rpcError) {
        console.error('[YILLIK-IZIN-API] RPC çağrısı hatası:', rpcError);
      }
    }

    // Yıl durumunu ve kullanım yüzdesini ekle
    const enrichedData = (data || []).map(hak => {
      const hakKazanmaTarihi = new Date(hak.HakKazanmaTarihi);
      const bugun = new Date();
      
      return {
        ...hak,
        YilDurumu: hakKazanmaTarihi > bugun ? 'gelecek' : 'aktif',
        KullanimYuzdesi: hak.ToplamHakGun > 0 
          ? Math.round((hak.KullanilanGun / hak.ToplamHakGun) * 100 * 10) / 10
          : 0
      };
    });

    return NextResponse.json(enrichedData);

  } catch (error) {
    console.error('[YILLIK-IZIN-API] API hatası:', error);
    
    return NextResponse.json(
      { 
        error: 'Sunucu hatası', 
        details: error instanceof Error ? error.message : 'Bilinmeyen hata',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Belirli bir personel ve yıl için izin hakkını güncelle (admin için)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { HakID, KullanilanGun, Notlar } = body;

    if (!HakID) {
      return NextResponse.json(
        { error: 'HakID gereklidir' },
        { status: 400 }
      );
    }

    // Kullanıcının yetkisini kontrol et
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (KullanilanGun !== undefined) {
      updateData.KullanilanGun = KullanilanGun;
    }

    if (Notlar !== undefined) {
      updateData.Notlar = Notlar;
    }

    const { data, error } = await supabase
      .from('YillikIzinHaklari')
      .update(updateData)
      .eq('HakID', HakID)
      .select()
      .single();

    if (error) {
      console.error('Yıllık izin hakkı güncelleme hatası:', error);
      return NextResponse.json(
        { error: 'Güncelleme başarısız', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Yıllık izin hakları PATCH hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
