# 🎉 Yeni Word Tarzı Şablon Düzenleyici - Hızlı Başlangıç

## ✅ Tamamlandı

Yeni, profesyonel bir şablon düzenleyici başarıyla oluşturuldu!

### 🚀 Özellikler

#### 1. **Word Benzeri Editör**
- TinyMCE tabanlı profesyonel rich text editor
- Word'den **doğrudan kopyala-yapıştır** (Ctrl+C → Ctrl+V)
- **Tablolar dahil** tüm formatlar korunur
- Birden fazla Word dosyasını **alt alta yapıştırabilirsiniz**

#### 2. **A4 Sayfa Düzeni**
- Gerçek A4 boyutlarında (794px x 1123px) çalışma
- Çok sayfalı belgeler için **otomatik sayfa bölme**
- Print-ready format

#### 3. **Değişken Sistemi** (Mevcut Sistem Korundu)
- Kategorize edilmiş değişkenler
- Kolay ekleme menüsü
- Görsel ayırt etme (mavi etiketler)

#### 4. **Tablo Desteği**
- Word'den tam tablo desteği
- Editörde tablo düzenleme araçları
- Satır/sütun ekleme-silme
- Hücre birleştirme

## 📍 Erişim

### Dashboard Menüsünden
1. Giriş yapın
2. Sol menüden **"📝 Word Şablon Düzenleyici"** seçin

### Direkt URL
```
http://localhost:3000/dashboard/yeni-sablon-duzenleyici
```

## 🎯 Hızlı Kullanım

### Adım 1: Word'den İçerik Kopyalayın
1. Word belgenizi açın
2. İstediğiniz içeriği seçin (tablolar dahil)
3. `Ctrl + C` ile kopyalayın

### Adım 2: Şablona Yapıştırın
1. Yeni şablon düzenleyicide editör alanına tıklayın
2. `Ctrl + V` ile yapıştırın
3. **Tablolar ve formatlar otomatik korunur!**

### Adım 3: Değişken Ekleyin
1. "Değişken Ekle" butonuna tıklayın
2. Kategori seçin (Genel / İzin / Avans)
3. İstediğiniz değişkeni seçin
4. Otomatik olarak mavi etiket şeklinde eklenir

### Adım 4: Kaydedin
1. Üstte şablon adı girin
2. Şablon türünü seçin
3. "Kaydet" butonuna tıklayın

## 📝 Mevcut Değişkenler

### 📋 Genel Bilgiler
- `{personel_adi}` - Personel Adı Soyadı
- `{tc_no}` - TC Kimlik No
- `{dogum_tarihi}` - Doğum Tarihi
- `{bolge}` - Bölge
- `{isyeri_sicil}` - İşyeri Sicil No
- `{hazirlama_tarihi}` - Hazırlanma Tarihi

### 📅 İzin Bilgileri
- `{izin_baslangic}` - İzin Başlangıç
- `{izin_bitis}` - İzin Bitiş
- `{izin_gun}` - İzin Gün Sayısı
- `{izin_turu}` - İzin Türü
- `{izin_hazirlama_tarihi}` - İzin Hazırlama Tarihi

### 💰 Avans Bilgileri
- `{avans_miktar}` - Avans Miktarı
- `{avans_tarih}` - Avans Talep Tarihi
- `{avans_aciklama}` - Avans Açıklaması

## 🔧 Teknik Bilgiler

### Kurulum
```bash
npm install @tinymce/tinymce-react
```

### Dosya Yapısı
```
src/
  app/
    dashboard/
      yeni-sablon-duzenleyici/
        page.tsx          # Yeni şablon düzenleyici
      sablon-duzenleyici/
        page.tsx          # Eski düzenleyici (korundu)
      evraklar/
        page.tsx          # Her iki düzenleyiciden şablonları kullanır
```

### API Endpoints
- `GET /api/sablonlar` - Şablonları listele
- `POST /api/sablonlar` - Yeni şablon kaydet
- `PUT /api/sablonlar` - Şablon güncelle
- `DELETE /api/sablonlar?id=X` - Şablon sil

### Database
Tablo: `EvrakSablonlari`
- Aynı tablo kullanılıyor (uyumluluk sağlandı)
- Eski ve yeni düzenleyici birlikte çalışır

## ⚡ Önemli Notlar

### ✅ Yapabilirsiniz
- Word'den **sınırsız sayıda** belge kopyalayın
- Her belgeyi **alt alta** yapıştırın
- **Tabloları** olduğu gibi kullanın
- Formatları değiştirin
- Değişkenleri istediğiniz yere ekleyin

### ⚠️ Dikkat
1. **TinyMCE Uyarısı**: Console'da "no-api-key" uyarısı görebilirsiniz. Bu normal, ücretsiz kullanım için sorun değil.

2. **Eski Düzenleyici**: Eski şablon düzenleyici menüde "Şablon Düzenleyici (Eski)" olarak korundu.

3. **Uyumluluk**: İki düzenleyici **aynı veritabanını** kullanır, sorunsuz çalışır.

## 🎨 Görünüm

### Dark Mode Desteği
- Otomatik tema geçişi
- TinyMCE da dark mode'u destekler

### Responsive
- Desktop için optimize edilmiş
- Mobilde okuma modu

## 🐛 Sorun Giderme

### Word'den Yapıştırma Çalışmıyor
1. Tarayıcı izinlerini kontrol edin
2. `Ctrl + V` yerine sağ tık → Yapıştır deneyin

### Tablolar Bozuk Görünüyor
- TinyMCE tablo araçlarını kullanarak düzeltin
- Toolbar'da tablo düzenleme butonları var

### Değişkenler Eklenmiyor
- Önce editör alanına tıklayın
- "Değişken Ekle" butonunu kullanın

## 📞 Build Test

```bash
npm run build
```

**Sonuç:** ✅ Build başarılı!
- Tüm TypeScript hataları düzeltildi
- ESLint kurallarına uygun
- Production-ready

## 🚀 Sonraki Adımlar (Opsiyonel)

1. **TinyMCE Cloud Key** (Uyarıları gidermek için)
   - https://www.tiny.cloud/
   - Ücretsiz key alın
   - `apiKey` prop'una ekleyin

2. **Resim Yükleme**
   - Supabase Storage entegrasyonu
   - Drag & drop resim

3. **PDF Önizleme**
   - Kaydetmeden önce PDF'i göster

4. **Şablon Paylaşma**
   - Şablonları export/import

## ✅ Sonuç

Yeni Word tarzı şablon düzenleyici **tamamen çalışır durumda** ve production-ready! 

### ✨ Avantajlar
- Word'den kolay kopyala-yapıştır
- Tablolar tamamen destekleniyor
- Çok sayfalı belgeler
- Profesyonel görünüm
- Eski sistem ile uyumlu

Artık Word'den içerikleri direkt kopyalayıp yapıştırabilir ve hızlıca profesyonel şablonlar oluşturabilirsiniz! 🎉
