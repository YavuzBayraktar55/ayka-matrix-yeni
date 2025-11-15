# Supabase Auth Migration - Kurulum Rehberi

## Adım 1: Service Role Key Ekle

`.env.local` dosyanıza Service Role Key'i ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ← BUNU EKLEYİN
```

**Service Role Key'i nereden alabilirsiniz:**
1. Supabase Dashboard → Settings → API
2. "Service Role" key'ini kopyalayın (güvenli bir yerdir, backend'de kullanılır)

## Adım 2: tsx Paketini Kur

```bash
npm install -D tsx
```

## Adım 3: Migration Script'i Çalıştır

```bash
npx tsx scripts/migrate-to-auth.ts
```

Bu script:
- ✅ Tüm aktif personeli Supabase Auth'a ekler
- ✅ Email/şifre ile kullanıcı oluşturur
- ✅ User metadata'ya TC Kimlik, Role, BolgeID ekler
- ✅ Email doğrulamasını otomatik yapar

## Adım 4: Yeni Personel Ekleme

Artık yeni personel eklerken `PersonelLevelizasyon` tablosuna eklemenin yanı sıra Supabase Auth'a da eklemelisiniz.

### Örnek Kod (Personel Ekleme Sayfasına Ekleyin):

```typescript
// PersonelLevelizasyon ve PersonelInfo'ya ekledikten sonra:

// Supabase Auth'a da ekle
const { error: authError } = await supabase.auth.admin.createUser({
  email: formData.PersonelEmail,
  password: formData.PersonelPassword,
  email_confirm: true,
  user_metadata: {
    tc_kimlik: formData.PersonelTcKimlik.toString(),
    role: formData.PersonelRole,
    bolge_id: formData.BolgeID?.toString() || null
  }
});

if (authError) {
  console.error('Auth kullanıcı oluşturulamadı:', authError);
}
```

## Güvenlik Modeli

### JWT-Based RLS Aktif:
- ✅ **Koordinatör**: Sadece kendi bölgesini görür (JWT'den bolge_id okunur)
- ✅ **Yönetici/İK**: Tüm bölgeleri görür
- ✅ **Saha Personeli**: Sadece kendi kayıtlarını görür

### RLS Politikaları:
- `PersonelLevelizasyon`: JWT metadata'dan role ve bolge_id kontrol eder
- `IzinTalepleri`: Join ile PersonelLevelizasyon üzerinden bölge kontrolü
- `AvansTalepleri`: İzin talepleri ile aynı mantık
- `AylikPuantaj`: BolgeID üzerinden direkt kontrol

## Önemli Notlar

⚠️ **Service Role Key'i GİZLİ tutun!** Bu key tüm RLS kurallarını bypass edebilir.

✅ Migration sadece bir kez çalıştırılmalı. Daha sonra yeni personel eklerken hem veritabanına hem Auth'a eklemelisiniz.

🔒 RLS artık **database seviyesinde** çalışıyor - frontend filtreleme gerekmez!

## Test

Migration sonrası koordinatör hesabıyla giriş yapın:
```
Email: gurhan.sahin@aykaenerji.com
Şifre: 123456
```

Sadece SAMSUN bölgesindeki personelleri göreceksiniz! 🎯
