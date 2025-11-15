# ✅ Hata Düzeltildi - Şablon Kullanım Rehberi

## 🐛 Sorun

**Hata:** `TypeError: tc.replace is not a function`

**Sebep:** TC Kimlik Numarası veritabanından `number` olarak geliyordu, `string` olarak işleniyordu.

## ✅ Yapılan Düzeltmeler

### 1. Helper Fonksiyonlar Güncellendi

```typescript
// Önce
function formatTcNo(tc: string | null): string

// Sonra
function formatTcNo(tc: string | number | null): string
```

Artık hem string hem de number değerler kabul ediliyor ve otomatik olarak string'e çevriliyor.

### 2. Yeni Değişkenler Eklendi

| Değişken | Açıklama | Örnek Kullanım |
|----------|----------|----------------|
| `{sirket_adres_duzgun}` | Şirket adresi (başharfler büyük) | Kocatepe Mahallesi, Paşa Caddesi... |
| `{sgk_isyeri_sicil}` | SGK İşyeri Sicil No | 4 8299 01 01 1041135 068 01 61 |
| `{dogum_yili}` | Sadece doğum yılı | 1990 |

### 3. Şirket Bilgileri Güncellendi

```
Eski: {sirket_adres} → İstanbul, Türkiye
Yeni: {sirket_adres} → Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul
```

## 📝 Şablonunuzdaki Düzeltilmesi Gerekenler

### ❌ Hatalı Kullanım

```
{sirket_adres_duzgun }ffff
```

**Sorunlar:**
1. Değişken adından sonra boşluk var
2. `ffff` gibi fazladan karakterler var

### ✅ Doğru Kullanım

```
{sirket_adres_duzgun}
```

## 🎯 Şablonunuz İçin Önerilen Değişkenler

Şablonunuzda kullandığınız bölümler için doğru değişkenler:

### 1. Şirket Bilgileri Bölümü

```
İŞVERENİN
Adı Soyadı(Unvanı)     : {sirket_adi}
Adresi                 : {sirket_adres_duzgun}
SGK İşyeri Sicil No    : {sgk_isyeri_sicil}
```

### 2. İşçi Bilgileri Bölümü

```
İŞÇİNİN
Adı Soyadı             : {personel_adi_duzgun}
Baba Adı               : {baba_adi_duzgun}
Doğum Yeri ve Yılı     : {dogum_yeri_duzgun} {dogum_yili}
İkametgâh Adresi       : {adres_duzgun}
Telefon Numarası       : {telefon}
T.C. Kimlik Numarası   : {tc_no}
```

**Not:** TC No'yu formatlanmış şekilde istiyorsanız: `{tc_no_duzgun}` → `123 456 789 01`

### 3. İş Tanımı Bölümü

```
İşçi, {pozisyon_duzgun} (unvanı) olarak çalışacaktır.
Çalışma bölgesi: {bolge_duzgun}
Departman: {departman_duzgun}
```

## 🔧 Test Adımları

1. ✅ **Şablonu Düzeltin**
   - `{sirket_adres_duzgun }ffff` → `{sirket_adres_duzgun}`
   - Tüm değişkenlerde boşluk olmadığından emin olun

2. ✅ **Şablonu Yeniden Yükleyin**
   - Dashboard → Şablonlar
   - İş Sözleşmesi Şablonu'nu seç
   - "Güncelle" butonuna tıkla
   - Yeni Word dosyasını yükle

3. ✅ **Test Edin**
   - Dashboard → Personel
   - Herhangi bir personel seç
   - 📄 Sözleşme Oluştur butonuna tıkla
   - Belge indirilmeli

## 📋 Tam Değişken Listesi

Şablonunuzda kullanabileceğiniz tüm değişkenler:

### Personel Kimlik
- `{personel_adi}` - AHMET YILMAZ (orijinal)
- `{personel_adi_duzgun}` - Ahmet Yılmaz ⭐ **ÖNERİLEN**
- `{tc_no}` - 12345678901
- `{tc_no_duzgun}` - 123 456 789 01 ⭐ **ÖNERİLEN**

### Doğum Bilgileri
- `{dogum_tarihi}` - 15/06/1990
- `{dogum_yili}` - 1990
- `{dogum_yeri_duzgun}` - İstanbul
- `{baba_adi_duzgun}` - Mehmet

### İletişim
- `{telefon}` - 0532 123 45 67
- `{email}` - ahmet@aykamatrix.com
- `{adres_duzgun}` - Kadıköy, İstanbul

### İş Bilgileri
- `{pozisyon_duzgun}` - Teknisyen
- `{bolge_duzgun}` - İstanbul Anadolu
- `{departman_duzgun}` - Teknik Servis
- `{ise_giris_tarihi}` - 01/03/2020

### Şirket Bilgileri
- `{sirket_adi}` - AY-KA DOĞALGAZ ENERJİ...
- `{sirket_adres_duzgun}` - Kocatepe Mahallesi, Paşa Caddesi...
- `{sgk_isyeri_sicil}` - 4 8299 01 01 1041135 068 01 61

### Tarihler
- `{bugun_tarihi}` - 13/11/2025
- `{sozlesme_tarihi}` - 01/03/2020
- `{yil}` - 2025
- `{ay}` - Kasım

## ⚠️ Önemli Hatırlatmalar

### ✅ Yapılması Gerekenler

1. Değişken adlarını **tam olarak** kopyala-yapıştır yapın
2. Süslü parantezleri unutmayın: `{degisken_adi}`
3. Değişken adından sonra/önce **boşluk bırakmayın**
4. İsimlerde `_duzgun` ekini kullanın (başharfler büyük için)

### ❌ Yapılmaması Gerekenler

1. Değişken adını değiştirmeyin: `{personel adi}` ❌
2. Ekstra karakter eklemeyin: `{tc_no}ffff` ❌
3. Boşluk bırakmayın: `{tc_no }` ❌
4. Türkçe karakter kullanmayın: `{personel_adı}` ❌

## 🎨 Örnek Düzeltilmiş Şablon

```
İŞ SÖZLEŞMESİ

Aydınlatma Hatlarına Modem ve Sayaç Takımı ile Tesis Yapım 
işlerine ilişkin işlerde, {pozisyon_duzgun} (unvanı) olarak 
çalışacaktır.

1.TARAFLAR

İŞVERENİN
Adı Soyadı(Unvanı)     : {sirket_adi}
Adresi                 : {sirket_adres_duzgun}
SGK İşyeri Sicil No    : {sgk_isyeri_sicil}

İŞÇİNİN
Adı Soyadı             : {personel_adi_duzgun}
Baba Adı               : {baba_adi_duzgun}
Doğum Yeri ve Yılı     : {dogum_yeri_duzgun} {dogum_yili}
İkametgâh Adresi       : {adres_duzgun}
Telefon Numarası       : {telefon}
T.C. Kimlik Numarası   : {tc_no}

2.İŞÇİNİN ÇALIŞMA YERİ

İşçi, {pozisyon_duzgun} görev ve işinde çalışmayı kabul 
ve taahhüt etmiştir. {departman_duzgun}
```

## 🚀 Sonraki Adımlar

1. ✅ Şablonu yukarıdaki örneklere göre düzeltin
2. ✅ `{sirket_adres_duzgun }ffff` → `{sirket_adres_duzgun}` olarak değiştirin
3. ✅ Şablonu kaydedin
4. ✅ Dashboard'dan şablonu yeniden yükleyin
5. ✅ Test personeli ile sözleşme oluşturun
6. ✅ İndirilen belgeyi kontrol edin

## 📞 Hala Sorun mu Var?

Eğer hata devam ediyorsa:

1. Browser console'u açın (F12)
2. Network sekmesinde hata detaylarını görün
3. Server terminalindeki log'ları kontrol edin
4. "Değişkenler Kılavuzu" dökümanını indirin (Şablonlar sayfasından)

---

**Güncelleme:** 13 Kasım 2025  
**Durum:** ✅ Hata Düzeltildi, Test Edilebilir
