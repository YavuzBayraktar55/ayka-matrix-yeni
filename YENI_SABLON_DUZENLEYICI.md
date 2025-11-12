# Yeni Şablon Düzenleyici - Kullanım Kılavuzu

## 🎉 Özellikler

### ✅ Tamamlanan Özellikler

1. **Word Benzeri Profesyonel Editör**
   - TinyMCE tabanlı zengin metin editörü
   - Word'den doğrudan kopyala-yapıştır desteği
   - Tablolar dahil tüm formatlama korunur

2. **A4 Sayfa Düzeni**
   - Gerçek A4 boyutlarında (794px x 1123px) çalışma alanı
   - Çok sayfalı belgeler için otomatik sayfa bölme
   - Print-ready formatında

3. **Değişken Yönetimi**
   - Mevcut placeholder sistemi tamamen korundu
   - Kategorize edilmiş değişkenler (Genel, İzin, Avans)
   - Kolay ekleme ve görsel ayırt etme

4. **Tablo Desteği**
   - Word'den tablo kopyala-yapıştır
   - Editörde tablo düzenleme araçları
   - Satır/sütun ekleme-silme
   - Hücre birleştirme

5. **Çoklu Belge Desteği**
   - Birden fazla Word belgesini alt alta yapıştırabilirsiniz
   - Her belge kendi formatını korur

## 📍 Erişim

**URL:** `/dashboard/yeni-sablon-duzenleyici`

## 🎯 Kullanım

### Yeni Şablon Oluşturma

1. **Şablon Bilgileri**
   - Şablon adı girin
   - Şablon türünü seçin (Genel, İzin, Avans, İşe Giriş, İşten Çıkış)

2. **İçerik Ekleme**
   - Word'den içeriği kopyalayıp yapıştırın
   - Tablolar otomatik olarak korunur
   - Birden fazla Word belgesini alt alta yapıştırabilirsiniz

3. **Değişken Ekleme**
   - "Değişken Ekle" butonuna tıklayın
   - Kategoriden uygun değişkeni seçin
   - Değişken otomatik olarak mavi renkli etiket olarak eklenir

4. **Kaydetme**
   - "Kaydet" butonuna tıklayın
   - Şablon veritabanına kaydedilir
   - Evraklar sayfasından kullanılabilir

### Mevcut Şablon Düzenleme

1. "Şablonlar" butonuna tıklayın
2. Düzenlemek istediğiniz şablonu seçin
3. Değişiklikleri yapın
4. "Kaydet" butonuna tıklayın

### Şablon Silme

1. "Şablonlar" listesinde
2. İlgili şablonun yanındaki çöp kutusu ikonuna tıklayın
3. Onaylayın

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler

- **TinyMCE 6**: Profesyonel rich text editor
- **@tinymce/tinymce-react**: React entegrasyonu
- **React 19**: En güncel React sürümü
- **Next.js 15**: App router
- **TypeScript**: Tip güvenliği

### Özellikler

```typescript
// TinyMCE Plugins
plugins: [
  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
  'pagebreak', 'paste'
]

// Paste Ayarları
paste_data_images: true
paste_as_text: false
paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,h6,p,br,ul,ol,li,table,thead,tbody,tfoot,tr,td,th,div,span,a'
paste_retain_style_properties: 'color font-size font-weight text-decoration text-align background-color'
```

## 📝 Değişkenler

### Genel Bilgiler
- `{personel_adi}` - Personel Adı Soyadı
- `{tc_no}` - TC Kimlik No
- `{dogum_tarihi}` - Doğum Tarihi
- `{bolge}` - Bölge
- `{isyeri_sicil}` - İşyeri Sicil No
- `{hazirlama_tarihi}` - Hazırlanma Tarihi

### İzin Bilgileri
- `{izin_baslangic}` - İzin Başlangıç
- `{izin_bitis}` - İzin Bitiş
- `{izin_gun}` - İzin Gün Sayısı
- `{izin_turu}` - İzin Türü
- `{izin_hazirlama_tarihi}` - İzin Hazırlama Tarihi

### Avans Bilgileri
- `{avans_miktar}` - Avans Miktarı
- `{avans_tarih}` - Avans Talep Tarihi
- `{avans_aciklama}` - Avans Açıklaması

## 🔄 Mevcut Sistem ile Uyumluluk

- Eski şablon düzenleyici (`/dashboard/sablon-duzenleyici`) korundu
- Aynı veritabanı tablosu kullanılıyor (`EvrakSablonlari`)
- Aynı API endpoint'leri kullanılıyor (`/api/sablonlar`)
- Evraklar sayfası her iki düzenleyiciden oluşturulan şablonları kullanabilir

## ⚠️ Notlar

1. **TinyMCE API Key**: Şu an "no-api-key" kullanılıyor. Production'da uyarı görebilirsiniz. Ücretsiz TinyMCE Cloud key alabilirsiniz: https://www.tiny.cloud/

2. **Word'den Kopyalama**: 
   - Ctrl+C ile kopyalayın
   - Editöre tıklayın
   - Ctrl+V ile yapıştırın
   - Formatlar otomatik korunur

3. **Tablolar**:
   - Word'deki tüm tablo formatları korunur
   - Editörde tablo düzenleme araçları mevcuttur
   - Birleştirilmiş hücreler desteklenir

4. **Çok Sayfalı Belgeler**:
   - İçerik uzunsa otomatik olarak sayfalara bölünür
   - PDF oluştururken sayfa düzeni korunur

## 🚀 Sonraki Adımlar

- [ ] TinyMCE Cloud API key ekleyin (optional)
- [ ] Resim yükleme özelliği eklenebilir
- [ ] PDF önizleme özelliği eklenebilir
- [ ] Şablon kopyalama özelliği eklenebilir

## 📞 Destek

Sorun yaşarsanız:
1. Browser console'u kontrol edin
2. Network sekmesinde API çağrılarını inceleyin
3. Build loglarını kontrol edin: `npm run build`
