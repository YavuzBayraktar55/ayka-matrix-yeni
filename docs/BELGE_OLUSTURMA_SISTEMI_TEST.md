# ✅ Belge Oluşturma Sistemi - Test Rehberi

**Tarih:** 15 Kasım 2025  
**Durum:** Şablonlar yüklenmiş, sistem hazır ✅

---

## 📊 Sistemin Mevcut Durumu

### ✅ Yüklü Şablonlar

| Şablon Türü | Şablon Adı | Dosya Adı | Versiyon |
|-------------|-----------|-----------|----------|
| **İzin** | İzin Formu Şablonu | izin-sablon-1763233270436.docx | 2 |
| **Avans** | Avans Talep Şablonu | avans-sablon-1763233370017.docx | 2 |

### ✅ Mevcut Test Verileri

#### İzin Talepleri (3 adet):
```
1. Talep ID: 61
   - Personel: EMRE GÖÇER
   - Pozisyon: SAHA PERSONELİ
   - Bölge: SAMSUN
   - İzin Türü: Yıllık İzin
   - Tarih: 06.11.2025 - 20.11.2025
   - Gün: 12 gün
   - Durum: yonetim_onay ✅
   
2. Talep ID: 60
   - Personel: İLKER ÇELENK
   - Pozisyon: SAHA PERSONELİ
   - Bölge: SAMSUN
   - İzin Türü: Ücretli İzin
   - Tarih: 07.11.2025 - 12.11.2025
   - Gün: 5 gün
   - Durum: yonetim_onay ✅

3. Talep ID: 59
   - Personel: İLKER ÇELENK
   - İzin Türü: Ücretli İzin
   - Durum: beklemede ⏳
```

---

## 🧪 Test Adımları

### 1. İzin Belgesi Testi

#### Adım 1: Sayfaya Git
```
http://localhost:3000/dashboard/izin-talepleri
```

#### Adım 2: Yetkilendir
- **Koordinatör**, **İK** veya **Yönetici** olarak giriş yapın
- Saha personeli "Belge Yazdır" butonunu göremez ❌

#### Adım 3: Test Talebi Seç
- **EMRE GÖÇER** - Talep ID: 61 (12 gün yıllık izin)
- **İLKER ÇELENK** - Talep ID: 60 (5 gün ücretli izin)

#### Adım 4: Belge Yazdır
1. Talep satırında **"Belge Yazdır"** butonuna tıkla (📄 amber renk)
2. İndirme başlamalı
3. Dosya adı: `Izin_YillikIzin_EmreGocer_1731700000.docx` formatında

#### Adım 5: Word Dosyasını Aç
Aşağıdaki değişkenlerin dolu olduğunu kontrol et:

**Personel Bilgileri:**
```
{personel_adi_duzgun} → Emre Göçer
{tc_no_duzgun} → 132 820 854 36
{pozisyon_duzgun} → Saha Personeli
{bolge_duzgun} → Samsun
{departman_duzgun} → Saha Personeli (P_Gorevi)
```

**İzin Bilgileri:**
```
{izin_turu} → Yıllık İzin
{izin_turu_kucuk} → yıllık izin
{izin_baslangic} → 06/11/2025
{izin_bitis} → 20/11/2025
{izin_gun} → 12
{izin_aciklama} → (talep açıklaması)
{izin_durum} → yonetim_onay
```

**Tarih Bilgileri:**
```
{bugun_tarihi} → 15/11/2025
{yil} → 2025
{ay} → 11
{gun} → 15
```

**Şirket Bilgileri:**
```
{sirket_adi_duzgun} → Ayka İnşaat A.Ş.
{sirket_adres_duzgun} → (şirket adresi)
{sgk_isyeri_sicil} → (SGK sicil)
```

---

### 2. Avans Belgesi Testi

#### Önkoşul: Test Verisi Oluştur
Şu anda sistemde avans talebi yok. Test için bir tane oluşturun:

```
1. /dashboard/avans-talepleri sayfasına git
2. "Yeni Avans Talebi" butonu ile talep oluştur
3. Miktar: 5000 TL
4. Gün Sayısı: 3
5. Koordinatör/Yönetici olarak onayla
```

#### Test Adımları
1. `/dashboard/avans-talepleri` sayfasına git
2. Onaylı avans talebinin satırında **"Belge Yazdır"** butonuna tıkla
3. İndirilen dosyayı aç: `Avans_EmreGocer_1731700000.docx`

#### Beklenen Değişkenler
**Avans Bilgileri:**
```
{avans_miktar} → 5.000,00 TL (formatlanmış)
{avans_miktar_rakam} → 5000.00 (ham değer)
{avans_miktar_yazi} → Beşbin Türk Lirası
{avans_gun} → 3
{odeme_tarihi} → (ödeme tarihi)
{avans_aciklama} → (talep açıklaması)
{avans_durum} → yonetim_onay
```

**Personel Bilgileri:**
```
(İzin belgesindekilerle aynı)
{personel_adi_duzgun} → Emre Göçer
{tc_no_duzgun} → 132 820 854 36
{pozisyon_duzgun} → Saha Personeli
vb.
```

---

## 🔍 Sorun Giderme

### Hata 1: "Şablon bulunamadı"
**Sebep:** Şablon yüklenmemiş veya sablonturu yanlış

**Çözüm:**
1. `/dashboard/sablonlar` sayfasına git
2. Şablon listesinde kontrol et:
   - İzin: `sablonturu = 'izin'`
   - Avans: `sablonturu = 'avans'`
3. Yoksa "Yeni Şablon Yükle" ile yükle

### Hata 2: "Değişkenler boş geliyor"
**Sebep:** Şablonda değişken adları yanlış yazılmış

**Çözüm:**
1. Word şablonunu aç
2. Değişken adlarını kontrol et:
   - ✅ Doğru: `{personel_adi_duzgun}`
   - ❌ Yanlış: `{ personel_adi_duzgun }` (boşluk var)
   - ❌ Yanlış: `{PersonelAdiDuzgun}` (büyük harf)
3. `/dashboard/sablonlar` → "Değişkenler Kılavuzu" indir
4. Kılavuza göre şablonu düzenle
5. Yeni versiyon yükle

### Hata 3: "Butonu göremiyorum"
**Sebep:** Yetkilendirme

**Çözüm:**
- Saha personeli olarak giriş yaptıysanız "Belge Yazdır" butonu görünmez
- **Koordinatör**, **İK** veya **Yönetici** olarak giriş yapın

### Hata 4: "İndirme başlamıyor"
**Sebep:** API hatası

**Çözüm:**
1. Tarayıcı Console'u aç (F12)
2. Hata mesajını kontrol et
3. Server terminalinde hata loglarına bak
4. Yaygın hatalar:
   - Supabase bağlantı hatası
   - Storage'da dosya yok
   - Personel bilgisi eksik

---

## 📦 API Endpoint'leri

### İzin Belgesi
```
POST /api/izin-belgesi-olustur
Body: { "talepId": "61" }
```

**İşlem Akışı:**
1. IzinTalepleri tablosundan talep verisi getir
2. PersonelLevelizasyon → PersonelInfo join
3. BolgeInfo join
4. Şablon dosyasını Storage'dan indir (sablonturu = 'izin')
5. Docxtemplater ile değişkenleri doldur
6. .docx dosyası döndür

### Avans Belgesi
```
POST /api/avans-belgesi-olustur
Body: { "talepId": "123" }
```

**İşlem Akışı:**
1. AvansTalepleri tablosundan talep verisi getir
2. PersonelLevelizasyon → PersonelInfo join
3. BolgeInfo join
4. Avans miktarını formatla (5000 → "5.000,00 TL")
5. Sayıyı yazıya çevir (5000 → "Beşbin Türk Lirası")
6. Şablon dosyasını Storage'dan indir (sablonturu = 'avans')
7. Docxtemplater ile değişkenleri doldur
8. .docx dosyası döndür

---

## 🎨 Kullanıcı Arayüzü

### İzin Talepleri Sayfası
```
[Talep Satırı]
┌─────────────────────────────────────────────────────────────┐
│ EMRE GÖÇER | Yıllık İzin | 06.11.2025-20.11.2025 | 12 gün  │
│                                                               │
│ [Onayla] [Reddet] [Tarih Düzenle] [Geçmiş]                 │
│ [Belge Yazdır 📄] [İptal Et] [Detay]                        │
└─────────────────────────────────────────────────────────────┘

Belge Yazdır Butonu:
- Renk: Amber (amber-500/20 bg, amber-300 text)
- Icon: FileText (📄)
- Tooltip: "İzin Belgesi Yazdır"
- Görünürlük: koordinator || insan_kaynaklari || yonetici
```

### Avans Talepleri Sayfası
```
[Talep Satırı]
┌─────────────────────────────────────────────────────────────┐
│ EMRE GÖÇER | 5.000,00 TL | 3 gün | 25.11.2025               │
│                                                               │
│ [Onayla] [Reddet] [Belge Yazdır 📄] [İptal Et] [Detay]     │
└─────────────────────────────────────────────────────────────┘

Belge Yazdır Butonu:
- Aynı tasarım (Amber renk, FileText icon)
- Görünürlük: koordinator || insan_kaynaklari || yonetici
```

---

## 📋 Kontrol Listesi

Test öncesi kontrol:

- [x] **Şablonlar yüklenmiş:** ✅ İzin Formu, ✅ Avans Talep
- [x] **Test verileri mevcut:** ✅ 3 izin talebi (2 onaylı)
- [ ] **Yetkilendirilmiş kullanıcı:** Koordinatör/İK/Yönetici olarak giriş yapın
- [ ] **İzin belgesi test edildi:** Talep ID 61 veya 60 ile test edin
- [ ] **Avans talebi oluşturuldu:** Test için bir avans talebi ekleyin
- [ ] **Avans belgesi test edildi:** Oluşturulan talep ile test edin
- [ ] **Değişkenler kontrol edildi:** Word dosyasında boş alan yok
- [ ] **Türkçe karakterler düzgün:** İstanbul (büyük İ), Şirket (Ş) doğru

---

## 🚀 Sonraki Adımlar

### 1. Üretim Ortamına Alma
```bash
# Build oluştur
npm run build

# Vercel/Hosting'e deploy et
git push origin main
```

### 2. Kullanıcı Eğitimi
- Koordinatörlere sistem tanıtımı
- Şablon düzenleme eğitimi
- Değişken kullanımı rehberi paylaş

### 3. İyileştirmeler (Opsiyonel)
- [ ] PDF export özelliği ekle
- [ ] Toplu belge oluşturma (çoklu talep)
- [ ] Belge önizleme (indirmeden önce görüntüle)
- [ ] E-posta ile belge gönderme
- [ ] Belge versiyonlama/geçmişi

---

**Test Durumu:** ✅ Hazır  
**Son Güncelleme:** 15 Kasım 2025  
**Hazırlayan:** AI Assistant
