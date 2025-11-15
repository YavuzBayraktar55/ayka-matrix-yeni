/**
 * Tarih formatlama fonksiyonu
 * @param date - Formatlanacak tarih (string, Date veya null)
 * @returns Türkçe formatlanmış tarih (gg/aa/yyyy) veya boş string
 * @example formatDate(new Date()) // "16/11/2025"
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

/**
 * String'i Title Case'e çevirir (Her kelimenin ilk harfi büyük)
 * Türkçe karakterleri doğru işler (ı → I, i → İ)
 * @param str - Formatlanacak string
 * @returns Title case formatlanmış string
 * @example toTitleCase("ahmet yılmaz") // "Ahmet Yılmaz"
 */
export function toTitleCase(str: string | number | null): string {
  if (!str) return '';
  const strValue = String(str);
  
  // Türkçe karakterler için özel işlem
  return strValue
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      // İlk harfi Türkçe locale ile büyük yap
      const firstChar = word.charAt(0).toLocaleUpperCase('tr-TR');
      const restOfWord = word.slice(1);
      return firstChar + restOfWord;
    })
    .join(' ');
}

/**
 * TC Kimlik Numarasını formatlar (123 456 789 01)
 * @param tc - TC Kimlik numarası (string veya number)
 * @returns Formatlanmış TC No veya boş string
 * @example formatTcNo("12345678901") // "123 456 789 01"
 */
export function formatTcNo(tc: string | number | null): string {
  if (!tc) return '';
  const tcStr = String(tc);
  return tcStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1 $2 $3 $4');
}

/**
 * Para formatı (Türk Lirası)
 * @param amount - Miktar (number veya null)
 * @returns Formatlanmış para birimi string
 * @example formatCurrency(15000) // "₺15.000,00"
 */
export function formatCurrency(amount: number | null): string {
  if (!amount) return '₺0,00';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
}

/**
 * Sayıyı Türkçe yazıya çevirir (basit versiyon - 999.999'a kadar)
 * @param num - Sayı
 * @returns Türkçe yazılı sayı
 * @example numberToWords(15000) // "OnBeşBin"
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Sıfır';
  
  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const hundreds = ['', 'Yüz', 'İkiYüz', 'ÜçYüz', 'DörtYüz', 'BeşYüz', 'AltıYüz', 'YediYüz', 'SekizYüz', 'DokuzYüz'];
  
  let result = '';
  
  // Binler
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'Bin';
    } else {
      result += ones[thousands] + 'Bin';
    }
    num = num % 1000;
  }
  
  // Yüzler
  const hundred = Math.floor(num / 100);
  if (hundred > 0) {
    result += hundreds[hundred];
    num = num % 100;
  }
  
  // Onlar
  const ten = Math.floor(num / 10);
  if (ten > 0) {
    result += tens[ten];
    num = num % 10;
  }
  
  // Birler
  if (num > 0) {
    result += ones[num];
  }
  
  return result;
}

/**
 * İzin türü kodunu Türkçe label'a çevirir
 * @param tur - İzin türü kodu
 * @returns Türkçe izin türü
 * @example getIzinTuruLabel("yillik") // "Yıllık İzin"
 */
export function getIzinTuruLabel(tur: string): string {
  const labels: Record<string, string> = {
    'yillik': 'Yıllık İzin',
    'ucretli': 'Ücretli İzin',
    'ucretsiz': 'Ücretsiz İzin',
    'raporlu': 'Raporlu İzin (Hastalık)'
  };
  return labels[tur] || tur;
}

/**
 * Telefon numarasını formatlar (0532 123 45 67)
 * @param phone - Telefon numarası
 * @returns Formatlanmış telefon
 * @example formatPhone("05321234567") // "0532 123 45 67"
 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
}
