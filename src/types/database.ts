export type UserRole = 'saha_personeli' | 'koordinator' | 'insan_kaynaklari' | 'yonetici';

export interface PersonelLevelizasyon {
  PersonelTcKimlik: number;
  PersonelRole: UserRole;
  PersonelEmail: string;
  PersonelPassword: string;
  PersonelAktif: boolean;
  BolgeID: number | null;
  Pleveli?: number;
  created_at: string;
  updated_at: string;
}

export interface BolgeInfo {
  BolgeID: number;
  BolgeAdi: string | null;
  BolgeSicilNo: string | null;
  BolgeAdres: string | null;
  BolgeIL: string | null;
  BolgeSGKkodu: number | null;
  created_at: string;
}

export interface PersonelInfo {
  PersonelTcKimlik: number;
  P_AdSoyad: string | null;
  P_KidemTarihi: string | null;
  P_AykaSozlesmeTarihi: string | null;
  P_DogumTarihi: string | null;
  P_DogumYeri: string | null;
  P_BabaAdi: string | null;
  P_MedeniHali: boolean | null;
  P_EsGelir: boolean | null;
  P_CocukSayisi: string | null;
  P_AgiYuzdesi: number | null;
  P_EngelOrani: number | null;
  P_Adres: string | null;
  P_TelNo: string | null;
  P_MailAdres: string | null;
  P_Mezuniyet: string | null;
  P_Bolum: string | null;
  P_AskerlikDurum: string | null;
  P_TecilBitis: string | null;
  P_Ehliyet: string | null;
  P_KanGrubu: string | null;
  P_IBANno: string | null;
  P_DogalGazSayacBelge: boolean | null;
  P_DogalGazSayacBelgeGecerlilik: string | null;
  P_IcTesisatBelge: boolean | null;
  P_IcTesisatBelgeGecerlilik: string | null;
  P_Gorevi: string | null;
  P_Sube: string | null;
  P_IsCikis: boolean;
  P_IsCikisTarihi: string | null;
  created_at: string;
}

// Geçici: Eski ve yeni değerleri destekle
export type IzinTuru = 'ucretli' | 'ucretsiz' | 'raporlu' | 'yillik' | 'mazeret' | 'hastalik' | 'dogum' | 'vefat' | 'evlilik';
export type TalepDurum = 'beklemede' | 'koordinator_onay' | 'yonetim_onay' | 'reddedildi' | 'iptal';
export type IslemTipi = 'olusturuldu' | 'koordinator_onay' | 'yonetim_onay' | 'reddedildi' | 'tarih_degistirildi' | 'iptal';

export interface IzinTalepleri {
  TalepID: number;
  PersonelTcKimlik: number;
  IzinTuru: IzinTuru;
  BaslangicTarihi: string;
  BitisTarihi: string;
  GunSayisi: number;
  Aciklama: string | null;
  Durum: TalepDurum;
  KoordinatorNotu: string | null;
  YonetimNotu: string | null;
  KoordinatorOnayTarihi: string | null;
  YonetimOnayTarihi: string | null;
  created_at: string;
  updated_at: string;
}

export interface IzinTalepGecmis {
  GecmisID: number;
  TalepID: number;
  IslemTarihi: string;
  IslemYapan: number;
  IslemTipi: IslemTipi;
  EskiDurum: TalepDurum | null;
  YeniDurum: TalepDurum | null;
  EskiBaslangic: string | null;
  YeniBaslangic: string | null;
  EskiBitis: string | null;
  YeniBitis: string | null;
  Not: string | null;
  IslemYapanAd: string | null;
}

export interface AvansTalepleri {
  TalepID: number;
  PersonelTcKimlik: number;
  AvansGunSayisi: number;
  AvansMiktari: number;
  Aciklama: string | null;
  Durum: TalepDurum;
  KoordinatorNotu: string | null;
  YonetimNotu: string | null;
  KoordinatorOnayTarihi: string | null;
  YonetimOnayTarihi: string | null;
  OdemeTarihi: string | null;
  created_at: string;
  updated_at: string;
}

export type EvrakTuru = 'ise_giris' | 'isten_cikis' | 'tutanak' | 'uyari' | 'diger';
export type EvrakDurum = 'hazirlaniyor' | 'tamamlandi' | 'imzalandi' | 'arsivlendi';

export interface EvrakTakip {
  EvrakID: number;
  PersonelTcKimlik: number;
  EvrakTuru: EvrakTuru;
  EvrakAdi: string;
  EvrakDurum: EvrakDurum;
  DosyaURL: string | null;
  Aciklama: string | null;
  HazirlayanKisi: number | null;
  created_at: string;
  updated_at: string;
}

export interface AykaSosyal {
  PostID: number;
  PersonelTcKimlik: number;
  PostIcerik: string;
  ResimURL: string | null;
  BegeniSayisi: number;
  YorumSayisi: number;
  created_at: string;
  updated_at: string;
}

export interface CalismaŞablonlari {
  SablonID: number;
  BolgeID: number;
  SablonAdi: string;
  Aktif: boolean;
  created_at: string;
  updated_at: string;
}

export type SlotTipi = 'normal' | 'hafta_tatili' | 'resmi_tatil';

export interface SablonSlotlari {
  SlotID: number;
  SablonID: number;
  SlotSirasi: number;
  SlotTipi: SlotTipi;
  BaslangicSaati: string | null;
  BitisSaati: string | null;
  MolaSuresi: number;
  GunTipi: string | null;
  Aciklama: string | null;
}

export type PuantajDurum = 'hazirlanıyor' | 'kaydedildi' | 'onaylandi';

export interface AylikPuantaj {
  PuantajID: number;
  BolgeID: number;
  YilAy: string;
  SablonID: number;
  Durum: PuantajDurum;
  KaydedenKisi: number | null;
  KayitTarihi: string | null;
  created_at: string;
}

export type CalismaTipi = 'normal' | 'izinli' | 'hafta_tatili' | 'resmi_tatil' | 'hastalik' | 'mazeret';

export interface GunlukCalisma {
  KayitID: number;
  PuantajID: number;
  PersonelTcKimlik: number;
  Tarih: string;
  CalismaSlotID: number | null;
  BaslangicSaati: string | null;
  BitisSaati: string | null;
  MolaSuresi: number;
  CalismaTipi: CalismaTipi;
  IzinTalepID: number | null;
  Notlar: string | null;
  RenkKodu: string | null;
  created_at: string;
  updated_at: string;
}
