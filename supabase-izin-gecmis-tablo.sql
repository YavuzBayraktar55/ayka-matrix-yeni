-- İzin Talep Geçmişi (History/Log) Tablosu
CREATE TABLE IF NOT EXISTS "IzinTalepGecmis" (
  "GecmisID" SERIAL PRIMARY KEY,
  "TalepID" INTEGER NOT NULL REFERENCES "IzinTalepleri"("TalepID") ON DELETE CASCADE,
  "IslemTarihi" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "IslemYapan" INTEGER NOT NULL REFERENCES "PersonelLevelizasyon"("PersonelTcKimlik"),
  "IslemTipi" VARCHAR(50) NOT NULL, -- 'olusturuldu', 'koordinator_onay', 'yonetim_onay', 'reddedildi', 'tarih_degistirildi', 'iptal'
  "EskiDurum" VARCHAR(50),
  "YeniDurum" VARCHAR(50),
  "EskiBaslangic" DATE,
  "YeniBaslangic" DATE,
  "EskiBitis" DATE,
  "YeniBitis" DATE,
  "Not" TEXT,
  "IslemYapanAd" VARCHAR(255) -- Denormalize edilmiş ad (performans için)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_talep ON "IzinTalepGecmis"("TalepID");
CREATE INDEX IF NOT EXISTS idx_izin_talep_gecmis_tarih ON "IzinTalepGecmis"("IslemTarihi");

-- RLS Aktif
ALTER TABLE "IzinTalepGecmis" ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
-- Geçmiş kayıtlarını herkes okuyabilir (kendi erişebildiği taleplerin geçmişini)
CREATE POLICY "Geçmiş kayıtları görüntüle"
ON "IzinTalepGecmis"
FOR SELECT
USING (
  -- Kendi taleplerinin geçmişini görebilir
  "TalepID" IN (
    SELECT "TalepID" FROM "IzinTalepleri" 
    WHERE "PersonelTcKimlik" = (
      SELECT "PersonelTcKimlik" FROM "PersonelLevelizasyon" 
      WHERE "PersonelEmail" = auth.jwt() ->> 'email'
    )
  )
  OR
  -- Koordinatör kendi bölgesindeki taleplerin geçmişini görebilir
  (
    (SELECT "PersonelRole" FROM "PersonelLevelizasyon" WHERE "PersonelEmail" = auth.jwt() ->> 'email') = 'koordinator'
    AND "TalepID" IN (
      SELECT it."TalepID" FROM "IzinTalepleri" it
      INNER JOIN "PersonelLevelizasyon" pl ON it."PersonelTcKimlik" = pl."PersonelTcKimlik"
      WHERE pl."BolgeID" = (
        SELECT "BolgeID" FROM "PersonelLevelizasyon" 
        WHERE "PersonelEmail" = auth.jwt() ->> 'email'
      )
    )
  )
  OR
  -- Yönetici ve İK tüm geçmişi görebilir
  (
    (SELECT "PersonelRole" FROM "PersonelLevelizasyon" WHERE "PersonelEmail" = auth.jwt() ->> 'email') 
    IN ('yonetici', 'insan_kaynaklari')
  )
);

-- Geçmiş kayıtları sadece sistem ekleyebilir (INSERT trigger ile)
CREATE POLICY "Geçmiş kayıtları ekle"
ON "IzinTalepGecmis"
FOR INSERT
WITH CHECK (true); -- Trigger tarafından kontrol edilecek

-- Güncelleme ve silme yasak
CREATE POLICY "Geçmiş kayıtları güncelleme yasak"
ON "IzinTalepGecmis"
FOR UPDATE
USING (false);

CREATE POLICY "Geçmiş kayıtları silme yasak"
ON "IzinTalepGecmis"
FOR DELETE
USING (false);

COMMENT ON TABLE "IzinTalepGecmis" IS 'İzin talep geçmişi - her değişiklik ve onay/red işlemi kaydedilir';
COMMENT ON COLUMN "IzinTalepGecmis"."IslemTipi" IS 'olusturuldu, koordinator_onay, yonetim_onay, reddedildi, tarih_degistirildi, iptal';
