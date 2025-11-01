-- EvrakKayitlari tablosu oluştur
CREATE TABLE IF NOT EXISTS public."EvrakKayitlari" (
    "EvrakID" SERIAL PRIMARY KEY,
    "PersonelTcKimlik" BIGINT NOT NULL,
    "SablonAdi" TEXT NOT NULL,
    "SablonTuru" TEXT,
    "EvrakTarihi" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "Aciklama" TEXT,
    "PDFYolu" TEXT,
    "OlusturanEmail" TEXT,
    "OlusturmaTarihi" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_personel FOREIGN KEY ("PersonelTcKimlik") 
        REFERENCES public."PersonelLevelizasyon"("PersonelTcKimlik") 
        ON DELETE CASCADE
);

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_evrak_personel ON public."EvrakKayitlari"("PersonelTcKimlik");
CREATE INDEX IF NOT EXISTS idx_evrak_tarih ON public."EvrakKayitlari"("EvrakTarihi" DESC);
CREATE INDEX IF NOT EXISTS idx_evrak_sablon ON public."EvrakKayitlari"("SablonTuru");

-- RLS politikalarını etkinleştir
ALTER TABLE public."EvrakKayitlari" ENABLE ROW LEVEL SECURITY;

-- Tüm yetkili personel evrakları görebilir
CREATE POLICY "Evrakları herkes görebilir" ON public."EvrakKayitlari"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."PersonelLevelizasyon" pl
            WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
            AND pl."PersonelRole" IN ('koordinator', 'insan_kaynaklari', 'yonetici')
        )
    );

-- Yetkili personel evrak ekleyebilir
CREATE POLICY "Yetkili personel evrak ekleyebilir" ON public."EvrakKayitlari"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."PersonelLevelizasyon" pl
            WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
            AND pl."PersonelRole" IN ('koordinator', 'insan_kaynaklari', 'yonetici')
        )
    );

-- Evrak sahibi kendi evraklarını görebilir
CREATE POLICY "Personel kendi evraklarını görebilir" ON public."EvrakKayitlari"
    FOR SELECT
    USING (
        "PersonelTcKimlik" IN (
            SELECT "PersonelTcKimlik" FROM public."PersonelLevelizasyon"
            WHERE "PersonelEmail" = auth.jwt() ->> 'email'
        )
    );

-- Yetkili personel evrak güncelleyebilir
CREATE POLICY "Yetkili personel evrak güncelleyebilir" ON public."EvrakKayitlari"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public."PersonelLevelizasyon" pl
            WHERE pl."PersonelEmail" = auth.jwt() ->> 'email'
            AND pl."PersonelRole" IN ('koordinator', 'insan_kaynaklari', 'yonetici')
        )
    );

-- Storage bucket oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evraklar', 'evraklar', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politikaları
CREATE POLICY "Evrak PDF'lerini yetkili personel yükleyebilir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'evraklar' AND
    EXISTS (
        SELECT 1 FROM public."PersonelLevelizasyon"
        WHERE "PersonelEmail" = auth.jwt() ->> 'email'
        AND "PersonelRole" IN ('koordinator', 'insan_kaynaklari', 'yonetici')
    )
);

CREATE POLICY "Evrak PDF'lerini yetkili personel görebilir"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'evraklar' AND
    (
        -- Yetkili personel tüm evrakları görebilir
        EXISTS (
            SELECT 1 FROM public."PersonelLevelizasyon"
            WHERE "PersonelEmail" = auth.jwt() ->> 'email'
            AND "PersonelRole" IN ('koordinator', 'insan_kaynaklari', 'yonetici')
        )
        OR
        -- Personel kendi evraklarını görebilir (dosya yolu PersonelTcKimlik ile başlar)
        name LIKE (
            (SELECT "PersonelTcKimlik"::text FROM public."PersonelLevelizasyon"
             WHERE "PersonelEmail" = auth.jwt() ->> 'email') || '%'
        )
    )
);

CREATE POLICY "Evrak PDF'lerini yetkili personel silebilir"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'evraklar' AND
    EXISTS (
        SELECT 1 FROM public."PersonelLevelizasyon"
        WHERE "PersonelEmail" = auth.jwt() ->> 'email'
        AND "PersonelRole" IN ('yonetici', 'insan_kaynaklari')
    )
);

-- Başarılı mesajı
DO $$
BEGIN
    RAISE NOTICE 'EvrakKayitlari tablosu ve storage bucket başarıyla oluşturuldu!';
END $$;
