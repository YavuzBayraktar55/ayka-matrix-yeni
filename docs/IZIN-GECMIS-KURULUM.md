# İzin Talep Geçmişi - Kurulum Rehberi

## 🎯 Yeni Özellikler

### ✅ Tamamlanan Özellikler:
1. **İzin Geçmişi Görüntüleme** - Herkes izin taleplerinin tam geçmişini görebilir
2. **Tarih Düzenleme** - Koordinatör ve Yöneticiler izin tarihlerini düzenleyebilir
3. **Otomatik Geçmiş Kaydı** - Tüm işlemler otomatik olarak kaydedilir
4. **Timeline Görünümü** - Modern, görsel zengin geçmiş görüntüleme
5. **Değişiklik Notları** - Her değişiklik için zorunlu not sistemi

## 📋 Kurulum Adımları

### 1. Veritabanı Tablosunu Oluşturun

Supabase Dashboard'a gidin:
1. **SQL Editor** sekmesine tıklayın
2. `supabase-izin-gecmis-tablo.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'e yapıştırın
4. **Run** butonuna tıklayın

Bu işlem:
- ✅ `IzinTalepGecmis` tablosunu oluşturur
- ✅ Gerekli index'leri ekler
- ✅ RLS (Row Level Security) politikalarını ayarlar
- ✅ İzinleri yapılandırır

### 2. Uygulamayı Test Edin

Tarayıcıda **İzin Talepleri** sayfasına gidin:

#### Test Senaryoları:

**1. Yeni İzin Talebi Oluşturma:**
- Yeni izin talebi oluşturun
- Geçmişe otomatik olarak "Oluşturuldu" kaydı düşer

**2. Koordinatör Onayı:**
- Koordinatör olarak giriş yapın
- Bir talebi onaylayın/reddedin
- Not ekleyin
- Geçmişe kayıt düşer

**3. Tarih Düzenleme:**
- Koordinatör/Yönetici olarak giriş yapın
- Bir izin talebinde **"Tarih Düzenle"** butonuna tıklayın
- Yeni tarihleri seçin
- **Değişiklik notu** yazın (zorunlu)
- Kaydedin
- Geçmişe: "27.12.2024 - 30.12.2024 → 28.12.2024 - 31.12.2024. Not: ..." kaydı düşer

**4. Geçmiş Görüntüleme:**
- Herhangi bir izin talebinde **"Geçmiş"** butonuna tıklayın
- Timeline görünümünde tüm işlemleri görün:
  - 📝 Oluşturuldu
  - ✅ Koordinatör Onayı
  - ✅ Yönetim Onayı
  - 📅 Tarih Değiştirildi
  - ❌ Reddedildi
  - 🚫 İptal Edildi

## 🎨 Özellik Detayları

### Geçmiş Modalı (History Modal)

```tsx
// Özellikler:
- Timeline görünümü
- Renkli işlem kartları
- Tarih ve saat gösterimi
- İşlem yapan kişi bilgisi
- Durum değişiklikleri
- Tarih değişiklikleri
- Notlar
```

**Görsel:**
- 🔵 Mavi: Oluşturuldu
- 🟢 Yeşil: Koordinatör Onayı
- 🟢 Emerald: Yönetim Onayı
- 🔴 Kırmızı: Reddedildi
- 🟣 Mor: Tarih Değiştirildi
- ⚫ Gri: İptal Edildi

### Tarih Düzenleme Modalı

```tsx
// Özellikler:
- Mevcut tarihleri gösterir
- Yeni tarih seçimi
- Otomatik gün hesaplama
- Zorunlu değişiklik notu
- Geçmişe otomatik kayıt
```

**Yetki:**
- ✅ Koordinatör: Düzenleyebilir
- ✅ Yönetici: Düzenleyebilir
- ✅ İnsan Kaynakları: Düzenleyebilir
- ❌ Saha Personeli: Düzenleyemez

### API Routes

**1. GET `/api/izin-gecmis?talepId=123`**
- Belirli bir talebin geçmişini getirir
- Tüm işlemleri kronolojik sırada döndürür

**2. POST `/api/izin-gecmis`**
- Yeni geçmiş kaydı ekler
- Otomatik olarak çağrılır (manuel çağrı gerektirmez)

## 🔐 Güvenlik

### RLS Politikaları:
- **SELECT**: Herkes kendi erişebildiği taleplerin geçmişini görebilir
- **INSERT**: Sadece sistem ekleyebilir (API üzerinden)
- **UPDATE**: YASAK - Geçmiş değiştirilemez
- **DELETE**: YASAK - Geçmiş silinemez

### Veri Bütünlüğü:
- Geçmiş kayıtları **immutable** (değiştirilemez)
- Tüm değişiklikler kalıcı olarak saklanır
- Audit trail (denetim izi) oluşturur

## 📊 Veritabanı Şeması

```sql
IzinTalepGecmis:
- GecmisID (PK)
- TalepID (FK → IzinTalepleri)
- IslemTarihi
- IslemYapan (FK → PersonelLevelizasyon)
- IslemTipi
- EskiDurum / YeniDurum
- EskiBaslangic / YeniBaslangic
- EskiBitis / YeniBitis
- Not
- IslemYapanAd
```

## 🎯 Kullanım Örnekleri

### Senaryo 1: İzin Tarihi Değişikliği
```
1. Personel 27-30 Aralık için izin talep eder
2. Koordinatör onaylar
3. Yönetici tarihi 28-31 Aralık'a çeker
   Not: "Nöbet programı değişti, bir gün ileri alındı"
4. Geçmişte görünür:
   - 📝 27.12.2024 10:30 - Ali Veli tarafından oluşturuldu
   - ✅ 27.12.2024 14:15 - Koordinatör Ayşe onayladı
   - 📅 28.12.2024 09:00 - Yönetici Mehmet tarihleri değiştirdi
     "27-30 Aralık → 28-31 Aralık. Not: Nöbet programı değişti"
```

### Senaryo 2: Red ve Yeniden Talep
```
1. Personel izin talep eder
2. Koordinatör reddeder, not: "Aynı tarihlerde başka personel izinde"
3. Personel farklı tarihle tekrar talep eder
4. İkinci talep onaylanır
5. Her iki talepte de tam geçmiş görünür
```

## 🚀 İleriye Dönük Geliştirmeler

### Potansiyel Özellikler:
- [ ] Excel'e geçmiş raporu dışa aktarma
- [ ] Email bildirimleri (değişiklik yapıldığında)
- [ ] Toplu tarih düzenleme
- [ ] Geçmiş filtreleme (sadece belirli işlem tiplerini göster)
- [ ] İstatistik paneli (en çok kim değişiklik yapıyor, vb.)

## 📝 Notlar

- **Geçmiş silme özelliği YOK** - Bu kasıtlıdır, audit trail korunmalı
- **Tarih düzenleme sınırsız** - Koordinatör/Yönetici istediği kadar düzenleyebilir
- **Not zorunlu** - Tarih değişikliğinde mutlaka neden belirtilmeli
- **Immutable** - Geçmiş kayıtları hiçbir şekilde değiştirilemez

## ❓ Sorun Giderme

### Geçmiş Görünmüyor
1. SQL dosyasını çalıştırdınız mı?
2. RLS aktif mi? (`ALTER TABLE "IzinTalepGecmis" ENABLE ROW LEVEL SECURITY;`)
3. Console'da hata var mı? (F12 → Console)

### Tarih Düzenle Butonu Yok
- Sadece **Koordinatör, Yönetici, İnsan Kaynakları** görebilir
- Saha personeli bu butonu göremez

### API Hatası
1. `.env.local` dosyasında `SUPABASE_SERVICE_ROLE_KEY` var mı?
2. API route'u doğru mu? (`/api/izin-gecmis`)

## ✅ Başarı Kriterleri

Aşağıdaki testi yapın:

1. ✅ Yeni izin talebi oluştur → Geçmişte "Oluşturuldu" görünmeli
2. ✅ Koordinatör onayı → Geçmişte "Koordinatör Onayı" görünmeli
3. ✅ Tarih düzenle → Geçmişte eski ve yeni tarihler görünmeli
4. ✅ Geçmiş modalı aç → Timeline düzgün görünmeli
5. ✅ Farklı roller test et → Herkes kendi yetkisine göre görmeli

## 🎉 Tamamdır!

Artık izin talepleri sisteminiz profesyonel bir audit trail'e sahip!

**Önemli:** Geçmiş kayıtları **asla silinmez**, bu sayede:
- 📊 Raporlama yapılabilir
- 🔍 Sorunlar araştırılabilir
- ⚖️ Hukuki delil oluşturur
- 📈 İstatistikler çıkarılabilir
