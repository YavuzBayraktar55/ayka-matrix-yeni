import { jsPDF } from 'jspdf';
import { turkishToEnglish, addHeaderFooter, addSignatureSection } from './helpers';
import { LeaveAgreementData } from './paidLeave';

// ÜCRETSİZ İZİN SÖZLEŞMESİ
export const generateUnpaidLeaveAgreement = async (data: LeaveAgreementData): Promise<void> => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 16 // Yüksek hassasiyet için
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  await addHeaderFooter(doc, 'UCRETSIZ IZIN SOZLESMESI', data.preparationDate);

  // İçerik
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const leftMargin = 25;
  const maxWidth = pageWidth - (leftMargin * 2);
  let yPosition = 95;

  const cleanEmployeeName = turkishToEnglish(data.employeeName);
  const cleanEmployerId = turkishToEnglish(data.employerId);

  // Paragraf 1
  const line1 = `${cleanEmployerId || '........................'} isyeri sicil nolu dosyada islem gormekteriz`;
  doc.text(line1, leftMargin, yPosition);
  yPosition += 10;

  // Paragraf 2
  const line2 = `Isyerimiz calisanlarimizdan ${data.employeeId || '..................'} T.C. Kimlik numarali ${cleanEmployeeName || '................................'}`;
  const line2Parts = doc.splitTextToSize(line2, maxWidth);

  line2Parts.forEach((part: string, index: number) => {
    doc.text(part, leftMargin, yPosition);
    yPosition += (index === line2Parts.length - 1) ? 10 : 7;
  });

  // Paragraf 3 - ÜCRETSİZ izin
  const line3 = `${data.leaveStartDate || '.../.../....'} tarihinde ${data.leaveDays} gun ucretsiz izin ayrilmistir. Is bu sozlesme ${data.preparationDate} tarihinde 2 suret hazirlanmis ve taraflarca imzalanmistir.`;
  const line3Parts = doc.splitTextToSize(line3, maxWidth);

  line3Parts.forEach((part: string) => {
    doc.text(part, leftMargin, yPosition);
    yPosition += 7;
  });

  yPosition += 35;

  // İmza
  addSignatureSection(doc, yPosition);

  // PDF'i indir
  const cleanNameForFile = turkishToEnglish(data.employeeName).replace(/\s+/g, '_');
  const fileName = `Ucretsiz_Izin_Sozlesmesi_${cleanNameForFile}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
