import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client - RLS bypass
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // RLS logic'i burada manuel uyguluyoruz
    let query = supabaseAdmin
      .from('AvansTalepleri')
      .select(`
        *,
        PersonelLevelizasyon!inner(
          PersonelInfo(P_AdSoyad),
          BolgeInfo(BolgeAdi),
          BolgeID,
          PersonelEmail
        )
      `)
      .order('created_at', { ascending: false });

    // Role-based filtering
    if (userRole === 'saha_personeli') {
      query = query.eq('PersonelLevelizasyon.PersonelEmail', userEmail);
    } else if (userRole === 'koordinator') {
      // Koordinatör kendi bölgesindeki personelleri görür
      const { data: userData } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select('BolgeID')
        .eq('PersonelEmail', userEmail)
        .single();

      if (userData?.BolgeID) {
        query = query.eq('PersonelLevelizasyon.BolgeID', userData.BolgeID);
      }
    }
    // yonetici ve insan_kaynaklari tüm talepleri görür (filtre yok)

    const { data, error } = await query;

    if (error) throw error;

    // Format data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedData = data?.map((item: any) => ({
      ...item,
      PersonelInfo: item.PersonelLevelizasyon?.PersonelInfo,
      BolgeInfo: item.PersonelLevelizasyon?.BolgeInfo,
    })) || [];

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Avans talepleri fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
