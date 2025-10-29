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

// Şablonları getir
export async function GET(request: NextRequest) {
  try {
    console.log('📥 GET /api/sablonlar - Şablon listesi başladı');
    
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

    // Aktif şablonları getir
    const { data, error } = await supabaseClient
      .from('EvrakSablonlari')
      .select('*')
      .eq('Aktif', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Şablon fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Şablonlar yüklendi:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Yeni şablon kaydet
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/sablonlar - Yeni şablon kaydı başladı');
    
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    let user = null;
    
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
    }
    
    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json({ 
        error: 'Kullanıcı bulunamadı' 
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.email);

    // Admin client ile personel bilgisi al
    const adminSupabase = getAdminClient();
    const { data: personelData, error: personelError } = await adminSupabase
      .from('PersonelLevelizasyon')
      .select('PersonelTcKimlik, PersonelRole')
      .eq('PersonelEmail', user.email)
      .single();

    if (personelError) {
      console.error('❌ Personel fetch error:', personelError);
    }
    console.log('👤 Personel data:', personelData);

    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { 
      sablonAdi, 
      sablonTuru,
      headerContent, 
      contentHTML, 
      footerContent, 
      images, 
      styles 
    } = body;

    if (!sablonAdi || !sablonAdi.trim()) {
      return NextResponse.json({ error: 'Şablon adı zorunludur' }, { status: 400 });
    }

    const insertData = {
      SablonAdi: sablonAdi,
      SablonTuru: sablonTuru || 'genel',
      HeaderContent: headerContent || '',
      ContentHTML: contentHTML,
      FooterContent: footerContent || '',
      ImagesJSON: JSON.stringify(images || []),
      StylesJSON: JSON.stringify(styles || {}),
      OlusturanKisi: personelData?.PersonelTcKimlik,
      Aktif: true
    };

    console.log('💾 Insert data:', insertData);

    // Admin client ile şablonu kaydet
    const { data, error } = await adminSupabase
      .from('EvrakSablonlari')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Şablon kayıt error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Şablon başarıyla kaydedildi:', data);
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Şablon başarıyla kaydedildi!' 
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Şablon güncelle
export async function PUT(request: NextRequest) {
  try {
    console.log('📥 PUT /api/sablonlar - Şablon güncelleme başladı');
    
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
    const { 
      sablonId,
      sablonAdi, 
      sablonTuru,
      headerContent, 
      contentHTML, 
      footerContent, 
      images, 
      styles 
    } = body;

    if (!sablonId) {
      return NextResponse.json({ error: 'SablonID gerekli' }, { status: 400 });
    }

    // Şablonu güncelle
    const { data, error } = await supabaseClient
      .from('EvrakSablonlari')
      .update({
        SablonAdi: sablonAdi,
        SablonTuru: sablonTuru,
        HeaderContent: headerContent,
        ContentHTML: contentHTML,
        FooterContent: footerContent,
        ImagesJSON: JSON.stringify(images),
        StylesJSON: JSON.stringify(styles),
        updated_at: new Date().toISOString()
      })
      .eq('SablonID', sablonId)
      .select()
      .single();

    if (error) {
      console.error('❌ Şablon güncelleme error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Şablon güncellendi:', sablonAdi);
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Şablon başarıyla güncellendi!' 
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Şablon sil (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Kullanıcı kontrolü
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sablonId = searchParams.get('id');

    if (!sablonId) {
      return NextResponse.json({ error: 'SablonID gerekli' }, { status: 400 });
    }

    // Soft delete
    const { error } = await supabase
      .from('EvrakSablonlari')
      .update({ Aktif: false })
      .eq('SablonID', sablonId);

    if (error) {
      console.error('❌ Şablon silme error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Şablon başarıyla silindi!' 
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
