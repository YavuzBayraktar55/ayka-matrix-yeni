'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { Editor } from '@tinymce/tinymce-react';
import { 
  Save, 
  FileText, 
  ChevronDown, 
  Trash2,
  Type,
  FolderOpen,
  Plus,
  Download,
  Eye,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveAs } from 'file-saver';
import * as htmlDocx from 'html-docx-js-typescript';
import mammoth from 'mammoth';

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
  { key: '{izin_hazirlama_tarihi}', label: 'İzin Hazırlama Tarihi (Başlangıçtan 1 Gün Önce)', example: '31.05.2024' },
];

const PLACEHOLDERS_AVANS = [
  { key: '{avans_miktar}', label: 'Avans Miktarı', example: '5.000,00 TL' },
  { key: '{avans_tarih}', label: 'Avans Talep Tarihi', example: '15.10.2025' },
  { key: '{avans_aciklama}', label: 'Avans Açıklaması', example: 'Acil ihtiyaç' },
];

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

function YeniSablonDuzenleyiciContent() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const editorRef = useRef<{ insertContent: (content: string) => void } | null>(null);

  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'genel' | 'izin' | 'avans' | 'ise_giris' | 'isten_cikis'>('genel');
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ID ile şablon yükle
  const loadTemplateById = async (sablonId: number) => {
    try {
      console.log('🔍 Şablon yükleniyor, ID:', sablonId);
      setIsLoading(true);
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Oturum bulunamadı');
        alert('❌ Oturum bulunamadı. Lütfen giriş yapın.');
        return;
      }

      const response = await fetch('/api/sablonlar', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        console.error('❌ Şablon yükleme hatası:', response.status);
        alert('❌ Şablon yüklenemedi!');
        return;
      }

      const sablonlar = await response.json();
      const sablon = sablonlar.find((s: SavedTemplate) => s.SablonID === sablonId);
      
      if (!sablon) {
        alert('❌ Şablon bulunamadı!');
        return;
      }

      console.log('✅ Şablon bulundu:', sablon.SablonAdi);

      setTemplateName(sablon.SablonAdi);
      setTemplateType(sablon.SablonTuru);
      setCurrentTemplateId(sablon.SablonID);
      setEditorContent(sablon.ContentHTML || '');
      
      alert('✅ Şablon yüklendi!');
    } catch (error) {
      console.error('❌ Şablon yükleme hatası:', error);
      alert('❌ Şablon yüklenirken hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  // Şablon yükle
  const loadTemplate = (sablon: SavedTemplate) => {
    setCurrentTemplateId(sablon.SablonID);
    setTemplateName(sablon.SablonAdi);
    setTemplateType(sablon.SablonTuru);
    setEditorContent(sablon.ContentHTML || '');
    setShowTemplateList(false);
    alert('✅ Şablon yüklendi!');
  };

  // Yeni şablon
  const newTemplate = () => {
    if (confirm('Yeni şablon oluşturulacak. Kaydedilmemiş değişiklikler kaybolacak. Devam etmek istiyor musunuz?')) {
      setCurrentTemplateId(null);
      setTemplateName('');
      setTemplateType('genel');
      setEditorContent('');
    }
  };

  // Şablonu kaydet
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('❌ Lütfen şablon adı girin!');
      return;
    }

    if (!editorContent.trim()) {
      alert('❌ Şablon içeriği boş olamaz!');
      return;
    }

    console.log('💾 Şablon kaydediliyor...');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || !session.access_token) {
        console.error('❌ Session missing:', { session, error: sessionError });
        alert('❌ Oturum bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
        return;
      }

      const templateData = {
        sablonId: currentTemplateId,
        sablonAdi: templateName,
        sablonTuru: templateType,
        headerContent: '',
        contentHTML: editorContent,
        footerContent: '',
        images: [],
        styles: {}
      };

      const url = '/api/sablonlar';
      const method = currentTemplateId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(templateData)
      });

      const responseText = await response.text();

      if (response.ok) {
        const result = JSON.parse(responseText);
        alert('✅ Şablon başarıyla kaydedildi!\n📝 ' + templateName);
        
        if (!currentTemplateId && result.data) {
          setCurrentTemplateId(result.data.SablonID);
        }
        
        fetchTemplates();
      } else {
        let errorMessage = 'Bilinmeyen hata';
        try {
          if (responseText) {
            const error = JSON.parse(responseText);
            errorMessage = error.error || error.message || JSON.stringify(error);
          } else {
            errorMessage = `Sunucu hatası (${response.status})`;
          }
        } catch {
          errorMessage = responseText || 'Sunucu hatası';
        }
        alert('❌ Hata: ' + errorMessage);
      }
    } catch (error) {
      console.error('❌ Kayıt hatası:', error);
      alert('❌ Kayıt sırasında bir hata oluştu: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
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

  // Placeholder ekle
  const insertPlaceholder = (placeholder: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.insertContent(
        `<span class="placeholder-variable" contenteditable="false" style="background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin: 0 2px; white-space: nowrap;">${placeholder}</span>&nbsp;`
      );
    }
    setShowPlaceholderMenu(false);
  };

  // Word dosyasından yükle
  const loadFromWord = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      alert('❌ Lütfen .docx veya .doc uzantılı bir Word dosyası seçin!');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📄 Word dosyası okunuyor:', file.name);

      // Word dosyasını ArrayBuffer'a çevir
      const arrayBuffer = await file.arrayBuffer();
      
      // Mammoth ile HTML'e çevir
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "b => strong",
            "i => em",
          ],
          includeDefaultStyleMap: true,
          convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`
              };
            });
          })
        }
      );

      if (result.value) {
        // Mevcut içeriğin sonuna ekle
        const newContent = editorContent 
          ? `${editorContent}<br/><br/>${result.value}`
          : result.value;
        
        setEditorContent(newContent);
        
        console.log('✅ Word içeriği başarıyla yüklendi');
        alert(`✅ Word dosyası başarıyla yüklendi!\n📝 ${file.name}\n\n💡 İçerik editörün sonuna eklendi.`);
        
        if (result.messages.length > 0) {
          console.warn('⚠️ Dönüştürme uyarıları:', result.messages);
        }
      } else {
        alert('❌ Word dosyasından içerik okunamadı!');
      }
    } catch (error) {
      console.error('❌ Word yükleme hatası:', error);
      alert('❌ Word dosyası yüklenirken hata oluştu!\n\nDetay: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      // Input'u sıfırla (aynı dosyayı tekrar seçebilmek için)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Word olarak indir
  const downloadAsWord = async () => {
    if (!editorContent.trim()) {
      alert('❌ İçerik boş! Lütfen önce bir şablon oluşturun.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Temiz içerik - placeholder'ları koru ama editör özel stillerini temizle
      const cleanContent = editorContent
        .replace(/body::(before|after)\s*{[^}]*}/g, '')  // Sayfa sınır çizgilerini kaldır
        .replace(/contenteditable="false"/g, '');  // contenteditable özelliklerini kaldır
      
      // HTML'i Word formatına çevir - A4 boyutunda
      const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <meta name="ProgId" content="Word.Document">
            <meta name="Generator" content="Microsoft Word 15">
            <meta name="Originator" content="Microsoft Word 15">
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
              </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
              /* Sayfa Ayarları - A4 */
              @page Section1 {
                size: 21.0cm 29.7cm;
                margin: 2.54cm 1.91cm 2.54cm 1.91cm;  /* 1 inch kenar boşluğu */
                mso-header-margin: 1.27cm;
                mso-footer-margin: 1.27cm;
                mso-paper-source: 0;
              }
              
              div.Section1 {
                page: Section1;
              }
              
              /* Genel Yazı Ayarları */
              body {
                font-family: 'Calibri', 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                margin: 0;
                padding: 0;
              }
              
              /* Paragraf Ayarları */
              p {
                margin: 0 0 12pt 0;
                text-align: justify;
                text-justify: inter-word;
              }
              
              /* Başlık Ayarları */
              h1, h2, h3, h4, h5, h6 {
                margin: 16pt 0 8pt 0;
                font-weight: bold;
                line-height: 1.3;
                page-break-after: avoid;
              }
              
              h1 { 
                font-size: 16pt;
                font-family: 'Arial Black', Arial, sans-serif;
              }
              h2 { font-size: 14pt; }
              h3 { font-size: 12pt; }
              
              /* Tablo Ayarları */
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 12pt 0;
                page-break-inside: avoid;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
              }
              
              table td, table th {
                border: 1pt solid #000000;
                padding: 4pt 8pt;
                vertical-align: top;
                mso-line-height-rule: exactly;
              }
              
              table th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: left;
              }
              
              /* Liste Ayarları */
              ul, ol {
                margin: 0 0 12pt 24pt;
                padding: 0;
              }
              
              li {
                margin-bottom: 6pt;
              }
              
              /* Placeholder Değişken Stilleri */
              .placeholder-variable {
                background-color: #e0e7ff;
                color: #4f46e5;
                padding: 2pt 6pt;
                border-radius: 3pt;
                font-weight: 600;
                margin: 0 2pt;
                white-space: nowrap;
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 10pt;
              }
              
              /* Resim Ayarları */
              img {
                max-width: 100%;
                height: auto;
                margin: 12pt 0;
              }
              
              /* Sayfa Kırılması Ayarları */
              .page-break {
                page-break-before: always;
              }
              
              /* Word için özel ayarlar */
              .MsoNormal {
                margin: 0 0 12pt 0;
              }
            </style>
          </head>
          <body>
            <div class="Section1">
              ${cleanContent}
            </div>
          </body>
        </html>
      `;

      // HTML'den Word belgesi oluştur
      const converted = await htmlDocx.asBlob(htmlContent);
      
      // Dosya adı
      const fileName = templateName 
        ? `${templateName.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '_')}.docx`
        : 'sablon.docx';
      
      // İndir
      saveAs(converted as Blob, fileName);
      
      alert('✅ Word belgesi başarıyla indirildi!\n📝 ' + fileName + '\n\n💡 Word\'de açtıktan sonra "Dosya > Farklı Kaydet > PDF" ile PDF\'e çevirebilirsiniz.');
    } catch (error) {
      console.error('❌ Word indirme hatası:', error);
      alert('❌ Word belgesi oluşturulurken hata oluştu!\n\nDetay: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className={cn(
          'min-h-screen p-6',
          'bg-transparent'
        )}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={cn(
                    'text-2xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Word Tarzı Şablon Düzenleyici
                  </h1>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    Profesyonel şablonlar oluşturun • Word&apos;den tablo kopyalayın
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setShowTemplateList(true)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium',
                    isDark
                      ? 'border-gray-700 bg-gray-800 text-white hover:border-blue-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-blue-500'
                  )}
                >
                  <FolderOpen className="w-5 h-5" />
                  Şablonlar
                </button>
                
                <button
                  onClick={newTemplate}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium',
                    isDark
                      ? 'border-gray-700 bg-gray-800 text-white hover:border-green-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-green-500'
                  )}
                >
                  <Plus className="w-5 h-5" />
                  Yeni
                </button>

                {/* Hidden file input for Word upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx"
                  onChange={loadFromWord}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium',
                    isDark
                      ? 'border-gray-700 bg-gray-800 text-white hover:border-purple-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-purple-500',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Upload className="w-5 h-5" />
                  Word&apos;den Yükle
                </button>

                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium',
                    isDark
                      ? 'border-gray-700 bg-gray-800 text-white hover:border-yellow-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-yellow-500'
                  )}
                >
                  <Eye className="w-5 h-5" />
                  {showPreview ? 'Düzenle' : 'Önizle'}
                </button>

                <button
                  onClick={downloadAsWord}
                  disabled={isLoading || !editorContent.trim()}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  Word İndir
                </button>

                <button
                  onClick={saveTemplate}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>

            {/* Şablon Bilgileri */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Şablon adını girin..."
                className={cn(
                  'px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all',
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
              />

              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as 'genel' | 'izin' | 'avans' | 'ise_giris' | 'isten_cikis')}
                className={cn(
                  'px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all',
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                <option value="genel">Genel</option>
                <option value="izin">İzin</option>
                <option value="avans">Avans</option>
                <option value="ise_giris">İşe Giriş</option>
                <option value="isten_cikis">İşten Çıkış</option>
              </select>
            </div>
          </div>

          {/* Placeholder Ekleme Bölümü */}
          <div className={cn(
            'mb-4 p-4 rounded-xl border',
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="relative inline-block">
              <button
                onClick={() => setShowPlaceholderMenu(!showPlaceholderMenu)}
                className={cn(
                  'px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium',
                  isDark 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                )}
              >
                <Type className="w-5 h-5" />
                <span>Değişken Ekle</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPlaceholderMenu && (
                <div className={cn(
                  'absolute top-full mt-2 w-96 rounded-xl border shadow-xl z-50 max-h-[500px] overflow-y-auto',
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                )}>
                  {/* Genel Placeholders */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className={cn(
                      'text-xs font-bold px-3 py-2 mb-1',
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
                        'text-xs font-bold px-3 py-2 mb-1',
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
                        'text-xs font-bold px-3 py-2 mb-1',
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

            <p className={cn(
              'text-sm mt-2',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}>
              💡 Word&apos;den tablolar dahil içerik kopyalayıp yapıştırabilirsiniz
            </p>
          </div>

          {/* TinyMCE Editor */}
          <div className={cn(
            'rounded-xl border shadow-lg overflow-hidden',
            isDark ? 'border-gray-700' : 'border-gray-200'
          )}>
            <Editor
              apiKey="gqfy4th67hj1gphis4i0aj23k6577gv21nnyrjj5yx0a6rg7"
              onInit={(_evt, editor) => editorRef.current = editor}
              value={editorContent}
              onEditorChange={(content: string) => setEditorContent(content)}
              init={{
                height: 800,
                menubar: true,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                  'pagebreak', 'paste'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor backcolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'table tabledelete | tableprops tablerowprops tablecellprops | ' +
                  'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
                  'tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
                  'removeformat | help',
                content_style: `
                  /* A4 Sayfası: 210mm x 297mm = 794px x 1123px (96 DPI) */
                  body { 
                    font-family: 'Calibri', Arial, sans-serif; 
                    font-size: 11pt;
                    line-height: 1.5;
                    padding: 2.54cm 1.91cm;  /* 1 inch = 2.54cm kenar boşluğu */
                    background: white;
                    width: 21cm;  /* A4 genişlik */
                    margin: 0 auto;
                    position: relative;
                    min-height: 29.7cm;  /* A4 yükseklik */
                    box-sizing: border-box;
                  }
                  
                  /* Sayfa Sınır Çizgileri - Her 29.7cm'de (A4 yüksekliği) */
                  body::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 3px;
                    background: repeating-linear-gradient(
                      to right,
                      #ff4444 0px,
                      #ff4444 15px,
                      transparent 15px,
                      transparent 30px
                    );
                    z-index: 9999;
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
                  }
                  
                  /* Sayfa altbilgi alanı göstergesi */
                  body::before {
                    content: 'SAYFA SONU';
                    position: absolute;
                    right: 20px;
                    bottom: 10px;
                    font-size: 9px;
                    color: #ff4444;
                    font-weight: bold;
                    letter-spacing: 1px;
                    z-index: 10000;
                    background: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    border: 1px solid #ff4444;
                  }
                  
                  /* Paragraf ayarları */
                  p {
                    margin: 0 0 12pt 0;
                    text-align: justify;
                  }
                  
                  h1, h2, h3, h4, h5, h6 {
                    margin: 16pt 0 8pt 0;
                    font-weight: bold;
                    line-height: 1.3;
                  }
                  
                  h1 { font-size: 16pt; }
                  h2 { font-size: 14pt; }
                  h3 { font-size: 12pt; }
                  
                  /* Tablo stilleri - Word uyumlu */
                  table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12pt 0;
                    page-break-inside: avoid;
                  }
                  
                  table td, table th {
                    border: 1pt solid #000000;
                    padding: 4pt 8pt;
                    vertical-align: top;
                  }
                  
                  table th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                    text-align: left;
                  }
                  
                  /* Liste stilleri */
                  ul, ol {
                    margin: 0 0 12pt 24pt;
                    padding: 0;
                  }
                  
                  li {
                    margin-bottom: 6pt;
                  }
                  
                  /* Değişken placeholder stilleri */
                  .placeholder-variable {
                    background: #e0e7ff;
                    color: #4f46e5;
                    padding: 2pt 6pt;
                    border-radius: 3pt;
                    font-weight: 600;
                    margin: 0 2pt;
                    white-space: nowrap;
                    font-family: monospace;
                    font-size: 10pt;
                  }
                  
                  /* Resim ayarları */
                  img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 12pt 0;
                  }
                  
                  /* Sayfa kırılması önleme */
                  .page-break-avoid {
                    page-break-inside: avoid;
                  }
                  
                  /* Print ayarları */
                  @page {
                    size: A4 portrait;
                    margin: 2.54cm 1.91cm;
                  }
                  
                  @media print {
                    body { 
                      width: 100%;
                      margin: 0;
                      padding: 0;
                    }
                    body::before,
                    body::after {
                      display: none;
                    }
                  }
                `,
                paste_data_images: true,
                paste_as_text: false,
                paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,h6,p,br,ul,ol,li,table,thead,tbody,tfoot,tr,td,th,div,span,a',
                paste_retain_style_properties: 'color font-size font-weight text-decoration text-align background-color',
                table_default_attributes: {
                  border: '1'
                },
                table_default_styles: {
                  'border-collapse': 'collapse',
                  'width': '100%'
                },
                pagebreak_separator: '<div style="page-break-after: always;"></div>',
                skin: isDark ? 'oxide-dark' : 'oxide',
                content_css: isDark ? 'dark' : 'default',
              }}
            />
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
              <li>• <strong>📤 Word&apos;den Yükle:</strong> &quot;Word&apos;den Yükle&quot; butonu ile hazır Word belgelerini direkt içe aktarın! Tüm tablolar, başlıklar ve formatlar korunur.</li>
              <li>• <strong>📋 Kopyala-Yapıştır:</strong> Word&apos;den tablolar dahil içeriği kopyalayıp direkt yapıştırabilirsiniz</li>
              <li>• <strong>🏷️ Değişkenler:</strong> &quot;Değişken Ekle&quot; butonundan {'{personel_adi}'}, {'{tc_no}'} gibi otomatik alanlar ekleyin</li>
              <li>• <strong>📊 Tablolar:</strong> Toolbar&apos;daki tablo araçlarıyla sütun/satır ekleyip düzenleyebilirsiniz</li>
              <li>• <strong>📏 Sayfa Sınırları:</strong> Editörde kırmızı kesikli çizgi ve &quot;SAYFA SONU&quot; yazısı A4 sayfa sınırlarını gösterir (21cm x 29.7cm)</li>
              <li>• <strong>👁️ Önizleme:</strong> &quot;Önizle&quot; butonuyla gerçek sayfa görünümünü kontrol edin</li>
              <li>• <strong>💾 Word İndir:</strong> Şablonu Word formatında (.docx) indirip bilgisayarınızda PDF&apos;e çevirebilirsiniz</li>
            </ul>
          </div>

          {/* Önizleme Modal */}
          {showPreview && (
            <div 
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
              onClick={() => setShowPreview(false)}
            >
              <div 
                className={cn(
                  'rounded-2xl shadow-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto',
                  isDark ? 'bg-gray-800' : 'bg-white'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn(
                    'text-2xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    📄 Şablon Önizleme - A4 Sayfa Düzeni
                  </h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* A4 Sayfalar */}
                <div className="space-y-6">
                  {(() => {
                    const A4_HEIGHT = 1123; // A4 yüksekliği pixel
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = editorContent;
                    tempDiv.style.width = '794px';
                    tempDiv.style.padding = '60px 80px';
                    tempDiv.style.fontFamily = 'Arial, sans-serif';
                    tempDiv.style.fontSize = '14px';
                    tempDiv.style.lineHeight = '1.6';
                    document.body.appendChild(tempDiv);
                    const contentHeight = tempDiv.scrollHeight;
                    document.body.removeChild(tempDiv);

                    const numPages = Math.ceil(contentHeight / A4_HEIGHT);
                    const pages = [];

                    for (let i = 0; i < numPages; i++) {
                      pages.push(
                        <div key={i} className="relative">
                          {/* Sayfa Başlığı */}
                          <div className={cn(
                            'text-center py-2 mb-2 rounded text-sm font-semibold',
                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          )}>
                            Sayfa {i + 1} / {numPages}
                          </div>

                          {/* A4 Sayfa */}
                          <div
                            className="bg-white shadow-lg mx-auto"
                            style={{
                              width: '794px',
                              minHeight: `${A4_HEIGHT}px`,
                              padding: '60px 80px',
                              fontFamily: 'Arial, sans-serif',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              position: 'relative'
                            }}
                            dangerouslySetInnerHTML={{ __html: editorContent }}
                          />
                        </div>
                      );
                    }

                    return pages;
                  })()}
                </div>

                <div className={cn(
                  'mt-6 p-4 rounded-lg text-sm',
                  isDark ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-50 text-blue-700'
                )}>
                  💡 <strong>Not:</strong> Önizleme yaklaşık sayfa bölünmesini gösterir. Gerçek sayfa düzeni Word&apos;de oluşturulur.
                </div>
              </div>
            </div>
          )}

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
                            ? 'bg-gray-700/50 border-gray-600 hover:border-blue-500' 
                            : 'bg-gray-50 border-gray-200 hover:border-blue-500'
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

export default function YeniSablonDuzenleyiciPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <YeniSablonDuzenleyiciContent />
    </Suspense>
  );
}
