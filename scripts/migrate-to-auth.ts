/**
 * Tüm personeli Supabase Auth'a migrate eden script
 * 
 * Kullanım:
 * npx tsx scripts/migrate-to-auth.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local dosyasını yükle
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local dosyasında olmalı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface Personel {
  PersonelTcKimlik: number;
  PersonelEmail: string;
  PersonelPassword: string;
  PersonelRole: string;
  BolgeID: number | null;
  PersonelAktif: boolean;
}

async function migrateToAuth() {
  console.log('🚀 Supabase Auth migration başlıyor...\n');

  // Tüm aktif personeli çek
  const { data: personeller, error: fetchError } = await supabase
    .from('PersonelLevelizasyon')
    .select('PersonelTcKimlik, PersonelEmail, PersonelPassword, PersonelRole, BolgeID, PersonelAktif')
    .eq('PersonelAktif', true);

  if (fetchError || !personeller) {
    console.error('❌ Personel verisi çekilemedi:', fetchError);
    return;
  }

  console.log(`📊 Toplam ${personeller.length} aktif personel bulundu\n`);

  let successCount = 0;
  let errorCount = 0;
  let existsCount = 0;

  for (const personel of personeller as Personel[]) {
    try {
      // Supabase Auth'a kullanıcı ekle
      const { error: authError } = await supabase.auth.admin.createUser({
        email: personel.PersonelEmail,
        password: personel.PersonelPassword,
        email_confirm: true, // Email doğrulaması gerekmesin
        user_metadata: {
          tc_kimlik: personel.PersonelTcKimlik.toString(),
          role: personel.PersonelRole,
          bolge_id: personel.BolgeID?.toString() || null
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  Zaten mevcut: ${personel.PersonelEmail}`);
          existsCount++;
        } else {
          console.error(`❌ Hata (${personel.PersonelEmail}):`, authError.message);
          errorCount++;
        }
      } else {
        console.log(`✅ Eklendi: ${personel.PersonelEmail} (${personel.PersonelRole})`);
        successCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Exception (${personel.PersonelEmail}):`, errorMessage);
      errorCount++;
    }

    // Rate limiting'i önlemek için kısa bekle
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📈 Özet:');
  console.log(`✅ Başarılı: ${successCount}`);
  console.log(`⚠️  Zaten mevcut: ${existsCount}`);
  console.log(`❌ Hata: ${errorCount}`);
  console.log(`📊 Toplam: ${personeller.length}`);
}

migrateToAuth().catch(console.error);
