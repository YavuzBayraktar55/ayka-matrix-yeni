import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const talepId = searchParams.get('talepId');

    console.log('🔍 GET /api/izin-gecmis - TalepID:', talepId);

    if (!talepId) {
      console.error('❌ TalepID eksik');
      return NextResponse.json({ error: 'Missing talepId' }, { status: 400 });
    }

    // Önce tablo var mı kontrol et
    const { error: tableError } = await supabaseAdmin
      .from('IzinTalepGecmis')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Tablo bulunamadı:', tableError);
      return NextResponse.json({ 
        error: 'IzinTalepGecmis tablosu bulunamadı. Lütfen SQL dosyasını çalıştırın.',
        tableError: tableError.message 
      }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('IzinTalepGecmis')
      .select('*')
      .eq('TalepID', parseInt(talepId))
      .order('IslemTarihi', { ascending: true });

    if (error) {
      console.error('❌ Geçmiş query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Geçmiş bulundu:', data?.length, 'kayıt');
    return NextResponse.json({ data: data || [] });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Yeni geçmiş kaydı ekle
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('💾 POST /api/izin-gecmis - Body:', body);
    
    const { 
      TalepID, 
      IslemYapan, 
      IslemTipi, 
      EskiDurum, 
      YeniDurum,
      EskiBaslangic,
      YeniBaslangic,
      EskiBitis,
      YeniBitis,
      Not,
      IslemYapanAd 
    } = body;

    if (!TalepID || !IslemYapan || !IslemTipi) {
      console.error('❌ Eksik alanlar:', { TalepID, IslemYapan, IslemTipi });
      return NextResponse.json({ error: 'Missing required fields: TalepID, IslemYapan, IslemTipi' }, { status: 400 });
    }

    const insertData = {
      TalepID,
      IslemYapan,
      IslemTipi,
      EskiDurum: EskiDurum || null,
      YeniDurum: YeniDurum || null,
      EskiBaslangic: EskiBaslangic || null,
      YeniBaslangic: YeniBaslangic || null,
      EskiBitis: EskiBitis || null,
      YeniBitis: YeniBitis || null,
      Not: Not || null,
      IslemYapanAd: IslemYapanAd || null
    };

    console.log('📝 Insert Data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('IzinTalepGecmis')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    console.log('✅ Geçmiş kaydedildi:', data);
    return NextResponse.json({ data });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
