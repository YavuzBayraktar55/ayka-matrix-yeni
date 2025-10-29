import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

// Şablonu personel bilgileriyle doldur
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/evrak-olustur - Evrak oluşturma başladı');
    
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    let user = null;
    let supabaseClient = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🎫 Using bearer token with admin client');
      
      // Admin client ile token'ı doğrula
      const adminSupabase = getAdminClient();
      const { data, error } = await adminSupabase.auth.getUser(token);
      
      if (error) {
        console.error('❌ Token validation error:', error.message);
        return NextResponse.json({ 
          error: 'Geçersiz token: ' + error.message 
        }, { status: 401 });
      }
      
      user = data.user;
      supabaseClient = adminSupabase;
      console.log('✅ User from admin client:', user?.email);
    } else {
      // Cookie session'ı dene
      console.log('🍪 Trying cookie session');
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Cookie auth error:', error.message);
        return NextResponse.json({ 
          error: 'Oturum bulunamadı' 
        }, { status: 401 });
      }
      
      user = data.user;
      supabaseClient = supabase;
    }
    
    if (!user || !supabaseClient) {
      console.error('❌ No user or client found');
      return NextResponse.json({ 
        error: 'Kullanıcı bulunamadı' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { sablonId, personelTcKimlik, izinData } = body;

    if (!sablonId || !personelTcKimlik) {
      return NextResponse.json({ 
        error: 'SablonID ve PersonelTcKimlik gerekli' 
      }, { status: 400 });
    }

    // Şablonu getir
    const { data: sablon, error: sablonError } = await supabaseClient
      .from('EvrakSablonlari')
      .select('*')
      .eq('SablonID', sablonId)
      .single();

    if (sablonError || !sablon) {
      return NextResponse.json({ 
        error: 'Şablon bulunamadı' 
      }, { status: 404 });
    }

    // Personel bilgilerini getir
    const { data: personel, error: personelError } = await supabaseClient
      .from('PersonelLevelizasyon')
      .select(`
        PersonelTcKimlik,
        PersonelEmail,
        BolgeID,
        PersonelInfo (*),
        BolgeInfo:BolgeID (*)
      `)
      .eq('PersonelTcKimlik', personelTcKimlik)
      .single();

    if (personelError || !personel) {
      return NextResponse.json({ 
        error: 'Personel bulunamadı' 
      }, { status: 404 });
    }

    const personelInfo = Array.isArray(personel.PersonelInfo) 
      ? personel.PersonelInfo[0] 
      : personel.PersonelInfo;
    
    const bolgeInfo = Array.isArray(personel.BolgeInfo) 
      ? personel.BolgeInfo[0] 
      : personel.BolgeInfo;

    // Değişken değerlerini hazırla
    const variables: Record<string, string> = {
      '{personel_adi}': personelInfo?.P_AdSoyad || '',
      '{tc_no}': personel.PersonelTcKimlik?.toString() || '',
      '{dogum_tarihi}': personelInfo?.P_DogumTarihi 
        ? new Date(personelInfo.P_DogumTarihi).toLocaleDateString('tr-TR')
        : '',
      '{bolge}': bolgeInfo?.BolgeAdi || '',
      '{isyeri_sicil}': bolgeInfo?.BolgeSicilNo || '',
      '{hazirlama_tarihi}': new Date().toLocaleDateString('tr-TR'),
    };

    // İzin verileri varsa ekle
    if (izinData) {
      variables['{izin_baslangic}'] = izinData.BaslangicTarihi 
        ? new Date(izinData.BaslangicTarihi).toLocaleDateString('tr-TR')
        : '';
      variables['{izin_bitis}'] = izinData.BitisTarihi 
        ? new Date(izinData.BitisTarihi).toLocaleDateString('tr-TR')
        : '';
      variables['{izin_gun}'] = izinData.GunSayisi?.toString() || '';
    }

    // HTML içeriğinde değişkenleri değiştir
    let headerContent = sablon.HeaderContent || '';
    let contentHTML = sablon.ContentHTML || '';
    let footerContent = sablon.FooterContent || '';

    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      // Placeholder span'larını değiştir
      const regex = new RegExp(
        `<span[^>]*class="placeholder-text"[^>]*>${key.replace(/[{}]/g, '\\$&')}</span>`,
        'g'
      );
      headerContent = headerContent.replace(regex, value);
      contentHTML = contentHTML.replace(regex, value);
      footerContent = footerContent.replace(regex, value);

      // Düz metin halindeki değişkenleri de değiştir
      const textRegex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      headerContent = headerContent.replace(textRegex, value);
      contentHTML = contentHTML.replace(textRegex, value);
      footerContent = footerContent.replace(textRegex, value);
    });

    // Doldurulmuş şablonu döndür
    return NextResponse.json({
      success: true,
      data: {
        sablonAdi: sablon.SablonAdi,
        headerContent,
        contentHTML,
        footerContent,
        images: JSON.parse(sablon.ImagesJSON || '[]'),
        styles: JSON.parse(sablon.StylesJSON || '{}'),
        personel: {
          adi: personelInfo?.P_AdSoyad,
          tcNo: personel.PersonelTcKimlik,
          bolge: bolgeInfo?.BolgeAdi
        }
      }
    });
  } catch (error) {
    console.error('❌ Evrak oluşturma error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
