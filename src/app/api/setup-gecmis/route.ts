import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST() {
  try {
    console.log('🔧 IzinTalepGecmis tablosu oluşturuluyor...');

    // SQL komutunu çalıştır
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- İzin Talep Geçmişi (History/Log) Tablosu
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

        -- Index'ler
        CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_talep ON "IzinTalepGecmis"("TalepID");
        CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_tarih ON "IzinTalepGecmis"("IslemTarihi");

        -- RLS Aktif
        ALTER TABLE "IzinTalepGecmis" ENABLE ROW LEVEL SECURITY;
      `
    });

    if (error) {
      console.error('❌ SQL hatası:', error);
      return NextResponse.json({ 
        error: 'SQL execution failed',
        message: error.message 
      }, { status: 500 });
    }

    console.log('✅ Tablo başarıyla oluşturuldu!');
    return NextResponse.json({ 
      success: true,
      message: 'IzinTalepGecmis tablosu başarıyla oluşturuldu!' 
    });

  } catch (error) {
    console.error('❌ Kurulum hatası:', error);
    return NextResponse.json({ 
      error: 'Setup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
