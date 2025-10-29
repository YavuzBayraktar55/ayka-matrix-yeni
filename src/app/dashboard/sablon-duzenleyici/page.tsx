'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { 
  Save, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Image as ImageIcon, Minus, Palette, ChevronDown, Trash2,
  FileText, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Placeholder değişkenleri - Kategorize edilmiş
const PLACEHOLDERS_GENEL = [
  { key: '{personel_adi}', label: 'Personel Adı Soyadı', example: 'Ahmet Yılmaz' },
  { key: '{tc_no}', label: 'TC Kimlik No', example: '12345678901' },
  { key: '{dogum_tarihi}', label: 'Doğum Tarihi', example: '01.01.1990' },
  { key: '{bolge}', label: 'Bölge', example: 'İstanbul' },
  { key: '{isyeri_sicil}', label: 'İşyeri Sicil No', example: '123456' },
  { key: '{hazirlama_tarihi}', label: 'Hazırlanma Tarihi', example: '28.10.2025' },
];

const PLACEHOLDERS_IZIN = [
  { key: '{izin_baslangic}', label: 'İzin Başlangıç', example: '01.06.2024' },
  { key: '{izin_bitis}', label: 'İzin Bitiş', example: '15.06.2024' },
  { key: '{izin_gun}', label: 'İzin Gün Sayısı', example: '14' },
  { key: '{izin_turu}', label: 'İzin Türü', example: 'Yıllık İzin' },
];

const PLACEHOLDERS_AVANS = [
  { key: '{avans_miktar}', label: 'Avans Miktarı', example: '5.000,00 TL' },
  { key: '{avans_tarih}', label: 'Avans Talep Tarihi', example: '15.10.2025' },
  { key: '{avans_aciklama}', label: 'Avans Açıklaması', example: 'Acil ihtiyaç' },
];

interface TemplateImage {
  id: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

interface TemplateData {
  name: string;
  header: string;
  content: string;
  footer: string;
  images: TemplateImage[];
  styles: {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
  };
}

interface SavedTemplate {
  SablonID: number;
  SablonAdi: string;
  SablonTuru: 'genel' | 'izin' | 'avans' | 'ise_giris' | 'isten_cikis';
  HeaderContent: string;
  ContentHTML: string;
  FooterContent: string;
  ImagesJSON: string;
  StylesJSON: string;
  created_at: string;
}

function SablonDuzenleyiciContent() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'genel' | 'izin' | 'avans' | 'ise_giris' | 'isten_cikis'>('genel');
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [activeSection, setActiveSection] = useState<'header' | 'content' | 'footer'>('content');
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('14');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [images, setImages] = useState<TemplateImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const [template] = useState<TemplateData>({
    name: 'Yeni Şablon',
    header: '',
    content: '<p>Şablonunuzu buraya yazmaya başlayın...</p>',
    footer: '',
    images: [],
    styles: {
      fontSize: '14px',
      fontFamily: 'Arial',
      lineHeight: '1.6'
    }
  });

  // Initial content yükle
  useEffect(() => {
    if (contentRef.current && !contentRef.current.innerHTML) {
      contentRef.current.innerHTML = template.content;
    }
  }, [template.content]);

  // URL'den ID varsa şablonu yükle
  useEffect(() => {
    const sablonId = searchParams.get('id');
    if (sablonId) {
      const id = parseInt(sablonId, 10);
      if (!isNaN(id)) {
        loadTemplateById(id);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (headerRef.current && activeSection === 'header' && !headerRef.current.innerHTML) {
      headerRef.current.innerHTML = template.header || '<p>Üst bilgi buraya...</p>';
    }
  }, [activeSection, template.header]);

  useEffect(() => {
    if (footerRef.current && activeSection === 'footer' && !footerRef.current.innerHTML) {
      footerRef.current.innerHTML = template.footer || '<p>Alt bilgi buraya...</p>';
    }
  }, [activeSection, template.footer]);

  // Format komutları
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (activeSection === 'content') contentRef.current?.focus();
    if (activeSection === 'header') headerRef.current?.focus();
    if (activeSection === 'footer') footerRef.current?.focus();
  }, [activeSection]);

  // Placeholder ekle
  const insertPlaceholder = useCallback((placeholder: string) => {
    // Aktif section'ın ref'ini al
    let targetRef = null;
    if (activeSection === 'header') targetRef = headerRef.current;
    else if (activeSection === 'content') targetRef = contentRef.current;
    else if (activeSection === 'footer') targetRef = footerRef.current;

    if (!targetRef) {
      alert('⚠️ Lütfen önce bir alan seçin (Üst Bilgi, İçerik veya Alt Bilgi)');
      setShowPlaceholderMenu(false);
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Seçimin aktif editör alanı içinde olduğunu kontrol et
      const isInsideTarget = targetRef.contains(range.commonAncestorContainer);
      
      if (!isInsideTarget) {
        // Eğer seçim editör alanının dışındaysa, editör alanının sonuna ekle
        range.selectNodeContents(targetRef);
        range.collapse(false); // Sonuna git
      }
      
      const span = document.createElement('span');
      span.className = 'placeholder-text';
      span.contentEditable = 'false';
      span.textContent = placeholder;
      span.style.cssText = 'background: #e0e7ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin: 0 2px; cursor: pointer;';
      
      range.insertNode(span);
      
      // Placeholder'dan sonra bir boşluk ekle
      const space = document.createTextNode(' ');
      range.setStartAfter(span);
      range.insertNode(space);
      range.setStartAfter(space);
      range.collapse(true);
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Focus'u editör alanına ver
      targetRef.focus();
    } else {
      // Hiç seçim yoksa, editör alanının sonuna ekle
      const span = document.createElement('span');
      span.className = 'placeholder-text';
      span.contentEditable = 'false';
      span.textContent = placeholder;
      span.style.cssText = 'background: #e0e7ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin: 0 2px; cursor: pointer;';
      
      targetRef.appendChild(span);
      targetRef.appendChild(document.createTextNode(' '));
      targetRef.focus();
    }
    
    setShowPlaceholderMenu(false);
  }, [activeSection]);

  // Resim yükle
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Orijinal aspect ratio'yu koru
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;

          // Eğer resim çok büyükse ölçeklendir
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          const newImage: TemplateImage = {
            id: Date.now().toString(),
            src: event.target?.result as string,
            width: width,
            height: height,
            x: 50,
            y: 50
          };
          setImages([...images, newImage]);
          setSelectedImage(newImage.id);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, [images]);

  // Resim yukarı taşı
  const moveImageUp = useCallback(() => {
    if (!selectedImage) return;
    setImages(images.map(img => 
      img.id === selectedImage 
        ? { ...img, y: Math.max(0, img.y - 10) }
        : img
    ));
  }, [selectedImage, images]);

  // Resim aşağı taşı
  const moveImageDown = useCallback(() => {
    if (!selectedImage) return;
    const canvas = document.querySelector('.pdf-canvas') as HTMLElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    setImages(images.map(img => 
      img.id === selectedImage 
        ? { ...img, y: Math.min(rect.height - img.height, img.y + 10) }
        : img
    ));
  }, [selectedImage, images]);

  // Resim sil
  const handleDeleteImage = useCallback((id: string) => {
    setImages(images.filter(img => img.id !== id));
    if (selectedImage === id) setSelectedImage(null);
  }, [images, selectedImage]);

  // Resim hizalama
  const alignImage = useCallback((position: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    
    const canvas = document.querySelector('.pdf-canvas') as HTMLElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const img = images.find(i => i.id === selectedImage);
    if (!img) return;

    let newX = img.x;
    
    if (position === 'left') {
      newX = 20; // 20px padding
    } else if (position === 'center') {
      newX = (rect.width - img.width) / 2;
    } else if (position === 'right') {
      newX = rect.width - img.width - 20; // 20px padding
    }

    setImages(images.map(i => 
      i.id === selectedImage 
        ? { ...i, x: newX }
        : i
    ));
  }, [selectedImage, images]);

  // Resize başlat
  const startResize = (imageId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const img = images.find(i => i.id === imageId);
    if (!img) return;

    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: img.width,
      height: img.height
    });
    setSelectedImage(imageId);
  };

  // Resize devam
  useEffect(() => {
    if (!isResizing || !resizeHandle || !selectedImage) return;

    let rafId: number | null = null;
    let isScheduled = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (isScheduled) return;
      
      isScheduled = true;
      rafId = requestAnimationFrame(() => {
        const img = images.find(i => i.id === selectedImage);
        if (!img) {
          isScheduled = false;
          return;
        }

        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;

        // Aspect ratio'yu koru
        const aspectRatio = resizeStart.width / resizeStart.height;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(50, resizeStart.width + deltaX);
          newHeight = newWidth / aspectRatio;
        } else if (resizeHandle.includes('w')) {
          newWidth = Math.max(50, resizeStart.width - deltaX);
          newHeight = newWidth / aspectRatio;
        }

        if (resizeHandle.includes('s')) {
          newHeight = Math.max(50, resizeStart.height + deltaY);
          newWidth = newHeight * aspectRatio;
        } else if (resizeHandle.includes('n')) {
          newHeight = Math.max(50, resizeStart.height - deltaY);
          newWidth = newHeight * aspectRatio;
        }

        // Köşe handle'ları için
        if (resizeHandle === 'se' || resizeHandle === 'sw' || resizeHandle === 'ne' || resizeHandle === 'nw') {
          const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          const sign = (resizeHandle.includes('e') || resizeHandle.includes('s')) ? 1 : -1;
          newWidth = Math.max(50, resizeStart.width + (delta * sign));
          newHeight = newWidth / aspectRatio;
        }

        setImages(images.map(i =>
          i.id === selectedImage
            ? { ...i, width: newWidth, height: newHeight }
            : i
        ));
        
        isScheduled = false;
      });
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, selectedImage, resizeStart, images]);

  // Çizgi ekle
  const insertLine = () => {
    execCommand('insertHTML', '<hr style="border: 1px solid #ccc; margin: 10px 0;">');
  };

  // Kayıtlı şablonları getir
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/sablonlar');
      if (response.ok) {
        const data = await response.json();
        setSavedTemplates(data);
      }
    } catch (error) {
      console.error('❌ Şablon yükleme hatası:', error);
    }
  };

  // Sayfa yüklendiğinde şablonları getir
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Şablon yükle
  const loadTemplate = (sablon: SavedTemplate) => {
    setCurrentTemplateId(sablon.SablonID);
    setTemplateName(sablon.SablonAdi);
    setTemplateType(sablon.SablonTuru);
    
    if (headerRef.current) headerRef.current.innerHTML = sablon.HeaderContent || '';
    if (contentRef.current) contentRef.current.innerHTML = sablon.ContentHTML || '';
    if (footerRef.current) footerRef.current.innerHTML = sablon.FooterContent || '';
    
    const loadedImages = JSON.parse(sablon.ImagesJSON || '[]');
    setImages(loadedImages);
    
    const styles = JSON.parse(sablon.StylesJSON || '{}');
    setFontSize(styles.fontSize?.replace('px', '') || '14');
    setFontFamily(styles.fontFamily || 'Arial');
    
    setShowTemplateList(false);
    alert('✅ Şablon yüklendi!');
  };

  // ID ile şablon yükle
  const loadTemplateById = async (sablonId: number) => {
    try {
      console.log('🔍 Şablon yükleniyor, ID:', sablonId);
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Oturum bulunamadı');
        return;
      }

      const response = await fetch('/api/sablonlar', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        console.error('❌ Şablon yükleme hatası:', response.status);
        return;
      }

      const sablonlar = await response.json();
      const sablon = sablonlar.find((s: SavedTemplate) => s.SablonID === sablonId);
      
      if (!sablon) {
        alert('❌ Şablon bulunamadı!');
        return;
      }

      console.log('✅ Şablon bulundu:', sablon.SablonAdi);

      // Şablon verilerini yükle
      setTemplateName(sablon.SablonAdi);
      setTemplateType(sablon.SablonTuru);
      setCurrentTemplateId(sablon.SablonID);
      
      // ContentHTML direkt HTML string'i (JSON değil)
      const htmlContent = sablon.ContentHTML || '';
      if (contentRef.current) contentRef.current.innerHTML = htmlContent;
      
      // Header ve Footer varsayılan boş
      if (headerRef.current) headerRef.current.innerHTML = '';
      if (footerRef.current) footerRef.current.innerHTML = '';
      
      const loadedImages = JSON.parse(sablon.ImagesJSON || '[]');
      setImages(loadedImages);
      
      const styles = JSON.parse(sablon.StylesJSON || '{}');
      setFontSize(styles.fontSize?.replace('px', '') || '14');
      setFontFamily(styles.fontFamily || 'Arial');
      
      alert('✅ Şablon yüklendi!');
    } catch (error) {
      console.error('❌ Şablon yükleme hatası:', error);
      alert('❌ Şablon yüklenirken hata oluştu!');
    }
  };

  // Şablonu kaydet
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('❌ Lütfen şablon adı girin!');
      return;
    }

    console.log('💾 Şablon kaydediliyor...');
    console.log('📝 Şablon Adı:', templateName);
    console.log('📄 Şablon Türü:', templateType);
    console.log('🆔 Mevcut ID:', currentTemplateId);

    try {
      // Session token'ı al
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔐 Session check:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        error: sessionError?.message
      });
      
      if (!session || !session.access_token) {
        console.error('❌ Session missing:', { session, error: sessionError });
        alert('❌ Oturum bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
        return;
      }

      console.log('🔑 Session token alındı, user:', session.user.email);

      const templateData = {
        sablonId: currentTemplateId,
        sablonAdi: templateName,
        sablonTuru: templateType,
        headerContent: headerRef.current?.innerHTML || '',
        contentHTML: contentRef.current?.innerHTML || '',
        footerContent: footerRef.current?.innerHTML || '',
        images: images,
        styles: {
          fontSize: fontSize + 'px',
          fontFamily: fontFamily,
          lineHeight: '1.6'
        }
      };

      console.log('📦 Gönderilecek veri:', {
        sablonAdi: templateData.sablonAdi,
        sablonTuru: templateData.sablonTuru,
        hasContent: !!templateData.contentHTML,
        imageCount: templateData.images.length
      });

      const url = '/api/sablonlar';
      const method = currentTemplateId ? 'PUT' : 'POST';
      
      console.log('🌐 API Çağrısı:', method, url);

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(templateData)
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Response text:', responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log('✅ Başarılı:', result);
        
        // Başarılı bildirim
        alert('✅ Şablon başarıyla kaydedildi!\n📝 ' + templateName);
        
        if (!currentTemplateId && result.data) {
          setCurrentTemplateId(result.data.SablonID);
        }
        
        // Şablonları güncelle
        fetchTemplates();
        
        // Formu temizle
        setTemplateName('');
        if (contentRef.current) contentRef.current.innerHTML = '<p>Yeni şablon...</p>';
        if (headerRef.current) headerRef.current.innerHTML = '';
        if (footerRef.current) footerRef.current.innerHTML = '';
        setImages([]);
      } else {
        let errorMessage = 'Bilinmeyen hata';
        try {
          const error = JSON.parse(responseText);
          console.error('❌ API Error:', error);
          errorMessage = error.error || error.message || JSON.stringify(error);
        } catch (e) {
          console.error('❌ Response parse error:', e);
          errorMessage = responseText || 'Sunucu hatası';
        }
        alert('❌ Hata: ' + errorMessage);
      }
    } catch (error) {
      console.error('❌ Kayıt hatası:', error);
      alert('❌ Kayıt sırasında bir hata oluştu: ' + (error as Error).message);
    }
  };

  // Yeni şablon
  const newTemplate = () => {
    if (confirm('Yeni şablon oluşturulacak. Kaydedilmemiş değişiklikler kaybolacak. Devam etmek istiyor musunuz?')) {
      setCurrentTemplateId(null);
      setTemplateName('Yeni Şablon');
      setTemplateType('genel');
      if (headerRef.current) headerRef.current.innerHTML = '';
      if (contentRef.current) contentRef.current.innerHTML = '<p>Şablonunuzu buraya yazmaya başlayın...</p>';
      if (footerRef.current) footerRef.current.innerHTML = '';
      setImages([]);
      setFontSize('14');
      setFontFamily('Arial');
    }
  };

  // Şablon sil
  const deleteTemplate = async (sablonId: number) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/sablonlar?id=${sablonId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Şablon silindi!');
        fetchTemplates();
        if (currentTemplateId === sablonId) {
          newTemplate();
        }
      }
    } catch (error) {
      console.error('❌ Silme hatası:', error);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className={cn(
          'min-h-screen p-6',
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        )}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={cn(
                    'text-2xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Şablon Düzenleyici
                  </h1>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    Yeni şablon oluşturun
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                {/* Şablon Adı Input */}
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Şablon adını girin..."
                  className={cn(
                    'px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex-1 min-w-[400px]',
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                />

                <button
                  onClick={saveTemplate}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  <Save className="w-5 h-5" />
                  Kaydet
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className={cn(
            'rounded-xl border p-4 mb-6 shadow-lg',
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex flex-wrap gap-2">
              {/* Font Family */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border',
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                )}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>

              {/* Font Size */}
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border w-20',
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                )}
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>

              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />

              {/* Format Buttons */}
              <button
                onClick={() => execCommand('bold')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-5 h-5" />
              </button>

              <button
                onClick={() => execCommand('italic')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-5 h-5" />
              </button>

              <button
                onClick={() => execCommand('underline')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-5 h-5" />
              </button>

              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />

              {/* Alignment */}
              <button
                onClick={() => execCommand('justifyLeft')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Sola Hizala"
              >
                <AlignLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => execCommand('justifyCenter')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Ortaya Hizala"
              >
                <AlignCenter className="w-5 h-5" />
              </button>

              <button
                onClick={() => execCommand('justifyRight')}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Sağa Hizala"
              >
                <AlignRight className="w-5 h-5" />
              </button>

              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className={cn(
                    'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                    isDark ? 'text-white' : 'text-gray-700'
                  )}
                  title="Renk"
                >
                  <Palette className="w-5 h-5" />
                  <div 
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: currentColor }}
                  />
                </button>

                {showColorPicker && (
                  <div className="absolute top-full mt-2 z-50">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => {
                        setCurrentColor(e.target.value);
                        execCommand('foreColor', e.target.value);
                      }}
                      className="w-32 h-32 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Line */}
              <button
                onClick={insertLine}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Yatay Çizgi Ekle"
              >
                <Minus className="w-5 h-5" />
              </button>

              {/* Image Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  isDark ? 'text-white' : 'text-gray-700'
                )}
                title="Resim Ekle"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />

              {/* Placeholder Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowPlaceholderMenu(!showPlaceholderMenu)}
                  className={cn(
                    'px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                    isDark ? 'text-white' : 'text-gray-700'
                  )}
                  title="Değişken Ekle"
                >
                  <Type className="w-5 h-5" />
                  <span className="text-sm font-medium">Değişken</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showPlaceholderMenu && (
                  <div className={cn(
                    'absolute top-full mt-2 w-80 rounded-xl border shadow-xl z-50 max-h-[500px] overflow-y-auto',
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  )}>
                    {/* Genel Placeholders */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className={cn(
                        'text-xs font-bold px-3 py-1 mb-1',
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        📋 GENEL BİLGİLER
                      </div>
                      {PLACEHOLDERS_GENEL.map((placeholder) => (
                        <button
                          key={placeholder.key}
                          onClick={() => insertPlaceholder(placeholder.key)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                            isDark ? 'text-white' : 'text-gray-900'
                          )}
                        >
                          <div className="font-medium text-sm">{placeholder.label}</div>
                          <div className="text-xs text-blue-500">{placeholder.key}</div>
                          <div className={cn(
                            'text-xs mt-1',
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          )}>
                            Örnek: {placeholder.example}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* İzin Placeholders */}
                    {(templateType === 'izin' || templateType === 'genel') && (
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className={cn(
                          'text-xs font-bold px-3 py-1 mb-1',
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>
                          📅 İZİN BİLGİLERİ
                        </div>
                        {PLACEHOLDERS_IZIN.map((placeholder) => (
                          <button
                            key={placeholder.key}
                            onClick={() => insertPlaceholder(placeholder.key)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                              isDark ? 'text-white' : 'text-gray-900'
                            )}
                          >
                            <div className="font-medium text-sm">{placeholder.label}</div>
                            <div className="text-xs text-green-500">{placeholder.key}</div>
                            <div className={cn(
                              'text-xs mt-1',
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            )}>
                              Örnek: {placeholder.example}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Avans Placeholders */}
                    {(templateType === 'avans' || templateType === 'genel') && (
                      <div className="p-2">
                        <div className={cn(
                          'text-xs font-bold px-3 py-1 mb-1',
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>
                          💰 AVANS BİLGİLERİ
                        </div>
                        {PLACEHOLDERS_AVANS.map((placeholder) => (
                          <button
                            key={placeholder.key}
                            onClick={() => insertPlaceholder(placeholder.key)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                              isDark ? 'text-white' : 'text-gray-900'
                            )}
                          >
                            <div className="font-medium text-sm">{placeholder.label}</div>
                            <div className="text-xs text-orange-500">{placeholder.key}</div>
                            <div className={cn(
                              'text-xs mt-1',
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            )}>
                              Örnek: {placeholder.example}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveSection('header')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                activeSection === 'header'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              Üst Bilgi
            </button>
            <button
              onClick={() => setActiveSection('content')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                activeSection === 'content'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              İçerik
            </button>
            <button
              onClick={() => setActiveSection('footer')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                activeSection === 'footer'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              Alt Bilgi
            </button>
          </div>

          {/* Editor Canvas */}
          <div 
            className="pdf-canvas rounded-xl border shadow-2xl mx-auto relative"
            style={{ 
              width: '794px', // A4 width at 96 DPI (210mm)
              minHeight: '1123px', // A4 height at 96 DPI (297mm)
              backgroundColor: '#ffffff',
              border: '1px solid ' + (isDark ? '#374151' : '#e5e7eb')
            }}
          >
            {/* Images Layer */}
            {images.map((img) => (
              <div
                key={img.id}
                className={cn(
                  'absolute border-2 transition-all',
                  selectedImage === img.id ? 'selected-image border-purple-500 shadow-lg' : 'border-transparent hover:border-purple-300'
                )}
                style={{
                  left: `${img.x}px`,
                  top: `${img.y}px`,
                  width: `${img.width}px`,
                  height: `${img.height}px`,
                  zIndex: selectedImage === img.id ? 10 : 1
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(img.id);
                }}
              >
                <img 
                  src={img.src} 
                  alt="" 
                  className="w-full h-full object-contain pointer-events-none select-none" 
                  draggable={false}
                />
                {selectedImage === img.id && (
                  <>
                    {/* Yukarı/Aşağı Butonları - Sol tarafta */}
                    <div className="image-controls absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImageUp();
                        }}
                        style={{ backgroundColor: '#3b82f6' }}
                        className="w-8 h-8 text-white rounded-lg flex items-center justify-center hover:opacity-80 shadow-lg transition-opacity"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImageDown();
                        }}
                        style={{ backgroundColor: '#3b82f6' }}
                        className="w-8 h-8 text-white rounded-lg flex items-center justify-center hover:opacity-80 shadow-lg transition-opacity"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Hizalama Butonları - Üstte */}
                    <div 
                      className="image-controls absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 rounded-lg shadow-xl p-1"
                      style={{ 
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alignImage('left');
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded hover:opacity-80 transition-opacity flex items-center gap-1"
                        style={{ backgroundColor: '#f3f4f6' }}
                        title="Sola Hizala"
                      >
                        <AlignLeft className="w-3 h-3" />
                        Sol
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alignImage('center');
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded hover:opacity-80 transition-opacity flex items-center gap-1"
                        style={{ backgroundColor: '#f3f4f6' }}
                        title="Ortaya Hizala"
                      >
                        <AlignCenter className="w-3 h-3" />
                        Orta
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alignImage('right');
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded hover:opacity-80 transition-opacity flex items-center gap-1"
                        style={{ backgroundColor: '#f3f4f6' }}
                        title="Sağa Hizala"
                      >
                        <AlignRight className="w-3 h-3" />
                        Sağ
                      </button>
                    </div>

                    {/* Silme Butonu - Sağ üstte */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.id);
                      }}
                      style={{ backgroundColor: '#ef4444' }}
                      className="image-controls absolute -top-3 -right-3 w-7 h-7 text-white rounded-full flex items-center justify-center hover:opacity-80 shadow-lg transition-opacity z-20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Resize Handles */}
                    {/* Köşeler */}
                    <div
                      onMouseDown={(e) => startResize(img.id, 'nw', e)}
                      className="image-controls absolute -top-2 -left-2 w-4 h-4 rounded-full cursor-nw-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 'ne', e)}
                      className="image-controls absolute -top-2 -right-2 w-4 h-4 rounded-full cursor-ne-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 'sw', e)}
                      className="image-controls absolute -bottom-2 -left-2 w-4 h-4 rounded-full cursor-sw-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 'se', e)}
                      className="image-controls absolute -bottom-2 -right-2 w-4 h-4 rounded-full cursor-se-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />

                    {/* Kenarlar */}
                    <div
                      onMouseDown={(e) => startResize(img.id, 'n', e)}
                      className="image-controls absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-4 rounded cursor-n-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 's', e)}
                      className="image-controls absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-4 rounded cursor-s-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 'w', e)}
                      className="image-controls absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-6 rounded cursor-w-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                    <div
                      onMouseDown={(e) => startResize(img.id, 'e', e)}
                      className="image-controls absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-6 rounded cursor-e-resize z-30"
                      style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}
                      title="Boyutlandır"
                    />
                  </>
                )}
              </div>
            ))}

            {/* Header Section */}
            {activeSection === 'header' && (
              <div
                key="header-editor"
                ref={headerRef}
                contentEditable
                className="p-8 outline-none min-h-[100px] border-b-2 border-dashed border-gray-300"
                style={{
                  fontSize: fontSize + 'px',
                  fontFamily: fontFamily,
                  color: '#000',
                  lineHeight: '1.6'
                }}
                suppressContentEditableWarning
              />
            )}

            {/* Content Section */}
            {activeSection === 'content' && (
              <div
                key="content-editor"
                ref={contentRef}
                contentEditable
                className="p-8 outline-none min-h-[600px]"
                style={{
                  fontSize: fontSize + 'px',
                  fontFamily: fontFamily,
                  color: '#000',
                  lineHeight: '1.6'
                }}
                suppressContentEditableWarning
              />
            )}

            {/* Footer Section */}
            {activeSection === 'footer' && (
              <div
                key="footer-editor"
                ref={footerRef}
                contentEditable
                className="p-8 outline-none min-h-[100px] border-t-2 border-dashed border-gray-300"
                style={{
                  fontSize: fontSize + 'px',
                  fontFamily: fontFamily,
                  color: '#000',
                  lineHeight: '1.6'
                }}
                suppressContentEditableWarning
              />
            )}
          </div>

          {/* Help Text */}
          <div className={cn(
            'mt-6 p-4 rounded-xl border',
            isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'
          )}>
            <h3 className={cn(
              'font-semibold mb-2',
              isDark ? 'text-blue-300' : 'text-blue-700'
            )}>
              💡 Kullanım İpuçları
            </h3>
            <ul className={cn(
              'text-sm space-y-1',
              isDark ? 'text-blue-200' : 'text-blue-600'
            )}>
              <li>• Değişken butonundan {'{personel_adi}'}, {'{tc_no}'} gibi otomatik alanlar ekleyebilirsiniz</li>
              <li>• Resimleri tıklayarak seçin, köşelerinden/kenarlarından boyutlandırın</li>
              <li>• Üst/Alt Bilgi kısımları her sayfada tekrar edecektir</li>
              <li>• Şablonunuz veritabanına kaydedilir ve evrak oluştururken kullanılır</li>
            </ul>
          </div>

          {/* Şablon Listesi Modal */}
          {showTemplateList && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowTemplateList(false)}
            >
              <div 
                className={cn(
                  'rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto',
                  isDark ? 'bg-gray-800' : 'bg-white'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn(
                    'text-2xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    📋 Kayıtlı Şablonlar
                  </h2>
                  <button
                    onClick={() => setShowTemplateList(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                {savedTemplates.length === 0 ? (
                  <div className={cn(
                    'text-center py-12',
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Henüz kayıtlı şablon yok</p>
                    <p className="text-sm mt-2">İlk şablonunuzu oluşturun!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {savedTemplates.map((sablon) => (
                      <div
                        key={sablon.SablonID}
                        className={cn(
                          'p-4 rounded-xl border hover:shadow-lg transition-all cursor-pointer',
                          isDark 
                            ? 'bg-gray-700/50 border-gray-600 hover:border-purple-500' 
                            : 'bg-gray-50 border-gray-200 hover:border-purple-500'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => loadTemplate(sablon)}>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={cn(
                                'text-lg font-semibold',
                                isDark ? 'text-white' : 'text-gray-900'
                              )}>
                                {sablon.SablonAdi}
                              </h3>
                              <span className={cn(
                                'px-2 py-1 text-xs rounded-full font-medium',
                                sablon.SablonTuru === 'izin' 
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : sablon.SablonTuru === 'avans'
                                  ? 'bg-green-500/20 text-green-400'
                                  : sablon.SablonTuru === 'ise_giris'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : sablon.SablonTuru === 'isten_cikis'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              )}>
                                {sablon.SablonTuru}
                              </span>
                            </div>
                            <p className={cn(
                              'text-sm mb-2',
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            )}>
                              Oluşturulma: {new Date(sablon.created_at).toLocaleDateString('tr-TR')}
                            </p>
                            <div 
                              className={cn(
                                'text-xs line-clamp-2',
                                isDark ? 'text-gray-500' : 'text-gray-500'
                              )}
                              dangerouslySetInnerHTML={{ 
                                __html: sablon.ContentHTML?.substring(0, 150) + '...' || '' 
                              }}
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(sablon.SablonID);
                            }}
                            className="ml-4 p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                            title="Şablonu Sil"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function SablonDuzenleyiciPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SablonDuzenleyiciContent />
    </Suspense>
  );
}
