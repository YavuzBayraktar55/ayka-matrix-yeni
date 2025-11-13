'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { SablonDosyalari } from '@/types/database';
import { FileText, Download, Edit, Trash2, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function SablonlarPage() {
  const { isDark } = useTheme();
  const [sablonlar, setSablonlar] = useState<SablonDosyalari[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedSablon, setSelectedSablon] = useState<SablonDosyalari | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    sablonAdi: '',
    sablonTuru: 'sozlesme' as 'sozlesme' | 'izin' | 'avans' | 'genel',
    aciklama: '',
    file: null as File | null
  });

  // Update form
  const [updateForm, setUpdateForm] = useState({
    sablonAdi: '',
    aciklama: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchSablonlar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSablonlar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sablon-dosyalari');
      const result = await response.json();
      
      if (response.ok) {
        setSablonlar(result.data || []);
      } else {
        showMessage('error', result.error || 'Şablonlar yüklenemedi');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showMessage('error', 'Şablonlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file) {
      showMessage('error', 'Dosya seçiniz');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('sablonAdi', uploadForm.sablonAdi);
    formData.append('sablonTuru', uploadForm.sablonTuru);
    formData.append('aciklama', uploadForm.aciklama);

    try {
      const response = await fetch('/api/sablon-dosyalari', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        showMessage('success', result.message || 'Şablon başarıyla yüklendi');
        setUploadModalOpen(false);
        setUploadForm({ sablonAdi: '', sablonTuru: 'sozlesme', aciklama: '', file: null });
        fetchSablonlar();
      } else {
        showMessage('error', result.error || 'Yükleme başarısız');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showMessage('error', 'Yükleme sırasında hata oluştu');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSablon) return;

    const formData = new FormData();
    formData.append('sablonId', selectedSablon.sablonid);
    
    if (updateForm.sablonAdi) {
      formData.append('sablonAdi', updateForm.sablonAdi);
    }
    
    if (updateForm.aciklama !== undefined) {
      formData.append('aciklama', updateForm.aciklama);
    }
    
    if (updateForm.file) {
      formData.append('file', updateForm.file);
    }

    try {
      const response = await fetch('/api/sablon-dosyalari', {
        method: 'PUT',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        showMessage('success', result.message || 'Şablon başarıyla güncellendi');
        setUpdateModalOpen(false);
        setSelectedSablon(null);
        setUpdateForm({ sablonAdi: '', aciklama: '', file: null });
        fetchSablonlar();
      } else {
        showMessage('error', result.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Update error:', error);
      showMessage('error', 'Güncelleme sırasında hata oluştu');
    }
  };

  const handleDownload = async (sablon: SablonDosyalari) => {
    try {
      const response = await fetch(`/api/sablon-indir?id=${sablon.sablonid}`);
      
      if (!response.ok) {
        const error = await response.json();
        showMessage('error', error.error || 'İndirme başarısız');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sablon.dosyaadi;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage('success', 'Şablon indirildi');
    } catch (error) {
      console.error('Download error:', error);
      showMessage('error', 'İndirme sırasında hata oluştu');
    }
  };

  const handleDelete = async (sablon: SablonDosyalari) => {
    if (!confirm(`"${sablon.sablonadi}" şablonunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sablon-dosyalari?id=${sablon.sablonid}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        showMessage('success', result.message || 'Şablon silindi');
        fetchSablonlar();
      } else {
        showMessage('error', result.error || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
  };

  const openUpdateModal = (sablon: SablonDosyalari) => {
    setSelectedSablon(sablon);
    setUpdateForm({
      sablonAdi: sablon.sablonadi,
      aciklama: sablon.aciklama || '',
      file: null
    });
    setUpdateModalOpen(true);
  };

  const getSablonTuruLabel = (tur: string) => {
    const labels: Record<string, string> = {
      sozlesme: 'Sözleşme',
      izin: 'İzin',
      avans: 'Avans',
      genel: 'Genel'
    };
    return labels[tur] || tur;
  };

  const getSablonTuruColor = (tur: string) => {
    const colors: Record<string, string> = {
      sozlesme: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      izin: 'bg-green-500/20 text-green-400 border-green-500/30',
      avans: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      genel: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[tur] || colors.genel;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute allowedRoles={['insan_kaynaklari', 'yonetici']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn(
                'text-3xl font-bold',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                📁 Şablon Yönetimi
              </h1>
              <p className={cn(
                'text-sm mt-2',
                isDark ? 'text-gray-400' : 'text-gray-600'
              )}>
                Word şablonlarınızı yönetin (Supabase Storage)
              </p>
            </div>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Yeni Şablon Yükle
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={cn(
              'p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top',
              message.type === 'success'
                ? isDark
                  ? 'bg-green-900/20 border-green-500/30 text-green-400'
                  : 'bg-green-50 border-green-200 text-green-700'
                : isDark
                  ? 'bg-red-900/20 border-red-500/30 text-red-400'
                  : 'bg-red-50 border-red-200 text-red-700'
            )}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="flex-1">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Info Box */}
          <div className={cn(
            'p-6 rounded-xl border',
            isDark
              ? 'bg-blue-900/10 border-blue-500/30'
              : 'bg-blue-50 border-blue-200'
          )}>
            <div className="flex items-start gap-3">
              <AlertCircle className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                isDark ? 'text-blue-400' : 'text-blue-600'
              )} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn(
                    'font-semibold',
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  )}>
                    Şablon Sistemi Hakkında
                  </h3>
                  <a
                    href="/api/kilavuz-indir"
                    download="Sablon_Degiskenler_Kilavuzu.md"
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1',
                      isDark
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    )}
                    title="Şablon değişkenlerinin tam listesini indir"
                  >
                    <Download className="w-3 h-3" />
                    Değişkenler Kılavuzu
                  </a>
                </div>
                <ul className={cn(
                  'text-sm space-y-1',
                  isDark ? 'text-blue-300' : 'text-blue-700'
                )}>
                  <li>• Şablonlar Supabase Storage&apos;da güvenli şekilde saklanır</li>
                  <li>• Şablonu indirip Word&apos;de düzenleyebilir, güncelleyebilirsiniz</li>
                  <li>• Her güncelleme versiyon numarasını artırır</li>
                  <li>• Değişkenler: <code className="px-1 py-0.5 rounded bg-black/10">{'{personel_adi_duzgun}'}</code> (başharfler büyük)</li>
                  <li>• Tüm değişkenler için yukarıdaki kılavuzu indirin 📄</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Şablonlar Listesi */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className={cn('mt-4', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Şablonlar yükleniyor...
              </p>
            </div>
          ) : sablonlar.length === 0 ? (
            <div className={cn(
              'text-center py-12 rounded-xl border-2 border-dashed',
              isDark ? 'border-gray-700' : 'border-gray-300'
            )}>
              <FileText className={cn(
                'w-16 h-16 mx-auto mb-4',
                isDark ? 'text-gray-600' : 'text-gray-400'
              )} />
              <h3 className={cn(
                'text-xl font-semibold mb-2',
                isDark ? 'text-gray-400' : 'text-gray-600'
              )}>
                Henüz şablon yok
              </h3>
              <p className={cn(
                'text-sm mb-4',
                isDark ? 'text-gray-500' : 'text-gray-500'
              )}>
                İlk şablonunuzu yüklemek için yukarıdaki butonu kullanın
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sablonlar.map((sablon) => (
                <div
                  key={sablon.sablonid}
                  className={cn(
                    'p-6 rounded-xl border transition-all duration-200 hover:shadow-xl',
                    isDark
                      ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className={cn(
                        'text-lg font-bold mb-2',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}>
                        {sablon.sablonadi}
                      </h3>
                      <span className={cn(
                        'inline-block px-2 py-1 text-xs font-medium rounded-full border',
                        getSablonTuruColor(sablon.sablonturu)
                      )}>
                        {getSablonTuruLabel(sablon.sablonturu)}
                      </span>
                    </div>
                    <FileText className={cn(
                      'w-8 h-8',
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>

                  {/* Info */}
                  <div className={cn(
                    'space-y-2 mb-4 text-sm',
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    <div className="flex items-center justify-between">
                      <span>Boyut:</span>
                      <span className="font-medium">{formatFileSize(sablon.dosyaboyutu)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Versiyon:</span>
                      <span className="font-medium">v{sablon.versiyon}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Güncelleme:</span>
                      <span className="font-medium">{formatDate(sablon.updated_at)}</span>
                    </div>
                  </div>

                  {/* Açıklama */}
                  {sablon.aciklama && (
                    <p className={cn(
                      'text-sm mb-4 p-3 rounded-lg',
                      isDark ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-600'
                    )}>
                      {sablon.aciklama}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(sablon)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
                        isDark
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      )}
                      title="İndir ve düzenle"
                    >
                      <Download className="w-4 h-4" />
                      İndir
                    </button>
                    <button
                      onClick={() => openUpdateModal(sablon)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
                        isDark
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      )}
                      title="Güncelle"
                    >
                      <Edit className="w-4 h-4" />
                      Güncelle
                    </button>
                    <button
                      onClick={() => handleDelete(sablon)}
                      className={cn(
                        'px-3 py-2 rounded-lg transition-colors',
                        isDark
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      )}
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Modal */}
          {uploadModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div
                className={cn(
                  'w-full max-w-md rounded-2xl shadow-2xl',
                  isDark ? 'bg-gray-800' : 'bg-white'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className={cn(
                  'px-6 py-4 border-b flex items-center justify-between',
                  isDark ? 'border-gray-700' : 'border-gray-200'
                )}>
                  <h2 className={cn(
                    'text-xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Yeni Şablon Yükle
                  </h2>
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleUpload} className="p-6 space-y-4">
                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Şablon Adı *
                    </label>
                    <input
                      type="text"
                      value={uploadForm.sablonAdi}
                      onChange={(e) => setUploadForm({ ...uploadForm, sablonAdi: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      placeholder="örn: İş Sözleşmesi Şablonu"
                      required
                    />
                  </div>

                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Şablon Türü *
                    </label>
                    <select
                      value={uploadForm.sablonTuru}
                      onChange={(e) => setUploadForm({ ...uploadForm, sablonTuru: e.target.value as 'sozlesme' | 'izin' | 'avans' | 'genel' })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      required
                    >
                      <option value="sozlesme">Sözleşme</option>
                      <option value="izin">İzin</option>
                      <option value="avans">Avans</option>
                      <option value="genel">Genel</option>
                    </select>
                  </div>

                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Açıklama
                    </label>
                    <textarea
                      value={uploadForm.aciklama}
                      onChange={(e) => setUploadForm({ ...uploadForm, aciklama: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none resize-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      rows={3}
                      placeholder="Şablon hakkında kısa açıklama (opsiyonel)"
                    />
                  </div>

                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Word Dosyası (.docx) *
                    </label>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      required
                    />
                    <p className={cn(
                      'text-xs mt-1',
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    )}>
                      Sadece .docx formatı kabul edilir
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(false)}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                        isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      )}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
                    >
                      Yükle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Update Modal */}
          {updateModalOpen && selectedSablon && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div
                className={cn(
                  'w-full max-w-md rounded-2xl shadow-2xl',
                  isDark ? 'bg-gray-800' : 'bg-white'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className={cn(
                  'px-6 py-4 border-b flex items-center justify-between',
                  isDark ? 'border-gray-700' : 'border-gray-200'
                )}>
                  <h2 className={cn(
                    'text-xl font-bold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Şablonu Güncelle
                  </h2>
                  <button
                    onClick={() => setUpdateModalOpen(false)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleUpdate} className="p-6 space-y-4">
                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Şablon Adı
                    </label>
                    <input
                      type="text"
                      value={updateForm.sablonAdi}
                      onChange={(e) => setUpdateForm({ ...updateForm, sablonAdi: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      placeholder="Yeni isim (opsiyonel)"
                    />
                  </div>

                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Açıklama
                    </label>
                    <textarea
                      value={updateForm.aciklama}
                      onChange={(e) => setUpdateForm({ ...updateForm, aciklama: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none resize-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                      rows={3}
                      placeholder="Yeni açıklama (opsiyonel)"
                    />
                  </div>

                  <div>
                    <label className={cn(
                      'block text-sm font-medium mb-2',
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Yeni Dosya (.docx)
                    </label>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => setUpdateForm({ ...updateForm, file: e.target.files?.[0] || null })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none',
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                    />
                    <p className={cn(
                      'text-xs mt-1',
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    )}>
                      Dosya seçilmezse sadece bilgiler güncellenir. Versiyon: {selectedSablon.versiyon} → {selectedSablon.versiyon + 1}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setUpdateModalOpen(false)}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                        isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      )}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-lg transition-all"
                    >
                      Güncelle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
