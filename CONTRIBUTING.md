# 🤝 Katkıda Bulunma Rehberi

AY-KA Matrix projesine katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 📋 İçindekiler

- [Davranış Kuralları](#davranış-kuralları)
- [Nasıl Katkıda Bulunurum](#nasıl-katkıda-bulunurum)
- [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
- [Kod Standartları](#kod-standartları)
- [Commit Mesaj Kuralları](#commit-mesaj-kuralları)
- [Pull Request Süreci](#pull-request-süreci)

---

## 📜 Davranış Kuralları

- ✅ Saygılı ve profesyonel olun
- ✅ Yapıcı eleştiri yapın
- ✅ Açık fikirli olun
- ❌ Saldırgan veya aşağılayıcı dil kullanmayın

---

## 🚀 Nasıl Katkıda Bulunurum?

### Bug Bildirimi
1. GitHub Issues'da yeni bir issue açın
2. Bug'ı detaylı açıklayın
3. Yeniden oluşturma adımlarını ekleyin
4. Beklenen ve gerçekleşen davranışı belirtin
5. Ekran görüntüleri ekleyin (varsa)

### Özellik İsteği
1. GitHub Issues'da "Feature Request" etiketi ile issue açın
2. Özelliği detaylı açıklayın
3. Kullanım senaryoları ekleyin
4. Varsa mockup/wireframe paylaşın

### Kod Katkısı
1. Issue seçin veya yeni issue oluşturun
2. Fork yapın
3. Feature branch oluşturun
4. Kodunuzu yazın
5. Test edin
6. Pull Request açın

---

## 🛠️ Geliştirme Ortamı Kurulumu

### 1. Repository'yi Klonlayın
```bash
git clone https://github.com/YavuzBayraktar55/ayka-matrix-yeni.git
cd ayka-matrix-yeni
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment Variables
```bash
cp .env.local.example .env.local
# .env.local dosyasını düzenleyin
```

### 4. Development Server
```bash
npm run dev
```

---

## 💻 Kod Standartları

### TypeScript
```typescript
// ✅ İyi
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User | null {
  // ...
}

// ❌ Kötü
function getUser(id) {
  // ...
}
```

### React Components
```typescript
// ✅ İyi - Fonksiyon component
export function MyComponent({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

// ❌ Kötü - Class component (eskimiş)
class MyComponent extends React.Component {
  // ...
}
```

### Naming Conventions
```typescript
// Components: PascalCase
export function UserCard() { }

// Functions: camelCase
function getUserData() { }

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = "...";

// Types/Interfaces: PascalCase
interface UserData { }
type UserRole = "admin" | "user";
```

### File Structure
```
src/
├── app/              # Pages ve routes
├── components/       # Reusable components
│   ├── ui/          # Basic UI components
│   └── features/    # Feature-specific components
├── hooks/           # Custom hooks
├── lib/             # Utilities
│   └── helpers/     # Helper functions
└── types/           # TypeScript types
```

### Import Order
```typescript
// 1. External libraries
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 2. Internal imports
import { formatDate } from '@/lib/helpers/formatters';
import { UserCard } from '@/components/UserCard';

// 3. Types
import type { User } from '@/types/database';

// 4. Styles
import './styles.css';
```

---

## 📝 Commit Mesaj Kuralları

### Format
```
<tip>(<kapsam>): <açıklama>

[isteğe bağlı gövde]

[isteğe bağlı footer]
```

### Tipler
- `feat`: Yeni özellik
- `fix`: Bug düzeltme
- `docs`: Dokümantasyon değişikliği
- `style`: Kod formatı (kod mantığı değişmez)
- `refactor`: Kod iyileştirme (ne bug fix ne feature)
- `test`: Test ekleme/düzeltme
- `chore`: Build, dependency güncellemeleri

### Örnekler
```bash
# Yeni özellik
feat(izin): izin geçmişi görüntüleme eklendi

# Bug düzeltme
fix(auth): login sonrası redirect sorunu düzeltildi

# Dokümantasyon
docs(readme): kurulum adımları güncellendi

# Refactoring
refactor(api): helper fonksiyonlar merkezileştirildi
```

---

## 🔄 Pull Request Süreci

### 1. Branch Oluşturun
```bash
# Feature
git checkout -b feat/yeni-ozellik

# Bug fix
git checkout -b fix/bug-aciklamasi

# Docs
git checkout -b docs/dokuman-guncelleme
```

### 2. Kodunuzu Yazın
- Kod standartlarına uyun
- Yorum ekleyin (gerekiyorsa)
- Değişiklikleri test edin

### 3. Commit Yapın
```bash
git add .
git commit -m "feat(izin): yeni özellik açıklaması"
```

### 4. Push Edin
```bash
git push origin feat/yeni-ozellik
```

### 5. Pull Request Açın
1. GitHub'da repository'ye gidin
2. "Pull Request" butonuna tıklayın
3. Branch'inizi seçin
4. Açıklama yazın:
   ```markdown
   ## Değişiklikler
   - [ ] Yeni özellik X eklendi
   - [ ] Bug Y düzeltildi
   
   ## Test Edilen Senaryolar
   - [ ] Senaryo 1
   - [ ] Senaryo 2
   
   ## Screenshots (varsa)
   [ekran görüntüleri]
   
   Closes #123
   ```
5. "Create Pull Request" tıklayın

### 6. Review Süreci
- Geri bildirime açık olun
- İstenen değişiklikleri yapın
- Tartışmalara katılın

---

## ✅ Checklist (PR Öncesi)

- [ ] Kod standartlarına uygun mu?
- [ ] TypeScript hataları var mı? (`npm run build`)
- [ ] Lint hataları var mı? (`npm run lint`)
- [ ] Testler geçiyor mu? (test yazıldıysa)
- [ ] Dokümantasyon güncellendi mi? (gerekiyorsa)
- [ ] Commit mesajları kurallara uygun mu?
- [ ] `.env.local` gibi hassas dosyalar commit'lenmedi mi?

---

## 🧪 Testing (Gelecek)

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Coverage
```bash
npm run test:coverage
```

---

## 📚 Faydalı Kaynaklar

- [Next.js Dokümantasyonu](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [React Best Practices](https://react.dev/learn)

---

## 🤔 Sorularınız mı var?

- GitHub Issues'da soru sorun
- Discussions bölümünü kullanın
- Email: [destek@aykamatrix.com](mailto:destek@aykamatrix.com)

---

## 🎉 Teşekkürler!

Katkılarınız için teşekkür ederiz. Her katkı, projeyi daha iyi hale getirir!

**Mutlu kodlamalar! 🚀**
