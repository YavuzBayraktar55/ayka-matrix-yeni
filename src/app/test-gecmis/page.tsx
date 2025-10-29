'use client';

import { useState } from 'react';

export default function TestGecmisPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    data?: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const createTable = async () => {
    setCreateLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/create-gecmis-table');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult({
          status: 'success',
          message: '✅ Tablo başarıyla oluşturuldu!',
          detail: 'IzinTalepGecmis tablosu artık kullanıma hazır.',
          apiResponse: data
        });
      } else {
        setResult({
          status: 'error',
          message: '❌ Tablo oluşturulamadı',
          detail: data.message || data.error || 'Bilinmeyen hata',
          apiResponse: data
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: '❌ API çağrısı başarısız',
        detail: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const testTableExists = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Test için random bir talepId ile geçmiş çekmeyi dene
      const response = await fetch('/api/izin-gecmis?talepId=1');
      const data = await response.json();
      
      if (data.error && data.error.includes('bulunamadı')) {
        setResult({
          status: 'error',
          message: '❌ IzinTalepGecmis tablosu bulunamadı!',
          detail: 'Supabase SQL Editor\'de supabase-izin-gecmis-tablo.sql dosyasını çalıştırın.',
          apiResponse: data
        });
      } else if (data.error) {
        setResult({
          status: 'warning',
          message: '⚠️ API hatası (ama tablo var gibi görünüyor)',
          detail: data.error,
          apiResponse: data
        });
      } else {
        setResult({
          status: 'success',
          message: '✅ Tablo mevcut ve çalışıyor!',
          detail: `${data.data?.length || 0} geçmiş kaydı bulundu (TalepID=1 için)`,
          apiResponse: data
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: '❌ Test başarısız',
        detail: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const testData = {
        TalepID: 1,
        IslemYapan: 12345678901,
        IslemTipi: 'olusturuldu',
        YeniDurum: 'beklemede',
        Not: 'Test kaydı',
        IslemYapanAd: 'Test User'
      };

      const response = await fetch('/api/izin-gecmis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      const data = await response.json();

      if (data.error) {
        setResult({
          status: 'error',
          message: '❌ Insert başarısız',
          detail: data.error,
          apiResponse: data
        });
      } else {
        setResult({
          status: 'success',
          message: '✅ Kayıt başarıyla eklendi!',
          detail: `GecmisID: ${data.data?.GecmisID}`,
          apiResponse: data
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: '❌ Test başarısız',
        detail: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-2">İzin Geçmişi Test</h1>
          <p className="text-gray-400 mb-8">IzinTalepGecmis tablosunu test edin</p>

          <div className="space-y-4 mb-8">
            <button
              onClick={createTable}
              disabled={createLoading}
              className="w-full px-6 py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {createLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  🔧 Tabloyu Otomatik Oluştur
                </>
              )}
            </button>

            <div className="flex gap-4">
              <button
                onClick={testTableExists}
                disabled={loading}
                className="flex-1 px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Test Ediliyor...
                  </>
                ) : (
                  <>
                    🔍 Tablo Var Mı Test Et
                  </>
                )}
              </button>

              <button
                onClick={testInsert}
                disabled={loading}
                className="flex-1 px-6 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Test Ediliyor...
                  </>
                ) : (
                  <>
                    ✏️ Test Kaydı Ekle
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className={`p-6 rounded-xl border-2 ${
              result.status === 'success' 
                ? 'bg-green-500/20 border-green-500' 
                : result.status === 'warning'
                ? 'bg-yellow-500/20 border-yellow-500'
                : 'bg-red-500/20 border-red-500'
            }`}>
              <h2 className="text-2xl font-bold text-white mb-2">{result.message}</h2>
              <p className="text-gray-300 mb-4">{result.detail}</p>
              
              {result.apiResponse && (
                <details className="mt-4">
                  <summary className="text-white cursor-pointer hover:text-gray-300">
                    API Response (Detay)
                  </summary>
                  <pre className="mt-2 p-4 bg-black/30 rounded-lg overflow-x-auto text-xs text-gray-300">
                    {JSON.stringify(result.apiResponse, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">📋 Talimatlar</h3>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li>Önce &quot;Tablo Var Mı Test Et&quot; butonuna tıklayın</li>
              <li>Eğer tablo yoksa, Supabase Dashboard → SQL Editor&apos;e gidin</li>
              <li><code className="bg-black/30 px-2 py-1 rounded">supabase-izin-gecmis-tablo.sql</code> dosyasını çalıştırın</li>
              <li>Tekrar bu sayfada &quot;Tablo Var Mı Test Et&quot; butonuna tıklayın</li>
              <li>Başarılı olursa &quot;Test Kaydı Ekle&quot; butonunu deneyin</li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400">
              <strong>Not:</strong> Bu sayfa sadece test içindir. Gerçek uygulamada İzin Talepleri sayfasını kullanın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
