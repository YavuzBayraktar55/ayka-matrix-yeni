/**
 * API Response Types
 * Tüm API endpoint'lerinin dönüş tipi tanımları
 */

import { PersonelInfo, BolgeInfo, UserRole, IzinTalepleri, AvansTalepleri } from './database';

// ==================== Generic API Response ====================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  statusCode?: number;
}

// ==================== Personel API ====================

export interface PersonelLevelizasyonFull {
  PersonelTcKimlik: string;
  PersonelEmail: string;
  PersonelRole: UserRole;
  PersonelAktif: boolean;
  BolgeID: number | null;
  PersonelInfo?: PersonelInfo;
  BolgeInfo?: BolgeInfo;
  created_at?: string;
  updated_at?: string;
}

export type GetPersonelResponse = ApiResponse<PersonelLevelizasyonFull[]>;

// ==================== İzin Talepleri API ====================

export interface FullIzinTalep extends IzinTalepleri {
  PersonelLevelizasyon: {
    PersonelInfo: {
      P_AdSoyad: string;
    };
    BolgeInfo: {
      BolgeAdi: string;
    };
    BolgeID: number;
    PersonelEmail: string;
  };
}

export interface IzinTalepGecmis {
  GecmisID: number;
  TalepID: number;
  IslemTuru: 'olusturma' | 'guncelleme' | 'onay' | 'red';
  EskiDurum?: string;
  YeniDurum: string;
  DegisiklikYapan: string;
  IslemTarihi: string;
  Aciklama?: string;
}

export type GetIzinTalepleriResponse = ApiResponse<FullIzinTalep[]>;
export type GetIzinGecmisResponse = ApiResponse<IzinTalepGecmis[]>;

// ==================== Avans Talepleri API ====================

export interface FullAvansTalep extends AvansTalepleri {
  PersonelLevelizasyon: {
    PersonelInfo: {
      P_AdSoyad: string;
    };
    BolgeInfo: {
      BolgeAdi: string;
    };
  };
}

export type GetAvansTalepleriResponse = ApiResponse<FullAvansTalep[]>;

// ==================== Bölge API ====================

export interface Bolge {
  BolgeID: number;
  BolgeAdi: string;
  BolgeAdres?: string;
  BolgeSicilNo?: string;
  created_at?: string;
}

export type GetBolgelerResponse = ApiResponse<Bolge[]>;

// ==================== Dashboard Stats API ====================

export interface DashboardStats {
  toplamPersonel: number;
  aktifPersonel: number;
  bekleyenIzinler: number;
  bekleyenAvanslar: number;
  buAyIzinler: number;
  buAyAvanslar: number;
  toplamBolge: number;
  aylikIstatistikler?: {
    ay: string;
    izinSayisi: number;
    avansSayisi: number;
  }[];
}

export type GetDashboardStatsResponse = ApiResponse<DashboardStats>;

// ==================== Sablon API ====================

export interface SablonDosya {
  sablonid: string;
  sablonadi: string;
  sablonturu: 'sozlesme' | 'izin' | 'avans' | 'diger';
  dosyayolu: string;
  aciklama?: string;
  versiyon?: string;
  aktif: boolean;
  created_at: string;
  updated_at?: string;
}

export type GetSablonlarResponse = ApiResponse<SablonDosya[]>;

export interface CreateSablonRequest {
  sablonadi: string;
  sablonturu: string;
  aciklama?: string;
  versiyon?: string;
  file: File;
}

export interface UpdateSablonRequest {
  sablonadi?: string;
  aciklama?: string;
  versiyon?: string;
  aktif?: boolean;
  file?: File;
}

// ==================== Belge Oluşturma API ====================

export interface CreateSozlesmeRequest {
  personelId: string;
  sablonTuru?: string;
}

export interface CreateIzinBelgesiRequest {
  talepId: number;
}

export interface CreateAvansBelgesiRequest {
  talepId: number;
}

// ==================== Puantaj API ====================

export interface Puantaj {
  PuantajID: number;
  PersonelTcKimlik: string;
  BolgeID: number;
  Tarih: string;
  CalismaSaati: number;
  MesaiSaati?: number;
  Aciklama?: string;
  ManuelDegisiklik: boolean;
  DegisiklikYapan?: string;
  DegisiklikTarihi?: string;
  created_at: string;
}

export interface PuantajDegisiklik {
  DegisiklikID: number;
  PuantajID: number;
  EskiDeger: number;
  YeniDeger: number;
  DegisiklikYapan: string;
  DegisiklikTarihi: string;
  Aciklama?: string;
}

export type GetPuantajResponse = ApiResponse<Puantaj[]>;
export type GetPuantajDegisiklikResponse = ApiResponse<PuantajDegisiklik[]>;

// ==================== Auth API ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  user?: {
    PersonelTcKimlik: number;
    PersonelEmail: string;
    PersonelRole: UserRole;
    PersonelAktif: boolean;
  };
}

// ==================== Validation Types ====================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: 'Validation Error';
  errors: ValidationError[];
}
