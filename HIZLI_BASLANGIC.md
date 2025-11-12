# 🎯 Hızlı Başlangıç Kılavuzu - Word Şablon Düzenleyici

## 📋 3 Adımda Şablon Oluşturma

### Yöntem 1: Word Dosyasından Yükle (ÖNERİLEN) ⭐

```
1. "Word'den Yükle" butonuna tıkla
   └─> .docx veya .doc dosyasını seç
   
2. Değişkenleri ekle
   └─> "Değişken Ekle" → {personel_adi}, {tc_no} vb.
   
3. Kaydet ve İndir
   └─> "Kaydet" → "Word İndir"
```

**💡 Avantajları:**
- ✅ Tüm tablolar otomatik gelir
- ✅ Formatlar korunur
- ✅ Hızlı ve pratik
- ✅ Birden fazla Word birleştirilebilir

---

### Yöntem 2: Manuel Oluşturma

```
1. "Yeni" butonuyla temiz başla
   └─> Şablon adı ve türünü seç
   
2. TinyMCE editöründe yaz
   └─> Toolbar'dan tablo, liste, stil ekle
   
3. Değişkenleri ekle
   └─> "Değişken Ekle" menüsünden seç
   
4. Kaydet ve İndir
   └─> "Kaydet" → "Word İndir"
```

---

## 🎨 Temel İşlemler

### Tablo Ekleme
```
1. Toolbar'dan "Table" menüsü
2. İstediğin satır/sütun sayısını seç
3. Word'den kopyala-yapıştır da yapabilirsin!
```

### Değişken Ekleme
```
1. "Değişken Ekle" butonuna tıkla
2. Listeden değişkeni seç:
   - {personel_adi}
   - {tc_no}
   - {izin_baslangic}
   - {avans_miktar}
3. Otomatik eklenir
```

### Sayfa Kontrolü
```
1. Editörde yaz
2. Kırmızı kesikli çizgi = Sayfa sonu (29.7cm)
3. "SAYFA SONU" yazısı sağ altta görünür
4. "Önizle" ile gerçek görünümü kontrol et
```

---

## 🔥 Hızlı İpuçları

### ✅ DOĞRU Kullanım:

```
✓ Word'den direkt dosya yükle
✓ Tablolar için Word tablosu kullan
✓ Değişkenleri doğru yere ekle
✓ Önizle ile kontrol et
✓ Word indir → Word'de PDF'e çevir
```

### ❌ YANLIŞ Kullanım:

```
✗ Çok büyük Word dosyaları (10MB+)
✗ Karmaşık Word şablonları
✗ Elle tablo çizmeye çalışma
✗ PDF direkt export bekleme
✗ Sayfa sınırlarını görmezden gelme
```

---

## 📱 Menü Butonları

| Buton | İkon | İşlev |
|-------|------|-------|
| **Şablonlar** | 📁 | Kayıtlı şablonları listele |
| **Yeni** | ➕ | Temiz şablon başlat |
| **Word'den Yükle** | 📤 | Word dosyası içe aktar |
| **Önizle** | 👁️ | Sayfa görünümünü göster |
| **Word İndir** | 💾 | .docx olarak indir |
| **Kaydet** | 💾 | Şablonu veritabanına kaydet |

---

## 🎯 Örnek Senaryo: İzin Belgesi

### 1. Word Şablonunu Hazırla
```
Word'de izin belgeni yaz:
- Başlık: "İZİN FORMU"
- Tablo: Personel bilgileri
- Metin: İzin detayları
- İmza alanları
```

### 2. Sisteme Yükle
```
1. Dashboard → Word Şablon Düzenleyici
2. "Yeni" → Şablon adı: "İzin Formu"
3. Tür: "İzin" seç
4. "Word'den Yükle" → izin-formu.docx seç
```

### 3. Değişkenleri Ekle
```
Sabit metinleri değişkenlerle değiştir:
- "Ahmet Yılmaz" → {personel_adi}
- "12345678901" → {tc_no}
- "01.06.2024" → {izin_baslangic}
- "15.06.2024" → {izin_bitis}
```

### 4. Kontrol ve Kaydet
```
1. "Önizle" → Sayfa düzenini kontrol et
2. Tablo sınırları düzgün mü?
3. Sayfa geçişi doğru mu?
4. "Kaydet" → Şablonu sakla
```

### 5. Kullan
```
1. Dashboard → İzin Talepleri
2. Yeni izin oluştururken "İzin Formu" şablonunu seç
3. Değişkenler otomatik doldurulur
4. "Word İndir" → Yazdır veya PDF'e çevir
```

---

## 🛠️ Sık Sorulan Sorular

### S: Word dosyam yüklenmiyor?
**C:** Dosya uzantısı `.docx` veya `.doc` olmalı. Dosya boyutu 10MB'dan küçük olmalı.

### S: Tablolar bozuk görünüyor?
**C:** Word'den "Word'den Yükle" özelliğini kullan, kopyala-yapıştır yerine.

### S: Sayfa sınırları nerede?
**C:** Editörde 29.7cm'de kırmızı kesikli çizgi ve "SAYFA SONU" yazısını ara.

### S: PDF olarak nasıl kaydederim?
**C:** "Word İndir" → Word'de aç → "Dosya > Farklı Kaydet > PDF"

### S: Birden fazla Word birleştirebilir miyim?
**C:** Evet! Sırayla "Word'den Yükle" ile ekle. Her dosya sonuna eklenir.

### S: Değişkenler nasıl çalışır?
**C:** Sistem otomatik verileri doldurur. Örn: `{personel_adi}` → "Ahmet Yılmaz"

---

## ⚡ Klavye Kısayolları (TinyMCE)

```
Ctrl + B      → Kalın
Ctrl + I      → İtalik
Ctrl + U      → Altı çizili
Ctrl + Z      → Geri al
Ctrl + Y      → Yinele
Ctrl + C      → Kopyala
Ctrl + V      → Yapıştır
Ctrl + X      → Kes
Ctrl + A      → Tümünü seç
```

---

## 📊 Performans İpuçları

### Hızlı Yükleme İçin:
```
✓ Küçük Word dosyaları kullan (< 5MB)
✓ Görselleri optimize et
✓ Gereksiz formatları temizle
✓ Birden fazla küçük dosya yerine tek dosya
```

### Verimli Çalışma:
```
✓ Şablonları kategorize et (İzin, Avans, vb.)
✓ Sık kullanılan değişkenleri ezberle
✓ Önizleme ile hataları erken yakala
✓ Düzenli olarak kaydet
```

---

## 🎓 Video Eğitim (Metin Tabanlı)

### Bölüm 1: İlk Şablon (2 dakika)
```
00:00 - Dashboard'a gir
00:15 - "Word Şablon Düzenleyici"ye tıkla
00:30 - "Yeni" butonuna bas
00:45 - Şablon adı gir: "Test Belgesi"
01:00 - "Word'den Yükle" → test.docx seç
01:30 - İçerik yüklendi → "Kaydet"
01:45 - "Word İndir" → Tamamlandı!
```

### Bölüm 2: Değişken Ekleme (3 dakika)
```
00:00 - Mevcut şablonu aç
00:30 - Metinde değişken yerini bul
01:00 - "Değişken Ekle" butonuna tıkla
01:30 - {personel_adi} değişkenini seç
02:00 - Tekrarla: {tc_no}, {bolge}
02:30 - "Önizle" ile kontrol et
03:00 - "Kaydet" → Bitti!
```

---

## 🚀 Pro İpuçları

1. **Şablon Şablonu Oluştur:**
   - Standart başlık/altbilgi hazırla
   - Tüm şablonlar için temel al
   - Tutarlı görünüm sağla

2. **Değişken Listesi Tut:**
   - Excel'de değişken listesi yap
   - Hangi değişken ne işe yarar?
   - Kopyala-yapıştır kolaylığı

3. **Test Şablonu Yap:**
   - Tüm değişkenleri içeren test şablonu
   - Hızlı test için kullan
   - Hataları erkenden yakala

4. **Versiyon Kontrolü:**
   - Şablon adlarına tarih ekle
   - "İzin Formu v1", "İzin Formu v2"
   - Eski versiyonları sakla

---

## 📞 Destek

**Sorun mu yaşıyorsunuz?**

1. Konsolu kontrol edin (F12)
2. Hata mesajını kopyalayın
3. `WORD_YUKLE_OZELLIGI.md` dosyasını okuyun
4. Sorun Giderme bölümüne bakın

---

## ✅ Checklist: Şablon Hazır mı?

- [ ] Şablon adı girildi
- [ ] Şablon türü seçildi
- [ ] İçerik eklendi (Word veya manuel)
- [ ] Değişkenler yerleştirildi
- [ ] Tablolar düzgün
- [ ] Önizleme kontrol edildi
- [ ] Sayfa geçişleri doğru
- [ ] Şablon kaydedildi
- [ ] Word indirme test edildi
- [ ] PDF'e çevirme denenmiş

**Hepsi ✓ ise tebrikler! Şablonunuz hazır! 🎉**

---

**📅 Güncel:** 12 Kasım 2025  
**⏱️ Ortalama Okuma Süresi:** 5 dakika  
**🎯 Hedef:** Hızlı başlangıç
