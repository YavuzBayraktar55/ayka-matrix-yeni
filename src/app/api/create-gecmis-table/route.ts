import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

export async function GET() {
  try {
    console.log('🔧 IzinTalepGecmis tablosu oluşturuluyor...');

    // Tam SQL script - tek seferde çalıştır
    const fullSQL = `
      -- Adım 1: Tabloyu oluştur
      CREATE TABLE IF NOT EXISTS "IzinTalepGecmis" (
        "GecmisID" SERIAL PRIMARY KEY,
        "TalepID" INTEGER NOT NULL REFERENCES "IzinTalepleri"("TalepID") ON DELETE CASCADE,
        "IslemTarihi" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "IslemYapan" INTEGER NOT NULL,
        "IslemTipi" VARCHAR(50) NOT NULL,
        "EskiDurum" VARCHAR(50),
        "YeniDurum" VARCHAR(50),
        "EskiBaslangic" DATE,
        "YeniBaslangic" DATE,
        "EskiBitis" DATE,
        "YeniBitis" DATE,
        "Not" TEXT,
        "IslemYapanAd" VARCHAR(255)
      );

      -- Adım 2: Index'leri oluştur
      CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_talep ON "IzinTalepGecmis"("TalepID");
      CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_tarih ON "IzinTalepGecmis"("IslemTarihi");

      -- Adım 3: RLS aktif et
      ALTER TABLE "IzinTalepGecmis" ENABLE ROW LEVEL SECURITY;

      -- Adım 4: Politikaları oluştur
      DROP POLICY IF EXISTS "Geçmiş kayıtları görüntüle" ON "IzinTalepGecmis";
      CREATE POLICY "Geçmiş kayıtları görüntüle"
        ON "IzinTalepGecmis"
        FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Geçmiş kayıtları ekle" ON "IzinTalepGecmis";
      CREATE POLICY "Geçmiş kayıtları ekle"
        ON "IzinTalepGecmis"
        FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Geçmiş güncelleme yasak" ON "IzinTalepGecmis";
      CREATE POLICY "Geçmiş güncelleme yasak"
        ON "IzinTalepGecmis"
        FOR UPDATE
        USING (false);

      DROP POLICY IF EXISTS "Geçmiş silme yasak" ON "IzinTalepGecmis";
      CREATE POLICY "Geçmiş silme yasak"
        ON "IzinTalepGecmis"
        FOR DELETE
        USING (false);

      -- Yorum ekle
      COMMENT ON TABLE "IzinTalepGecmis" IS 'İzin talepleri için değişiklik geçmişi - immutable audit log';
    `;

    // Supabase Management API kullanarak SQL çalıştır
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: fullSQL })
    });

    console.log('📡 SQL API Response:', response.status);

    // Test: Tablo oluşturuldu mu kontrol et
    const { error: testError } = await supabaseAdmin
      .from('IzinTalepGecmis')
      .select('GecmisID')
      .limit(1);

    if (testError) {
      console.error('❌ Tablo testi başarısız:', testError);
      return NextResponse.json({ 
        error: 'Table creation may have failed',
        message: testError.message,
        hint: 'Lütfen Supabase Dashboard > SQL Editor\'de aşağıdaki komutu manuel olarak çalıştırın:',
        sql: fullSQL
      }, { status: 500 });
    }

    console.log('✅ Tablo başarıyla oluşturuldu ve test edildi!');

    return NextResponse.json({ 
      success: true,
      message: '✅ IzinTalepGecmis tablosu başarıyla oluşturuldu!',
      details: {
        table: 'IzinTalepGecmis',
        indexes: ['idx_izin_talep_gecmis_talep', 'idx_izin_talep_gecmis_tarih'],
        rls: 'enabled',
        policies: ['görüntüle', 'ekle', 'güncelleme yasak', 'silme yasak']
      }
    });

  } catch (error) {
    console.error('❌ Kurulum hatası:', error);
    return NextResponse.json({ 
      error: 'Setup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Supabase Dashboard SQL Editor\'de manuel olarak supabase-izin-gecmis-tablo.sql dosyasını çalıştırın'
    }, { status: 500 });
  }
}
