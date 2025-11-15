-- =========================================
-- AYKAMATRIX PERFORMANS İYİLEŞTİRME
-- Supabase Index Optimizasyon Script
-- =========================================

-- İzin Talepleri Tablosu İndeksleri
-- =========================================

-- 1. PersonelTcKimlik'e göre sorgulama (saha personeli kendi taleplerini görür)
CREATE INDEX IF NOT EXISTS idx_izintalepleri_personel 
ON "IzinTalepleri" ("PersonelTcKimlik");

-- 2. Durum filtreleme (beklemede, onaylandı, reddedildi)
CREATE INDEX IF NOT EXISTS idx_izintalepleri_durum 
ON "IzinTalepleri" ("Durum");

-- 3. Tarih aralığı sorgulamaları için
CREATE INDEX IF NOT EXISTS idx_izintalepleri_tarih 
ON "IzinTalepleri" ("BaslangicTarihi", "BitisTarihi");

-- 4. Composite index - Durum ve tarih birlikte sorgulanır
CREATE INDEX IF NOT EXISTS idx_izintalepleri_durum_tarih 
ON "IzinTalepleri" ("Durum", "created_at" DESC);

-- 5. İzin türü filtreleme
CREATE INDEX IF NOT EXISTS idx_izintalepleri_tur 
ON "IzinTalepleri" ("IzinTuru");


-- Avans Talepleri Tablosu İndeksleri
-- =========================================

-- 1. PersonelTcKimlik'e göre sorgulama
CREATE INDEX IF NOT EXISTS idx_avanstalepleri_personel 
ON "AvansTalepleri" ("PersonelTcKimlik");

-- 2. Durum filtreleme
CREATE INDEX IF NOT EXISTS idx_avanstalepleri_durum 
ON "AvansTalepleri" ("Durum");

-- 3. Composite index - Durum ve tarih
CREATE INDEX IF NOT EXISTS idx_avanstalepleri_durum_tarih 
ON "AvansTalepleri" ("Durum", "created_at" DESC);


-- Personel Levelizasyon Tablosu İndeksleri
-- =========================================

-- 1. Email ile sorgulama (her login'de kullanılır)
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_email 
ON "PersonelLevelizasyon" ("PersonelEmail");

-- 2. TC Kimlik ile sorgulama
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_tc 
ON "PersonelLevelizasyon" ("PersonelTcKimlik");

-- 3. Bölge ID ile sorgulama (koordinatör kendi bölgesini görür)
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_bolge 
ON "PersonelLevelizasyon" ("BolgeID");

-- 4. Role göre filtreleme
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_role 
ON "PersonelLevelizasyon" ("PersonelRole");

-- 5. Aktif personel filtreleme
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_aktif 
ON "PersonelLevelizasyon" ("Aktif");

-- 6. Composite index - Bölge ve aktif durum (koordinatör aktif personelini görür)
CREATE INDEX IF NOT EXISTS idx_personellevelizasyon_bolge_aktif 
ON "PersonelLevelizasyon" ("BolgeID", "Aktif");


-- Puantaj Tablosu İndeksleri
-- =========================================

-- 1. Personel ve tarih composite index (en sık kullanılan sorgu)
CREATE INDEX IF NOT EXISTS idx_puantaj_personel_tarih 
ON "Puantaj" ("PersonelTcKimlik", "Tarih" DESC);

-- 2. Bölge ve tarih (koordinatör bölge puantajını görür)
CREATE INDEX IF NOT EXISTS idx_puantaj_bolge_tarih 
ON "Puantaj" ("BolgeID", "Tarih" DESC);

-- 3. Tarih aralığı sorgulamaları
CREATE INDEX IF NOT EXISTS idx_puantaj_tarih 
ON "Puantaj" ("Tarih" DESC);


-- İzin Tahlep Geçmiş Tablosu İndeksleri
-- =========================================

-- 1. Talep ID ile geçmiş sorgulaması
CREATE INDEX IF NOT EXISTS idx_izintarepgecmis_talep 
ON "IzinTalepGecmis" ("TalepID", "IslemTarihi" DESC);


-- Bölgeler Tablosu İndeksleri
-- =========================================

-- 1. Bölge adı ile sıralama/arama
CREATE INDEX IF NOT EXISTS idx_bolgeler_ad 
ON "Bolgeler" ("BolgeAdi");


-- Personel Info Tablosu İndeksleri
-- =========================================

-- 1. TC Kimlik ile personel bilgisi getirme
CREATE INDEX IF NOT EXISTS idx_personelinfo_tc 
ON "PersonelInfo" ("P_TcKimlik");

-- 2. Ad Soyad ile arama
CREATE INDEX IF NOT EXISTS idx_personelinfo_adsoyad 
ON "PersonelInfo" ("P_AdSoyad");


-- =========================================
-- ANALYZE - İstatistikleri güncelle
-- =========================================

ANALYZE "IzinTalepleri";
ANALYZE "AvansTalepleri";
ANALYZE "PersonelLevelizasyon";
ANALYZE "Puantaj";
ANALYZE "IzinTalepGecmis";
ANALYZE "Bolgeler";
ANALYZE "PersonelInfo";

-- =========================================
-- İNDEX KULLANIMI RAPORU
-- =========================================

-- Mevcut indexleri görmek için:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Index kullanım istatistikleri:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
