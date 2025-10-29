// PDF Generator - Tüm izin belgesi şablonlarını yöneten ana dosya
// Şablonlar: src/lib/pdfTemplates/ klasöründe

import { generatePaidLeaveAgreement, LeaveAgreementData } from './pdfTemplates/paidLeave';
import { generateUnpaidLeaveAgreement } from './pdfTemplates/unpaidLeave';

// İzin türüne göre doğru PDF şablonunu çağır
export const generateLeaveAgreement = async (
  leaveType: 'ucretli' | 'ucretsiz' | 'raporlu',
  data: LeaveAgreementData
): Promise<void> => {
  switch (leaveType) {
    case 'ucretli':
      await generatePaidLeaveAgreement(data);
      break;
    case 'ucretsiz':
      await generateUnpaidLeaveAgreement(data);
      break;
    case 'raporlu':
      // Raporlu izin henüz yok, ücretli ile aynı
      await generatePaidLeaveAgreement(data);
      break;
    default:
      throw new Error(`Bilinmeyen izin turu: ${leaveType}`);
  }
};

// Geriye uyumluluk için - mevcut kodlar bu fonksiyonu kullanıyor
export { generatePaidLeaveAgreement };
export type { LeaveAgreementData };
