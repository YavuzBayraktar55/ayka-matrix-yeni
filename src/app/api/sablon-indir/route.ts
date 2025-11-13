import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET - Şablon dosyasını indir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sablonId = searchParams.get('id');

    if (!sablonId) {
      return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });
    }

    console.log('📥 Şablon dosyası indiriliyor:', sablonId);

    // Şablon bilgisini al
    const { data: sablon, error: getError } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .eq('sablonid', sablonId)
      .single();

    if (getError || !sablon) {
      console.error('❌ Şablon bulunamadı:', getError);
      return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });
    }

    console.log('✅ Şablon metadata bulundu:', sablon.dosyayolu);

    // 2. Storage'dan dosyayı indir
    const { data: fileData, error: storageError } = await supabaseAdmin
      .storage
      .from('sablonlar')
      .download(sablon.dosyayolu);

    if (storageError || !fileData) {
      console.error('❌ Dosya indirme hatası:', storageError);
      return NextResponse.json({ 
        error: 'Dosya indirilemedi',
        details: storageError?.message 
      }, { status: 500 });
    }

    console.log('✅ Dosya storage\'dan indirildi, boyut:', fileData.size, 'bytes');

    // Blob'u Buffer'a çevir
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Word dosyası olarak döndür
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(sablon.dosyaadi)}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Şablon indirme hatası:', error);
    return NextResponse.json({ 
      error: 'Şablon indirilirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
