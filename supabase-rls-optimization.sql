-- =========================================
-- AYKAMATRIX RLS POLICY OPTİMİZASYONU
-- Row Level Security Performans İyileştirme
-- =========================================

-- NOT: Bu script mevcut RLS policy'lerini optimize eder
-- İndexler oluşturulduktan sonra çalıştırın!

-- =========================================
-- İZİN TALEPLERİ RLS OPTİMİZASYONU
-- =========================================

-- Mevcut policy'leri kaldır
DROP POLICY IF EXISTS "izin_talepleri_select_policy" ON "IzinTalepleri";
DROP POLICY IF EXISTS "izin_talepleri_insert_policy" ON "IzinTalepleri";
DROP POLICY IF EXISTS "izin_talepleri_update_policy" ON "IzinTalepleri";

-- Optimize edilmiş SELECT policy
-- Index kullanımını maksimize etmek için basitleştirildi
CREATE POLICY "izin_talepleri_select_policy" ON "IzinTalepleri"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      -- Saha personeli: Sadece kendi talepleri
      (pl."PersonelRole" = 'saha_personeli' AND "IzinTalepleri"."PersonelTcKimlik" = pl."PersonelTcKimlik")
      
      -- Koordinatör: Kendi bölgesindeki personellerin talepleri
      OR (pl."PersonelRole" = 'koordinator' AND EXISTS (
        SELECT 1 FROM "PersonelLevelizasyon" pl2
        WHERE pl2."PersonelTcKimlik" = "IzinTalepleri"."PersonelTcKimlik"
        AND pl2."BolgeID" = pl."BolgeID"
      ))
      
      -- Yönetici ve IK: Tüm talepler
      OR pl."PersonelRole" IN ('yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş INSERT policy
CREATE POLICY "izin_talepleri_insert_policy" ON "IzinTalepleri"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      -- Saha personeli: Sadece kendi adına
      (pl."PersonelRole" = 'saha_personeli' AND "IzinTalepleri"."PersonelTcKimlik" = pl."PersonelTcKimlik")
      
      -- Koordinatör, Yönetici, IK: Herkes adına
      OR pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş UPDATE policy
CREATE POLICY "izin_talepleri_update_policy" ON "IzinTalepleri"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
  )
);


-- =========================================
-- AVANS TALEPLERİ RLS OPTİMİZASYONU
-- =========================================

DROP POLICY IF EXISTS "avans_talepleri_select_policy" ON "AvansTalepleri";
DROP POLICY IF EXISTS "avans_talepleri_insert_policy" ON "AvansTalepleri";
DROP POLICY IF EXISTS "avans_talepleri_update_policy" ON "AvansTalepleri";

-- Optimize edilmiş SELECT policy
CREATE POLICY "avans_talepleri_select_policy" ON "AvansTalepleri"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      (pl."PersonelRole" = 'saha_personeli' AND "AvansTalepleri"."PersonelTcKimlik" = pl."PersonelTcKimlik")
      OR (pl."PersonelRole" = 'koordinator' AND EXISTS (
        SELECT 1 FROM "PersonelLevelizasyon" pl2
        WHERE pl2."PersonelTcKimlik" = "AvansTalepleri"."PersonelTcKimlik"
        AND pl2."BolgeID" = pl."BolgeID"
      ))
      OR pl."PersonelRole" IN ('yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş INSERT policy
CREATE POLICY "avans_talepleri_insert_policy" ON "AvansTalepleri"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      (pl."PersonelRole" = 'saha_personeli' AND "AvansTalepleri"."PersonelTcKimlik" = pl."PersonelTcKimlik")
      OR pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş UPDATE policy
CREATE POLICY "avans_talepleri_update_policy" ON "AvansTalepleri"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
  )
);


-- =========================================
-- PUANTAJ RLS OPTİMİZASYONU
-- =========================================

DROP POLICY IF EXISTS "puantaj_select_policy" ON "Puantaj";
DROP POLICY IF EXISTS "puantaj_insert_policy" ON "Puantaj";
DROP POLICY IF EXISTS "puantaj_update_policy" ON "Puantaj";

-- Optimize edilmiş SELECT policy
CREATE POLICY "puantaj_select_policy" ON "Puantaj"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      (pl."PersonelRole" = 'saha_personeli' AND "Puantaj"."PersonelTcKimlik" = pl."PersonelTcKimlik")
      OR (pl."PersonelRole" = 'koordinator' AND "Puantaj"."BolgeID" = pl."BolgeID")
      OR pl."PersonelRole" IN ('yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş INSERT/UPDATE policy
CREATE POLICY "puantaj_insert_policy" ON "Puantaj"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
  )
);

CREATE POLICY "puantaj_update_policy" ON "Puantaj"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND pl."PersonelRole" IN ('koordinator', 'yonetici', 'insan_kaynaklari')
  )
);


-- =========================================
-- PERSONEL LEVELİZASYON RLS OPTİMİZASYONU
-- =========================================

DROP POLICY IF EXISTS "personel_levelizasyon_select_policy" ON "PersonelLevelizasyon";
DROP POLICY IF EXISTS "personel_levelizasyon_update_policy" ON "PersonelLevelizasyon";

-- Optimize edilmiş SELECT policy
CREATE POLICY "personel_levelizasyon_select_policy" ON "PersonelLevelizasyon"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND (
      (pl."PersonelRole" = 'saha_personeli' AND "PersonelLevelizasyon"."PersonelEmail" = pl."PersonelEmail")
      OR (pl."PersonelRole" = 'koordinator' AND "PersonelLevelizasyon"."BolgeID" = pl."BolgeID")
      OR pl."PersonelRole" IN ('yonetici', 'insan_kaynaklari')
    )
  )
);

-- Optimize edilmiş UPDATE policy
CREATE POLICY "personel_levelizasyon_update_policy" ON "PersonelLevelizasyon"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "PersonelLevelizasyon" pl
    WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
    AND pl."PersonelRole" IN ('yonetici', 'insan_kaynaklari')
  )
);


-- =========================================
-- PERFORMANS KONTROL SORGUSU
-- =========================================

-- RLS policy'lerin index kullanımını kontrol et:
-- EXPLAIN ANALYZE
-- SELECT * FROM "IzinTalepleri"
-- WHERE "PersonelTcKimlik" = 'TEST_TC'
-- AND "Durum" = 'beklemede';

-- Cache istatistikleri:
-- SELECT 
--   schemaname,
--   tablename,
--   heap_blks_read,
--   heap_blks_hit,
--   idx_blks_read,
--   idx_blks_hit,
--   round(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) as cache_hit_ratio
-- FROM pg_statio_user_tables
-- WHERE schemaname = 'public'
-- ORDER BY cache_hit_ratio ASC;
