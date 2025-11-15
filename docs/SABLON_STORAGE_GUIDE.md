# 📁 Şablon Yönetim Sistemi - Supabase Storage Entegrasyonu

## 🎯 Amaç

Word şablonlarını (`.docx`) Supabase Storage'da saklamak ve yönetmek. Şablonlar artık projenin içinde değil, Supabase'de bulunuyor.

---

## 📋 1. Supabase Hazırlık Adımları

### 1.1 Storage Bucket Oluşturma

1. Supabase Dashboard → **Storage** → **Create a new bucket**
2. Ayarlar:
   - **Name:** `sablonlar`
   - **Public bucket:** ❌ (Kapalı)
   - **File size limit:** 50 MB
   - **Allowed MIME types:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 1.2 SQL'i Çalıştırma

`supabase-sablonlar-tablo.sql` dosyasını Supabase SQL Editor'de çalıştırın:

```bash
# Dosya: supabase-sablonlar-tablo.sql
```

Bu SQL:
- ✅ `SablonDosyalari` tablosunu oluşturur
- ✅ RLS politikalarını ayarlar
- ✅ Varsayılan şablon kayıtlarını ekler

---

## 🗄️ 2. Veritabanı Şeması

### Tablo: `SablonDosyalari`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `SablonID` | UUID | Primary Key |
| `SablonAdi` | VARCHAR(255) | Şablon adı (örn: "İş Sözleşmesi") |
| `SablonTuru` | VARCHAR(50) | `'sozlesme'`, `'izin'`, `'avans'`, `'genel'` |
| `DosyaAdi` | VARCHAR(255) | Storage'daki dosya adı |
| `DosyaYolu` | TEXT | Storage path |
| `DosyaBoyutu` | BIGINT | Bytes cinsinden |
| `Versiyon` | INTEGER | Her güncellemede +1 |
| `Aciklama` | TEXT | Opsiyonel açıklama |
| `YukleyenKullanici` | BIGINT | PersonelTcKimlik (FK) |
| `created_at` | TIMESTAMP | Oluşturma tarihi |
| `updated_at` | TIMESTAMP | Güncelleme tarihi |

---

## 🔒 3. RLS (Row Level Security) Politikaları

### Storage Bucket Politikaları

```sql
-- Okuma: Tüm authenticated kullanıcılar
SELECT ON storage.objects WHERE bucket_id = 'sablonlar'

-- Yazma: Sadece İK ve Yönetici
INSERT/UPDATE/DELETE ON storage.objects 
WHERE bucket_id = 'sablonlar' 
AND role IN ('insan_kaynaklari', 'yonetici')
```

### Tablo Politikaları

```sql
-- Okuma: Herkes
SELECT ON SablonDosyalari

-- Yazma: Sadece İK ve Yönetici
INSERT/UPDATE/DELETE ON SablonDosyalari
WHERE user.role IN ('insan_kaynaklari', 'yonetici')
```

---

## 🚀 4. API Endpoints

### GET `/api/sablon-dosyalari`
Şablon listesini getir

**Query Params:**
- `tur` (optional): Şablon türüne göre filtrele

**Response:**
```json
{
  "data": [
    {
      "SablonID": "uuid",
      "SablonAdi": "İş Sözleşmesi",
      "SablonTuru": "sozlesme",
      "DosyaBoyutu": 245760,
      "Versiyon": 3,
      "created_at": "2025-11-12T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST `/api/sablon-dosyalari`
Yeni şablon yükle

**Content-Type:** `multipart/form-data`

**Body:**
```
file: File (.docx)
sablonAdi: string
sablonTuru: 'sozlesme' | 'izin' | 'avans' | 'genel'
aciklama: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": { /* şablon metadata */ },
  "message": "Şablon başarıyla yüklendi"
}
```

---

### PUT `/api/sablon-dosyalari`
Şablonu güncelle

**Content-Type:** `multipart/form-data`

**Body:**
```
sablonId: string (UUID)
file: File (optional) - Yeni dosya
sablonAdi: string (optional)
aciklama: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": { /* güncel metadata */ },
  "message": "Şablon başarıyla güncellendi"
}
```

---

### DELETE `/api/sablon-dosyalari?id=uuid`
Şablonu sil

**Response:**
```json
{
  "success": true,
  "message": "Şablon başarıyla silindi"
}
```

---

### GET `/api/sablon-indir?id=uuid`
Şablon dosyasını indir

**Response:** Word dosyası (`.docx`)

---

### POST `/api/sozlesme-olustur`
Sözleşme oluştur (Şablon + Değişken)

**Body:**
```json
{
  "personelId": "12345678901",
  "sablonTuru": "sozlesme"
}
```

**İşlem Akışı:**
1. `SablonDosyalari` tablosundan şablon metadata al
2. Supabase Storage'dan `.docx` dosyasını indir
3. Personel bilgilerini al
4. Docxtemplater ile değişkenleri doldur
5. Kişiselleştirilmiş Word dosyasını döndür

---

## 🖥️ 5. UI Akışı

### Menü: "Şablonlar" (`/dashboard/sablonlar`)

**Özellikler:**
- 📋 Mevcut şablonları listele
- ➕ Yeni şablon yükle
- 📥 Şablonu indir (düzenlemek için)
- 🔄 Düzenlenmiş şablonu güncelle
- 🗑️ Şablon sil

**Kullanıcı Akışı:**

#### 1. İlk Şablon Yükleme
```
1. "Yeni Şablon Yükle" butonuna tıkla
2. Formu doldur:
   - Şablon Adı: "İş Sözleşmesi"
   - Şablon Türü: "sozlesme"
   - Dosya Seç: sozlesme-sablon.docx
   - Açıklama: (opsiyonel)
3. "Yükle" butonuna tıkla
4. ✅ Şablon Supabase'e yüklendi
```

#### 2. Şablon Düzenleme
```
1. Şablon listesinde "İndir" butonuna tıkla
2. Dosya bilgisayara indirilir
3. Word'de aç ve düzenle (değişkenleri koru: {personel_adi})
4. Kaydet
5. Şablon listesinde "Güncelle" butonuna tıkla
6. Düzenlenmiş dosyayı seç
7. ✅ Yeni versiyon Supabase'e yüklendi (Versiyon +1)
```

#### 3. Sözleşme Oluşturma
```
1. Personel listesinde bir personeli seç
2. "Sözleşme Oluştur" (📄 sarı buton) butonuna tıkla
3. Sistem:
   - Supabase'den şablonu indirir
   - Personel bilgilerini çeker
   - Değişkenleri doldurur
4. Kişiselleştirilmiş Word dosyası indirilir
```

---

## 📝 6. Değişkenler (Template Variables)

Şablonunuzda kullanabileceğiniz değişkenler:

```
{personel_tam_adi}
{tc_no}
{dogum_tarihi}
{dogum_yeri}
{baba_adi}
{medeni_hali}
{es_gelir}
{cocuk_sayisi}
{telefon}
{email}
{adres}
{bolge}
{pozisyon}
{departman}
{mezuniyet}
{bolum}
{askerlik_durum}
{tecil_bitis}
{ehliyet}
{kan_grubu}
{iban_no}
{agi_yuzdesi}
{engel_orani}
{dogalgaz_belge}
{dogalgaz_belge_gecerlilik}
{ic_tesisat_belge}
{ic_tesisat_belge_gecerlilik}
{ise_giris_tarihi}
{kidem_tarihi}
{sozlesme_tarihi}
{hazirlama_tarihi}
{bugun_tarihi}
{yil}
{ay}
{gun}
{sirket_adi}
{sirket_adres}
{sirket_telefon}
{sirket_email}
```

**Örnek Kullanım:**
```
İŞ SÖZLEŞMESİ

TC No: {tc_no}
Ad Soyad: {personel_tam_adi}
Doğum Tarihi: {dogum_tarihi}
Adres: {adres}
Telefon: {telefon}

İşe Giriş Tarihi: {ise_giris_tarihi}
Pozisyon: {pozisyon}
Bölge: {bolge}
```

---

## 🔄 7. Versiyon Yönetimi

Her şablon güncellemesinde:
- ✅ Eski dosya silinir
- ✅ Yeni dosya yüklenir
- ✅ `Versiyon` sütunu +1 artar
- ✅ `updated_at` güncellenir

**Örnek:**
```
İlk yükleme: Versiyon 1
1. Güncelleme: Versiyon 2
2. Güncelleme: Versiyon 3
```

---

## 🛡️ 8. Güvenlik

### Kimler Ne Yapabilir?

| Rol | Okuma | Yükleme | Güncelleme | Silme |
|-----|-------|---------|------------|-------|
| Saha Personeli | ❌ | ❌ | ❌ | ❌ |
| Koordinatör | ❌ | ❌ | ❌ | ❌ |
| İnsan Kaynakları | ✅ | ✅ | ✅ | ✅ |
| Yönetici | ✅ | ✅ | ✅ | ✅ |

---

## 📦 9. Dosya Boyut Limitleri

- **Storage:** 50 MB/dosya
- **API Upload:** Sınırsız (Node.js buffer)
- **Tavsiye:** Şablon dosyaları 1-5 MB arası olmalı

---

## 🚨 10. Hata Yönetimi

### Şablon Bulunamadı
```json
{
  "error": "sozlesme türünde şablon bulunamadı. Lütfen önce şablon yükleyin."
}
```

**Çözüm:** İlgili türde şablon yükleyin

---

### Dosya İndirilemedi
```json
{
  "error": "Dosya indirilemedi",
  "details": "Object not found"
}
```

**Çözüm:**
1. Storage bucket'ın varlığını kontrol edin
2. Dosya yolunun doğru olduğunu kontrol edin
3. RLS politikalarını kontrol edin

---

### Yetki Hatası
```json
{
  "error": "Sadece İK ve Yönetici yükleyebilir"
}
```

**Çözüm:** Kullanıcı rolünü kontrol edin

---

## ✅ 11. Checklist

### Supabase Tarafı
- [ ] `sablonlar` bucket'ı oluşturuldu
- [ ] Storage RLS politikaları eklendi
- [ ] `SablonDosyalari` tablosu oluşturuldu
- [ ] Tablo RLS politikaları eklendi
- [ ] Varsayılan kayıtlar eklendi

### Uygulama Tarafı
- [ ] API endpoint'leri hazır
- [ ] Types eklendi (`SablonDosyalari`)
- [ ] Menü öğesi eklendi ("Şablonlar")
- [ ] Sözleşme API Storage entegrasyonu yapıldı

### Test
- [ ] Şablon yükleme çalışıyor
- [ ] Şablon listeleme çalışıyor
- [ ] Şablon indirme çalışıyor
- [ ] Şablon güncelleme çalışıyor
- [ ] Sözleşme oluşturma çalışıyor

---

## 🎉 12. Avantajlar

### Eski Sistem (Local Files)
❌ Dosyalar projenin içinde
❌ Git'e commit edilmeli
❌ Deploy sırasında taşınmalı
❌ Versiyon kontrolü yok
❌ Yedekleme manuel

### Yeni Sistem (Supabase Storage)
✅ Merkezi saklama
✅ Otomatik yedekleme
✅ Versiyon takibi
✅ RLS ile güvenlik
✅ Kolay güncelleme
✅ Metadata yönetimi

---

## 📚 13. Örnek Senaryolar

### Senaryo 1: İlk Kurulum
```bash
1. Supabase → Storage → Create bucket "sablonlar"
2. SQL Editor → Çalıştır supabase-sablonlar-tablo.sql
3. Dashboard → Şablonlar → Yeni Şablon Yükle
4. sozlesme-sablon.docx dosyasını yükle
5. ✅ Hazır!
```

### Senaryo 2: Şablon Güncelleme
```bash
1. Dashboard → Şablonlar → "İş Sözleşmesi" → İndir
2. Word'de aç → Madde ekle → Kaydet
3. Dashboard → Şablonlar → "İş Sözleşmesi" → Güncelle
4. Düzenlenmiş dosyayı seç → Yükle
5. ✅ Versiyon 2 yüklendi!
```

### Senaryo 3: Sözleşme Oluşturma
```bash
1. Dashboard → Personel → Ahmet Yılmaz'ı seç
2. Sözleşme Oluştur (📄) butonuna tıkla
3. ✅ Sozlesme_Ahmet_Yilmaz_1731398400.docx indirildi!
4. Word'de aç → İmza at → Kaydet
```

---

## 🔗 14. İlgili Dosyalar

```
supabase-sablonlar-tablo.sql         # SQL şema
src/app/api/sablon-dosyalari/route.ts # CRUD API
src/app/api/sablon-indir/route.ts     # Download API
src/app/api/sozlesme-olustur/route.ts # Sözleşme API (güncellendi)
src/types/database.ts                 # TypeScript types
src/components/DashboardLayout.tsx    # Menü öğesi
public/templates/README.md            # Değişkenler listesi
```

---

## 🎯 15. Sonraki Adımlar

1. **UI Oluştur:** `/dashboard/sablonlar` sayfasını oluştur
2. **Test Et:** Tüm akışı test et
3. **Dokümante Et:** Kullanıcı kılavuzu hazırla
4. **Deploy Et:** Production'a taşı

---

**Hazırlayan:** GitHub Copilot  
**Tarih:** 12 Kasım 2025  
**Versiyon:** 1.0
