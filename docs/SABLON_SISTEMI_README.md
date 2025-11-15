# 📚 Şablon Sistemi - Hızlı Başlangıç

## 🎯 Amaç

Bu sistem, Word şablonlarınızı Supabase Storage'da merkezi olarak saklamanıza ve personel bilgilerini otomatik olarak doldurup belgeler oluşturmanıza olanak tanır.

## 📋 Ana Özellikler

- ✅ **Merkezi Şablon Yönetimi**: Tüm Word şablonları tek yerde
- ✅ **Otomatik Doldurma**: Personel bilgileri otomatik olarak yerleşir
- ✅ **Versiyon Kontrolü**: Her güncelleme numaralandırılır
- ✅ **Format Desteği**: Büyük/küçük harf otomatik dönüşümü
- ✅ **Güvenli Depolama**: Supabase Storage ile güvenli saklanma

## 🚀 Hızlı Başlangıç

### 1️⃣ Şablon Oluşturma

1. Word'de yeni bir belge oluşturun
2. Değişkenleri süslü parantez içinde yazın: `{degisken_adi}`
3. Dosyayı `.docx` formatında kaydedin

**Örnek:**
```
İş Sözleşmesi

Sayın {personel_adi_duzgun},
TC Kimlik No: {tc_no_duzgun}
Doğum Tarihi: {dogum_tarihi}

{pozisyon_duzgun} pozisyonunda {ise_giris_tarihi} 
tarihinde başlamak üzere işe alınmıştır.
```

### 2️⃣ Şablonu Yükleme

1. Dashboard → Şablonlar sayfasına gidin
2. "Yeni Şablon Yükle" butonuna tıklayın
3. Formu doldurun:
   - **Şablon Adı**: İş Sözleşmesi Şablonu
   - **Şablon Türü**: Sözleşme
   - **Açıklama**: Standart iş sözleşmesi
   - **Dosya**: .docx dosyanızı seçin
4. "Yükle" butonuna tıklayın

### 3️⃣ Belge Oluşturma

1. Dashboard → Personel sayfasına gidin
2. İlgili personelin yanındaki 📄 butonuna tıklayın
3. Belge otomatik olarak oluşturulup indirilir

## 📖 Değişkenler Kılavuzu

### En Çok Kullanılan Değişkenler

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `{personel_adi_duzgun}` | Ad Soyad (Her kelime baş harf büyük) | Ahmet Yılmaz |
| `{tc_no_duzgun}` | TC No (formatlanmış) | 123 456 789 01 |
| `{dogum_tarihi}` | Doğum tarihi | 15/06/1990 |
| `{pozisyon_duzgun}` | Pozisyon | Teknisyen |
| `{bolge_duzgun}` | Bölge | İstanbul Anadolu |
| `{ise_giris_tarihi}` | İşe giriş tarihi | 01/03/2020 |
| `{telefon}` | Telefon numarası | 0532 123 45 67 |
| `{email}` | E-posta | ahmet@aykamatrix.com |

**📄 Tam Liste:** Şablonlar sayfasından "Değişkenler Kılavuzu" butonuyla indirin.

## 🎨 Format Kuralları

### Büyük/Küçük Harf Çeşitleri

Her text değişkeni 3 formatta kullanılabilir:

```
{personel_adi}          → AHMET YILMAZ (orijinal - DB'deki hali)
{personel_adi_duzgun}   → Ahmet Yılmaz (önerilen - başharfler büyük)
{personel_adi_kucuk}    → ahmet yılmaz (tamamen küçük)
```

**Önerilen:** İsimlerde ve metin alanlarında `_duzgun` ekini kullanın.

### TC Kimlik No Formatı

```
{tc_no}          → 12345678901
{tc_no_duzgun}   → 123 456 789 01
```

## 🔄 Güncelleme İşlemleri

### Şablon Güncelleme

1. Şablonlar sayfasında "Güncelle" butonuna tıklayın
2. Yeni dosya seçin veya bilgileri değiştirin
3. Versiyon otomatik olarak artırılır (v1 → v2)

### Şablon İndirme

1. İlgili şablonun "İndir" butonuna tıklayın
2. Word'de açıp düzenleyin
3. "Güncelle" ile yeni versiyonu yükleyin

## ⚠️ Önemli Notlar

### ✅ Yapılması Gerekenler

- Değişken isimlerini **tam olarak** kopyalayın
- **Türkçe karakter** kullanmayın (`personel_adı` ❌ `personel_adi` ✅)
- Değişkenleri **süslü parantez** içinde yazın
- Test için **önce deneme** belgesi oluşturun

### ❌ Yapılmaması Gerekenler

- Değişken isimlerini değiştirmeyin
- Track Changes açık tutmayın
- Şablon içinde formül kullanmayın
- 50 MB'tan büyük dosya yüklemeyin

## 🐛 Sorun Giderme

### Değişken Görünüyor (Dolmuyor)

❌ Hatalı: `{personel adi}` (boşluk var)  
✅ Doğru: `{personel_adi}`

### İsimler Büyük Harfle Çıkıyor

❌ Kullanılan: `{personel_adi}` → AHMET YILMAZ  
✅ Kullanılmalı: `{personel_adi_duzgun}` → Ahmet Yılmaz

### Belge Oluşturulmuyor

1. Şablonun yüklendiğinden emin olun
2. Personel bilgilerinin eksiksiz olduğunu kontrol edin
3. Browser console'da hata var mı bakın

## 📞 Destek

Sorun yaşarsanız:
1. Önce "Değişkenler Kılavuzu"nu indirip kontrol edin
2. Şablon test edin (test personeli ile)
3. Sorun devam ederse sistem yöneticisine ulaşın

## 🎓 Video Eğitimler (İleride Eklenecek)

- [ ] Şablon Oluşturma
- [ ] Değişken Kullanımı
- [ ] Belge Oluşturma
- [ ] Güncelleme İşlemleri

---

**Son Güncelleme:** 13 Kasım 2025  
**Versiyon:** 1.0.0

