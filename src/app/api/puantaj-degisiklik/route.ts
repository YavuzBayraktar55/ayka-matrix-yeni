import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Belirli bir bölge ve ay için tüm manuel değişiklikleri getir
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const bolgeId = searchParams.get('bolgeId');
    const yilAy = searchParams.get('yilAy');

    if (!bolgeId || !yilAy) {
      return NextResponse.json(
        { error: 'BolgeID ve YilAy parametreleri gerekli' },
        { status: 400 }
      );
    }

    // Manuel değişiklikleri getir
    const { data, error } = await supabase
      .from('PuantajManuelDegisiklik')
      .select('*')
      .eq('BolgeID', bolgeId)
      .eq('YilAy', yilAy)
      .order('Tarih', { ascending: true });

    if (error) {
      console.error('Manuel değişiklik getirme hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Değişiklikleri personel bazında grupla
    const degisiklikMap: Record<number, Record<string, {
      HucreDeger?: string;
      NetSoforluk?: string;
      GunlukBrut?: string;
      YolYardimi?: string;
    }>> = {};

    data?.forEach((deg) => {
      const tc = deg.PersonelTcKimlik;
      const tarih = deg.Tarih;
      
      if (!degisiklikMap[tc]) {
        degisiklikMap[tc] = {};
      }
      
      degisiklikMap[tc][tarih] = {
        HucreDeger: deg.HucreDeger,
        NetSoforluk: deg.NetSoforluk,
        GunlukBrut: deg.GunlukBrut,
        YolYardimi: deg.YolYardimi
      };
    });

    return NextResponse.json({ degisiklikler: degisiklikMap });
  } catch (error) {
    console.error('GET puantaj-degisiklik error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// POST - Yeni manuel değişiklik kaydet veya güncelle
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    console.log('POST Body:', body); // Debug için

    const {
      BolgeID,
      PersonelTcKimlik,
      YilAy,
      Tarih,
      HucreDeger,
      NetSoforluk,
      GunlukBrut,
      YolYardimi,
      DegistirenKisi
    } = body;

    // Validasyon
    if (!BolgeID || !PersonelTcKimlik || !YilAy || !Tarih) {
      console.error('Validasyon hatası:', { BolgeID, PersonelTcKimlik, YilAy, Tarih });
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik', details: { BolgeID, PersonelTcKimlik, YilAy, Tarih } },
        { status: 400 }
      );
    }

    // Tip kontrolü ve dönüştürme
    const bolgeIdNum = Number(BolgeID);
    const personelTcNum = Number(PersonelTcKimlik);
    
    console.log('Type checks:', {
      BolgeID, 
      bolgeIdNum, 
      isValidBolge: !isNaN(bolgeIdNum),
      PersonelTcKimlik, 
      personelTcNum, 
      isValidPersonel: !isNaN(personelTcNum)
    });

    if (isNaN(bolgeIdNum) || isNaN(personelTcNum)) {
      console.error('Geçersiz sayısal değer:', { BolgeID, PersonelTcKimlik });
      return NextResponse.json(
        { error: 'BolgeID ve PersonelTcKimlik sayısal değer olmalı', details: { BolgeID, PersonelTcKimlik } },
        { status: 400 }
      );
    }

    // UPSERT için data objesi oluştur
    const upsertData: Record<string, unknown> = {
      BolgeID: bolgeIdNum,
      PersonelTcKimlik: personelTcNum,
      YilAy: String(YilAy),
      Tarih: String(Tarih)
    };

    // Optional alanları sadece tanımlıysa ekle
    if (HucreDeger !== undefined && HucreDeger !== null) upsertData.HucreDeger = String(HucreDeger);
    if (NetSoforluk !== undefined && NetSoforluk !== null) upsertData.NetSoforluk = String(NetSoforluk);
    if (GunlukBrut !== undefined && GunlukBrut !== null) upsertData.GunlukBrut = String(GunlukBrut);
    if (YolYardimi !== undefined && YolYardimi !== null) upsertData.YolYardimi = String(YolYardimi);
    if (DegistirenKisi !== undefined && DegistirenKisi !== null) upsertData.DegistirenKisi = String(DegistirenKisi);

    console.log('Upsert Data:', upsertData); // Debug için

    // UPSERT işlemi - aynı kayıt varsa güncelle, yoksa ekle
    const { data, error } = await supabase
      .from('PuantajManuelDegisiklik')
      .upsert(upsertData, {
        onConflict: 'BolgeID,PersonelTcKimlik,YilAy,Tarih'
      })
      .select();

    if (error) {
      console.error('Supabase UPSERT hatası:', error);
      return NextResponse.json({ 
        error: error.message, 
        details: error,
        sentData: upsertData 
      }, { status: 500 });
    }

    console.log('UPSERT başarılı:', data); // Debug için

    return NextResponse.json({ 
      success: true, 
      data: data?.[0] || data,
      message: 'Değişiklik kaydedildi' 
    });
  } catch (error) {
    console.error('POST puantaj-degisiklik error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: 'Sunucu hatası', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Belirli bir değişikliği sil
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const bolgeId = searchParams.get('bolgeId');
    const personelTc = searchParams.get('personelTc');
    const yilAy = searchParams.get('yilAy');
    const tarih = searchParams.get('tarih');

    if (!bolgeId || !personelTc || !yilAy || !tarih) {
      return NextResponse.json(
        { error: 'Tüm parametreler gerekli' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('PuantajManuelDegisiklik')
      .delete()
      .eq('BolgeID', bolgeId)
      .eq('PersonelTcKimlik', personelTc)
      .eq('YilAy', yilAy)
      .eq('Tarih', tarih);

    if (error) {
      console.error('Manuel değişiklik silme hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Değişiklik silindi' 
    });
  } catch (error) {
    console.error('DELETE puantaj-degisiklik error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
