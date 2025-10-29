import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client - RLS'i bypass eder
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Yönetici ve İK için tüm personelleri getir
    if (userRole === 'yonetici' || userRole === 'insan_kaynaklari') {
      const { data, error } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select(`
          *,
          PersonelInfo (*),
          BolgeInfo (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Admin query error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, count: data.length });
    }

    // Koordinatör için kendi bölgesindeki personelleri getir
    if (userRole === 'koordinator') {
      // Önce kullanıcının bölgesini bul
      const { data: userData, error: userError } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select('BolgeID')
        .eq('PersonelEmail', userEmail)
        .single();

      if (userError || !userData?.BolgeID) {
        return NextResponse.json({ error: 'User region not found' }, { status: 404 });
      }

      const { data, error } = await supabaseAdmin
        .from('PersonelLevelizasyon')
        .select(`
          *,
          PersonelInfo (*),
          BolgeInfo (*)
        `)
        .eq('BolgeID', userData.BolgeID)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, count: data.length });
    }

    // Saha personeli için sadece kendisini getir
    const { data, error } = await supabaseAdmin
      .from('PersonelLevelizasyon')
      .select(`
        *,
        PersonelInfo (*),
        BolgeInfo (*)
      `)
      .eq('PersonelEmail', userEmail)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: [data], count: 1 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
