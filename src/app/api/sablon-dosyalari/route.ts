import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client - RLS'i bypass eder
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET - Tüm şablon dosyalarını listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sablonTuru = searchParams.get('tur');

    console.log('📋 Şablon dosyaları listeleniyor...');

    let query = supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .order('created_at', { ascending: false });

    // Türe göre filtrele
    if (sablonTuru) {
      query = query.eq('sablonturu', sablonTuru);
    }

    const { data: sablonlar, error } = await query;

    if (error) {
      console.error('❌ Şablon listesi hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Şablon dosyaları listelendi:', sablonlar?.length, 'adet');
    return NextResponse.json({ data: sablonlar, count: sablonlar?.length || 0 });

  } catch (error) {
    console.error('❌ Şablon listeleme hatası:', error);
    return NextResponse.json({ 
      error: 'Şablon dosyaları listelenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Yeni şablon dosyası yükle
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sablonAdi = formData.get('sablonAdi') as string;
    const sablonTuru = formData.get('sablonTuru') as string;
    const aciklama = formData.get('aciklama') as string;

    if (!file || !sablonAdi || !sablonTuru) {
      return NextResponse.json({ 
        error: 'Dosya, şablon adı ve türü gerekli' 
      }, { status: 400 });
    }

    console.log('📤 Şablon dosyası yükleniyor:', sablonAdi, '-', sablonTuru);

    // Dosya uzantısı kontrolü
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ 
        error: 'Sadece .docx dosyaları yüklenebilir' 
      }, { status: 400 });
    }

    // Dosyayı buffer'a çevir
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Benzersiz dosya adı oluştur
    const timestamp = Date.now();
    const dosyaAdi = `${sablonTuru}-sablon-${timestamp}.docx`;
    const dosyaYolu = `${dosyaAdi}`;

    // Storage'a yükle
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('sablonlar')
      .upload(dosyaYolu, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage yükleme hatası:', uploadError);
      return NextResponse.json({ 
        error: 'Dosya yüklenemedi',
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('✅ Dosya storage\'a yüklendi:', dosyaYolu);

    // Metadata kaydet
    const { data: metaData, error: metaError } = await supabaseAdmin
      .from('sablondosyalari')
      .insert({
        sablonadi: sablonAdi,
        sablonturu: sablonTuru,
        dosyaadi: dosyaAdi,
        dosyayolu: dosyaYolu,
        dosyaboyutu: buffer.length,
        aciklama: aciklama || null
      })
      .select()
      .single();

    if (metaError) {
      console.error('❌ Metadata kayıt hatası:', metaError);
      
      // Metadata kaydedilemezse dosyayı da sil
      await supabaseAdmin.storage.from('sablonlar').remove([dosyaYolu]);
      
      return NextResponse.json({ 
        error: 'Şablon bilgileri kaydedilemedi',
        details: metaError.message 
      }, { status: 500 });
    }

    console.log('✅ Şablon metadata kaydedildi:', metaData.sablonid);

    return NextResponse.json({ 
      success: true, 
      data: metaData,
      message: 'Şablon başarıyla yüklendi'
    });

  } catch (error) {
    console.error('❌ Şablon yükleme hatası:', error);
    return NextResponse.json({ 
      error: 'Şablon yüklenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Şablon dosyasını güncelle
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sablonId = formData.get('sablonId') as string;
    const file = formData.get('file') as File;
    const sablonAdi = formData.get('sablonAdi') as string;
    const aciklama = formData.get('aciklama') as string;

    if (!sablonId) {
      return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });
    }

    console.log('🔄 Şablon dosyası güncelleniyor:', sablonId);

    // Mevcut şablon bilgisini al
    const { data: eskiSablon, error: getError } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .eq('sablonid', sablonId)
      .single();

    if (getError || !eskiSablon) {
      return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });
    }

    const guncelData: Record<string, unknown> = {
      versiyon: (eskiSablon.versiyon || 1) + 1
    };

    // Şablon adı güncellenecek mi?
    if (sablonAdi && sablonAdi !== eskiSablon.sablonadi) {
      guncelData.sablonadi = sablonAdi;
    }

    // Açıklama güncellenecek mi?
    if (aciklama !== undefined) {
      guncelData.aciklama = aciklama;
    }

    // Yeni dosya yüklenecek mi?
    if (file) {
      if (!file.name.endsWith('.docx')) {
        return NextResponse.json({ 
          error: 'Sadece .docx dosyaları yüklenebilir' 
        }, { status: 400 });
      }

      // Eski dosyayı sil
      await supabaseAdmin.storage
        .from('sablonlar')
        .remove([eskiSablon.dosyayolu]);

      console.log('🗑️ Eski dosya silindi:', eskiSablon.dosyayolu);

      // Yeni dosyayı yükle
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const timestamp = Date.now();
      const dosyaAdi = `${eskiSablon.sablonturu}-sablon-${timestamp}.docx`;
      const dosyaYolu = `${dosyaAdi}`;

      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('sablonlar')
        .upload(dosyaYolu, buffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Dosya yükleme hatası:', uploadError);
        return NextResponse.json({ 
          error: 'Yeni dosya yüklenemedi',
          details: uploadError.message 
        }, { status: 500 });
      }

      console.log('✅ Yeni dosya yüklendi:', dosyaYolu);

      guncelData.dosyaadi = dosyaAdi;
      guncelData.dosyayolu = dosyaYolu;
      guncelData.dosyaboyutu = buffer.length;
    }

    // 4. Database'i güncelle
    const { data: guncellenmis, error: updateError } = await supabaseAdmin
      .from('sablondosyalari')
      .update(guncelData)
      .eq('sablonid', sablonId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Güncelleme hatası:', updateError);
      return NextResponse.json({ 
        error: 'Şablon güncellenemedi',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Şablon güncellendi:', guncellenmis.sablonid);

    return NextResponse.json({ 
      success: true, 
      data: guncellenmis,
      message: 'Şablon başarıyla güncellendi'
    });

  } catch (error) {
    console.error('❌ Şablon güncelleme hatası:', error);
    return NextResponse.json({ 
      error: 'Şablon güncellenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Şablon dosyasını sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sablonId = searchParams.get('id');

    if (!sablonId) {
      return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });
    }

    console.log('🗑️ Şablon dosyası siliniyor:', sablonId);

    // Şablon bilgisini al
    const { data: sablon, error: getError } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*')
      .eq('sablonid', sablonId)
      .single();

    if (getError || !sablon) {
      return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });
    }

    // Storage'dan dosyayı sil
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('sablonlar')
      .remove([sablon.dosyayolu]);

    if (storageError) {
      console.error('❌ Storage silme hatası:', storageError);
    } else {
      console.log('✅ Dosya storage\'dan silindi:', sablon.dosyayolu);
    }

    // Metadata'yı sil
    const { error: deleteError } = await supabaseAdmin
      .from('sablondosyalari')
      .delete()
      .eq('sablonid', sablonId);

    if (deleteError) {
      console.error('❌ Metadata silme hatası:', deleteError);
      return NextResponse.json({ 
        error: 'Şablon silinemedi',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Şablon metadata silindi');

    return NextResponse.json({ 
      success: true,
      message: 'Şablon başarıyla silindi'
    });

  } catch (error) {
    console.error('❌ Şablon silme hatası:', error);
    return NextResponse.json({ 
      error: 'Şablon silinirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
