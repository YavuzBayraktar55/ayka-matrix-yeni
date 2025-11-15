# Evrak Veritabanına Kaydetme Özelliği

## 📋 Özellik Açıklaması

Evraklar sayfasında önizleme yaparken artık PDF'i indirmenin yanı sıra **veritabanına da kaydedebilirsiniz**. Bu özellik:

- ✅ Seçilen evrak ve personel için PDF oluşturur
- ✅ PDF'i Supabase Storage'a yükler
- ✅ Evrak kaydını veritabanına işler
- ✅ Personel bazında klasörleme yapar
- ✅ Evrak geçmişi tutar

## 🚀 Kurulum

### 1. Veritabanı Tablosunu Oluşturun

Supabase Dashboard > SQL Editor'a gidin ve `evrak-kayitlari-tablo.sql` dosyasındaki SQL kodunu çalıştırın.

Bu script:
- `EvrakKayitlari` tablosunu oluşturur
- `evraklar` storage bucket'ını oluşturur
- Gerekli RLS politikalarını ayarlar
- Index'leri oluşturur

### 2. Storage Bucket Kontrolü

Supabase Dashboard > Storage bölümünden `evraklar` bucket'ının oluşturulduğunu kontrol edin.

## 💻 Kullanım

1. **Evraklar** sayfasına gidin
2. Bir şablon seçin
3. Bir personel seçin
4. Önizleme açıldığında:
   - 🔵 **Veritabanına Kaydet** butonu ile evrakı kaydedin
   - 🟢 **PDF İndir** butonu ile PDF olarak indirin

## 📁 Veri Yapısı

### EvrakKayitlari Tablosu

```sql
- EvrakID: Otomatik artan ID
- PersonelTcKimlik: Evrakın ait olduğu personel
- SablonAdi: Kullanılan şablon adı
- SablonTuru: Şablon türü (genel, izin, avans, vb.)
- EvrakTarihi: Evrak tarihi
- Aciklama: Evrak açıklaması
- PDFYolu: Storage'daki dosya yolu
- OlusturanEmail: Evrakı oluşturan kullanıcı
- OlusturmaTarihi: Oluşturulma tarihi
```

### Storage Yapısı

```
evraklar/
  ├── {PersonelTcKimlik}/
  │   ├── {EvrakID}_{SablonAdi}_{timestamp}.pdf
  │   ├── {EvrakID}_{SablonAdi}_{timestamp}.pdf
  │   └── ...
```

## 🔒 Güvenlik

### RLS Politikaları

- **Görüntüleme**: Koordinatör, İK ve Yöneticiler tüm evrakları görebilir
- **Ekleme**: Yetkili personel evrak ekleyebilir
- **Güncelleme**: Yetkili personel evrak güncelleyebilir
- **Personel Erişimi**: Personeller sadece kendi evraklarını görebilir

### Storage Politikaları

- **Yükleme**: Sadece yetkili personel yükleyebilir
- **Görüntüleme**: Yetkili personel tüm PDF'leri, personeller kendi PDF'lerini görebilir
- **Silme**: Sadece Yönetici ve İK silebilir

## 🔧 API Endpoint

### POST /api/evrak-kaydet

**Request Body:**
```json
{
  "personelTcKimlik": "12345678901",
  "sablonAdi": "İşe Giriş Evrakı",
  "sablonTuru": "ise_giris",
  "pdfBase64": "data:application/pdf;base64,...",
  "evrakTarihi": "2025-10-30T10:00:00Z",
  "aciklama": "Personel için oluşturulan evrak"
}
```

**Response:**
```json
{
  "success": true,
  "evrakId": 123,
  "message": "Evrak başarıyla kaydedildi"
}
```

## 📊 Gelecek Geliştirmeler

- [ ] Evrak listesi sayfası
- [ ] Evrak arama ve filtreleme
- [ ] Evrak silme özelliği
- [ ] Toplu evrak indirme
- [ ] Evrak şablonu yönetimi
- [ ] E-imza entegrasyonu
- [ ] Evrak onay akışı

## 🐛 Sorun Giderme

### "Bucket bulunamadı" hatası
- Supabase Dashboard > Storage'dan `evraklar` bucket'ını manuel oluşturun
- Public erişimi kapalı olarak ayarlayın

### "Yetki hatası" 
- RLS politikalarının doğru kurulduğundan emin olun
- Kullanıcınızın PersonelRole'ünün yetkili olduğunu kontrol edin

### "PDF oluşturulamadı"
- Tarayıcı konsolunu kontrol edin
- Sayfa içeriğinin tam yüklendiğinden emin olun

## 📞 Destek

Herhangi bir sorun veya öneri için lütfen issue açın.
