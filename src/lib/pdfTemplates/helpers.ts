import { jsPDF } from 'jspdf';

// Türkçe karakterleri İngilizce eşdeğerlerine çevir
export const turkishToEnglish = (text: string): string => {
  const charMap: Record<string, string> = {
    'Ç': 'C', 'ç': 'c',
    'Ğ': 'G', 'ğ': 'g',
    'İ': 'I', 'ı': 'i',
    'Ö': 'O', 'ö': 'o',
    'Ş': 'S', 'ş': 's',
    'Ü': 'U', 'ü': 'u'
  };
  
  return text.split('').map(char => charMap[char] || char).join('');
};

// Görsel yükleme yardımcı fonksiyonu - Yüksek kalite
export const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Daha yüksek çözünürlük için 2x boyutlandırma
      const scaleFactor = 2;
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Görsel kalitesini artırmak için ayarlar
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Maksimum kalite ile PNG'ye çevir
        resolve(canvas.toDataURL('image/png', 1.0));
      } else {
        reject(new Error('Canvas context alınamadı'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Ortak başlık ve footer ekleme
export const addHeaderFooter = async (
  doc: jsPDF,
  title: string,
  preparationDate: string
): Promise<void> => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo ekleme - Yüksek kalitede
  try {
    const logoImg = await loadImage('/logo.png');
    const logoSize = 30;
    const logoX = (pageWidth - logoSize) / 2;
    // 'SLOW' kompresyon kullanarak daha yüksek kalite
    doc.addImage(logoImg, 'PNG', logoX, 15, logoSize, logoSize, undefined, 'SLOW');
  } catch (error) {
    console.error('Logo yuklenemedi:', error);
  }

  // Üst çizgi
  doc.setLineWidth(0.5);
  doc.line(20, 52, pageWidth - 20, 52);

  // Sağ üst tarih
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(preparationDate, pageWidth - 25, 62, { align: 'right' });

  // Başlık
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 75, { align: 'center' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 22;
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = 'YAVRUTURNA MH. KULAKSIZ SK. HURSUCUOGLU APT. NO:7/1 MERKEZ CORUM';
  const footerLine2 = 'TEL : 364 224 99 45  FAKS: 364 224 99 46';

  doc.text(footerLine1, pageWidth / 2, footerY, { align: 'center' });
  doc.text(footerLine2, pageWidth / 2, footerY + 4, { align: 'center' });
};

// İmza bölümü ekleme
export const addSignatureSection = (doc: jsPDF, yPosition: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');

  const col1X = 50;
  const col2X = pageWidth - 60;

  // İmza çizgileri
  doc.setLineWidth(0.3);
  doc.line(col1X - 25, yPosition - 5, col1X + 25, yPosition - 5);
  doc.line(col2X - 20, yPosition - 5, col2X + 20, yPosition - 5);

  // İmza başlıkları
  doc.text('ISVEREN VEKILI', col1X, yPosition, { align: 'center' });
  doc.text('ISCI', col2X, yPosition, { align: 'center' });
};
