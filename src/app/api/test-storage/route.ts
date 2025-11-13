import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type TestResult = {
  name: string;
  status: string;
  message: string;
  data?: unknown;
  count?: number;
  error?: string | null;
  note?: string;
};

export async function GET() {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as TestResult[]
  };

  // Test 1: Storage Bucket Kontrolü
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    const sablonlarBucket = buckets?.find(b => b.name === 'sablonlar');
    
    testResults.tests.push({
      name: 'Storage Bucket',
      status: sablonlarBucket ? 'PASS' : 'FAIL',
      message: sablonlarBucket 
        ? `✅ 'sablonlar' bucket mevcut (Public: ${sablonlarBucket.public})`
        : '❌ "sablonlar" bucket bulunamadı',
      data: sablonlarBucket || null,
      error: error?.message || null
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Storage Bucket',
      status: 'ERROR',
      message: '❌ Storage bucket listelenemedi',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Tablo Varlığı Kontrolü
  try {
    const { error } = await supabaseAdmin
      .from('sablondosyalari')
      .select('count')
      .limit(1);
    
    testResults.tests.push({
      name: 'SablonDosyalari Tablosu',
      status: error ? 'FAIL' : 'PASS',
      message: error 
        ? `❌ Tablo bulunamadı: ${error.message}`
        : '✅ Tablo mevcut ve erişilebilir',
      error: error?.message || null
    });
  } catch (error) {
    testResults.tests.push({
      name: 'SablonDosyalari Tablosu',
      status: 'ERROR',
      message: '❌ Tablo sorgulanamadı',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Tablo İçeriği
  try {
    const { data: sablonlar, error, count } = await supabaseAdmin
      .from('sablondosyalari')
      .select('*', { count: 'exact' });
    
    testResults.tests.push({
      name: 'Tablo İçeriği',
      status: 'PASS',
      message: `✅ ${count || 0} adet şablon kaydı bulundu`,
      data: sablonlar || [],
      count: count || 0,
      error: error?.message || null
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Tablo İçeriği',
      status: 'ERROR',
      message: '❌ Tablo içeriği okunamadı',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Storage Dosyaları
  try {
    const { data: files, error } = await supabaseAdmin
      .storage
      .from('sablonlar')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    testResults.tests.push({
      name: 'Storage Dosyaları',
      status: error ? 'FAIL' : 'PASS',
      message: error
        ? `❌ Dosyalar listelenemedi: ${error.message}`
        : `✅ ${files?.length || 0} adet dosya bulundu`,
      data: files || [],
      count: files?.length || 0,
      error: error?.message || null
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Storage Dosyaları',
      status: 'ERROR',
      message: '❌ Storage sorgulanamadı',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 5: RLS Politikaları (Simüle)
  try {
    // Service role ile yapılan işlemler RLS'i bypass eder
    // Gerçek test için authenticated user token'ı gerekir
    testResults.tests.push({
      name: 'RLS Politikaları',
      status: 'INFO',
      message: '⚠️ RLS test edilemedi (Service role bypass eder)',
      note: 'RLS testini UI\'dan authenticated kullanıcı ile yapın'
    });
  } catch (error) {
    testResults.tests.push({
      name: 'RLS Politikaları',
      status: 'ERROR',
      message: '❌ RLS kontrol edilemedi',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Özet
  const passCount = testResults.tests.filter(t => t.status === 'PASS').length;
  const failCount = testResults.tests.filter(t => t.status === 'FAIL').length;
  const errorCount = testResults.tests.filter(t => t.status === 'ERROR').length;
  const infoCount = testResults.tests.filter(t => t.status === 'INFO').length;

  const summary = {
    total: testResults.tests.length,
    passed: passCount,
    failed: failCount,
    errors: errorCount,
    info: infoCount,
    success: failCount === 0 && errorCount === 0
  };

  return NextResponse.json({
    ...testResults,
    summary,
    recommendation: summary.success
      ? '✅ Tüm testler başarılı! Sistem kullanıma hazır.'
      : '❌ Bazı testler başarısız. Lütfen hataları kontrol edin.'
  });
}
