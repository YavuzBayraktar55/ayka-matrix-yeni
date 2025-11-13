# 🐛 Şablon Debug Rehberi

## ❌ {sirket_adres_duzgun} undefined Sorunu

### 1️⃣ Şablonunuzu Kontrol Edin

Word dosyanızda değişkeni nasıl yazdığınızı kontrol edin:

#### ❌ YANLIŞ KULLANIMLAR:

```
{sirket_adres_duzgun }    ← Kapanış süslüden ÖNCE boşluk var
{ sirket_adres_duzgun}    ← Açılış süslüden SONRA boşluk var
{sirket_adres_duzgun ffff} ← İçinde fazladan metin var
{sirketadres_duzgun}      ← Alt çizgi eksik (sirket_adres değil sirketadres)
{sirket_adres_duzgun.}    ← Sonunda nokta var
{şirket_adres_duzgun}     ← "ş" yerine "s" olmalı (Türkçe karakter YOK)
```

#### ✅ DOĞRU KULLANIM:

```
{sirket_adres_duzgun}
```

**KURALLAR:**
- Süslü parantez HEMEN açılıp kapanmalı, içeride boşluk yok
- Değişken adı tamamen küçük harf
- Türkçe karakter YOK (ş değil s, ı değil i)
- Alt çizgi ile ayrılmış (sirket_adres_duzgun)

---

## 🔍 Debug Adımları

### Adım 1: Terminal Loglarını Kontrol Et

Dev server terminalinde şu satırı görmelisiniz:

```
🔍 Şirket değişkenleri: {
  sirket_adres: 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul',
  sirket_adres_duzgun: 'Kocatepe Mahallesi, Paşa Caddesi, No:17/B, Bayrampaşa/İstanbul'
}
```

✅ **Eğer bu satırı görüyorsanız:** Sistem çalışıyor, sorun şablonda!

❌ **Eğer undefined görüyorsanız:** Kod hatası var, bana haber verin.

---

### Adım 2: Şablonunuzu Developer Mode'da Kontrol Et

Word'de değişkeni görünür yapmak için:

1. Word dosyasını açın
2. `Alt + F9` tuşlarına basın (Windows)
3. Değişkenler şu şekilde görünür: `{ MERGEFIELD sirket_adres_duzgun }`
4. Boşluk veya hata var mı kontrol edin
5. Tekrar `Alt + F9` ile normal görünüme dönün

---

### Adım 3: Şablonu Sıfırdan Test Et

Yeni bir Word belgesi açın ve test edin:

```
Şirket Bilgileri:

Adres: {sirket_adres}
Adres (Düzgün): {sirket_adres_duzgun}
SGK Sicil: {sgk_isyeri_sicil}
```

Bu test şablonunu yükleyin ve deneyin. Eğer çalışıyorsa, eski şablonunuzda typo var demektir.

---

## 📋 Tüm Şirket Değişkenleri

Kopyala-yapıştır yapabilmeniz için:

```
{sirket_adi}
{sirket_adi_duzgun}
{sirket_adres}
{sirket_adres_duzgun}
{sgk_isyeri_sicil}
```

---

## 🔧 Şablon Hazırlama İpuçları

### ✅ YAPILMASI GEREKENLER:

1. **Word'de Normal Metin Olarak Yazın**
   - Değişkeni direkt klavyeden yazın
   - Copy-paste yaparken format kopyalanmasın

2. **Kopyala-Yapıştır Güvenli Yöntem**
   ```
   1. Değişken adını Notepad'e kopyalayın
   2. Notepad'den Word'e yapıştırın
   3. Format temizlenmiş olur
   ```

3. **Değişken Testi**
   - Her değişkeni ayrı satıra yazın
   - Hangi değişkenin sorunlu olduğunu bulun

### ❌ YAPILMAMASI GEREKENLER:

1. **Otomatik Düzeltmeyi Kapatın**
   ```
   Word → Dosya → Seçenekler → Yazım Denetimi
   → "Yazdıkça otomatik düzelt" → KAPALI
   ```

2. **Akıllı Tırnak İşaretlerini Kapatın**
   ```
   → "Tırnak işaretlerini düz tırnakla değiştir" → AKTİF
   ```

3. **Otomatik Format Değiştirmeyi Engelleyin**
   - Değişkeni yazınca Enter'a basmayın (otomatik format tetiklenir)
   - Space'den sonra yazın

---

## 🧪 Test Şablonu

Aşağıdaki metni Word'e kopyalayın ve test edin:

```
İŞ SÖZLEŞMESİ

TARAFLAR:

İŞVEREN:
Unvanı: {sirket_adi_duzgun}
Adresi: {sirket_adres_duzgun}
SGK Sicil No: {sgk_isyeri_sicil}

İŞÇİ:
Adı Soyadı: {personel_adi_duzgun}
TC Kimlik No: {tc_no_duzgun}
Doğum Tarihi: {dogum_tarihi}
Adres: {adres_duzgun}

Bu belge {bugun_tarihi} tarihinde düzenlenmiştir.
```

Bu şablonu .docx olarak kaydedin ve sistemde test edin.

---

## 🚨 Hala Çalışmıyor mu?

Eğer yukarıdaki tüm adımları yaptıysanız ve hala çalışmıyorsa:

1. **Dev server'ı yeniden başlatın**
   ```powershell
   Ctrl+C
   npm run dev
   ```

2. **Tarayıcı cache'ini temizleyin**
   ```
   Ctrl+Shift+Delete → Cache temizle
   ```

3. **Şablonu yeniden yükleyin**
   - Dashboard → Şablonlar
   - Sil → Yeniden Yükle

4. **Terminal loglarını bana gönderin**
   ```
   📄 Sözleşme oluşturma başladı
   📦 Request data: { personelId: '...', sablonTuru: 'sozlesme' }
   🔍 Şirket değişkenleri: { ... }
   ```

---

## 📞 Destek

Sorun devam ediyorsa:

1. Terminal'deki tam log çıktısını gönderin
2. Word şablonunuzun screenshot'ını gönderin (Alt+F9 ile)
3. İndirilen belgede tam olarak ne yazıyor söyleyin

**Önemli:** "undefined" kelimesi mi yazıyor, yoksa değişken adı mı yazıyor ({sirket_adres_duzgun})?

- **undefined yazıyorsa:** Değişken tanımlı ama değer yok
- **{sirket_adres_duzgun} yazıyorsa:** Değişken hiç tanınmamış, şablonda typo var

---

**Hazırlayan:** AI Assistant  
**Tarih:** 13 Kasım 2025  
**Versiyon:** 1.0
