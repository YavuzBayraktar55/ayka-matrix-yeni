# 🔐 Row Level Security (RLS) Sistemi - Kullanım Kılavuzu

## ✅ Sistem Özeti

Ayka Matrix uygulamasında **Database Level Security** (RLS) aktif. Tüm veri erişimi otomatik olarak kullanıcının rolüne ve bölgesine göre filtreleniyor.

---

## 👥 Rol Bazlı Erişim Kontrolleri

### 1. **Saha Personeli** (`saha_personeli`)
✅ **Yapabilecekleri:**
- ✅ Sadece **kendi bilgilerini** görebilir
- ✅ İzin talebi oluşturabilir
- ✅ Avans talebi oluşturabilir
- ✅ Kendi taleplerinin durumunu görebilir
- ✅ Beklemedeki taleplerini iptal edebilir

❌ **Yapamayacakları:**
- ❌ Diğer personellerin bilgilerini göremez
- ❌ Diğer personellerin taleplerini göremez
- ❌ Puantaj oluşturamaz/düzenleyemez
- ❌ Başkasının taleplerini onaylayamaz

---

### 2. **Koordinatör** (`koordinator`)
✅ **Yapabilecekleri:**
- ✅ **Sadece kendi bölgesindeki** personelleri görebilir
- ✅ **Kendi bölgesindeki** izin taleplerini görebilir ve **ARA ONAY** verebilir
- ✅ **Kendi bölgesindeki** avans taleplerini görebilir ve **ARA ONAY** verebilir
- ✅ **Kendi bölgesinin** aylık puantajını oluşturabilir ve düzenleyebilir
- ✅ Taleplerden gelen personeli ekleyebilir

❌ **Yapamayacakları:**
- ❌ Diğer bölgelerin personellerini göremez
- ❌ Diğer bölgelerin taleplerini göremez
- ❌ Diğer bölgelerin puantajını göremez
- ❌ **Nihai onay** veremez (sadece ara onay)

---

### 3. **Yönetici** (`yonetici`)
✅ **Yapabilecekleri:**
- ✅ **TÜM** personelleri görebilir ve yönetebilir
- ✅ **TÜM** izin taleplerini görebilir ve **NİHAİ ONAY** verebilir
- ✅ **TÜM** avans taleplerini görebilir ve **NİHAİ ONAY** verebilir
- ✅ **TÜM** bölgelerin puantajını görebilir ve düzenleyebilir
- ✅ Personel silebilir
- ✅ Talepleri reddedebilir

---

### 4. **İnsan Kaynakları** (`insan_kaynaklari`)
✅ **Yapabilecekleri:**
- ✅ **TÜM** personelleri görebilir ve yönetebilir
- ✅ **TÜM** izin taleplerini görebilir ve **NİHAİ ONAY** verebilir
- ✅ **TÜM** avans taleplerini görebilir ve **NİHAİ ONAY** verebilir
- ✅ **TÜM** bölgelerin puantajını görebilir
- ✅ Personel ekleyebilir ve düzenleyebilir
- ✅ Talepleri reddedebilir

---

## 📋 Talep Onay Akışı

### İzin ve Avans Talepleri için 2 Aşamalı Onay Sistemi:

```
1. TALEP OLUŞTURULDU
   ↓ (Saha Personeli tarafından)
   Durum: beklemede

2. KOORDINATÖR ARA ONAYI
   ↓ (Koordinatör tarafından)
   Durum: koordinator_onay
   - Koordinatör notu eklenebilir
   - Red edilebilir (Durum: reddedildi)

3. YÖNETİM NİHAİ ONAYI
   ↓ (Yönetici/IK tarafından)
   Durum: yonetim_onay ✅
   - Yönetim notu eklenebilir
   - Red edilebilir (Durum: reddedildi)
```

**Durum Değerleri:**
- `beklemede`: İlk oluşturuldu, koordinatör onayı bekliyor
- `koordinator_onay`: Koordinatör onayladı, yönetim onayı bekliyor
- `yonetim_onay`: ✅ Nihai onay verildi
- `reddedildi`: ❌ Red edildi (koordinatör veya yönetim tarafından)
- `iptal`: İptal edildi (personel tarafından)

---

## 🔒 RLS Nasıl Çalışıyor?

### Otomatik Filtreleme
Frontend'de **hiçbir filtreleme kodu yazmaya gerek yok**. Database seviyesinde otomatik çalışıyor:

```typescript
// ✅ DOĞRU - RLS otomatik filtreliyor
const { data } = await supabase
  .from('PersonelLevelizasyon')
  .select('*');

// ❌ YANLIŞ - Gereksiz filtreleme (RLS zaten yapıyor)
const { data } = await supabase
  .from('PersonelLevelizasyon')
  .select('*')
  .eq('BolgeID', user.BolgeID); // Gereksiz!
```

### JWT Token Bazlı
Supabase Auth ile giriş yapan her kullanıcının JWT token'ında şu bilgiler var:
- `tc_kimlik`: Personel TC Kimlik No
- `role`: Personel rolü (saha_personeli, koordinator, vb.)
- `bolge_id`: Personel bölge ID

RLS policy'leri bu bilgileri okuyarak otomatik filtreleme yapıyor.

---

## 🎨 UI İyileştirmeleri

### Form Input Stilleri Güncellendi
- ✅ Light mode'da **beyaz background** + **koyu border** (daha görünür)
- ✅ Dark mode'da **yarı saydam background** + **açık border**
- ✅ **Border thickness** 2px oldu (daha belirgin)
- ✅ Focus durumunda **mavi ring** + **border rengi değişimi**
- ✅ Label'lar **font-semibold** (daha okunabilir)
- ✅ Placeholder metinleri **daha koyu** (gray-500)

---

## 📝 Kullanıcı Senaryoları

### Senaryo 1: Saha Personeli İzin Talep Ediyor
1. Saha personeli giriş yapar
2. İzin Talepleri sayfasına gider
3. **Sadece kendi taleplerini** görür
4. "Yeni Talep" butonuna tıklar
5. İzin bilgilerini doldurur ve gönderir
6. Talep **"beklemede"** durumuna geçer

### Senaryo 2: Koordinatör Ara Onay Veriyor
1. Koordinatör giriş yapar
2. İzin Talepleri sayfasına gider
3. **Sadece kendi bölgesindeki** talepleri görür
4. **"Beklemede"** durumdaki bir talebi seçer
5. "Onayla" veya "Reddet" butonuna tıklar
6. Not ekler (opsiyonel)
7. Talep **"koordinator_onay"** durumuna geçer

### Senaryo 3: Yönetici Nihai Onay Veriyor
1. Yönetici giriş yapar
2. İzin Talepleri sayfasına gider
3. **Tüm talepleri** görür
4. **"Koordinator_onay"** durumdaki bir talebi seçer
5. "Onayla" veya "Reddet" butonuna tıklar
6. Not ekler (opsiyonel)
7. Talep **"yonetim_onay"** durumuna geçer ✅

---

## 🛠️ Teknik Detaylar

### RLS Helper Fonksiyonları
```sql
-- JWT'den bilgileri okuyan fonksiyonlar
current_user_tc_kimlik()  -- TC Kimlik No döndürür
current_user_role()       -- Role döndürür
current_user_bolge_id()   -- Bölge ID döndürür
is_admin_or_ik()         -- Admin veya IK kontrolü (koordinatör HARİÇ)
```

### Policy Örnekleri
```sql
-- PersonelLevelizasyon SELECT Policy
CREATE POLICY "personel_select_policy"
ON PersonelLevelizasyon FOR SELECT
USING (
  PersonelTcKimlik = current_user_tc_kimlik() OR
  (current_user_role() = 'koordinator' AND BolgeID = current_user_bolge_id()) OR
  is_admin_or_ik()
);

-- IzinTalepleri SELECT Policy  
CREATE POLICY "izin_select_policy"
ON IzinTalepleri FOR SELECT
USING (
  PersonelTcKimlik = current_user_tc_kimlik() OR
  (current_user_role() = 'koordinator' AND EXISTS (
    SELECT 1 FROM PersonelLevelizasyon pl
    WHERE pl.PersonelTcKimlik = IzinTalepleri.PersonelTcKimlik
      AND pl.BolgeID = current_user_bolge_id()
  )) OR
  is_admin_or_ik()
);
```

---

## ✨ Avantajlar

1. **Güvenlik**: Veri hiçbir zaman yanlış kişiye gösterilmez
2. **Basitlik**: Frontend'de filtreleme kodu yazmaya gerek yok
3. **Performans**: Database seviyesinde filtreleme daha hızlı
4. **Tutarlılık**: Tüm API çağrıları otomatik korunuyor
5. **Bakım**: Tek yerden (database) yönetiliyor

---

## 📞 Sorun mu var?

Eğer bir kullanıcı görmemesi gereken veriyi görüyorsa:
1. RLS policy'lerini kontrol et (`pg_policies` tablosu)
2. `is_admin_or_ik()` fonksiyonunu kontrol et
3. JWT token'daki `user_metadata` bilgilerini kontrol et
4. Browser console'da hata var mı bak

---

## 🎉 Sistem Hazır!

Tüm RLS policy'leri aktif ve çalışıyor. Kullanıcılar artık:
- ✅ Sadece yetkili oldukları verileri görürler
- ✅ Sadece yetkili oldukları işlemleri yapabilirler
- ✅ Database seviyesinde korunmuş bir sistem kullanırlar

**Son Güncelleme:** Ekim 2025
**Versiyon:** 1.0.0
