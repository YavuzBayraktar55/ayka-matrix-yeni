-- ============================================
-- HELPER FONKSIYONLAR (ÖNCE BUNLARI OLUŞTUR)
-- ============================================
-- Bu fonksiyonlar RLS politikalarında kullanılacak
-- NOT: auth şeması korumalı olduğu için public şemasında oluşturuyoruz

-- 1. Kullanıcının TC Kimlik numarasını döndürür
CREATE OR REPLACE FUNCTION public.get_user_tc_kimlik()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_tc_kimlik', '')::TEXT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. Kullanıcının rolünü döndürür
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_role', '')::TEXT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 3. Kullanıcının bölge ID'sini döndürür
CREATE OR REPLACE FUNCTION public.get_user_bolge_id()
RETURNS INTEGER AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'bolge_id', '')::INTEGER;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- AYLIKPuantaj TABLOSU RLS POLİTİKASI
-- ============================================
-- Tüm personel kendi puantaj kayıtlarını görebilir (sadece okuma yetkisi)
-- Koordinatör ve üstü kendi bölgelerinin puantajını görebilir
-- Yönetim tüm puantajları görebilir ve düzenleyebilir
-- ============================================

-- 1. RLS'i aktifleştir
ALTER TABLE "AylikPuantaj" ENABLE ROW LEVEL SECURITY;

-- 2. Eski politikaları temizle (varsa)
DROP POLICY IF EXISTS "puantaj_select_policy" ON "AylikPuantaj";
DROP POLICY IF EXISTS "puantaj_insert_policy" ON "AylikPuantaj";
DROP POLICY IF EXISTS "puantaj_update_policy" ON "AylikPuantaj";
DROP POLICY IF EXISTS "puantaj_delete_policy" ON "AylikPuantaj";

-- ============================================
-- SELECT POLİTİKASI - OKUMA YETKİSİ
-- ============================================
-- Saha personeli kendi bölgesinin puantajını görebilir
-- Koordinatör kendi bölgesinin puantajını görebilir
-- Yönetici ve İK tüm puantajları görebilir
CREATE POLICY "puantaj_select_policy" ON "AylikPuantaj"
FOR SELECT
USING (
  -- Saha personeli ve Koordinatör: Kendi bölgesinin puantajını görebilir
  (
    public.get_user_role() IN ('saha_personeli', 'koordinator') AND
    "AylikPuantaj"."BolgeID" = public.get_user_bolge_id()
  )
  OR
  -- Yönetici ve İK: Tüm puantajları görebilir
  public.get_user_role() IN ('yonetici', 'insan_kaynaklari')
);

-- ============================================
-- INSERT POLİTİKASI - YENİ KAYIT EKLEME
-- ============================================
-- Sadece koordinatör ve üstü puantaj ekleyebilir
CREATE POLICY "puantaj_insert_policy" ON "AylikPuantaj"
FOR INSERT
WITH CHECK (
  -- Koordinatör: Kendi bölgesinin puantajını ekleyebilir
  (
    public.get_user_role() = 'koordinator' AND
    "AylikPuantaj"."BolgeID" = public.get_user_bolge_id()
  )
  OR
  -- Yönetici ve İK: Tüm puantajları ekleyebilir
  public.get_user_role() IN ('yonetici', 'insan_kaynaklari')
);

-- ============================================
-- UPDATE POLİTİKASI - KAYIT GÜNCELLEME
-- ============================================
-- Sadece koordinatör ve üstü puantaj güncelleyebilir
CREATE POLICY "puantaj_update_policy" ON "AylikPuantaj"
FOR UPDATE
USING (
  -- Koordinatör: Kendi bölgesinin puantajını güncelleyebilir
  (
    public.get_user_role() = 'koordinator' AND
    "AylikPuantaj"."BolgeID" = public.get_user_bolge_id()
  )
  OR
  -- Yönetici ve İK: Tüm puantajları güncelleyebilir
  public.get_user_role() IN ('yonetici', 'insan_kaynaklari')
)
WITH CHECK (
  -- Aynı koşullar WITH CHECK için de geçerli
  (
    public.get_user_role() = 'koordinator' AND
    "AylikPuantaj"."BolgeID" = public.get_user_bolge_id()
  )
  OR
  public.get_user_role() IN ('yonetici', 'insan_kaynaklari')
);

-- ============================================
-- DELETE POLİTİKASI - KAYIT SİLME
-- ============================================
-- Sadece yönetici silebilir
CREATE POLICY "puantaj_delete_policy" ON "AylikPuantaj"
FOR DELETE
USING (
  public.get_user_role() = 'yonetici'
);

-- ============================================
-- POLİTİKA DOĞRULAMA
-- ============================================
-- Politikaların aktif olduğunu kontrol et
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'AylikPuantaj'
ORDER BY policyname;

-- Test için örnek sorgular
-- ============================================

-- Test 1: Saha personeli kendi puantajını görebilir mi?
-- SELECT * FROM "AylikPuantaj" WHERE "PersonelID" = '12345678901';

-- Test 2: Koordinatör kendi bölgesinin puantajını görebilir mi?
-- SELECT * FROM "AylikPuantaj" WHERE "PersonelID" IN (
--   SELECT "PersonelTcKimlik" FROM "PersonelLevelizasyon" 
--   WHERE "BolgeID" = public.get_user_bolge_id()
-- );

-- Test 3: Yönetici tüm puantajları görebilir mi?
-- SELECT * FROM "AylikPuantaj";

-- ============================================
-- NOTLAR
-- ============================================
-- 1. SELECT politikası tüm kullanıcılara açık (true)
-- 2. Bu sayede saha personeli izin talebi oluştururken tatil günlerini kontrol edebilir
-- 3. Ancak INSERT/UPDATE/DELETE sadece koordinatör ve üstüne kısıtlı
-- 4. Puantaj verisi hassas olduğu için düzenleme yetkileri sınırlı
