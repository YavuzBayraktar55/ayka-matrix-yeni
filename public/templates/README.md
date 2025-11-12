# Sözleşme Şablonları

Bu klasöre `.docx` formatında master template dosyalarınızı yükleyin.

## Dosya Adları

- `sozlesme-sablon.docx` - İş sözleşmesi şablonu
- `izin-sablon.docx` - İzin belgesi şablonu (gelecekte)
- `avans-sablon.docx` - Avans belgesi şablonu (gelecekte)

## Kullanılabilir Değişkenler

Word şablonunuzda şu değişkenleri kullanabilirsiniz:

### Personel Bilgileri
- `{personel_adi}` - Personel adı soyadı
- `{personel_tam_adi}` - Personel tam adı
- `{tc_no}` - TC Kimlik No
- `{dogum_tarihi}` - Doğum tarihi (GG.AA.YYYY)
- `{dogum_yeri}` - Doğum yeri
- `{baba_adi}` - Baba adı

### Medeni Durum
- `{medeni_hali}` - Evli/Bekar
- `{es_gelir}` - Eş gelir durumu (Var/Yok)
- `{cocuk_sayisi}` - Çocuk sayısı

### İletişim
- `{telefon}` - Telefon numarası
- `{email}` - E-posta adresi
- `{adres}` - Adres

### İş Bilgileri
- `{bolge}` - Bölge adı
- `{pozisyon}` - Görevi/Pozisyon
- `{departman}` - Şube/Departman

### Eğitim
- `{mezuniyet}` - Mezuniyet durumu
- `{bolum}` - Bölüm

### Askerlik
- `{askerlik_durum}` - Askerlik durumu
- `{tecil_bitis}` - Tecil bitiş tarihi

### Diğer Bilgiler
- `{ehliyet}` - Ehliyet sınıfı
- `{kan_grubu}` - Kan grubu
- `{iban_no}` - IBAN numarası
- `{agi_yuzdesi}` - AGI yüzdesi
- `{engel_orani}` - Engel oranı

### Belgeler
- `{dogalgaz_belge}` - Doğalgaz belgesi durumu (Var/Yok)
- `{dogalgaz_belge_gecerlilik}` - Geçerlilik tarihi
- `{ic_tesisat_belge}` - İç tesisat belgesi (Var/Yok)
- `{ic_tesisat_belge_gecerlilik}` - Geçerlilik tarihi

### Tarihler
- `{ise_giris_tarihi}` - İşe giriş tarihi
- `{kidem_tarihi}` - Kıdem tarihi
- `{sozlesme_tarihi}` - Sözleşme tarihi
- `{sozlesme_baslangic}` - Sözleşme başlangıç
- `{hazirlama_tarihi}` - Bugünün tarihi
- `{bugun_tarihi}` - Bugünün tarihi
- `{yil}` - Yıl
- `{ay}` - Ay (Ocak, Şubat, vb.)
- `{gun}` - Gün

### Şirket Bilgileri
- `{sirket_adi}` - Şirket adı
- `{sirket_adres}` - Şirket adresi
- `{sirket_telefon}` - Şirket telefonu
- `{sirket_email}` - Şirket e-posta

## Örnek Kullanım

```
İŞ SÖZLEŞMESİ

Bu sözleşme {tc_no} TC Kimlik numaralı {personel_tam_adi} ile 
{sirket_adi} arasında {hazirlama_tarihi} tarihinde düzenlenmiştir.

MADDE 1 - TARAFLAR
İşveren: {sirket_adi}
Adres: {sirket_adres}

İşçi: {personel_tam_adi}
TC No: {tc_no}
Doğum Tarihi: {dogum_tarihi}
Doğum Yeri: {dogum_yeri}
Baba Adı: {baba_adi}
Adres: {adres}
Telefon: {telefon}

MADDE 2 - İŞİN TANIMI
İşçi, {bolge} bölgesinde {pozisyon} pozisyonunda çalışmak üzere 
{ise_giris_tarihi} tarihinde işe başlamıştır.
```

## Not

- Değişkenler mutlaka süslü parantez içinde yazılmalıdır: `{degisken_adi}`
- Word formatını korur (bold, italic, tablolar, vb.)
- Boş değişkenler otomatik olarak boş string olarak doldurulur
