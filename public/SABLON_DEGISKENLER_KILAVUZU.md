# 📋 Şablon Değişkenleri Kılavuzu

Bu döküman, AY-KA Matrix sisteminde Word şablonlarında kullanabileceğiniz tüm değişkenleri ve kullanım kurallarını içerir.

## 📌 Genel Kullanım Kuralları

### Değişken Formatı
- Tüm değişkenler **süslü parantez** içinde yazılır: `{degisken_adi}`
- Değişken isimleri **küçük harf** ve **alt çizgi (_)** ile yazılır
- Boşluk karakteri kullanılmaz

### Büyük/Küçük Harf Kontrolü
Bazı değişkenler veritabanında BÜYÜK HARF olarak saklanır. Bunları düzgün formatta kullanmak için:

| Kullanım | Sonuç | Açıklama |
|----------|-------|----------|
| `{personel_adi}` | AHMET YILMAZ | Veritabanındaki hali (tam büyük harf) |
| `{personel_adi_duzgun}` | Ahmet Yılmaz | Her kelimenin ilk harfi büyük |
| `{personel_adi_kucuk}` | ahmet yılmaz | Tamamen küçük harf |

**Önerilen:** İsimlerde `{personel_adi_duzgun}` kullanın.

---

## 👤 Personel Bilgileri

### Kimlik ve Ad-Soyad

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{personel_adi}` | Personelin tam adı (DB'den geldiği gibi) | AHMET YILMAZ |
| `{personel_adi_duzgun}` | Personelin adı (her kelime baş harf büyük) | Ahmet Yılmaz |
| `{personel_tam_adi}` | Tam ad-soyad | AHMET YILMAZ |
| `{tc_no}` | TC Kimlik Numarası | 12345678901 |
| `{tc_no_duzgun}` | TC No (formatlanmış) | 123 456 789 01 |

### Doğum Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{dogum_tarihi}` | Doğum tarihi | 15/06/1990 |
| `{dogum_yeri}` | Doğum yeri | İstanbul |
| `{dogum_yeri_duzgun}` | Doğum yeri (başharfler büyük) | İstanbul |
| `{baba_adi}` | Baba adı | MEHMET |
| `{baba_adi_duzgun}` | Baba adı (düzgün format) | Mehmet |

### Medeni Durum ve Aile

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{medeni_hali}` | Medeni durumu | Evli / Bekar |
| `{es_gelir}` | Eşinin geliri var mı? | Var / Yok |
| `{cocuk_sayisi}` | Çocuk sayısı | 2 |

---

## 📞 İletişim Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{telefon}` | Cep telefonu | 0532 123 45 67 |
| `{email}` | E-posta adresi | ahmet.yilmaz@aykamatrix.com |
| `{adres}` | Tam adres | Kadıköy, İstanbul |
| `{adres_duzgun}` | Adres (başharfler büyük) | Kadıköy, İstanbul |

---

## 💼 İş Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{bolge}` | Çalıştığı bölge/şube | İstanbul Anadolu |
| `{bolge_duzgun}` | Bölge (başharfler büyük) | İstanbul Anadolu |
| `{pozisyon}` | Görevi/pozisyonu | Teknisyen |
| `{pozisyon_duzgun}` | Pozisyon (başharfler büyük) | Teknisyen |
| `{departman}` | Departman/şube | Teknik Servis |
| `{departman_duzgun}` | Departman (başharfler büyük) | Teknik Servis |

---

## 🎓 Eğitim Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{mezuniyet}` | Mezuniyet durumu | Lise |
| `{bolum}` | Okuduğu bölüm | Elektrik-Elektronik |

---

## 🪖 Askerlik Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{askerlik_durum}` | Askerlik durumu | Yapıldı / Tecilli / Muaf |
| `{tecil_bitis}` | Tecil bitiş tarihi | 01/08/2025 |

---

## 🔐 Diğer Bilgiler

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{ehliyet}` | Ehliyet sınıfları | B, C |
| `{kan_grubu}` | Kan grubu | A Rh+ |
| `{iban_no}` | IBAN numarası | TR12 3456 7890 1234 5678 9012 34 |
| `{agi_yuzdesi}` | Asgari geçim indirimi oranı | %20 |
| `{engel_orani}` | Engel oranı (varsa) | %40 |

---

## 📜 Belge Bilgileri

### Mesleki Belgeler

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{dogalgaz_belge}` | Doğalgaz belgesi durumu | Var / Yok |
| `{dogalgaz_belge_gecerlilik}` | Doğalgaz belgesi geçerlilik tarihi | 15/12/2025 |
| `{ic_tesisat_belge}` | İç tesisat belgesi durumu | Var / Yok |
| `{ic_tesisat_belge_gecerlilik}` | İç tesisat belgesi geçerlilik tarihi | 20/10/2026 |

---

## 💰 Maaş Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{maas}` | Maaş (yazı ile) | On Beş Bin Türk Lirası |
| `{maas_rakam}` | Maaş (sayı ile) | 15.000,00 TL |

---

## 📅 Tarih Bilgileri

### İş Tarihleri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{ise_giris_tarihi}` | İşe başlama tarihi | 01/03/2020 |
| `{kidem_tarihi}` | Kıdem başlangıç tarihi | 01/03/2020 |
| `{sozlesme_tarihi}` | Sözleşme imza tarihi | 01/03/2020 |
| `{sozlesme_baslangic}` | Sözleşme başlangıç tarihi | 01/03/2020 |
| `{sozlesme_bitis}` | Sözleşme bitiş tarihi | (Belirsiz süreli için boş) |

### Belge Tarihleri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{hazirlama_tarihi}` | Belgenin hazırlandığı tarih | 13/11/2025 |
| `{bugun_tarihi}` | Bugünün tarihi | 13/11/2025 |
| `{yil}` | Mevcut yıl | 2025 |
| `{ay}` | Mevcut ay (yazı ile) | Kasım |
| `{gun}` | Mevcut gün | 13 |

---

## 🏢 Şirket Bilgileri

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{sirket_adi}` | Şirket unvanı | AY-KA DOĞALGAZ ENERJİ GIDA TURZ. SOFRA ve TAAHHÜT HİZ. SAN. TİC. LTD. ŞTİ. |
| `{sirket_adi_duzgun}` | Şirket unvanı (başharfler büyük) | Ay-Ka Doğalgaz Enerji Gıda Turz. Sofra ve Taahhüt Hiz. San. Tic. Ltd. Şti. |
| `{sirket_adres}` | Şirket adresi | İstanbul, Türkiye |

---

## 🏖️ İzin Şablonu İçin Değişkenler

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{izin_baslangic}` | İzin başlangıç tarihi | 01/08/2025 |
| `{izin_bitis}` | İzin bitiş tarihi | 15/08/2025 |
| `{izin_gun}` | İzin gün sayısı | 14 |
| `{izin_turu}` | İzin türü | Yıllık İzin |
| `{izin_hazirlama_tarihi}` | İzin formunun hazırlandığı tarih | 25/07/2025 |

---

## 💵 Avans Şablonu İçin Değişkenler

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{avans_miktar}` | Avans tutarı | 5.000,00 TL |
| `{avans_tarih}` | Avans talep tarihi | 13/11/2025 |
| `{avans_aciklama}` | Avans açıklaması | Acil ihtiyaç için |

---

## 📝 Ek Alanlar

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `{aciklama}` | Genel açıklama alanı | (Boş veya özel açıklama) |
| `{not}` | Not alanı | (Boş veya özel not) |

---

## 🎨 Örnek Kullanım

### İş Sözleşmesi Örneği

```
İŞ SÖZLEŞMESİ

Bu sözleşme {sozlesme_tarihi} tarihinde {sirket_adi} ile 
{personel_adi_duzgun}, T.C. Kimlik No: {tc_no} arasında aşağıdaki 
şartlar dahilinde yapılmıştır.

MADDE 1 - İŞÇİ BİLGİLERİ
Adı Soyadı: {personel_adi_duzgun}
T.C. Kimlik No: {tc_no}
Doğum Tarihi ve Yeri: {dogum_tarihi} - {dogum_yeri_duzgun}
Baba Adı: {baba_adi_duzgun}
Telefon: {telefon}
E-posta: {email}
Adres: {adres_duzgun}

MADDE 2 - İŞ TANIMI
Pozisyon: {pozisyon_duzgun}
Departman: {departman_duzgun}
Çalışma Bölgesi: {bolge_duzgun}

MADDE 3 - BAŞLAMA TARİHİ
İşe başlama tarihi: {ise_giris_tarihi}

İmza: _______________
Tarih: {bugun_tarihi}
```

### İzin Formu Örneği

```
YıLLıK İZİN TALEBİ

Personel: {personel_adi_duzgun}
T.C. No: {tc_no}
Pozisyon: {pozisyon_duzgun}
Bölge: {bolge_duzgun}

İzin Türü: {izin_turu}
Başlangıç: {izin_baslangic}
Bitiş: {izin_bitis}
Toplam Gün: {izin_gun}

Hazırlama Tarihi: {izin_hazirlama_tarihi}
```

---

## 🔧 Teknik Notlar

### Değişken İşleme Sırası

1. Şablon dosyası Supabase Storage'dan okunur
2. Personel bilgileri veritabanından çekilir
3. Değişkenler hazırlanır ve formatlama yapılır
4. Docxtemplater ile değişkenler şablona uygulanır
5. Yeni Word dosyası oluşturulur

### Hata Durumları

- Değişken bulunamazsa **boş string** yazılır
- Tarih değeri yoksa **boş** bırakılır
- Boolean değerler **"Var/Yok"** veya **"Evli/Bekar"** olarak çevrilir

### Performans

- Tek bir sözleşme ortalama 2-3 saniyede oluşturulur
- Dosya boyutu: 20-100 KB arası
- Maksimum şablon boyutu: 50 MB

---

## 📞 Destek

Sorunlar veya yeni değişken talepleri için sistem yöneticinize başvurun.

**Son Güncelleme:** 13 Kasım 2025  
**Versiyon:** 1.0.0

---

## ⚠️ Önemli Hatırlatmalar

1. ✅ Değişken isimlerinde **Türkçe karakter kullanmayın**
2. ✅ Değişkenleri tam olarak yazdığınızdan emin olun (kopyala-yapıştır öneririz)
3. ✅ Test için önce bir deneme belgesi oluşturun
4. ✅ Şablonu Word'de düzenlerken **Track Changes'i kapatın**
5. ✅ Değişikliklerden sonra şablonu yeniden yükleyin
6. ✅ Versiyon numarasını güncel tutun

---

**Bu dökümanı indirip şablon düzenlerken yanınızda bulundurun!** 📄
