# Supabase RLS Politikası Düzeltme - Yönetici Erişimi

## Sorun
Yönetici rolündeki kullanıcılar bölge filtresini seçtiğinde diğer bölgelerdeki personelleri göremiyor. Sadece kendi bölgesindeki personeller görünüyor veya hiç görünmüyor.

## Çözüm
Supabase'de `PersonelLevelizasyon` tablosunun RLS (Row Level Security) politikasını güncellemeniz gerekiyor.

## Adımlar

### 1. Supabase Dashboard'a Gidin
https://supabase.com/dashboard/project/prhhkfysdgbrgmrysrvc

### 2. SQL Editor'ü Açın
Sol menüden **SQL Editor** seçeneğine tıklayın.

### 3. Mevcut RLS Politikasını Kontrol Edin
```sql
-- Mevcut politikaları görmek için
SELECT * FROM pg_policies WHERE tablename = 'PersonelLevelizasyon';
```

### 4. Yeni RLS Politikasını Uygulayın

**Önce mevcut SELECT politikasını silin:**
```sql
-- Eski politikayı kaldır (varsa)
DROP POLICY IF EXISTS "Personel kendi bilgilerine erişebilir" ON "PersonelLevelizasyon";
DROP POLICY IF EXISTS "Personeller görüntülenebilir" ON "PersonelLevelizasyon";
DROP POLICY IF EXISTS "select_personel" ON "PersonelLevelizasyon";
```

**Sonra yeni, doğru politikayı oluşturun:**
```sql
-- YENİ POLİTİKA: Rol bazlı personel görüntüleme
CREATE POLICY "Rol bazlı personel görüntüleme"
ON "PersonelLevelizasyon"
FOR SELECT
USING (
  -- Saha personeli sadece kendini görebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') = 'saha_personeli'
    AND PersonelEmail = auth.jwt() ->> 'email'
  )
  OR
  -- Koordinatör kendi bölgesindeki personelleri görebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') = 'koordinator'
    AND BolgeID = (SELECT BolgeID FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email')
  )
  OR
  -- Yönetici ve İK TÜM personelleri görebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') IN ('yonetici', 'insan_kaynaklari')
  )
);
```

### 5. Diğer İşlemler İçin RLS Politikaları

**INSERT Politikası:**
```sql
CREATE POLICY "Yönetici ve İK personel ekleyebilir"
ON "PersonelLevelizasyon"
FOR INSERT
WITH CHECK (
  (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
  IN ('yonetici', 'insan_kaynaklari', 'koordinator')
);
```

**UPDATE Politikası:**
```sql
CREATE POLICY "Yetkili personel güncelleyebilir"
ON "PersonelLevelizasyon"
FOR UPDATE
USING (
  -- Kendi bilgilerini güncelleyebilir
  PersonelEmail = auth.jwt() ->> 'email'
  OR
  -- Koordinatör kendi bölgesindeki personelleri güncelleyebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') = 'koordinator'
    AND BolgeID = (SELECT BolgeID FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email')
  )
  OR
  -- Yönetici ve İK herkesi güncelleyebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
    IN ('yonetici', 'insan_kaynaklari')
  )
);
```

**DELETE Politikası:**
```sql
CREATE POLICY "Sadece yönetici ve İK silebilir"
ON "PersonelLevelizasyon"
FOR DELETE
USING (
  (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
  IN ('yonetici', 'insan_kaynaklari')
);
```

### 6. PersonelInfo Tablosu İçin RLS

**PersonelInfo tablosunda da benzer politikalar olmalı:**

```sql
-- SELECT
CREATE POLICY "Rol bazlı personel bilgisi görüntüleme"
ON "PersonelInfo"
FOR SELECT
USING (
  -- Kendi bilgilerini görebilir
  PersonelTcKimlik = (
    SELECT PersonelTcKimlik FROM PersonelLevelizasyon 
    WHERE PersonelEmail = auth.jwt() ->> 'email'
  )
  OR
  -- Koordinatör kendi bölgesindeki personelleri görebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') = 'koordinator'
    AND PersonelTcKimlik IN (
      SELECT PersonelTcKimlik FROM PersonelLevelizasyon 
      WHERE BolgeID = (SELECT BolgeID FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email')
    )
  )
  OR
  -- Yönetici ve İK tüm bilgileri görebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
    IN ('yonetici', 'insan_kaynaklari')
  )
);

-- INSERT
CREATE POLICY "Yetkili personel bilgisi ekleyebilir"
ON "PersonelInfo"
FOR INSERT
WITH CHECK (
  (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
  IN ('yonetici', 'insan_kaynaklari', 'koordinator')
);

-- UPDATE
CREATE POLICY "Yetkili personel bilgisi güncelleyebilir"
ON "PersonelInfo"
FOR UPDATE
USING (
  -- Kendi bilgilerini güncelleyebilir
  PersonelTcKimlik = (
    SELECT PersonelTcKimlik FROM PersonelLevelizasyon 
    WHERE PersonelEmail = auth.jwt() ->> 'email'
  )
  OR
  -- Koordinatör kendi bölgesindeki personelleri güncelleyebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') = 'koordinator'
    AND PersonelTcKimlik IN (
      SELECT PersonelTcKimlik FROM PersonelLevelizasyon 
      WHERE BolgeID = (SELECT BolgeID FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email')
    )
  )
  OR
  -- Yönetici ve İK tüm bilgileri güncelleyebilir
  (
    (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
    IN ('yonetici', 'insan_kaynaklari')
  )
);

-- DELETE
CREATE POLICY "Sadece yönetici ve İK personel bilgisi silebilir"
ON "PersonelInfo"
FOR DELETE
USING (
  (SELECT PersonelRole FROM PersonelLevelizasyon WHERE PersonelEmail = auth.jwt() ->> 'email') 
  IN ('yonetici', 'insan_kaynaklari')
);
```

### 7. Test Edin
1. SQL komutlarını çalıştırdıktan sonra
2. Uygulamada yönetici olarak giriş yapın
3. Personel sayfasına gidin
4. Bölge filtresini değiştirin
5. Artık tüm bölgelerdeki personelleri görebilmelisiniz

## Önemli Notlar

- ⚠️ **RLS politikalarını değiştirmeden önce mevcut politikaları yedekleyin**
- 🔐 **Güvenlik**: RLS politikaları veritabanı güvenliğinin temelidir, dikkatli olun
- 🧪 **Test**: Her değişiklikten sonra tüm rolleri test edin (saha personeli, koordinatör, yönetici)
- 📊 **Performance**: Karmaşık RLS politikaları sorgu performansını etkileyebilir

## Alternatif Çözüm (Önerilmez)

Eğer RLS politikalarını güncellemek istemiyorsanız, uygulama tarafında **service role key** kullanabilirsiniz. Ancak bu **güvenlik riski** oluşturur ve **önerilmez**.

## Destek

Sorun devam ederse:
1. Console loglarını kontrol edin (F12 → Console)
2. Supabase Dashboard → Table Editor → PersonelLevelizasyon → RLS enabled olduğundan emin olun
3. Authentication → Policies sekmesinden politikaları kontrol edin
