# 🏢 AY-KA Matrix - İnsan Kaynakları Yönetim Sistemi

Modern, güvenli ve kullanıcı dostu bir insan kaynakları yönetim platformu. Personel takibi, izin/avans yönetimi, puantaj sistemi ve otomatik belge oluşturma özellikleri içerir.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.75-green?logo=supabase)
![License](https://img.shields.io/badge/License-Private-red)

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknoloji Stack](#-teknoloji-stack)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Güvenlik](#-güvenlik)
- [Geliştirici Notları](#-geliştirici-notları)

---

## ✨ Özellikler

### 👥 Personel Yönetimi
- ✅ Personel CRUD operasyonları
- ✅ Detaylı personel profilleri
- ✅ Bölge/Departman bazlı organizasyon
- ✅ Role-based access control (RBAC)

### 🏖️ İzin Yönetimi
- ✅ İzin talep oluşturma ve onaylama
- ✅ Yıllık, ücretli, ücretsiz, raporlu izin türleri
- ✅ Koordinatör ve yönetici onay sistemi
- ✅ İzin geçmişi ve takip
- ✅ Otomatik izin belgesi oluşturma (Word)

### 💰 Avans Yönetimi
- ✅ Avans talep sistemi
- ✅ Çok aşamalı onay mekanizması
- ✅ Avans takip ve raporlama
- ✅ Otomatik avans belgesi oluşturma

### ⏱️ Puantaj Sistemi
- ✅ Günlük puantaj girişi
- ✅ Manuel değişiklik takibi
- ✅ Bölge bazlı puantaj görüntüleme
- ✅ Excel export

### 📄 Belge Yönetimi
- ✅ Word şablon sistemi
- ✅ Otomatik sözleşme oluşturma
- ✅ Değişken sistemi (60+ değişken)
- ✅ Şablon yükleme ve düzenleme
- ✅ PDF dönüştürme

### 📊 Dashboard & Raporlama
- ✅ Gerçek zamanlı istatistikler
- ✅ Görsel grafikler (Recharts)
- ✅ Filtreleme ve arama
- ✅ Export özellikleri

---

## 🛠️ Teknoloji Stack

### Frontend
- **Framework:** [Next.js 15.5](https://nextjs.org/) (App Router)
- **Language:** TypeScript 5.0
- **Styling:** Tailwind CSS 4.0
- **UI Components:** Lucide Icons
- **Charts:** Recharts
- **State Management:** React Context API
- **Data Fetching:** SWR (stale-while-revalidate)

### Backend
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **API:** Next.js API Routes
- **Security:** Row Level Security (RLS)

### Belge İşleme
- **Word:** docxtemplater, pizzip
- **PDF:** jsPDF, jspdf-autotable
- **Excel:** xlsx

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18.0 veya üzeri
- npm, yarn veya pnpm
- Supabase hesabı

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/YavuzBayraktar55/ayka-matrix-yeni.git
cd ayka-matrix-yeni
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
# veya
yarn install
# veya
pnpm install
```

### 3. Environment Variables
`.env.local.example` dosyasını `.env.local` olarak kopyalayın:
```bash
cp .env.local.example .env.local
```

Ardından Supabase bilgilerinizi ekleyin:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> ⚠️ **Güvenlik Uyarısı:** `SUPABASE_SERVICE_ROLE_KEY` asla GitHub'a push edilmemelidir!
> Detaylar için: `.env.local.security-notes.md`

### 4. Veritabanı Kurulumu
Supabase SQL Editor'de sırayla çalıştırın:
```bash
# 1. Temel tablolar ve RLS
supabase-rls-optimization.sql

# 2. Performans index'leri
supabase-performance-indexes.sql

# 3. İzin geçmiş tablosu
supabase-izin-gecmis-tablo.sql

# 4. Şablon sistemi
supabase-sablonlar-tablo-v2.sql
```

### 5. Development Server'ı Başlatın
```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## 💻 Kullanım

### Kullanıcı Rolleri

| Role | Açıklama | Yetkiler |
|------|----------|----------|
| **Yönetici** | Tam yetki | Tüm işlemler |
| **İnsan Kaynakları** | İK departmanı | Tüm personel, izin ve avans işlemleri |
| **Koordinatör** | Bölge yöneticisi | Kendi bölgesindeki personel ve talepler |
| **Saha Personeli** | Normal kullanıcı | Kendi bilgileri ve talepleri |

### İlk Giriş
1. Varsayılan kullanıcılar Supabase Auth'ta oluşturulmalıdır
2. Email ve şifre ile giriş yapın
3. Dashboard'a yönlendirileceksiniz

---

## 📡 API Dokümantasyonu

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/logout` - Çıkış

### Personel
- `GET /api/personel` - Personel listesi
- `GET /api/personel?userEmail=...&userRole=...` - Filtered list
- `POST /api/personel` - Yeni personel
- `PUT /api/personel/:id` - Personel güncelleme
- `DELETE /api/personel/:id` - Personel silme

### İzin Talepleri
- `GET /api/izin-talepleri` - İzin listesi
- `POST /api/izin-olustur` - Yeni izin talebi
- `PUT /api/izin-talepleri/:id` - İzin onaylama/reddetme
- `GET /api/izin-gecmis/:id` - İzin geçmişi
- `POST /api/izin-belgesi-olustur` - İzin belgesi oluştur

### Avans Talepleri
- `GET /api/avans-talepleri` - Avans listesi
- `POST /api/avans-talepleri` - Yeni avans talebi
- `PUT /api/avans-talepleri/:id` - Avans onaylama
- `POST /api/avans-belgesi-olustur` - Avans belgesi

### Belge Yönetimi
- `GET /api/sablon-dosyalari` - Şablon listesi
- `POST /api/sablon-dosyalari` - Şablon yükleme
- `GET /api/sablon-indir/:id` - Şablon indirme
- `POST /api/sozlesme-olustur` - Sözleşme oluşturma
- `GET /api/kilavuz-indir` - Değişkenler kılavuzu

### Dashboard
- `GET /api/dashboard-stats` - İstatistikler

---

## 🔒 Güvenlik

### Row Level Security (RLS)
Tüm tablolarda RLS aktif:
- Kullanıcılar sadece yetkili oldukları verileri görebilir
- Koordinatörler kendi bölgelerini yönetir
- Saha personeli sadece kendi bilgilerine erişir

### Authentication
- Supabase Auth ile güvenli oturum yönetimi
- JWT token bazlı authentication
- Auto-refresh token

### API Güvenliği
- Service role key sadece API route'larında
- Input validation
- Error handling
- Rate limiting (önerilir)

### Best Practices
- ✅ Environment variables .gitignore'da
- ✅ SQL injection koruması (parameterized queries)
- ✅ XSS koruması (React default)
- ✅ CSRF koruması (SameSite cookies)

---

## 🔧 Geliştirici Notları

### Proje Yapısı
```
ayka-matrix/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   ├── dashboard/    # Dashboard pages
│   │   └── login/        # Auth pages
│   ├── components/       # React components
│   ├── contexts/         # Context providers
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   │   ├── helpers/      # Helper functions
│   │   └── supabase/     # Supabase client
│   └── types/            # TypeScript types
├── public/               # Static files
└── docs/                 # Documentation
```

### Kod Standartları
```typescript
// ✅ İyi
import { formatDate } from '@/lib/helpers/formatters';
const tarih = formatDate(new Date());

// ❌ Kötü - duplicate kod
function formatDate(date: Date) { ... }
```

### Testing (Gelecek)
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:coverage # Coverage report
```

### Deployment

#### Vercel (Önerilen)
```bash
npm run build
vercel --prod
```

#### Environment Variables (Production)
Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Secret olarak işaretle)

---

## 📚 Ek Dokümantasyon

- [Şablon Sistemi](./SABLON_SISTEMI_README.md)
- [Değişkenler Kılavuzu](./SABLON_DEGISKENLER_KILAVUZU.md)
- [RLS Politikaları](./RLS_GUIDE.md)
- [Performans Optimizasyonu](./PERFORMANS_NIHAI_RAPOR.md)
- [Güvenlik Notları](./.env.local.security-notes.md)

---

## 🐛 Bilinen Sorunlar

- [ ] Test coverage eksik
- [ ] Mobile responsive iyileştirilebilir
- [ ] Bulk operations yok

---

## 📝 Changelog

### v1.0.0 (Kasım 2025)
- ✅ İlk stabil release
- ✅ İzin/Avans yönetimi
- ✅ Belge oluşturma sistemi
- ✅ Dashboard ve raporlama

---

## 👥 Katkıda Bulunanlar

- **Proje Sahibi:** Yavuz Bayraktar
- **Geliştirici:** GitHub Copilot desteği ile

---

## 📄 Lisans

Bu proje özel mülkiyettir. Tüm hakları saklıdır.

---

## 📞 Destek

Sorularınız için:
- **Email:** [destek@aykamatrix.com](mailto:destek@aykamatrix.com)
- **GitHub Issues:** [Issues](https://github.com/YavuzBayraktar55/ayka-matrix-yeni/issues)

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**

Son Güncelleme: 16 Kasım 2025
