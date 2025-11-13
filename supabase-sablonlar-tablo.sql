-- Şablon Metadata Tablosu
CREATE TABLE IF NOT EXISTS public.SablonDosyalari (
    SablonID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    SablonAdi VARCHAR(255) NOT NULL,
    SablonTuru VARCHAR(50) NOT NULL, -- 'sozlesme', 'izin', 'avans', vb.
    DosyaAdi VARCHAR(255) NOT NULL, -- Storage'daki dosya adı
    DosyaYolu TEXT NOT NULL, -- Storage path
    DosyaBoyutu BIGINT, -- Bytes cinsinden
    Versiyon INTEGER DEFAULT 1,
    Aciklama TEXT,
    YukleyenKullanici BIGINT, -- Email ile kontrol edilecek
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_sablondosyalari_turu ON SablonDosyalari(SablonTuru);
CREATE INDEX IF NOT EXISTS idx_sablondosyalari_yukleme ON SablonDosyalari(created_at DESC);

-- RLS Politikaları
ALTER TABLE SablonDosyalari ENABLE ROW LEVEL SECURITY;

-- Okuma - Tüm authenticated kullanıcılar
CREATE POLICY "Anyone can read templates"
ON SablonDosyalari FOR SELECT
TO authenticated
USING (true);

-- Yazma - Sadece service role (API'ler kendi yetki kontrolünü yapar)
-- RLS'i bypass etmek için service_role kullanıyoruz
CREATE POLICY "Service role can manage templates"
ON SablonDosyalari FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_sablondosyalari_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sablondosyalari_updated_at ON SablonDosyalari;
CREATE TRIGGER trigger_update_sablondosyalari_updated_at
BEFORE UPDATE ON SablonDosyalari
FOR EACH ROW
EXECUTE FUNCTION update_sablondosyalari_updated_at();

-- Varsayılan şablon kayıtları ekle (DosyaYolu bucket root'tan)
INSERT INTO SablonDosyalari (SablonAdi, SablonTuru, DosyaAdi, DosyaYolu, Aciklama)
VALUES 
    ('İş Sözleşmesi Şablonu', 'sozlesme', 'sozlesme-sablon.docx', 'sozlesme-sablon.docx', 'Standart iş sözleşmesi şablonu'),
    ('İzin Formu Şablonu', 'izin', 'izin-sablon.docx', 'izin-sablon.docx', 'İzin talep formu şablonu'),
    ('Avans Talep Şablonu', 'avans', 'avans-sablon.docx', 'avans-sablon.docx', 'Avans talep formu şablonu')
ON CONFLICT DO NOTHING;

-- Açıklamalar
COMMENT ON TABLE SablonDosyalari IS 'Supabase Storage''da saklanan Word şablonlarının metadata bilgileri';
COMMENT ON COLUMN SablonDosyalari.SablonTuru IS 'Şablon türü: sozlesme, izin, avans, genel';
COMMENT ON COLUMN SablonDosyalari.DosyaYolu IS 'Supabase Storage içindeki dosya adı (bucket root)';
COMMENT ON COLUMN SablonDosyalari.Versiyon IS 'Şablon versiyonu, her güncellemede artırılır';

-- Başarı mesajı
DO $$
BEGIN
    RAISE NOTICE '✅ SablonDosyalari tablosu başarıyla oluşturuldu!';
    RAISE NOTICE '✅ RLS politikaları aktif';
    RAISE NOTICE '✅ Varsayılan kayıtlar eklendi';
    RAISE NOTICE 'ℹ️  Not: Service role API''ler kendi yetki kontrolünü yapar';
END $$;
